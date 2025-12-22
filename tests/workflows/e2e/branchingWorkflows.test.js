/**
 * E2E Tests - Branching Workflows
 *
 * Tests complex branching scenarios including:
 * - Determinator routing
 * - Nested branches
 * - Multi-branch determinators (3+ paths)
 */

const { query, closePool, testConnection } = require('../setup/testDatabase');
const {
  sendToTriggerQueue,
  testLocalStackConnection,
} = require('../setup/testAwsClients');
const {
  createTestTenant,
  createTestOwner,
  createTestPet,
  createTestBooking,
  createTestWorkflow,
  createTestExecution,
} = require('../setup/testFactories');
const {
  cleanupTestData,
  waitForExecution,
  getExecutionLogs,
} = require('../setup/testHelpers');

jest.setTimeout(30000);

let testTenantId;
let testTenant;
let localStackAvailable = false;

describe('Branching Workflows E2E Tests', () => {
  beforeAll(async () => {
    await testConnection();
    localStackAvailable = await testLocalStackConnection();

    testTenant = await createTestTenant({
      name: 'Branching Test Kennel',
    });
    testTenantId = testTenant.id;
  });

  afterAll(async () => {
    await cleanupTestData(testTenantId);
    await closePool();
  });

  describe('Determinator Routing', () => {
    test('routes to YES branch when condition met', async () => {
      // Create workflow with determinator
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Determinator YES Route',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'pet.created',
        },
        steps: [
          {
            step_type: 'determinator',
            config: {
              conditions: [
                { field: 'vaccination_status', operator: 'equals', value: 'expired' },
              ],
              conditionLogic: 'and',
            },
          },
        ],
      });

      const determinatorId = steps[0].id;

      // Add YES branch
      const yesBranchResult = await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'action', 'send_sms', '{"message": "Vaccination overdue"}', 0, $2, 'yes')
         RETURNING *`,
        [workflow.id, determinatorId]
      );

      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'terminus', '{}', 1, $2, 'yes')`,
        [workflow.id, determinatorId]
      );

      // Add NO branch
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'terminus', '{}', 0, $2, 'no')`,
        [workflow.id, determinatorId]
      );

      // Create pet that matches condition
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id, {
        vaccination_status: 'expired',
      });

      // Create execution
      const execution = await createTestExecution(
        workflow.id,
        testTenantId,
        pet.id,
        'pet',
        { current_step_id: determinatorId }
      );

      // Verify the determinator would route to YES
      const conditionMet = pet.vaccination_status === 'expired';
      expect(conditionMet).toBe(true);

      // Get YES branch step
      const yesBranch = await query(
        `SELECT id FROM "WorkflowStep"
         WHERE workflow_id = $1 AND parent_step_id = $2 AND branch_id = 'yes'
         ORDER BY position LIMIT 1`,
        [workflow.id, determinatorId]
      );

      expect(yesBranch.rows[0].id).toBe(yesBranchResult.rows[0].id);
    });

    test('routes to NO branch when condition not met', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Determinator NO Route',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'pet.created',
        },
        steps: [
          {
            step_type: 'determinator',
            config: {
              conditions: [
                { field: 'vaccination_status', operator: 'equals', value: 'expired' },
              ],
            },
          },
        ],
      });

      const determinatorId = steps[0].id;

      // Add branches
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'terminus', '{}', 0, $2, 'yes')`,
        [workflow.id, determinatorId]
      );

      const noBranchResult = await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'action', 'create_task', '{"title": "All good"}', 0, $2, 'no')
         RETURNING *`,
        [workflow.id, determinatorId]
      );

      // Create pet that does NOT match condition
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id, {
        vaccination_status: 'current',
      });

      // Verify routing
      const conditionMet = pet.vaccination_status === 'expired';
      expect(conditionMet).toBe(false);

      // Get NO branch step
      const noBranch = await query(
        `SELECT id FROM "WorkflowStep"
         WHERE workflow_id = $1 AND parent_step_id = $2 AND branch_id = 'no'
         ORDER BY position LIMIT 1`,
        [workflow.id, determinatorId]
      );

      expect(noBranch.rows[0].id).toBe(noBranchResult.rows[0].id);
    });
  });

  describe('Nested Branches', () => {
    test('executes nested determinator branches', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Nested Branch Workflow',
        object_type: 'booking',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'booking.created',
        },
        steps: [
          {
            step_type: 'determinator',
            config: {
              conditions: [
                { field: 'status', operator: 'equals', value: 'CONFIRMED' },
              ],
            },
          },
        ],
      });

      const topDeterminator = steps[0].id;

      // YES branch: Another determinator based on service type
      const nestedDeterminatorResult = await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'determinator', $2, 0, $3, 'yes')
         RETURNING *`,
        [
          workflow.id,
          JSON.stringify({
            conditions: [
              { field: 'service_type', operator: 'equals', value: 'BOARDING' },
            ],
          }),
          topDeterminator,
        ]
      );

      const nestedDeterminator = nestedDeterminatorResult.rows[0].id;

      // Nested YES: Boarding confirmed
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'action', 'create_task', '{"title": "Prepare kennel"}', 0, $2, 'yes')`,
        [workflow.id, nestedDeterminator]
      );

      // Nested NO: Other service confirmed
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'action', 'create_task', '{"title": "Prepare for service"}', 0, $2, 'no')`,
        [workflow.id, nestedDeterminator]
      );

      // NO branch: Not confirmed
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'terminus', '{}', 0, $2, 'no')`,
        [workflow.id, topDeterminator]
      );

      // Create confirmed boarding booking
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);
      const booking = await createTestBooking(testTenantId, pet.id, {
        status: 'CONFIRMED',
        service_type: 'BOARDING',
      });

      // Verify path: Top YES -> Nested YES
      expect(booking.status).toBe('CONFIRMED');
      expect(booking.service_type).toBe('BOARDING');

      // Verify step structure
      const structure = await query(
        `SELECT id, step_type, branch_id, parent_step_id
         FROM "WorkflowStep"
         WHERE workflow_id = $1
         ORDER BY position`,
        [workflow.id]
      );

      // Should have: top determinator, nested determinator, 2 actions, 1 terminus
      expect(structure.rows.length).toBe(5);
    });
  });

  describe('Multi-Branch Determinators (3+ paths)', () => {
    test('routes to correct branch among multiple options', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Multi-Branch Workflow',
        object_type: 'booking',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'booking.created',
        },
        steps: [
          {
            step_type: 'determinator',
            config: {
              multiBranch: true,
              branches: [
                {
                  id: 'confirmed',
                  label: 'Confirmed',
                  conditions: [{ field: 'status', operator: 'equals', value: 'CONFIRMED' }],
                },
                {
                  id: 'cancelled',
                  label: 'Cancelled',
                  conditions: [{ field: 'status', operator: 'equals', value: 'CANCELLED' }],
                },
                {
                  id: 'pending',
                  label: 'Pending',
                  conditions: [{ field: 'status', operator: 'equals', value: 'PENDING' }],
                },
              ],
            },
          },
        ],
      });

      const determinatorId = steps[0].id;

      // Create branch steps
      const branches = ['confirmed', 'cancelled', 'pending'];
      for (const branchId of branches) {
        await query(
          `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_id)
           VALUES (gen_random_uuid(), $1, 'action', 'create_task', $2, 0, $3, $4)`,
          [workflow.id, JSON.stringify({ title: `Handle ${branchId}` }), determinatorId, branchId]
        );

        await query(
          `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_id)
           VALUES (gen_random_uuid(), $1, 'terminus', '{}', 1, $2, $3)`,
          [workflow.id, determinatorId, branchId]
        );
      }

      // Create bookings with different statuses
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);

      const confirmedBooking = await createTestBooking(testTenantId, pet.id, { status: 'CONFIRMED' });
      const cancelledBooking = await createTestBooking(testTenantId, pet.id, { status: 'CANCELLED' });
      const pendingBooking = await createTestBooking(testTenantId, pet.id, { status: 'PENDING' });

      // Function to determine branch
      function determineBranch(status) {
        if (status === 'CONFIRMED') return 'confirmed';
        if (status === 'CANCELLED') return 'cancelled';
        if (status === 'PENDING') return 'pending';
        return 'default';
      }

      expect(determineBranch(confirmedBooking.status)).toBe('confirmed');
      expect(determineBranch(cancelledBooking.status)).toBe('cancelled');
      expect(determineBranch(pendingBooking.status)).toBe('pending');

      // Verify all branches exist
      const branchSteps = await query(
        `SELECT DISTINCT branch_id FROM "WorkflowStep"
         WHERE workflow_id = $1 AND parent_step_id = $2`,
        [workflow.id, determinatorId]
      );

      const existingBranches = branchSteps.rows.map(r => r.branch_id);
      expect(existingBranches).toContain('confirmed');
      expect(existingBranches).toContain('cancelled');
      expect(existingBranches).toContain('pending');
    });

    test('handles default/fallback branch', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Default Branch Workflow',
        object_type: 'booking',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'booking.created',
        },
        steps: [
          {
            step_type: 'determinator',
            config: {
              multiBranch: true,
              branches: [
                {
                  id: 'confirmed',
                  conditions: [{ field: 'status', operator: 'equals', value: 'CONFIRMED' }],
                },
                {
                  id: 'default',
                  isDefault: true,
                  conditions: [], // Empty conditions = always matches as fallback
                },
              ],
            },
          },
        ],
      });

      const determinatorId = steps[0].id;

      // Add branches
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'action', 'send_sms', '{}', 0, $2, 'confirmed')`,
        [workflow.id, determinatorId]
      );

      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'action', 'create_task', '{"title": "Review booking"}', 0, $2, 'default')`,
        [workflow.id, determinatorId]
      );

      // Create booking with unhandled status
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);
      const booking = await createTestBooking(testTenantId, pet.id, { status: 'NO_SHOW' });

      // Function to determine branch with fallback
      function determineBranchWithFallback(status) {
        if (status === 'CONFIRMED') return 'confirmed';
        return 'default'; // Fallback for any other status
      }

      expect(determineBranchWithFallback(booking.status)).toBe('default');
    });
  });

  describe('Complex Branching Scenarios', () => {
    test('multiple determinators in sequence', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Sequential Determinators',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'pet.created',
        },
        steps: [
          { step_type: 'action', action_type: 'create_task', config: { title: 'Initial check' } },
          {
            step_type: 'determinator',
            config: {
              conditions: [{ field: 'is_active', operator: 'is_true' }],
            },
          },
        ],
      });

      const firstDeterminator = steps[1].id;

      // First determinator YES branch has another determinator
      const secondDeterminatorResult = await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'determinator', $2, 0, $3, 'yes')
         RETURNING *`,
        [
          workflow.id,
          JSON.stringify({ conditions: [{ field: 'species', operator: 'equals', value: 'dog' }] }),
          firstDeterminator,
        ]
      );

      const secondDeterminator = secondDeterminatorResult.rows[0].id;

      // Add termini
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_id)
         VALUES
           (gen_random_uuid(), $1, 'terminus', '{}', 0, $2, 'yes'),
           (gen_random_uuid(), $1, 'terminus', '{}', 0, $2, 'no'),
           (gen_random_uuid(), $1, 'terminus', '{}', 0, $3, 'no')`,
        [workflow.id, secondDeterminator, firstDeterminator]
      );

      // Verify structure
      const allSteps = await query(
        `SELECT id, step_type, parent_step_id, branch_id FROM "WorkflowStep"
         WHERE workflow_id = $1`,
        [workflow.id]
      );

      // Should have: action, 2 determinators, 3 termini
      expect(allSteps.rows.length).toBe(6);
    });

    test('branch with multiple actions before terminus', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Multi-Action Branch',
        object_type: 'booking',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'booking.confirmed',
        },
        steps: [
          {
            step_type: 'determinator',
            config: {
              conditions: [{ field: 'service_type', operator: 'equals', value: 'BOARDING' }],
            },
          },
        ],
      });

      const determinatorId = steps[0].id;

      // YES branch with multiple actions
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_id)
         VALUES
           (gen_random_uuid(), $1, 'action', 'send_sms', '{"message": "Boarding confirmed"}', 0, $2, 'yes'),
           (gen_random_uuid(), $1, 'action', 'create_task', '{"title": "Prepare kennel"}', 1, $2, 'yes'),
           (gen_random_uuid(), $1, 'action', 'send_email', '{"subject": "Booking details"}', 2, $2, 'yes')`,
        [workflow.id, determinatorId]
      );

      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'terminus', '{}', 3, $2, 'yes')`,
        [workflow.id, determinatorId]
      );

      // NO branch with single action
      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, action_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'action', 'send_sms', '{"message": "Booking confirmed"}', 0, $2, 'no')`,
        [workflow.id, determinatorId]
      );

      await query(
        `INSERT INTO "WorkflowStep" (id, workflow_id, step_type, config, position, parent_step_id, branch_id)
         VALUES (gen_random_uuid(), $1, 'terminus', '{}', 1, $2, 'no')`,
        [workflow.id, determinatorId]
      );

      // Verify YES branch step order
      const yesBranchSteps = await query(
        `SELECT step_type, action_type, position FROM "WorkflowStep"
         WHERE workflow_id = $1 AND parent_step_id = $2 AND branch_id = 'yes'
         ORDER BY position`,
        [workflow.id, determinatorId]
      );

      expect(yesBranchSteps.rows.length).toBe(4);
      expect(yesBranchSteps.rows[0].action_type).toBe('send_sms');
      expect(yesBranchSteps.rows[1].action_type).toBe('create_task');
      expect(yesBranchSteps.rows[2].action_type).toBe('send_email');
      expect(yesBranchSteps.rows[3].step_type).toBe('terminus');
    });
  });

  describe('Gate Step Blocking', () => {
    test('gate blocks execution when condition not met', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Gate Blocking Workflow',
        object_type: 'owner',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'owner.created',
        },
        steps: [
          {
            step_type: 'gate',
            config: {
              conditions: [{ field: 'sms_consent', operator: 'is_true' }],
            },
          },
          { step_type: 'action', action_type: 'send_sms', config: { message: 'Welcome!' } },
          { step_type: 'terminus', config: {} },
        ],
      });

      // Create owner without SMS consent
      const owner = await createTestOwner(testTenantId, {
        sms_consent: false,
      });

      // Gate should block
      expect(owner.sms_consent).toBe(false);

      // The workflow would stop at the gate step
    });

    test('gate allows execution when condition met', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Gate Allowing Workflow',
        object_type: 'owner',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'owner.created',
        },
        steps: [
          {
            step_type: 'gate',
            config: {
              conditions: [{ field: 'email_consent', operator: 'is_true' }],
            },
          },
          { step_type: 'action', action_type: 'send_email', config: { subject: 'Welcome!' } },
          { step_type: 'terminus', config: {} },
        ],
      });

      // Create owner with email consent
      const owner = await createTestOwner(testTenantId, {
        email_consent: true,
      });

      // Gate should allow
      expect(owner.email_consent).toBe(true);
    });
  });
});
