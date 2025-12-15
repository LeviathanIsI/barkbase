/**
 * =============================================================================
 * BarkBase Workflow Events Publisher
 * =============================================================================
 *
 * Publishes domain events to the workflow trigger queue for automatic workflow
 * enrollment. Call this from service handlers when events occur (booking created,
 * pet updated, payment received, etc.).
 *
 * =============================================================================
 */

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

// Initialize SQS client
const sqs = new SQSClient({
  region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
});

// Get queue URL from environment
const TRIGGER_QUEUE_URL = process.env.WORKFLOW_TRIGGER_QUEUE_URL;

/**
 * All supported workflow event types
 */
const WORKFLOW_EVENT_TYPES = {
  // Booking events
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_MODIFIED: 'booking.modified',
  BOOKING_CHECKED_IN: 'booking.checked_in',
  BOOKING_CHECKED_OUT: 'booking.checked_out',

  // Pet events
  PET_CREATED: 'pet.created',
  PET_UPDATED: 'pet.updated',
  PET_VACCINATION_EXPIRING: 'pet.vaccination_expiring',
  PET_VACCINATION_EXPIRED: 'pet.vaccination_expired',
  PET_BIRTHDAY: 'pet.birthday',

  // Owner events
  OWNER_CREATED: 'owner.created',
  OWNER_UPDATED: 'owner.updated',

  // Payment events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_OVERDUE: 'invoice.overdue',
  INVOICE_PAID: 'invoice.paid',

  // Task events
  TASK_CREATED: 'task.created',
  TASK_ASSIGNED: 'task.assigned',
  TASK_COMPLETED: 'task.completed',
  TASK_OVERDUE: 'task.overdue',

  // Workflow-triggered events
  WORKFLOW_ENROLL_ACTION: 'workflow.enroll_action',
};

/**
 * Record types for workflow enrollments
 */
const RECORD_TYPES = {
  PET: 'pet',
  BOOKING: 'booking',
  OWNER: 'owner',
  PAYMENT: 'payment',
  INVOICE: 'invoice',
  TASK: 'task',
};

/**
 * Publish a domain event that may trigger workflows
 *
 * @param {string} eventType - Event type (e.g., 'booking.created', 'pet.vaccination_expiring')
 * @param {string} recordId - UUID of the record that triggered the event
 * @param {string} recordType - Type of record ('pet', 'booking', 'owner', etc.)
 * @param {string} tenantId - Tenant UUID
 * @param {object} eventData - Additional event-specific data (optional)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function publishWorkflowEvent(eventType, recordId, recordType, tenantId, eventData = {}) {
  // Skip if queue URL not configured (local development or not deployed yet)
  if (!TRIGGER_QUEUE_URL) {
    console.warn('[WorkflowEvents] WORKFLOW_TRIGGER_QUEUE_URL not set, skipping event publish');
    return { success: false, error: 'Queue URL not configured' };
  }

  // Validate required parameters
  if (!eventType || !recordId || !recordType || !tenantId) {
    console.error('[WorkflowEvents] Missing required parameters:', {
      eventType: !!eventType,
      recordId: !!recordId,
      recordType: !!recordType,
      tenantId: !!tenantId,
    });
    return { success: false, error: 'Missing required parameters' };
  }

  const message = {
    eventType,
    recordId,
    recordType,
    tenantId,
    eventData,
    timestamp: new Date().toISOString(),
    source: 'barkbase-service',
  };

  try {
    const result = await sqs.send(new SendMessageCommand({
      QueueUrl: TRIGGER_QUEUE_URL,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: eventType,
        },
        recordType: {
          DataType: 'String',
          StringValue: recordType,
        },
        tenantId: {
          DataType: 'String',
          StringValue: tenantId,
        },
      },
    }));

    console.log(`[WorkflowEvents] Published event: ${eventType} for ${recordType}:${recordId}`, {
      messageId: result.MessageId,
      tenantId,
    });

    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error('[WorkflowEvents] Failed to publish event:', {
      eventType,
      recordId,
      recordType,
      tenantId,
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Publish multiple events in batch (for efficiency)
 *
 * @param {Array<{eventType, recordId, recordType, tenantId, eventData?}>} events - Array of events
 * @returns {Promise<{success: number, failed: number, results: Array}>}
 */
async function publishWorkflowEventBatch(events) {
  const results = await Promise.allSettled(
    events.map(event =>
      publishWorkflowEvent(
        event.eventType,
        event.recordId,
        event.recordType,
        event.tenantId,
        event.eventData || {}
      )
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;

  return {
    success: successful,
    failed,
    results: results.map((r, i) => ({
      eventType: events[i].eventType,
      recordId: events[i].recordId,
      success: r.status === 'fulfilled' && r.value.success,
      messageId: r.status === 'fulfilled' ? r.value.messageId : undefined,
      error: r.status === 'rejected' ? r.reason.message : (r.value?.error || undefined),
    })),
  };
}

// ============================================================================
// Convenience functions for specific events
// ============================================================================

/**
 * Publish booking created event
 */
async function publishBookingCreated(booking, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.BOOKING_CREATED,
    booking.id,
    RECORD_TYPES.BOOKING,
    tenantId,
    {
      serviceType: booking.service_type,
      petId: booking.pet_id,
      ownerId: booking.owner_id,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      status: booking.status,
    }
  );
}

/**
 * Publish booking confirmed event
 */
async function publishBookingConfirmed(booking, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.BOOKING_CONFIRMED,
    booking.id,
    RECORD_TYPES.BOOKING,
    tenantId,
    {
      petId: booking.pet_id,
      ownerId: booking.owner_id,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
    }
  );
}

/**
 * Publish booking checked-in event
 */
async function publishBookingCheckedIn(booking, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.BOOKING_CHECKED_IN,
    booking.id,
    RECORD_TYPES.BOOKING,
    tenantId,
    {
      petId: booking.pet_id,
      ownerId: booking.owner_id,
      checkInTime: booking.checked_in_at || new Date().toISOString(),
      checkedInBy: booking.checked_in_by,
    }
  );
}

/**
 * Publish booking checked-out event
 */
async function publishBookingCheckedOut(booking, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.BOOKING_CHECKED_OUT,
    booking.id,
    RECORD_TYPES.BOOKING,
    tenantId,
    {
      petId: booking.pet_id,
      ownerId: booking.owner_id,
      checkOutTime: booking.checked_out_at || new Date().toISOString(),
      checkedOutBy: booking.checked_out_by,
    }
  );
}

/**
 * Publish booking cancelled event
 */
async function publishBookingCancelled(booking, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.BOOKING_CANCELLED,
    booking.id,
    RECORD_TYPES.BOOKING,
    tenantId,
    {
      petId: booking.pet_id,
      ownerId: booking.owner_id,
      cancellationReason: booking.cancellation_reason,
    }
  );
}

/**
 * Publish pet created event
 */
async function publishPetCreated(pet, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.PET_CREATED,
    pet.id,
    RECORD_TYPES.PET,
    tenantId,
    {
      name: pet.name,
      ownerId: pet.owner_id,
      species: pet.species,
      breed: pet.breed,
    }
  );
}

/**
 * Publish pet updated event
 */
async function publishPetUpdated(pet, tenantId, changedFields = []) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.PET_UPDATED,
    pet.id,
    RECORD_TYPES.PET,
    tenantId,
    {
      ownerId: pet.owner_id,
      changedFields,
    }
  );
}

/**
 * Publish pet vaccination expiring event
 */
async function publishPetVaccinationExpiring(pet, tenantId, daysUntilExpiry, expiryDate) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.PET_VACCINATION_EXPIRING,
    pet.id,
    RECORD_TYPES.PET,
    tenantId,
    {
      name: pet.name,
      ownerId: pet.owner_id,
      daysUntilExpiry,
      expiryDate,
      vaccinationStatus: pet.vaccination_status,
    }
  );
}

/**
 * Publish pet vaccination expired event
 */
async function publishPetVaccinationExpired(pet, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.PET_VACCINATION_EXPIRED,
    pet.id,
    RECORD_TYPES.PET,
    tenantId,
    {
      name: pet.name,
      ownerId: pet.owner_id,
      expiryDate: pet.vaccination_expiry_date,
    }
  );
}

/**
 * Publish pet birthday event
 */
async function publishPetBirthday(pet, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.PET_BIRTHDAY,
    pet.id,
    RECORD_TYPES.PET,
    tenantId,
    {
      name: pet.name,
      ownerId: pet.owner_id,
      dateOfBirth: pet.date_of_birth,
    }
  );
}

/**
 * Publish owner created event
 */
async function publishOwnerCreated(owner, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.OWNER_CREATED,
    owner.id,
    RECORD_TYPES.OWNER,
    tenantId,
    {
      name: `${owner.first_name} ${owner.last_name}`.trim(),
      email: owner.email,
      phone: owner.phone,
    }
  );
}

/**
 * Publish payment received event
 */
async function publishPaymentReceived(payment, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.PAYMENT_RECEIVED,
    payment.id,
    RECORD_TYPES.PAYMENT,
    tenantId,
    {
      amount: payment.amount,
      method: payment.payment_method,
      invoiceId: payment.invoice_id,
      ownerId: payment.owner_id,
    }
  );
}

/**
 * Publish payment failed event
 */
async function publishPaymentFailed(payment, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.PAYMENT_FAILED,
    payment.id,
    RECORD_TYPES.PAYMENT,
    tenantId,
    {
      amount: payment.amount,
      method: payment.payment_method,
      invoiceId: payment.invoice_id,
      ownerId: payment.owner_id,
      errorMessage: payment.error_message,
    }
  );
}

/**
 * Publish invoice overdue event
 */
async function publishInvoiceOverdue(invoice, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.INVOICE_OVERDUE,
    invoice.id,
    RECORD_TYPES.INVOICE,
    tenantId,
    {
      amount: invoice.total_amount,
      dueDate: invoice.due_date,
      ownerId: invoice.owner_id,
      daysOverdue: invoice.days_overdue,
    }
  );
}

/**
 * Publish task created event
 */
async function publishTaskCreated(task, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.TASK_CREATED,
    task.id,
    RECORD_TYPES.TASK,
    tenantId,
    {
      title: task.title,
      taskType: task.task_type,
      priority: task.priority,
      assignedTo: task.assigned_to,
      dueAt: task.due_at,
    }
  );
}

/**
 * Publish task completed event
 */
async function publishTaskCompleted(task, tenantId) {
  return publishWorkflowEvent(
    WORKFLOW_EVENT_TYPES.TASK_COMPLETED,
    task.id,
    RECORD_TYPES.TASK,
    tenantId,
    {
      title: task.title,
      taskType: task.task_type,
      completedBy: task.completed_by,
      completedAt: task.completed_at,
    }
  );
}

module.exports = {
  // Core functions
  publishWorkflowEvent,
  publishWorkflowEventBatch,

  // Constants
  WORKFLOW_EVENT_TYPES,
  RECORD_TYPES,

  // Convenience functions - Bookings
  publishBookingCreated,
  publishBookingConfirmed,
  publishBookingCheckedIn,
  publishBookingCheckedOut,
  publishBookingCancelled,

  // Convenience functions - Pets
  publishPetCreated,
  publishPetUpdated,
  publishPetVaccinationExpiring,
  publishPetVaccinationExpired,
  publishPetBirthday,

  // Convenience functions - Owners
  publishOwnerCreated,

  // Convenience functions - Payments
  publishPaymentReceived,
  publishPaymentFailed,

  // Convenience functions - Invoices
  publishInvoiceOverdue,

  // Convenience functions - Tasks
  publishTaskCreated,
  publishTaskCompleted,
};
