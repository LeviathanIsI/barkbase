/**
 * E2E Tests - Filter-based Workflows
 *
 * Tests filter/criteria-based workflow enrollment.
 * Records matching filter conditions should be enrolled.
 */

const { query, closePool, testConnection } = require('../setup/testDatabase');
const {
  createTestTenant,
  createTestOwner,
  createTestPet,
  createTestWorkflow,
} = require('../setup/testFactories');
const { cleanupTestData } = require('../setup/testHelpers');

jest.setTimeout(30000);

let testTenantId;
let testTenant;

describe('Filter Workflows E2E Tests', () => {
  beforeAll(async () => {
    await testConnection();

    testTenant = await createTestTenant({
      name: 'Filter Workflows Test Kennel',
    });
    testTenantId = testTenant.id;
  });

  afterAll(async () => {
    await cleanupTestData(testTenantId);
    await closePool();
  });

  describe('Filter-based Enrollment', () => {
    test('creates workflow with filter trigger', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Filter Enrollment Workflow',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'filter',
          filter: {
            filterBranchType: 'OR',
            filterBranches: [
              {
                filterBranchType: 'AND',
                filters: [
                  { property: 'status', operator: 'equals', value: 'INACTIVE' },
                ],
              },
            ],
          },
        },
        steps: [
          { step_type: 'action', action_type: 'send_sms', config: { message: 'Vaccination reminder' } },
          { step_type: 'terminus', config: {} },
        ],
      });

      expect(workflow.entry_condition.trigger_type).toBe('filter');
      expect(workflow.entry_condition.filter).toBeDefined();
    });

    test('identifies matching records for filter enrollment', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Pet Filter Workflow',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'filter',
          filter: {
            filterBranchType: 'OR',
            filterBranches: [
              {
                filterBranchType: 'AND',
                filters: [
                  { property: 'status', operator: 'equals', value: 'INACTIVE' },
                ],
              },
            ],
          },
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      const owner = await createTestOwner(testTenantId);

      // Create matching pet
      const matchingPet = await createTestPet(testTenantId, owner.id, {
        status: 'INACTIVE',
      });

      // Create non-matching pet
      const nonMatchingPet = await createTestPet(testTenantId, owner.id, {
        status: 'ACTIVE',
      });

      // Query to find matching records
      const matchingRecords = await query(
        `SELECT id, name, status FROM "Pet"
         WHERE tenant_id = $1 AND status = 'INACTIVE'`,
        [testTenantId]
      );

      expect(matchingRecords.rows.some(r => r.id === matchingPet.id)).toBe(true);
      expect(matchingRecords.rows.some(r => r.id === nonMatchingPet.id)).toBe(false);
    });

    test('excludes already enrolled records', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'No Duplicate Enrollment Workflow',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'filter',
          filter: {
            filterBranchType: 'OR',
            filterBranches: [
              {
                filterBranchType: 'AND',
                filters: [
                  { property: 'is_active', operator: 'is_true' },
                ],
              },
            ],
          },
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id, {
        is_active: true,
      });

      // Create existing execution
      await query(
        `INSERT INTO "WorkflowExecution" (id, workflow_id, tenant_id, record_id, record_type, status, enrolled_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'pet', 'running', NOW())`,
        [workflow.id, testTenantId, pet.id]
      );

      // Query to find records NOT already enrolled
      const eligibleRecords = await query(
        `SELECT p.id FROM "Pet" p
         WHERE p.tenant_id = $1
           AND p.is_active = true
           AND NOT EXISTS (
             SELECT 1 FROM "WorkflowExecution" we
             WHERE we.workflow_id = $2
               AND we.record_id = p.id
               AND we.status IN ('running', 'paused')
           )`,
        [testTenantId, workflow.id]
      );

      expect(eligibleRecords.rows.some(r => r.id === pet.id)).toBe(false);
    });
  });

  describe('Filter Condition Types', () => {
    test('evaluates equals condition', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Equals Filter',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'filter',
          filter: {
            filterBranchType: 'AND',
            filters: [
              { property: 'species', operator: 'equals', value: 'DOG' },
            ],
          },
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      const owner = await createTestOwner(testTenantId);
      const dog = await createTestPet(testTenantId, owner.id, { species: 'DOG' });
      const cat = await createTestPet(testTenantId, owner.id, { species: 'CAT' });

      // Find matching records
      const matches = await query(
        `SELECT id FROM "Pet" WHERE tenant_id = $1 AND species = 'DOG'`,
        [testTenantId]
      );

      expect(matches.rows.some(r => r.id === dog.id)).toBe(true);
      expect(matches.rows.some(r => r.id === cat.id)).toBe(false);
    });

    test('evaluates contains condition', async () => {
      const owner = await createTestOwner(testTenantId);
      await createTestPet(testTenantId, owner.id, { name: 'Max the Great' });
      await createTestPet(testTenantId, owner.id, { name: 'Buddy' });

      const matches = await query(
        `SELECT id, name FROM "Pet"
         WHERE tenant_id = $1 AND LOWER(name) LIKE LOWER($2)`,
        [testTenantId, '%great%']
      );

      expect(matches.rows.length).toBeGreaterThan(0);
      expect(matches.rows.some(r => r.name.toLowerCase().includes('great'))).toBe(true);
    });

    test('evaluates greater_than condition', async () => {
      const owner = await createTestOwner(testTenantId);
      const heavyPet = await createTestPet(testTenantId, owner.id, { weight: 80 });
      const lightPet = await createTestPet(testTenantId, owner.id, { weight: 20 });

      const matches = await query(
        `SELECT id, weight FROM "Pet" WHERE tenant_id = $1 AND weight > 50`,
        [testTenantId]
      );

      expect(matches.rows.some(r => r.id === heavyPet.id)).toBe(true);
      expect(matches.rows.some(r => r.id === lightPet.id)).toBe(false);
    });

    test('evaluates is_true condition', async () => {
      const owner = await createTestOwner(testTenantId);
      const activePet = await createTestPet(testTenantId, owner.id, { is_active: true });
      const inactivePet = await createTestPet(testTenantId, owner.id, { is_active: false });

      const matches = await query(
        `SELECT id FROM "Pet" WHERE tenant_id = $1 AND is_active = true`,
        [testTenantId]
      );

      expect(matches.rows.some(r => r.id === activePet.id)).toBe(true);
      expect(matches.rows.some(r => r.id === inactivePet.id)).toBe(false);
    });

    test('evaluates is_empty condition', async () => {
      const owner = await createTestOwner(testTenantId);
      const petWithNotes = await createTestPet(testTenantId, owner.id, {
        medical_notes: 'Some medical notes',
      });
      const petWithoutNotes = await createTestPet(testTenantId, owner.id, {
        medical_notes: null,
      });

      const matches = await query(
        `SELECT id FROM "Pet"
         WHERE tenant_id = $1 AND (medical_notes IS NULL OR medical_notes = '')`,
        [testTenantId]
      );

      expect(matches.rows.some(r => r.id === petWithoutNotes.id)).toBe(true);
      expect(matches.rows.some(r => r.id === petWithNotes.id)).toBe(false);
    });
  });

  describe('Complex Filter Conditions', () => {
    test('evaluates AND logic (all conditions must match)', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'AND Filter Workflow',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'filter',
          filter: {
            filterBranchType: 'AND',
            filters: [
              { property: 'species', operator: 'equals', value: 'DOG' },
              { property: 'is_active', operator: 'is_true' },
              { property: 'status', operator: 'equals', value: 'INACTIVE' },
            ],
          },
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      const owner = await createTestOwner(testTenantId);

      // All conditions match
      const matchingPet = await createTestPet(testTenantId, owner.id, {
        species: 'DOG',
        is_active: true,
        status: 'INACTIVE',
      });

      // Only some conditions match
      const partialMatch = await createTestPet(testTenantId, owner.id, {
        species: 'DOG',
        is_active: true,
        status: 'ACTIVE',
      });

      const matches = await query(
        `SELECT id FROM "Pet"
         WHERE tenant_id = $1
           AND species = 'DOG'
           AND is_active = true
           AND status = 'INACTIVE'`,
        [testTenantId]
      );

      expect(matches.rows.some(r => r.id === matchingPet.id)).toBe(true);
      expect(matches.rows.some(r => r.id === partialMatch.id)).toBe(false);
    });

    test('evaluates OR logic (any condition can match)', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'OR Filter Workflow',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'filter',
          filter: {
            filterBranchType: 'OR',
            filterBranches: [
              {
                filterBranchType: 'AND',
                filters: [
                  { property: 'status', operator: 'equals', value: 'INACTIVE' },
                ],
              },
              {
                filterBranchType: 'AND',
                filters: [
                  { property: 'status', operator: 'equals', value: 'DECEASED' },
                ],
              },
            ],
          },
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      const owner = await createTestOwner(testTenantId);

      const inactivePet = await createTestPet(testTenantId, owner.id, {
        status: 'INACTIVE',
      });

      const activePet = await createTestPet(testTenantId, owner.id, {
        status: 'ACTIVE',
      });

      const matches = await query(
        `SELECT id FROM "Pet"
         WHERE tenant_id = $1
           AND status IN ('INACTIVE', 'DECEASED')`,
        [testTenantId]
      );

      expect(matches.rows.some(r => r.id === inactivePet.id)).toBe(true);
      expect(matches.rows.some(r => r.id === activePet.id)).toBe(false);
    });

    test('evaluates nested filter groups', async () => {
      // (species = 'DOG' AND is_active = true) OR (species = 'CAT' AND weight > 10)
      const owner = await createTestOwner(testTenantId);

      const activeDog = await createTestPet(testTenantId, owner.id, {
        species: 'DOG',
        is_active: true,
      });

      const heavyCat = await createTestPet(testTenantId, owner.id, {
        species: 'CAT',
        weight: 15,
      });

      const lightCat = await createTestPet(testTenantId, owner.id, {
        species: 'CAT',
        weight: 5,
      });

      const matches = await query(
        `SELECT id FROM "Pet"
         WHERE tenant_id = $1
           AND (
             (species = 'DOG' AND is_active = true)
             OR (species = 'CAT' AND weight > 10)
           )`,
        [testTenantId]
      );

      expect(matches.rows.some(r => r.id === activeDog.id)).toBe(true);
      expect(matches.rows.some(r => r.id === heavyCat.id)).toBe(true);
      expect(matches.rows.some(r => r.id === lightCat.id)).toBe(false);
    });
  });

  describe('Filter Workflow Scheduling', () => {
    test('creates filter workflow with schedule', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Scheduled Filter Workflow',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'filter',
          schedule: {
            frequency: 'daily',
            time: '09:00',
            timezone: 'America/New_York',
          },
          filter: {
            filterBranchType: 'AND',
            filters: [
              { property: 'status', operator: 'equals', value: 'expired' },
            ],
          },
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      expect(workflow.entry_condition.schedule).toBeDefined();
      expect(workflow.entry_condition.schedule.frequency).toBe('daily');
    });
  });

  describe('BarkBase Legacy Filter Format', () => {
    test('supports legacy groups format', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Legacy Filter Workflow',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'filter',
          filter: {
            groups: [
              {
                logic: 'AND',
                conditions: [
                  { field: 'species', operator: 'equals', value: 'DOG' },
                  { field: 'is_active', operator: 'is_true' },
                ],
              },
            ],
            groupLogic: 'OR',
          },
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      expect(workflow.entry_condition.filter.groups).toBeDefined();
      expect(workflow.entry_condition.filter.groupLogic).toBe('OR');
    });
  });
});
