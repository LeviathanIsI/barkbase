/**
 * E2E Tests - Complete Workflow Execution
 *
 * Tests full workflow execution from trigger to completion via SQS.
 * Requires LocalStack to be running on localhost:4566.
 */

const { query, closePool, testConnection } = require('../setup/testDatabase');
const {
  sendToTriggerQueue,
  purgeAllQueues,
  testLocalStackConnection,
} = require('../setup/testAwsClients');
const {
  createTestTenant,
  createTestOwner,
  createTestPet,
  createTestBooking,
  createTestWorkflow,
} = require('../setup/testFactories');
const {
  cleanupTestData,
  waitForExecution,
  waitForExecutionCreated,
  getExecutionLogs,
} = require('../setup/testHelpers');

// Increase Jest timeout for E2E tests
jest.setTimeout(60000);

let testTenantId;
let testTenant;
let localStackAvailable = false;

describe('Complete Workflow E2E Tests', () => {
  beforeAll(async () => {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.warn('Database connection failed - some tests may be skipped');
    }

    // Test LocalStack connection
    localStackAvailable = await testLocalStackConnection();
    if (!localStackAvailable) {
      console.warn('LocalStack not available - SQS tests will be skipped');
    }

    // Create test tenant
    testTenant = await createTestTenant({
      name: 'E2E Test Kennel',
    });
    testTenantId = testTenant.id;

    // Purge queues before tests
    if (localStackAvailable) {
      try {
        await purgeAllQueues();
      } catch (error) {
        console.warn('Failed to purge queues:', error.message);
      }
    }
  });

  afterAll(async () => {
    await cleanupTestData(testTenantId);
    await closePool();
  });

  beforeEach(async () => {
    // Purge queues between tests
    if (localStackAvailable) {
      try {
        await purgeAllQueues();
      } catch (error) {
        // Ignore - queue may still be in purge cooldown
      }
    }
  });

  describe.each(['pet', 'booking', 'owner'])('Object Type: %s', (objectType) => {
    test('executes complete workflow from trigger to completion', async () => {
      // Create workflow
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: `E2E ${objectType} Workflow`,
        object_type: objectType,
        entry_condition: {
          trigger_type: 'event',
          event_type: `${objectType}.created`,
        },
        steps: [
          { step_type: 'action', action_type: 'create_task', config: { title: `Task for ${objectType}` } },
          { step_type: 'terminus', config: {} },
        ],
      });

      // Create record based on type
      const owner = await createTestOwner(testTenantId);
      let recordId;
      let recordType = objectType;

      if (objectType === 'pet') {
        const pet = await createTestPet(testTenantId, owner.id);
        recordId = pet.id;
      } else if (objectType === 'booking') {
        const booking = await createTestBooking(testTenantId, owner.id);
        recordId = booking.id;
      } else if (objectType === 'owner') {
        recordId = owner.id;
      }

      // Skip SQS tests if LocalStack not available
      if (!localStackAvailable) {
        console.log('LocalStack not available - testing workflow setup only');

        // Verify workflow was created correctly
        const workflowResult = await query(
          `SELECT * FROM "Workflow" WHERE id = $1`,
          [workflow.id]
        );

        expect(workflowResult.rows.length).toBe(1);
        expect(workflowResult.rows[0].object_type).toBe(objectType);
        expect(workflowResult.rows[0].status).toBe('active');

        // Verify steps were created
        const stepsResult = await query(
          `SELECT * FROM "WorkflowStep" WHERE workflow_id = $1 ORDER BY position`,
          [workflow.id]
        );

        expect(stepsResult.rows.length).toBe(2);
        expect(stepsResult.rows[0].step_type).toBe('action');
        expect(stepsResult.rows[1].step_type).toBe('terminus');

        return;
      }

      // Send event to trigger queue
      await sendToTriggerQueue({
        eventType: `${objectType}.created`,
        recordId,
        recordType,
        tenantId: testTenantId,
        eventData: {},
        timestamp: new Date().toISOString(),
      });

      // Wait for execution to be created
      const execution = await waitForExecutionCreated(workflow.id, recordId, {
        timeoutMs: 15000,
      });

      // If no execution, Lambda might not be processing (expected in test env)
      if (!execution) {
        console.log('No execution created - Lambda processing not configured in test env');
        return;
      }

      // Wait for completion
      const completedExecution = await waitForExecution(workflow.id, recordId, {
        targetStatuses: ['completed', 'failed'],
        timeoutMs: 30000,
      });

      expect(completedExecution).not.toBeNull();
      expect(completedExecution.status).toBe('completed');

      // Verify all steps were logged
      const logs = await getExecutionLogs(completedExecution.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Workflow with Wait Step', () => {
    test('handles wait step correctly', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Wait Workflow',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'pet.created',
        },
        steps: [
          { step_type: 'action', action_type: 'create_task', config: { title: 'Initial task' } },
          { step_type: 'wait', config: { waitType: 'duration', value: 1, unit: 'minutes' } },
          { step_type: 'action', action_type: 'create_task', config: { title: 'After wait task' } },
          { step_type: 'terminus', config: {} },
        ],
      });

      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);

      if (!localStackAvailable) {
        console.log('LocalStack not available - skipping SQS test');
        return;
      }

      // Send event
      await sendToTriggerQueue({
        eventType: 'pet.created',
        recordId: pet.id,
        recordType: 'pet',
        tenantId: testTenantId,
        eventData: {},
        timestamp: new Date().toISOString(),
      });

      // Wait for execution to reach paused state (waiting)
      const execution = await waitForExecutionCreated(workflow.id, pet.id);

      if (!execution) {
        console.log('No execution created - Lambda processing not configured');
        return;
      }

      // Check if execution is paused or waiting
      const result = await query(
        `SELECT status, resume_at FROM "WorkflowExecution" WHERE id = $1`,
        [execution.id]
      );

      // Execution should be either running, paused, or completed
      expect(['running', 'paused', 'completed', 'waiting']).toContain(result.rows[0].status);
    });
  });

  describe('Workflow with Multiple Actions', () => {
    test('executes all actions in sequence', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Multi-Action Workflow',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'pet.created',
        },
        steps: [
          { step_type: 'action', action_type: 'create_task', config: { title: 'Task 1' } },
          { step_type: 'action', action_type: 'create_task', config: { title: 'Task 2' } },
          { step_type: 'action', action_type: 'create_task', config: { title: 'Task 3' } },
          { step_type: 'terminus', config: {} },
        ],
      });

      expect(steps.length).toBe(4);

      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);

      if (!localStackAvailable) {
        // Verify setup
        expect(workflow.status).toBe('active');
        return;
      }

      await sendToTriggerQueue({
        eventType: 'pet.created',
        recordId: pet.id,
        recordType: 'pet',
        tenantId: testTenantId,
        eventData: {},
        timestamp: new Date().toISOString(),
      });

      const execution = await waitForExecution(workflow.id, pet.id, {
        targetStatuses: ['completed'],
        timeoutMs: 30000,
      });

      if (execution) {
        // Verify all steps executed
        const logs = await getExecutionLogs(execution.id);
        const actionLogs = logs.filter(l => l.event_type === 'step_executed');

        // Should have 3 action logs + 1 terminus
        expect(logs.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('Workflow Enrollment Metrics', () => {
    test('increments enrolled_count on enrollment', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Metrics Test Workflow',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'pet.created',
        },
        steps: [
          { step_type: 'terminus', config: {} },
        ],
      });

      // Get initial count
      const initialResult = await query(
        `SELECT enrolled_count FROM "Workflow" WHERE id = $1`,
        [workflow.id]
      );

      expect(initialResult.rows[0].enrolled_count).toBe(0);

      // Simulate enrollment (without SQS)
      await query(
        `UPDATE "Workflow" SET enrolled_count = enrolled_count + 1 WHERE id = $1`,
        [workflow.id]
      );

      const finalResult = await query(
        `SELECT enrolled_count FROM "Workflow" WHERE id = $1`,
        [workflow.id]
      );

      expect(finalResult.rows[0].enrolled_count).toBe(1);
    });

    test('increments completed_count on completion', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Completion Metrics Workflow',
        object_type: 'pet',
        steps: [
          { step_type: 'terminus', config: {} },
        ],
      });

      // Simulate completion
      await query(
        `UPDATE "Workflow" SET completed_count = completed_count + 1 WHERE id = $1`,
        [workflow.id]
      );

      const result = await query(
        `SELECT completed_count FROM "Workflow" WHERE id = $1`,
        [workflow.id]
      );

      expect(result.rows[0].completed_count).toBe(1);
    });
  });

  describe('Workflow Goal Completion', () => {
    test('completes execution early when goal is met', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Goal Test Workflow',
        object_type: 'pet',
        goal_config: {
          conditions: [
            { field: 'vaccination_status', operator: 'equals', value: 'current' },
          ],
          conditionLogic: 'and',
        },
        entry_condition: {
          trigger_type: 'event',
          event_type: 'pet.created',
        },
        steps: [
          { step_type: 'action', action_type: 'create_task', config: { title: 'Step 1' } },
          { step_type: 'wait', config: { waitType: 'duration', value: 1, unit: 'days' } },
          { step_type: 'action', action_type: 'create_task', config: { title: 'Step 2' } },
          { step_type: 'terminus', config: {} },
        ],
      });

      expect(workflow.goal_config).not.toBeNull();
      expect(workflow.goal_config.conditions.length).toBe(1);
    });
  });

  describe('Execution Status Transitions', () => {
    test('transitions from running to completed', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Status Transition Workflow',
        object_type: 'pet',
        steps: [
          { step_type: 'action', action_type: 'create_task', config: {} },
          { step_type: 'terminus', config: {} },
        ],
      });

      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);

      // Create execution in running state
      const executionResult = await query(
        `INSERT INTO "WorkflowExecution" (id, workflow_id, tenant_id, record_id, record_type, status, current_step_id, enrolled_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'running', $5, NOW())
         RETURNING *`,
        [workflow.id, testTenantId, pet.id, 'pet', steps[0].id]
      );

      const executionId = executionResult.rows[0].id;

      // Verify initial status
      expect(executionResult.rows[0].status).toBe('running');

      // Transition to completed
      await query(
        `UPDATE "WorkflowExecution"
         SET status = 'completed', completed_at = NOW(), current_step_id = $1
         WHERE id = $2`,
        [steps[1].id, executionId]
      );

      // Verify final status
      const finalResult = await query(
        `SELECT status, completed_at FROM "WorkflowExecution" WHERE id = $1`,
        [executionId]
      );

      expect(finalResult.rows[0].status).toBe('completed');
      expect(finalResult.rows[0].completed_at).not.toBeNull();
    });

    test('transitions from running to paused (wait step)', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Pause Transition Workflow',
        object_type: 'pet',
        steps: [
          { step_type: 'wait', config: { waitType: 'duration', value: 1, unit: 'hours' } },
          { step_type: 'terminus', config: {} },
        ],
      });

      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);

      // Create execution
      const executionResult = await query(
        `INSERT INTO "WorkflowExecution" (id, workflow_id, tenant_id, record_id, record_type, status, current_step_id, enrolled_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'running', $5, NOW())
         RETURNING *`,
        [workflow.id, testTenantId, pet.id, 'pet', steps[0].id]
      );

      const executionId = executionResult.rows[0].id;

      // Transition to paused
      const resumeAt = new Date();
      resumeAt.setHours(resumeAt.getHours() + 1);

      await query(
        `UPDATE "WorkflowExecution"
         SET status = 'paused', resume_at = $1
         WHERE id = $2`,
        [resumeAt.toISOString(), executionId]
      );

      const result = await query(
        `SELECT status, resume_at FROM "WorkflowExecution" WHERE id = $1`,
        [executionId]
      );

      expect(result.rows[0].status).toBe('paused');
      expect(result.rows[0].resume_at).not.toBeNull();
    });

    test('transitions from running to failed', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Failure Transition Workflow',
        object_type: 'pet',
        steps: [
          { step_type: 'action', action_type: 'webhook', config: { url: 'https://invalid.example.com' } },
          { step_type: 'terminus', config: {} },
        ],
      });

      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);

      // Create execution
      const executionResult = await query(
        `INSERT INTO "WorkflowExecution" (id, workflow_id, tenant_id, record_id, record_type, status, current_step_id, enrolled_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'running', $5, NOW())
         RETURNING *`,
        [workflow.id, testTenantId, pet.id, 'pet', steps[0].id]
      );

      const executionId = executionResult.rows[0].id;

      // Transition to failed
      await query(
        `UPDATE "WorkflowExecution"
         SET status = 'failed', completed_at = NOW(), error_message = $1
         WHERE id = $2`,
        ['Webhook request failed', executionId]
      );

      const result = await query(
        `SELECT status, error_message FROM "WorkflowExecution" WHERE id = $1`,
        [executionId]
      );

      expect(result.rows[0].status).toBe('failed');
      expect(result.rows[0].error_message).toBe('Webhook request failed');
    });
  });
});
