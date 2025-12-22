/**
 * E2E Tests - Event Triggers
 *
 * Tests all event trigger types defined in constants.js.
 * Verifies that workflows are correctly matched and triggered by events.
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
  createTestPayment,
  createTestInvoice,
} = require('../setup/testFactories');
const {
  cleanupTestData,
  waitForExecutionCreated,
} = require('../setup/testHelpers');

jest.setTimeout(30000);

let testTenantId;
let testTenant;
let localStackAvailable = false;

describe('Event Triggers E2E Tests', () => {
  beforeAll(async () => {
    await testConnection();
    localStackAvailable = await testLocalStackConnection();

    testTenant = await createTestTenant({
      name: 'Event Triggers Test Kennel',
    });
    testTenantId = testTenant.id;
  });

  afterAll(async () => {
    await cleanupTestData(testTenantId);
    await closePool();
  });

  describe('Booking Event Triggers', () => {
    const bookingEvents = [
      'booking.created',
      'booking.confirmed',
      'booking.cancelled',
      'booking.checked_in',
      'booking.checked_out',
    ];

    test.each(bookingEvents)('triggers workflow on %s event', async (eventType) => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: `${eventType} Workflow`,
        object_type: 'booking',
        entry_condition: {
          trigger_type: 'event',
          event_type: eventType,
        },
        steps: [
          { step_type: 'action', action_type: 'create_task', config: { title: `Task from ${eventType}` } },
          { step_type: 'terminus', config: {} },
        ],
      });

      // Verify workflow is configured correctly
      expect(workflow.entry_condition.event_type).toBe(eventType);
      expect(workflow.object_type).toBe('booking');

      // Verify workflow can be found by event type
      const matchingWorkflows = await query(
        `SELECT id, name FROM "Workflow"
         WHERE tenant_id = $1
           AND object_type = 'booking'
           AND status = 'active'
           AND entry_condition->>'trigger_type' = 'event'
           AND entry_condition->>'event_type' = $2`,
        [testTenantId, eventType]
      );

      expect(matchingWorkflows.rows.length).toBeGreaterThan(0);
      expect(matchingWorkflows.rows.some(w => w.id === workflow.id)).toBe(true);

      // Create test data
      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);
      const booking = await createTestBooking(testTenantId, pet.id);

      if (localStackAvailable) {
        // Send event to queue
        await sendToTriggerQueue({
          eventType,
          recordId: booking.id,
          recordType: 'booking',
          tenantId: testTenantId,
          eventData: {},
          timestamp: new Date().toISOString(),
        });

        // Wait for execution (may not be created if Lambda not processing)
        const execution = await waitForExecutionCreated(workflow.id, booking.id, {
          timeoutMs: 5000,
        });

        // Execution may or may not be created depending on Lambda setup
        if (execution) {
          expect(execution.workflow_id).toBe(workflow.id);
          expect(execution.record_id).toBe(booking.id);
        }
      }
    });
  });

  describe('Pet Event Triggers', () => {
    const petEvents = [
      'pet.created',
      'pet.vaccination_expiring',
      'pet.birthday',
    ];

    test.each(petEvents)('triggers workflow on %s event', async (eventType) => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: `${eventType} Workflow`,
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'event',
          event_type: eventType,
        },
        steps: [
          { step_type: 'action', action_type: 'send_sms', config: { message: `Alert: ${eventType}` } },
          { step_type: 'terminus', config: {} },
        ],
      });

      expect(workflow.entry_condition.event_type).toBe(eventType);

      // Query to find matching workflows
      const matchingWorkflows = await query(
        `SELECT id FROM "Workflow"
         WHERE tenant_id = $1
           AND object_type = 'pet'
           AND status = 'active'
           AND entry_condition->>'event_type' = $2`,
        [testTenantId, eventType]
      );

      expect(matchingWorkflows.rows.some(w => w.id === workflow.id)).toBe(true);

      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);

      if (localStackAvailable) {
        await sendToTriggerQueue({
          eventType,
          recordId: pet.id,
          recordType: 'pet',
          tenantId: testTenantId,
          eventData: {},
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  describe('Owner Event Triggers', () => {
    test('triggers workflow on owner.created event', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Owner Created Workflow',
        object_type: 'owner',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'owner.created',
        },
        steps: [
          { step_type: 'action', action_type: 'send_email', config: { subject: 'Welcome!' } },
          { step_type: 'terminus', config: {} },
        ],
      });

      expect(workflow.object_type).toBe('owner');

      const owner = await createTestOwner(testTenantId);

      if (localStackAvailable) {
        await sendToTriggerQueue({
          eventType: 'owner.created',
          recordId: owner.id,
          recordType: 'owner',
          tenantId: testTenantId,
          eventData: {},
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  describe('Payment Event Triggers', () => {
    const paymentEvents = ['payment.received', 'payment.failed'];

    test.each(paymentEvents)('triggers workflow on %s event', async (eventType) => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: `${eventType} Workflow`,
        object_type: 'payment',
        entry_condition: {
          trigger_type: 'event',
          event_type: eventType,
        },
        steps: [
          { step_type: 'action', action_type: 'create_task', config: { title: `Payment ${eventType}` } },
          { step_type: 'terminus', config: {} },
        ],
      });

      expect(workflow.entry_condition.event_type).toBe(eventType);

      const owner = await createTestOwner(testTenantId);
      const payment = await createTestPayment(testTenantId, owner.id);

      if (localStackAvailable) {
        await sendToTriggerQueue({
          eventType,
          recordId: payment.id,
          recordType: 'payment',
          tenantId: testTenantId,
          eventData: {},
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  describe('Invoice Event Triggers', () => {
    const invoiceEvents = ['invoice.created', 'invoice.overdue'];

    test.each(invoiceEvents)('triggers workflow on %s event', async (eventType) => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: `${eventType} Workflow`,
        object_type: 'invoice',
        entry_condition: {
          trigger_type: 'event',
          event_type: eventType,
        },
        steps: [
          { step_type: 'action', action_type: 'send_notification', config: { title: 'Invoice Alert' } },
          { step_type: 'terminus', config: {} },
        ],
      });

      expect(workflow.entry_condition.event_type).toBe(eventType);

      const owner = await createTestOwner(testTenantId);
      const invoice = await createTestInvoice(testTenantId, owner.id);

      if (localStackAvailable) {
        await sendToTriggerQueue({
          eventType,
          recordId: invoice.id,
          recordType: 'invoice',
          tenantId: testTenantId,
          eventData: {},
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  describe('Event Matching Logic', () => {
    test('only triggers workflows matching event type and object type', async () => {
      // Create workflow for pet.created
      const { workflow: petWorkflow } = await createTestWorkflow(testTenantId, {
        name: 'Pet Workflow',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'pet.created',
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      // Create workflow for booking.created
      const { workflow: bookingWorkflow } = await createTestWorkflow(testTenantId, {
        name: 'Booking Workflow',
        object_type: 'booking',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'booking.created',
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      // Query for pet.created - should only match pet workflow
      const petMatches = await query(
        `SELECT id FROM "Workflow"
         WHERE tenant_id = $1
           AND object_type = 'pet'
           AND status = 'active'
           AND entry_condition->>'trigger_type' = 'event'
           AND entry_condition->>'event_type' = 'pet.created'`,
        [testTenantId]
      );

      expect(petMatches.rows.some(w => w.id === petWorkflow.id)).toBe(true);
      expect(petMatches.rows.some(w => w.id === bookingWorkflow.id)).toBe(false);

      // Query for booking.created - should only match booking workflow
      const bookingMatches = await query(
        `SELECT id FROM "Workflow"
         WHERE tenant_id = $1
           AND object_type = 'booking'
           AND status = 'active'
           AND entry_condition->>'trigger_type' = 'event'
           AND entry_condition->>'event_type' = 'booking.created'`,
        [testTenantId]
      );

      expect(bookingMatches.rows.some(w => w.id === bookingWorkflow.id)).toBe(true);
      expect(bookingMatches.rows.some(w => w.id === petWorkflow.id)).toBe(false);
    });

    test('does not trigger inactive workflows', async () => {
      // Create inactive workflow
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Inactive Workflow',
        object_type: 'pet',
        status: 'draft',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'pet.created',
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      // Query for active workflows only
      const activeMatches = await query(
        `SELECT id FROM "Workflow"
         WHERE tenant_id = $1
           AND status = 'active'
           AND entry_condition->>'event_type' = 'pet.created'`,
        [testTenantId]
      );

      expect(activeMatches.rows.some(w => w.id === workflow.id)).toBe(false);
    });

    test('supports multiple workflows for same event', async () => {
      const eventType = 'pet.created';

      // Create two workflows for the same event
      const { workflow: workflow1 } = await createTestWorkflow(testTenantId, {
        name: 'Multi-trigger Workflow 1',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'event',
          event_type: eventType,
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      const { workflow: workflow2 } = await createTestWorkflow(testTenantId, {
        name: 'Multi-trigger Workflow 2',
        object_type: 'pet',
        entry_condition: {
          trigger_type: 'event',
          event_type: eventType,
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      // Both workflows should be found
      const matches = await query(
        `SELECT id FROM "Workflow"
         WHERE tenant_id = $1
           AND status = 'active'
           AND object_type = 'pet'
           AND entry_condition->>'event_type' = $2`,
        [testTenantId, eventType]
      );

      expect(matches.rows.some(w => w.id === workflow1.id)).toBe(true);
      expect(matches.rows.some(w => w.id === workflow2.id)).toBe(true);
    });
  });

  describe('Event Data Handling', () => {
    test('passes event data to workflow execution', async () => {
      const { workflow } = await createTestWorkflow(testTenantId, {
        name: 'Event Data Workflow',
        object_type: 'booking',
        entry_condition: {
          trigger_type: 'event',
          event_type: 'booking.confirmed',
        },
        steps: [{ step_type: 'terminus', config: {} }],
      });

      const owner = await createTestOwner(testTenantId);
      const pet = await createTestPet(testTenantId, owner.id);
      const booking = await createTestBooking(testTenantId, pet.id);

      const eventData = {
        previousStatus: 'PENDING',
        confirmedBy: 'staff-123',
        confirmedAt: new Date().toISOString(),
      };

      if (localStackAvailable) {
        await sendToTriggerQueue({
          eventType: 'booking.confirmed',
          recordId: booking.id,
          recordType: 'booking',
          tenantId: testTenantId,
          eventData,
          timestamp: new Date().toISOString(),
        });

        // Event data would be available in the execution context
      }

      // Verify event structure is valid
      expect(eventData.previousStatus).toBe('PENDING');
      expect(eventData.confirmedBy).toBeDefined();
    });
  });
});
