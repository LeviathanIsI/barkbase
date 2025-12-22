/**
 * Test Data Factories
 *
 * Factory functions to create realistic test data in the database.
 * Each factory creates actual records and returns the created objects.
 *
 * IMPORTANT: All tables use record_id (bigint) as primary key, NOT uuid.
 * Use getNextRecordId() to generate record_ids.
 */

const { query } = require('./testDatabase');

/**
 * Object type codes for the record_id system
 * Must match aws/layers/db-layer/nodejs/db.js OBJECT_TYPE_CODES
 */
const OBJECT_TYPE_CODES = {
  Owner: 1,
  Pet: 2,
  Booking: 3,
  Payment: 4,
  Invoice: 5,
  InvoiceLine: 6,
  Task: 7,
  Note: 8,
  Vaccination: 9,
  Incident: 10,
  Workflow: 20,
  WorkflowStep: 21,
  WorkflowExecution: 22,
  Service: 30,
  Package: 31,
  Run: 40,
  Kennel: 41,
  RunAssignment: 43,
  User: 50,
  Role: 52,
  UserRole: 53,
  TimeEntry: 55,
  Conversation: 60,
  Message: 61,
  Notification: 62,
  Segment: 27,
  SegmentMember: 28,
  AuditLog: 90,
};

/**
 * Get the next record_id for a table using the database function
 * @param {string} tenantId - Tenant UUID
 * @param {string} tableName - Table name (e.g., "User", "Owner")
 * @returns {Promise<number>} Next record_id
 */
async function getNextRecordId(tenantId, tableName) {
  const objectTypeCode = OBJECT_TYPE_CODES[tableName];
  if (!objectTypeCode) {
    throw new Error(`Unknown table "${tableName}" - not registered in OBJECT_TYPE_CODES`);
  }

  const result = await query(
    'SELECT next_record_id($1, $2) as record_id',
    [tenantId, objectTypeCode]
  );

  return result.rows[0].record_id;
}

/**
 * Generate a valid UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a unique account code
 */
function generateAccountCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Simple random generators
const FIRST_NAMES = ['John', 'Jane', 'Bob', 'Alice', 'Charlie'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
const PET_NAMES = ['Max', 'Buddy', 'Charlie', 'Cooper', 'Rocky'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create a test tenant
 * Tenant table schema: id (uuid), name, slug, account_code (required), plan, feature_flags, created_at, updated_at
 */
async function createTestTenant(overrides = {}) {
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const tenantData = {
    id: overrides.id || generateUUID(),
    name: overrides.name || `Test Kennel ${Date.now()}`,
    slug: overrides.slug || `test-kennel-${Date.now()}-${randomSuffix}`,
    account_code: overrides.account_code || generateAccountCode(),
    plan: overrides.plan || 'FREE',
  };

  const result = await query(
    `INSERT INTO "Tenant" (id, name, slug, account_code, plan, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [
      tenantData.id,
      tenantData.name,
      tenantData.slug,
      tenantData.account_code,
      tenantData.plan,
    ]
  );

  // Also create TenantSettings with defaults
  await query(
    `INSERT INTO "TenantSettings" (tenant_id)
     VALUES ($1)
     ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantData.id]
  );

  return result.rows[0];
}

/**
 * Create a test owner
 * Owner table uses record_id (bigint from getNextRecordId)
 */
async function createTestOwner(tenantId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Owner');

  const ownerData = {
    tenant_id: tenantId,
    record_id: recordId,
    first_name: overrides.first_name || overrides.firstName || randomElement(FIRST_NAMES),
    last_name: overrides.last_name || overrides.lastName || randomElement(LAST_NAMES),
    email: overrides.email || `test-${Date.now()}@example.com`,
    phone: overrides.phone || `+1${randomInt(2000000000, 9999999999)}`,
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
  };

  const result = await query(
    `INSERT INTO "Owner" (tenant_id, record_id, first_name, last_name, email, phone, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      ownerData.tenant_id,
      ownerData.record_id,
      ownerData.first_name,
      ownerData.last_name,
      ownerData.email,
      ownerData.phone,
      ownerData.is_active,
    ]
  );

  return result.rows[0];
}

/**
 * Create a test pet
 * Pet table uses record_id (bigint from getNextRecordId)
 * ownerRecordId should be owner.record_id (bigint)
 */
async function createTestPet(tenantId, ownerRecordId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Pet');

  const petData = {
    tenant_id: tenantId,
    record_id: recordId,
    name: overrides.name || randomElement(PET_NAMES),
    species: overrides.species || 'DOG',
    breed: overrides.breed || 'Labrador Retriever',
    gender: overrides.gender || 'MALE',
    weight: overrides.weight || randomInt(10, 100),
    status: overrides.status || 'ACTIVE',
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    medical_notes: overrides.medical_notes || overrides.medicalNotes || null,
  };

  const result = await query(
    `INSERT INTO "Pet" (tenant_id, record_id, name, species, breed, gender, weight, status, is_active, medical_notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      petData.tenant_id,
      petData.record_id,
      petData.name,
      petData.species,
      petData.breed,
      petData.gender,
      petData.weight,
      petData.status,
      petData.is_active,
      petData.medical_notes,
    ]
  );

  const pet = result.rows[0];

  // Link pet to owner via PetOwner junction table
  if (ownerRecordId) {
    await query(
      `INSERT INTO "PetOwner" (tenant_id, pet_id, owner_id, is_primary, created_at)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, pet.record_id, ownerRecordId]
    );
    pet.owner_record_id = ownerRecordId;
  }

  return pet;
}

/**
 * Create a test service
 * Service table uses record_id (bigint from getNextRecordId)
 */
async function createTestService(tenantId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Service');

  const serviceData = {
    tenant_id: tenantId,
    record_id: recordId,
    name: overrides.name || `Test Service ${Date.now()}`,
    description: overrides.description || 'Test service for workflow testing',
    category: overrides.category || 'BOARDING',
    price_in_cents: overrides.price_in_cents || randomInt(2500, 25000),
    duration_minutes: overrides.duration_minutes || 60,
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
  };

  const result = await query(
    `INSERT INTO "Service" (tenant_id, record_id, name, description, category, price_in_cents, duration_minutes, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [
      serviceData.tenant_id,
      serviceData.record_id,
      serviceData.name,
      serviceData.description,
      serviceData.category,
      serviceData.price_in_cents,
      serviceData.duration_minutes,
      serviceData.is_active,
    ]
  );

  return result.rows[0];
}

/**
 * Create a test booking
 * Booking table uses record_id (bigint from getNextRecordId)
 * owner_id and service_id are bigint record_ids
 */
async function createTestBooking(tenantId, ownerRecordId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Booking');

  // Create a service if not provided
  let serviceRecordId = overrides.service_id;
  if (!serviceRecordId) {
    const service = await createTestService(tenantId);
    serviceRecordId = service.record_id;
  }

  const checkIn = overrides.check_in || new Date(Date.now() + randomInt(1, 30) * 24 * 60 * 60 * 1000);
  const checkOut = overrides.check_out || new Date(checkIn.getTime() + 3 * 24 * 60 * 60 * 1000);

  const bookingData = {
    tenant_id: tenantId,
    record_id: recordId,
    owner_id: ownerRecordId,
    service_id: serviceRecordId,
    status: overrides.status || 'PENDING',
    check_in: checkIn,
    check_out: checkOut,
    total_price_cents: overrides.total_price_cents || randomInt(5000, 50000),
    deposit_cents: overrides.deposit_cents || 0,
    notes: overrides.notes || null,
    special_instructions: overrides.special_instructions || null,
  };

  const result = await query(
    `INSERT INTO "Booking" (tenant_id, record_id, owner_id, service_id, status, check_in, check_out, total_price_cents, deposit_cents, notes, special_instructions, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      bookingData.tenant_id,
      bookingData.record_id,
      bookingData.owner_id,
      bookingData.service_id,
      bookingData.status,
      bookingData.check_in,
      bookingData.check_out,
      bookingData.total_price_cents,
      bookingData.deposit_cents,
      bookingData.notes,
      bookingData.special_instructions,
    ]
  );

  return result.rows[0];
}

/**
 * Create a test workflow with steps
 * Workflow table uses record_id (bigint from getNextRecordId)
 */
async function createTestWorkflow(tenantId, config = {}) {
  const recordId = await getNextRecordId(tenantId, 'Workflow');

  const workflowData = {
    tenant_id: tenantId,
    record_id: recordId,
    name: config.name || `Test Workflow ${Date.now()}`,
    description: config.description || 'Test workflow for E2E testing',
    object_type: config.object_type || 'pet',
    status: config.status || 'active',
    entry_condition: config.entry_condition || {
      trigger_type: 'event',
      event_type: 'pet.created',
    },
    settings: config.settings || {
      allow_reenrollment: false,
      reenrollment_delay_days: 0,
    },
    goal_config: config.goal_config || null,
    suppression_segment_ids: config.suppression_segment_ids || [],
    revision: config.revision || 1,
    enrolled_count: 0,
    completed_count: 0,
    active_count: 0,
    failed_count: 0,
  };

  // Create workflow
  const workflowResult = await query(
    `INSERT INTO "Workflow" (tenant_id, record_id, name, description, object_type, status, entry_condition, settings, goal_config, suppression_segment_ids, revision, enrolled_count, completed_count, active_count, failed_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
     RETURNING *`,
    [
      workflowData.tenant_id,
      workflowData.record_id,
      workflowData.name,
      workflowData.description,
      workflowData.object_type,
      workflowData.status,
      JSON.stringify(workflowData.entry_condition),
      JSON.stringify(workflowData.settings),
      workflowData.goal_config ? JSON.stringify(workflowData.goal_config) : null,
      workflowData.suppression_segment_ids,
      workflowData.revision,
      workflowData.enrolled_count,
      workflowData.completed_count,
      workflowData.active_count,
      workflowData.failed_count,
    ]
  );

  const workflow = workflowResult.rows[0];

  // Create steps if provided
  const steps = [];
  if (config.steps && config.steps.length > 0) {
    for (let i = 0; i < config.steps.length; i++) {
      const stepConfig = config.steps[i];
      const stepRecordId = await getNextRecordId(tenantId, 'WorkflowStep');

      const stepResult = await query(
        `INSERT INTO "WorkflowStep" (record_id, step_type, action_type, config, position, parent_step_id, branch_path, name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [
          stepRecordId,
          stepConfig.step_type || 'action',
          stepConfig.action_type || null,
          JSON.stringify(stepConfig.config || {}),
          stepConfig.position !== undefined ? stepConfig.position : i,
          stepConfig.parent_step_id || null,
          stepConfig.branch_path || stepConfig.branch_id || null,
          stepConfig.name || null,
        ]
      );
      steps.push(stepResult.rows[0]);
    }
  }

  return { workflow, steps };
}

/**
 * Create a test segment
 * Segment table uses record_id (bigint from getNextRecordId)
 * Required columns: object_type, segment_type, filters
 */
async function createTestSegment(tenantId, config = {}) {
  const recordId = await getNextRecordId(tenantId, 'Segment');

  const segmentData = {
    tenant_id: tenantId,
    record_id: recordId,
    name: config.name || `Test Segment ${Date.now()}`,
    description: config.description || 'Test segment for E2E testing',
    object_type: config.object_type || 'owners',
    segment_type: config.segment_type || 'active',
    is_automatic: config.is_automatic || false,
    criteria: config.criteria || {},
    filters: config.filters || { groups: [], groupLogic: 'OR' },
    is_active: config.is_active !== undefined ? config.is_active : true,
  };

  const result = await query(
    `INSERT INTO "Segment" (tenant_id, record_id, name, description, object_type, segment_type, is_automatic, criteria, filters, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      segmentData.tenant_id,
      segmentData.record_id,
      segmentData.name,
      segmentData.description,
      segmentData.object_type,
      segmentData.segment_type,
      segmentData.is_automatic,
      JSON.stringify(segmentData.criteria),
      JSON.stringify(segmentData.filters),
      segmentData.is_active,
    ]
  );

  return result.rows[0];
}

/**
 * Add an owner to a segment
 * SegmentMember uses bigint record_ids for segment_id and owner_id
 */
async function addOwnerToSegment(segmentRecordId, ownerRecordId, tenantId) {
  const recordId = await getNextRecordId(tenantId, 'SegmentMember');

  await query(
    `INSERT INTO "SegmentMember" (tenant_id, record_id, segment_id, owner_id, added_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT DO NOTHING`,
    [tenantId, recordId, segmentRecordId, ownerRecordId]
  );
}

/**
 * Create a test payment
 * Payment table uses record_id (bigint from getNextRecordId)
 * owner_id and invoice_id are bigint record_ids
 */
async function createTestPayment(tenantId, ownerRecordId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Payment');

  const paymentData = {
    tenant_id: tenantId,
    record_id: recordId,
    owner_id: ownerRecordId,
    invoice_id: overrides.invoice_id || null,
    amount_cents: overrides.amount_cents || randomInt(5000, 50000),
    method: overrides.method || 'CARD',
    status: overrides.status || 'COMPLETED',
    notes: overrides.notes || null,
    processed_at: overrides.processed_at || new Date(),
  };

  const result = await query(
    `INSERT INTO "Payment" (tenant_id, record_id, owner_id, invoice_id, amount_cents, method, status, notes, processed_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING *`,
    [
      paymentData.tenant_id,
      paymentData.record_id,
      paymentData.owner_id,
      paymentData.invoice_id,
      paymentData.amount_cents,
      paymentData.method,
      paymentData.status,
      paymentData.notes,
      paymentData.processed_at,
    ]
  );

  return result.rows[0];
}

/**
 * Create a test invoice
 * Invoice table uses record_id (bigint from getNextRecordId)
 * owner_id is bigint record_id
 */
async function createTestInvoice(tenantId, ownerRecordId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Invoice');

  const subtotalCents = overrides.subtotal_cents || randomInt(5000, 50000);
  const taxCents = overrides.tax_cents || 0;
  const totalCents = overrides.total_cents || subtotalCents + taxCents;

  const invoiceData = {
    tenant_id: tenantId,
    record_id: recordId,
    owner_id: ownerRecordId,
    invoice_number: overrides.invoice_number || `INV-${Date.now()}`,
    status: overrides.status || 'SENT',
    subtotal_cents: subtotalCents,
    tax_cents: taxCents,
    discount_cents: overrides.discount_cents || 0,
    total_cents: totalCents,
    paid_cents: overrides.paid_cents || 0,
    due_date: overrides.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    notes: overrides.notes || null,
  };

  const result = await query(
    `INSERT INTO "Invoice" (tenant_id, record_id, owner_id, invoice_number, status, subtotal_cents, tax_cents, discount_cents, total_cents, paid_cents, due_date, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     RETURNING *`,
    [
      invoiceData.tenant_id,
      invoiceData.record_id,
      invoiceData.owner_id,
      invoiceData.invoice_number,
      invoiceData.status,
      invoiceData.subtotal_cents,
      invoiceData.tax_cents,
      invoiceData.discount_cents,
      invoiceData.total_cents,
      invoiceData.paid_cents,
      invoiceData.due_date,
      invoiceData.notes,
    ]
  );

  return result.rows[0];
}

/**
 * Create a workflow execution
 * WorkflowExecution table uses record_id (bigint from getNextRecordId)
 * workflow_id and enrolled_record_id are bigint record_ids
 */
async function createTestExecution(workflowRecordId, tenantId, enrolledRecordId, recordType, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'WorkflowExecution');

  const executionData = {
    tenant_id: tenantId,
    record_id: recordId,
    workflow_id: workflowRecordId,
    enrolled_record_id: enrolledRecordId,
    record_type: recordType,
    status: overrides.status || 'running',
    current_step_id: overrides.current_step_id || null,
    workflow_revision: overrides.workflow_revision || 1,
  };

  const result = await query(
    `INSERT INTO "WorkflowExecution" (tenant_id, record_id, workflow_id, enrolled_record_id, record_type, status, current_step_id, workflow_revision, enrolled_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING *`,
    [
      executionData.tenant_id,
      executionData.record_id,
      executionData.workflow_id,
      executionData.enrolled_record_id,
      executionData.record_type,
      executionData.status,
      executionData.current_step_id,
      executionData.workflow_revision,
    ]
  );

  return result.rows[0];
}

module.exports = {
  // Utilities
  getNextRecordId,
  generateUUID,
  generateAccountCode,
  OBJECT_TYPE_CODES,

  // Entity factories
  createTestTenant,
  createTestOwner,
  createTestPet,
  createTestService,
  createTestBooking,
  createTestWorkflow,
  createTestSegment,
  addOwnerToSegment,
  createTestPayment,
  createTestInvoice,
  createTestExecution,
};
