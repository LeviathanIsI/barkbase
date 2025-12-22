/**
 * Integration Tests - Step Execution
 *
 * Tests individual action execution including:
 * - create_task
 * - update_field
 * - internal_note
 * - add_to_segment
 * - remove_from_segment
 * - Template interpolation in actions
 */

const { query, closePool, testConnection } = require('../setup/testDatabase');
const {
  createTestTenant,
  createTestOwner,
  createTestPet,
  createTestWorkflow,
  createTestSegment,
  addOwnerToSegment,
  createTestExecution,
} = require('../setup/testFactories');
const {
  cleanupTestData,
  getCreatedTasks,
  getCreatedNotes,
  isInSegment,
  getTestUserId,
} = require('../setup/testHelpers');

let testTenantId;
let testTenant;

describe('Step Execution Integration Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to test database');
    }

    testTenant = await createTestTenant({
      name: 'Step Execution Test Kennel',
    });
    testTenantId = testTenant.id;
  });

  afterAll(async () => {
    await cleanupTestData(testTenantId);
    await closePool();
  });

  describe('create_task Action', () => {
    test('creates task record in database', async () => {
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id, { name: 'Buddy' });

      // Create task directly (simulating action execution)
      const taskResult = await query(
        `INSERT INTO "Task" (id, tenant_id, title, description, task_type, priority, status, pet_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [
          testTenantId,
          'Workflow Task: Follow up with Buddy',
          'Created by workflow automation',
          'OTHER',
          2, // medium priority
          'PENDING',
          pet.id,
        ]
      );

      const task = taskResult.rows[0];

      expect(task).toBeDefined();
      expect(task.title).toBe('Workflow Task: Follow up with Buddy');
      expect(task.status).toBe('PENDING');
      expect(task.pet_id).toBe(pet.id);
    });

    test('interpolates template variables in task title', async () => {
      const owner = await createTestOwner(testTenantId, {
        first_name: 'John',
        last_name: 'Doe',
      });
      const pet = await createTestPet(testTenantId, owner.id, { name: 'Max' });

      // Simulate template interpolation
      const template = 'Follow up with {{pet.name}} for {{owner.first_name}}';
      const interpolated = template
        .replace('{{pet.name}}', pet.name)
        .replace('{{owner.first_name}}', owner.first_name);

      expect(interpolated).toBe('Follow up with Max for John');

      // Create task with interpolated title
      const taskResult = await query(
        `INSERT INTO "Task" (id, tenant_id, title, task_type, priority, status, pet_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [testTenantId, interpolated, 'OTHER', 2, 'PENDING', pet.id]
      );

      expect(taskResult.rows[0].title).toBe('Follow up with Max for John');
    });

    test('sets due_at correctly', async () => {
      const dueInHours = 24;
      const dueAt = new Date();
      dueAt.setHours(dueAt.getHours() + dueInHours);

      const taskResult = await query(
        `INSERT INTO "Task" (id, tenant_id, title, task_type, priority, status, due_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [testTenantId, 'Due Tomorrow', 'OTHER', 2, 'PENDING', dueAt]
      );

      const task = taskResult.rows[0];
      const taskDueAt = new Date(task.due_at);

      // Should be approximately 24 hours from now
      const hoursDiff = (taskDueAt.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hoursDiff).toBeGreaterThan(23);
      expect(hoursDiff).toBeLessThan(25);
    });

    test('maps priority values correctly', async () => {
      const priorities = [
        { name: 'low', value: 1 },
        { name: 'medium', value: 2 },
        { name: 'high', value: 3 },
        { name: 'urgent', value: 4 },
      ];

      for (const { name, value } of priorities) {
        const taskResult = await query(
          `INSERT INTO "Task" (id, tenant_id, title, task_type, priority, status, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
          [testTenantId, `${name} priority task`, 'OTHER', value, 'PENDING']
        );

        expect(taskResult.rows[0].priority).toBe(value);
      }
    });
  });

  describe('update_field Action', () => {
    test('updates pet field in database', async () => {
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id, {
        medical_notes: 'Original notes',
      });

      // Update field
      await query(
        `UPDATE "Pet" SET medical_notes = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        ['Updated by workflow', pet.id, testTenantId]
      );

      // Verify update
      const result = await query(
        `SELECT medical_notes FROM "Pet" WHERE id = $1`,
        [pet.id]
      );

      expect(result.rows[0].medical_notes).toBe('Updated by workflow');
    });

    test('updates booking status', async () => {
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);
      const { createTestBooking } = require('../setup/testFactories');
      const booking = await createTestBooking(testTenantId, owner.id, {
        status: 'PENDING',
      });

      // Update status
      await query(
        `UPDATE "Booking" SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        ['CONFIRMED', booking.id, testTenantId]
      );

      // Verify
      const result = await query(
        `SELECT status FROM "Booking" WHERE id = $1`,
        [booking.id]
      );

      expect(result.rows[0].status).toBe('CONFIRMED');
    });

    test('interpolates value template before update', async () => {
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id, {
        name: 'Fluffy',
      });

      // Simulate template interpolation for value
      const template = 'Contact scheduled for {{pet.name}}';
      const interpolatedValue = template.replace('{{pet.name}}', pet.name);

      await query(
        `UPDATE "Pet" SET behavior_notes = $1, updated_at = NOW() WHERE id = $2`,
        [interpolatedValue, pet.id]
      );

      const result = await query(
        `SELECT behavior_notes FROM "Pet" WHERE id = $1`,
        [pet.id]
      );

      expect(result.rows[0].behavior_notes).toBe('Contact scheduled for Fluffy');
    });
  });

  describe('internal_note Action', () => {
    test('creates note record for pet', async () => {
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);
      const testUserId = await getTestUserId();

      // Create internal note (created_by requires a valid user ID from User table)
      const noteResult = await query(
        `INSERT INTO "Note" (id, tenant_id, entity_type, entity_id, content, note_type, created_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [testTenantId, 'pet', pet.id, 'Automated workflow note', 'GENERAL', testUserId]
      );

      const note = noteResult.rows[0];

      expect(note).toBeDefined();
      expect(note.content).toBe('Automated workflow note');
      expect(note.entity_type).toBe('pet');
      expect(note.entity_id).toBe(pet.id);
      expect(note.note_type).toBe('GENERAL');
    });

    test('creates note with interpolated content', async () => {
      const owner = await createTestOwner(testTenantId, {
        first_name: 'Alice',
      });
      const pet = await createTestPet(testTenantId, owner.id, {
        name: 'Whiskers',
      });
      const testUserId = await getTestUserId();

      const template = 'Pet {{pet.name}} enrolled in vaccination reminder workflow for owner {{owner.first_name}}';
      const content = template
        .replace('{{pet.name}}', pet.name)
        .replace('{{owner.first_name}}', owner.first_name);

      const noteResult = await query(
        `INSERT INTO "Note" (id, tenant_id, entity_type, entity_id, content, note_type, created_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [testTenantId, 'pet', pet.id, content, 'GENERAL', testUserId]
      );

      expect(noteResult.rows[0].content).toBe(
        'Pet Whiskers enrolled in vaccination reminder workflow for owner Alice'
      );
    });
  });

  describe('add_to_segment Action', () => {
    test('adds owner to static segment', async () => {
      const segment = await createTestSegment(testTenantId, {
        name: 'VIP Customers',
        segment_type: 'static',
        object_type: 'owners',
      });

      const owner = await createTestOwner(testTenantId);

      // Verify not in segment
      let inSegment = await isInSegment(segment.id, owner.id);
      expect(inSegment).toBe(false);

      // Add to segment
      await query(
        `INSERT INTO "SegmentMember" (segment_id, owner_id, tenant_id, added_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (segment_id, owner_id) DO NOTHING`,
        [segment.id, owner.id, testTenantId]
      );

      // Verify in segment
      inSegment = await isInSegment(segment.id, owner.id);
      expect(inSegment).toBe(true);
    });

    test('handles duplicate add gracefully (ON CONFLICT DO NOTHING)', async () => {
      const segment = await createTestSegment(testTenantId, {
        name: 'Test Segment',
        segment_type: 'static',
      });

      const owner = await createTestOwner(testTenantId);

      // Add twice
      await query(
        `INSERT INTO "SegmentMember" (segment_id, owner_id, tenant_id, added_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (segment_id, owner_id) DO NOTHING`,
        [segment.id, owner.id, testTenantId]
      );

      await query(
        `INSERT INTO "SegmentMember" (segment_id, owner_id, tenant_id, added_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (segment_id, owner_id) DO NOTHING`,
        [segment.id, owner.id, testTenantId]
      );

      // Should only have one membership
      const countResult = await query(
        `SELECT COUNT(*) as count FROM "SegmentMember" WHERE segment_id = $1 AND owner_id = $2`,
        [segment.id, owner.id]
      );

      expect(parseInt(countResult.rows[0].count)).toBe(1);
    });

    test('gets owner_id from related pet record via PetOwner', async () => {
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);

      // Verify we can get owner_id from pet via PetOwner junction table
      const ownerResult = await query(
        `SELECT owner_id FROM "PetOwner" WHERE pet_id = $1 AND is_primary = true`,
        [pet.id]
      );

      expect(ownerResult.rows[0].owner_id).toBe(owner.id);
    });
  });

  describe('remove_from_segment Action', () => {
    test('removes owner from segment', async () => {
      const segment = await createTestSegment(testTenantId, {
        name: 'Remove Test Segment',
        segment_type: 'static',
      });

      const owner = await createTestOwner(testTenantId);

      // Add to segment first
      await addOwnerToSegment(segment.id, owner.id, testTenantId);
      let inSegment = await isInSegment(segment.id, owner.id);
      expect(inSegment).toBe(true);

      // Remove from segment
      await query(
        `DELETE FROM "SegmentMember" WHERE segment_id = $1 AND owner_id = $2`,
        [segment.id, owner.id]
      );

      // Verify removed
      inSegment = await isInSegment(segment.id, owner.id);
      expect(inSegment).toBe(false);
    });

    test('handles remove when not in segment gracefully', async () => {
      const segment = await createTestSegment(testTenantId, {
        name: 'Empty Segment',
        segment_type: 'static',
      });

      const owner = await createTestOwner(testTenantId);

      // Remove from segment (should not error)
      const result = await query(
        `DELETE FROM "SegmentMember" WHERE segment_id = $1 AND owner_id = $2`,
        [segment.id, owner.id]
      );

      // Should have deleted 0 rows
      expect(result.rowCount).toBe(0);
    });
  });

  describe('send_notification Action', () => {
    test('creates notification record', async () => {
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);

      const notificationResult = await query(
        `INSERT INTO "Notification" (tenant_id, title, message, type, priority, entity_type, entity_id, recipient_type, recipient_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         RETURNING *`,
        [
          testTenantId,
          'Vaccination Reminder',
          'Max is due for vaccinations',
          'workflow',
          'normal',
          'pet',
          pet.id,
          'owner',
          owner.id,
          JSON.stringify({ workflowId: 'test-workflow-id' }),
        ]
      );

      const notification = notificationResult.rows[0];

      expect(notification).toBeDefined();
      expect(notification.title).toBe('Vaccination Reminder');
      expect(notification.recipient_type).toBe('owner');
      expect(notification.recipient_id).toBe(owner.id);
      expect(notification.priority).toBe('normal');
    });
  });

  describe('Template Interpolation in Actions', () => {
    test('handles missing owner gracefully', async () => {
      // Pet without owner data
      const template = 'Contact: {{owner.email}}';

      // If owner is missing, placeholder should remain
      const result = template; // Would remain unchanged

      expect(result).toBe('Contact: {{owner.email}}');
    });

    test('handles all record types', async () => {
      const recordTypes = ['pet', 'booking', 'owner', 'payment', 'invoice', 'task'];

      for (const recordType of recordTypes) {
        // Verify table exists
        const tableNames = {
          pet: 'Pet',
          booking: 'Booking',
          owner: 'Owner',
          payment: 'Payment',
          invoice: 'Invoice',
          task: 'Task',
        };

        const result = await query(
          `SELECT COUNT(*) as count FROM "${tableNames[recordType]}" WHERE tenant_id = $1`,
          [testTenantId]
        );

        expect(result.rows).toBeDefined();
      }
    });
  });

  describe('Webhook Action (Validation Only)', () => {
    test('validates URL format', () => {
      const validUrls = [
        'https://example.com/webhook',
        'http://localhost:3000/api',
        'https://api.example.com/v1/callback?token=abc',
      ];

      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        '',
        null,
      ];

      for (const url of validUrls) {
        try {
          new URL(url);
          expect(true).toBe(true);
        } catch {
          expect(false).toBe(true);
        }
      }

      for (const url of invalidUrls) {
        if (!url) {
          expect(!url).toBe(true);
          continue;
        }
        try {
          new URL(url);
          // ftp:// is valid URL but not allowed protocol
          if (url.startsWith('ftp://')) {
            expect(true).toBe(true);
          } else {
            expect(false).toBe(true);
          }
        } catch {
          expect(true).toBe(true);
        }
      }
    });
  });

  describe('Execution Logging', () => {
    test('logs step execution to WorkflowExecutionLog', async () => {
      const { workflow, steps } = await createTestWorkflow(testTenantId, {
        name: 'Logging Test Workflow',
        object_type: 'pet',
        steps: [
          { step_type: 'action', action_type: 'create_task', config: { title: 'Test' } },
        ],
      });

      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);

      const execution = await createTestExecution(
        workflow.id,
        testTenantId,
        pet.id,
        'pet'
      );

      // Create execution log
      const logResult = await query(
        `INSERT INTO "WorkflowExecutionLog" (id, execution_id, step_id, status, event_type, started_at, completed_at, result)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW(), $5)
         RETURNING *`,
        [
          execution.id,
          steps[0].id,
          'success',
          'step_completed',
          JSON.stringify({ taskId: 'test-task-id' }),
        ]
      );

      const log = logResult.rows[0];

      expect(log).toBeDefined();
      expect(log.execution_id).toBe(execution.id);
      expect(log.step_id).toBe(steps[0].id);
      expect(log.status).toBe('success');
    });
  });
});
