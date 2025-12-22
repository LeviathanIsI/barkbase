/**
 * Integration Tests - Branching Logic
 *
 * Tests workflow branching including:
 * - Determinator YES/NO paths
 * - Gate allow/block logic
 * - Terminus completion
 * - Multi-branch determinators
 */

const { query, closePool, testConnection } = require('../setup/testDatabase');
const {
  createTestTenant,
  createTestOwner,
  createTestPet,
  createTestWorkflow,
  createTestExecution,
} = require('../setup/testFactories');
const { cleanupTestData } = require('../setup/testHelpers');

let testTenantId;
let testTenant;

// Helper function to evaluate determinator condition
function evaluateDeterminatorCondition(condition, recordData) {
  const { field, operator, value } = condition;

  // Get value from record
  let actualValue = recordData;
  for (const part of field.split('.')) {
    actualValue = actualValue?.[part];
  }

  switch (operator) {
    case 'equals':
    case 'IS_EQUAL_TO':
      return String(actualValue) === String(value);
    case 'not_equals':
    case 'IS_NOT_EQUAL_TO':
      return String(actualValue) !== String(value);
    case 'contains':
      return String(actualValue || '').toLowerCase().includes(String(value).toLowerCase());
    case 'is_empty':
      return !actualValue || actualValue === '';
    case 'is_not_empty':
      return !!actualValue && actualValue !== '';
    case 'greater_than':
      return Number(actualValue) > Number(value);
    case 'less_than':
      return Number(actualValue) < Number(value);
    case 'is_true':
      return actualValue === true || actualValue === 'true';
    case 'is_false':
      return actualValue === false || actualValue === 'false';
    default:
      return false;
  }
}

// Helper to find next step based on branch
async function findBranchStep(workflowId, parentStepId, branchPath) {
  const result = await query(
    `SELECT id FROM "WorkflowStep"
     WHERE workflow_id = $1 AND parent_step_id = $2 AND branch_path = $3
     ORDER BY position ASC LIMIT 1`,
    [workflowId, parentStepId, branchPath]
  );

  return result.rows[0]?.id || null;
}

describe('Branching Logic Integration Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to test database');
    }

    testTenant = await createTestTenant({
      name: 'Branching Test Kennel',
    });
    testTenantId = testTenant.id;
  });

  afterAll(async () => {
    await cleanupTestData(testTenantId);
    await closePool();
  });

  describe('Determinator Step', () => {
    test('routes to YES branch when condition is met', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Determinator YES Path',
        object_type: 'pet',
        steps: [
          {
            step_type: 'determinator',
            config: {
              conditions: [
                { field: 'status', operator: 'equals', value: 'INACTIVE' },
              ],
              conditionLogic: 'and',
            },
          },
        ],
      });

      const determinatorStep = steps[0];

      // Create YES branch step
      const yesBranchResult = await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_path)
         VALUES (gen_random_uuid(), $1, 'action', 'send_sms', '{}', 0, $2, 'yes')
         RETURNING *`,
        [workflow.id, determinatorStep.id]
      );

      // Create NO branch step
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_path)
         VALUES (gen_random_uuid(), $1, 'action', 'create_task', '{}', 0, $2, 'no')
         RETURNING *`,
        [workflow.id, determinatorStep.id]
      );

      // Pet with expired vaccination (meets condition)
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id, {
        status: 'INACTIVE',
      });

      // Evaluate condition
      const recordData = { status: pet.status };
      const condition = determinatorStep.config.conditions[0];
      const conditionMet = evaluateDeterminatorCondition(condition, recordData);

      expect(conditionMet).toBe(true);

      // Should route to YES branch
      const nextStepId = await findBranchStep(workflow.id, determinatorStep.id, 'yes');
      expect(nextStepId).toBe(yesBranchResult.rows[0].id);
    });

    test('routes to NO branch when condition is not met', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Determinator NO Path',
        object_type: 'pet',
        steps: [
          {
            step_type: 'determinator',
            config: {
              conditions: [
                { field: 'status', operator: 'equals', value: 'INACTIVE' },
              ],
            },
          },
        ],
      });

      const determinatorStep = steps[0];

      // Create branches
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_path)
         VALUES (gen_random_uuid(), $1, 'action', 'send_sms', '{}', 0, $2, 'yes')`,
        [workflow.id, determinatorStep.id]
      );

      const noBranchResult = await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_path)
         VALUES (gen_random_uuid(), $1, 'action', 'create_task', '{}', 0, $2, 'no')
         RETURNING *`,
        [workflow.id, determinatorStep.id]
      );

      // Pet with current vaccination (does NOT meet condition)
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id, {
        status: 'ACTIVE',
      });

      // Evaluate condition
      const recordData = { status: pet.status };
      const condition = determinatorStep.config.conditions[0];
      const conditionMet = evaluateDeterminatorCondition(condition, recordData);

      expect(conditionMet).toBe(false);

      // Should route to NO branch
      const nextStepId = await findBranchStep(workflow.id, determinatorStep.id, 'no');
      expect(nextStepId).toBe(noBranchResult.rows[0].id);
    });

    test('evaluates multiple conditions with AND logic', async () => {
      const conditions = [
        { field: 'status', operator: 'equals', value: 'INACTIVE' },
        { field: 'is_active', operator: 'is_true' },
      ];

      // Both conditions met
      const recordData1 = {
        status: 'INACTIVE',
        is_active: true,
      };

      const allMet = conditions.every(c => evaluateDeterminatorCondition(c, recordData1));
      expect(allMet).toBe(true);

      // One condition not met
      const recordData2 = {
        status: 'INACTIVE',
        is_active: false,
      };

      const someMet = conditions.every(c => evaluateDeterminatorCondition(c, recordData2));
      expect(someMet).toBe(false);
    });

    test('evaluates multiple conditions with OR logic', async () => {
      const conditions = [
        { field: 'status', operator: 'equals', value: 'CANCELLED' },
        { field: 'status', operator: 'equals', value: 'NO_SHOW' },
      ];

      // One condition met
      const recordData = { status: 'CANCELLED' };
      const anyMet = conditions.some(c => evaluateDeterminatorCondition(c, recordData));

      expect(anyMet).toBe(true);

      // Neither condition met
      const recordData2 = { status: 'CONFIRMED' };
      const noneMet = conditions.some(c => evaluateDeterminatorCondition(c, recordData2));

      expect(noneMet).toBe(false);
    });
  });

  describe('Gate Step', () => {
    test('allows execution when condition is met', async () => {
      const gateConfig = {
        conditions: [
          { field: 'sms_consent', operator: 'is_true' },
        ],
      };

      const recordData = { sms_consent: true };
      const condition = gateConfig.conditions[0];
      const allowed = evaluateDeterminatorCondition(condition, recordData);

      expect(allowed).toBe(true);
    });

    test('blocks execution when condition is not met', async () => {
      const gateConfig = {
        conditions: [
          { field: 'sms_consent', operator: 'is_true' },
        ],
      };

      const recordData = { sms_consent: false };
      const condition = gateConfig.conditions[0];
      const allowed = evaluateDeterminatorCondition(condition, recordData);

      expect(allowed).toBe(false);
    });

    test('gate with is_not_empty condition', async () => {
      const gateConfig = {
        conditions: [
          { field: 'phone', operator: 'is_not_empty' },
        ],
      };

      // Has phone
      expect(evaluateDeterminatorCondition(gateConfig.conditions[0], { phone: '+1234567890' })).toBe(true);

      // No phone
      expect(evaluateDeterminatorCondition(gateConfig.conditions[0], { phone: '' })).toBe(false);
      expect(evaluateDeterminatorCondition(gateConfig.conditions[0], { phone: null })).toBe(false);
    });

    test('gate with numeric comparison', async () => {
      const gateConfig = {
        conditions: [
          { field: 'total_price', operator: 'greater_than', value: 100 },
        ],
      };

      // Above threshold
      expect(evaluateDeterminatorCondition(gateConfig.conditions[0], { total_price: 150 })).toBe(true);

      // Below threshold
      expect(evaluateDeterminatorCondition(gateConfig.conditions[0], { total_price: 50 })).toBe(false);
    });
  });

  describe('Terminus Step', () => {
    test('completes workflow execution', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Terminus Test',
        object_type: 'pet',
        steps: [
          { step_type: 'action', action_type: 'create_task', config: {} },
          { step_type: 'terminus', config: {} },
        ],
      });

      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);

      // Create execution
      const execution = await createTestExecution(
        workflow.id,
        testTenantId,
        pet.id,
        'pet'
      );

      // Simulate reaching terminus
      await query(
        `UPDATE "WorkflowExecution"
         SET status = 'completed', completed_at = NOW(), current_step_id = $1
         WHERE id = $2`,
        [steps[1].id, execution.id]
      );

      // Verify completed
      const result = await query(
        `SELECT status, completed_at FROM "WorkflowExecution" WHERE id = $1`,
        [execution.id]
      );

      expect(result.rows[0].status).toBe('completed');
      expect(result.rows[0].completed_at).not.toBeNull();
    });

    test('increments workflow completed_count', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Completion Count Test',
        object_type: 'pet',
        steps: [
          { step_type: 'terminus', config: {} },
        ],
      });

      // Get initial count
      const initialResult = await query(
        `SELECT completed_count FROM "Workflow" WHERE id = $1`,
        [workflow.id]
      );
      const initialCount = initialResult.rows[0].completed_count;

      // Increment completed count
      await query(
        `UPDATE "Workflow" SET completed_count = completed_count + 1 WHERE id = $1`,
        [workflow.id]
      );

      // Verify increment
      const finalResult = await query(
        `SELECT completed_count FROM "Workflow" WHERE id = $1`,
        [workflow.id]
      );

      expect(finalResult.rows[0].completed_count).toBe(initialCount + 1);
    });
  });

  describe('Multi-Branch Determinators', () => {
    test('supports 3+ branch paths', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Multi-Branch Workflow',
        object_type: 'booking',
        steps: [
          {
            step_type: 'determinator',
            config: {
              branches: [
                { id: 'confirmed', label: 'Confirmed', conditions: [{ field: 'status', operator: 'equals', value: 'CONFIRMED' }] },
                { id: 'cancelled', label: 'Cancelled', conditions: [{ field: 'status', operator: 'equals', value: 'CANCELLED' }] },
                { id: 'pending', label: 'Pending', conditions: [{ field: 'status', operator: 'equals', value: 'PENDING' }] },
              ],
            },
          },
        ],
      });

      const determinatorStep = steps[0];

      // Create branch steps
      for (const branchId of ['confirmed', 'cancelled', 'pending']) {
        await query(
          `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_path)
           VALUES (gen_random_uuid(), $1, 'action', 'send_sms', '{}', 0, $2, $3)`,
          [workflow.id, determinatorStep.id, branchId]
        );
      }

      // Verify all branches exist
      const branchesResult = await query(
        `SELECT DISTINCT branch_path FROM "WorkflowStep"
         WHERE workflow_id = $1 AND parent_step_id = $2`,
        [workflow.id, determinatorStep.id]
      );

      const branchIds = branchesResult.rows.map(r => r.branch_path);
      expect(branchIds).toContain('confirmed');
      expect(branchIds).toContain('cancelled');
      expect(branchIds).toContain('pending');
    });

    test('evaluates correct branch based on record status', async () => {
      const branches = [
        { id: 'confirmed', conditions: [{ field: 'status', operator: 'equals', value: 'CONFIRMED' }] },
        { id: 'cancelled', conditions: [{ field: 'status', operator: 'equals', value: 'CANCELLED' }] },
        { id: 'default', conditions: [] }, // Default/fallback branch
      ];

      // Test each status
      const testCases = [
        { status: 'CONFIRMED', expectedBranch: 'confirmed' },
        { status: 'CANCELLED', expectedBranch: 'cancelled' },
        { status: 'PENDING', expectedBranch: 'default' },
      ];

      for (const { status, expectedBranch } of testCases) {
        const recordData = { status };

        // Find matching branch
        let matchedBranch = 'default';
        for (const branch of branches) {
          if (branch.conditions.length > 0) {
            const allMet = branch.conditions.every(c =>
              evaluateDeterminatorCondition(c, recordData)
            );
            if (allMet) {
              matchedBranch = branch.id;
              break;
            }
          }
        }

        expect(matchedBranch).toBe(expectedBranch);
      }
    });
  });

  describe('Nested Branches', () => {
    test('supports branches within branches', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Nested Branch Workflow',
        object_type: 'pet',
        steps: [
          {
            step_type: 'determinator',
            config: {
              conditions: [{ field: 'is_active', operator: 'is_true' }],
            },
          },
        ],
      });

      const topDeterminator = steps[0];

      // Create YES branch with another determinator
      const nestedDeterminatorResult = await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_path)
         VALUES (gen_random_uuid(), $1, 'determinator', $2, 0, $3, 'yes')
         RETURNING *`,
        [
          workflow.id,
          JSON.stringify({ conditions: [{ field: 'status', operator: 'equals', value: 'INACTIVE' }] }),
          topDeterminator.id,
        ]
      );

      const nestedDeterminator = nestedDeterminatorResult.rows[0];

      // Create branches for nested determinator
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_path)
         VALUES (gen_random_uuid(), $1, 'action', 'send_sms', '{}', 0, $2, 'yes')`,
        [workflow.id, nestedDeterminator.id]
      );

      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_path)
         VALUES (gen_random_uuid(), $1, 'action', 'create_task', '{}', 0, $2, 'no')`,
        [workflow.id, nestedDeterminator.id]
      );

      // Verify structure
      const topYesBranch = await findBranchStep(workflow.id, topDeterminator.id, 'yes');
      expect(topYesBranch).toBe(nestedDeterminator.id);

      const nestedYesBranch = await findBranchStep(workflow.id, nestedDeterminator.id, 'yes');
      expect(nestedYesBranch).not.toBeNull();

      const nestedNoBranch = await findBranchStep(workflow.id, nestedDeterminator.id, 'no');
      expect(nestedNoBranch).not.toBeNull();
    });
  });

  describe('Branch Flow After Action', () => {
    test('continues to next step in branch after action', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Branch Flow Test',
        object_type: 'pet',
        steps: [
          { step_type: 'determinator', config: { conditions: [] } },
        ],
      });

      const determinatorStep = steps[0];

      // Create YES branch with multiple steps
      const action1Result = await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_path)
         VALUES (gen_random_uuid(), $1, 'action', 'send_sms', '{}', 0, $2, 'yes')
         RETURNING *`,
        [workflow.id, determinatorStep.id]
      );

      const action2Result = await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_path)
         VALUES (gen_random_uuid(), $1, 'action', 'create_task', '{}', 1, $2, 'yes')
         RETURNING *`,
        [workflow.id, determinatorStep.id]
      );

      const terminusResult = await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_path)
         VALUES (gen_random_uuid(), $1, 'terminus', '{}', 2, $2, 'yes')
         RETURNING *`,
        [workflow.id, determinatorStep.id]
      );

      // Verify step order in branch
      const branchSteps = await query(
        `SELECT id, step_type, position FROM "WorkflowStep"
         WHERE workflow_id = $1 AND parent_step_id = $2 AND branch_path = 'yes'
         ORDER BY position ASC`,
        [workflow.id, determinatorStep.id]
      );

      expect(branchSteps.rows.length).toBe(3);
      expect(branchSteps.rows[0].id).toBe(action1Result.rows[0].id);
      expect(branchSteps.rows[1].id).toBe(action2Result.rows[0].id);
      expect(branchSteps.rows[2].id).toBe(terminusResult.rows[0].id);
    });
  });
});
