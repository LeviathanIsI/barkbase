/**
 * E2E Test Data Factories
 *
 * Factory functions to create realistic test data in the database.
 * Each factory creates actual records and returns the created objects.
 */

const { query, getNextRecordId } = require('./setup');

// =============================================================================
// RANDOM DATA GENERATORS
// =============================================================================

const FIRST_NAMES = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'William', 'Amanda'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const PET_NAMES = ['Max', 'Buddy', 'Charlie', 'Cooper', 'Rocky', 'Bear', 'Duke', 'Tucker', 'Jack', 'Bella'];
const BREEDS = ['Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'French Bulldog', 'Bulldog', 'Poodle', 'Beagle', 'Rottweiler'];
const CITIES = ['Austin', 'Dallas', 'Houston', 'San Antonio', 'Denver', 'Phoenix', 'Seattle', 'Portland'];
const STATES = ['TX', 'CO', 'AZ', 'WA', 'OR', 'CA', 'NY', 'FL'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomEmail() {
  return `test-${Date.now()}-${randomInt(1000, 9999)}@example.com`;
}

function randomPhone() {
  return `+1${randomInt(2000000000, 9999999999)}`;
}

function randomDate(daysFromNow = 30) {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, daysFromNow));
  return date;
}

function pastDate(daysAgo = 365) {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(1, daysAgo));
  return date;
}

// =============================================================================
// ENTITY FACTORIES
// =============================================================================

/**
 * Create an owner
 * Owner table uses record_id (bigint from getNextRecordId)
 */
async function createOwner(tenantId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Owner');

  const data = {
    tenant_id: tenantId,
    record_id: recordId,
    first_name: overrides.first_name || randomElement(FIRST_NAMES),
    last_name: overrides.last_name || randomElement(LAST_NAMES),
    email: overrides.email || randomEmail(),
    phone: overrides.phone || randomPhone(),
    address_street: overrides.address_street || `${randomInt(100, 9999)} Main St`,
    address_city: overrides.address_city || randomElement(CITIES),
    address_state: overrides.address_state || randomElement(STATES),
    address_zip: overrides.address_zip || String(randomInt(10000, 99999)),
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    notes: overrides.notes || null,
  };

  const result = await query(
    `INSERT INTO "Owner" (
      tenant_id, record_id, first_name, last_name, email, phone,
      address_street, address_city, address_state, address_zip,
      is_active, notes, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.first_name, data.last_name,
      data.email, data.phone, data.address_street, data.address_city,
      data.address_state, data.address_zip, data.is_active, data.notes,
    ]
  );

  return result.rows[0];
}

/**
 * Create a pet
 * Pet table uses record_id (bigint from getNextRecordId)
 * ownerRecordId should be owner.record_id (bigint)
 */
async function createPet(tenantId, ownerRecordId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Pet');

  const data = {
    tenant_id: tenantId,
    record_id: recordId,
    name: overrides.name || randomElement(PET_NAMES),
    species: overrides.species || 'DOG',
    breed: overrides.breed || randomElement(BREEDS),
    gender: overrides.gender || randomElement(['MALE', 'FEMALE']),
    color: overrides.color || 'Brown',
    weight: overrides.weight || randomInt(10, 100),
    date_of_birth: overrides.date_of_birth || pastDate(365 * 5),
    status: overrides.status || 'ACTIVE',
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    medical_notes: overrides.medical_notes || null,
    dietary_notes: overrides.dietary_notes || null,
    behavior_notes: overrides.behavior_notes || null,
  };

  const result = await query(
    `INSERT INTO "Pet" (
      tenant_id, record_id, name, species, breed, gender, color, weight,
      date_of_birth, status, is_active, medical_notes, dietary_notes, behavior_notes,
      created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.name, data.species,
      data.breed, data.gender, data.color, data.weight, data.date_of_birth,
      data.status, data.is_active, data.medical_notes, data.dietary_notes,
      data.behavior_notes,
    ]
  );

  const pet = result.rows[0];

  // Link pet to owner via PetOwner junction (uses bigint record_ids)
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
 * Create a vaccination record
 * Vaccination table uses record_id (bigint from getNextRecordId)
 * petRecordId should be pet.record_id (bigint)
 * Column is `type` not `vaccine_name`, no `verified` column
 */
async function createVaccination(tenantId, petRecordId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Vaccination');

  const data = {
    tenant_id: tenantId,
    record_id: recordId,
    pet_id: petRecordId,
    type: overrides.type || randomElement(['Rabies', 'DHPP', 'Bordetella', 'Leptospirosis']),
    administered_at: overrides.administered_at || pastDate(180),
    expires_at: overrides.expires_at || randomDate(180),
    notes: overrides.notes || null,
  };

  const result = await query(
    `INSERT INTO "Vaccination" (
      tenant_id, record_id, pet_id, type, administered_at, expires_at, notes,
      created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.pet_id, data.type,
      data.administered_at, data.expires_at, data.notes,
    ]
  );

  return result.rows[0];
}

// NOTE: Staff table does NOT exist - use User table with staff-related columns
// (position, department, hire_date, hourly_rate_cents, employment_type)

// NOTE: Facility table does NOT exist - use Run and Kennel tables instead

/**
 * Create a service
 * Service table uses record_id (bigint from getNextRecordId)
 */
async function createService(tenantId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Service');

  const data = {
    tenant_id: tenantId,
    record_id: recordId,
    name: overrides.name || `Service ${randomInt(1, 100)}`,
    description: overrides.description || 'Test service description',
    category: overrides.category || randomElement(['BOARDING', 'DAYCARE', 'GROOMING', 'TRAINING', 'ADD_ON']),
    price_in_cents: overrides.price_in_cents || randomInt(2500, 15000),
    duration_minutes: overrides.duration_minutes || randomInt(30, 480),
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
  };

  const result = await query(
    `INSERT INTO "Service" (
      tenant_id, record_id, name, description, category, price_in_cents,
      duration_minutes, is_active, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.name, data.description,
      data.category, data.price_in_cents, data.duration_minutes, data.is_active,
    ]
  );

  return result.rows[0];
}

/**
 * Create a booking
 * Booking table uses record_id (bigint from getNextRecordId)
 * ownerRecordId and serviceRecordId should be bigint record_ids
 */
async function createBooking(tenantId, ownerRecordId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Booking');

  // Create service if not provided
  let serviceRecordId = overrides.service_id;
  if (!serviceRecordId) {
    const service = await createService(tenantId);
    serviceRecordId = service.record_id;
  }

  const checkIn = overrides.check_in || randomDate(7);
  const checkOut = overrides.check_out || new Date(checkIn.getTime() + 3 * 24 * 60 * 60 * 1000);

  const data = {
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
    `INSERT INTO "Booking" (
      tenant_id, record_id, owner_id, service_id, status, check_in, check_out,
      total_price_cents, deposit_cents, notes, special_instructions, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.owner_id, data.service_id,
      data.status, data.check_in, data.check_out, data.total_price_cents,
      data.deposit_cents, data.notes, data.special_instructions,
    ]
  );

  return result.rows[0];
}

/**
 * Create a task
 * Task table uses record_id (bigint from getNextRecordId)
 * task_type is required, priority is integer (1-5, default 3), due_at not due_date
 * No owner_id column - uses pet_id, booking_id, assigned_to (all bigint)
 */
async function createTask(tenantId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Task');
  const TASK_TYPES = ['FEEDING', 'MEDICATION', 'GROOMING', 'EXERCISE', 'CLEANING', 'MAINTENANCE', 'OTHER'];

  const data = {
    tenant_id: tenantId,
    record_id: recordId,
    title: overrides.title || `Task ${randomInt(1, 1000)}`,
    description: overrides.description || 'Test task description',
    task_type: overrides.task_type || randomElement(TASK_TYPES),
    status: overrides.status || 'PENDING',
    priority: overrides.priority !== undefined ? overrides.priority : randomInt(1, 5),
    due_at: overrides.due_at || randomDate(7),
    assigned_to: overrides.assigned_to || null, // bigint user record_id
    pet_id: overrides.pet_id || null,           // bigint pet record_id
    booking_id: overrides.booking_id || null,   // bigint booking record_id
  };

  const result = await query(
    `INSERT INTO "Task" (
      tenant_id, record_id, title, description, task_type, status, priority,
      due_at, assigned_to, pet_id, booking_id, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.title, data.description, data.task_type,
      data.status, data.priority, data.due_at, data.assigned_to,
      data.pet_id, data.booking_id,
    ]
  );

  return result.rows[0];
}

/**
 * Create an incident
 * Incident table uses record_id (bigint from getNextRecordId)
 * incident_type and incident_date are required, description is NOT NULL
 */
async function createIncident(tenantId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Incident');
  const INCIDENT_TYPES = ['INJURY', 'ILLNESS', 'BEHAVIOR', 'ESCAPE', 'PROPERTY_DAMAGE', 'OTHER'];
  const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  const data = {
    tenant_id: tenantId,
    record_id: recordId,
    title: overrides.title || `Incident ${randomInt(1, 1000)}`,
    description: overrides.description || 'Test incident description',
    incident_type: overrides.incident_type || randomElement(INCIDENT_TYPES),
    severity: overrides.severity || randomElement(SEVERITIES),
    status: overrides.status || 'OPEN',
    incident_date: overrides.incident_date || new Date(),
    pet_id: overrides.pet_id || null,           // bigint pet record_id
    booking_id: overrides.booking_id || null,   // bigint booking record_id
    reported_by: overrides.reported_by || null, // bigint user record_id
    resolved_at: overrides.resolved_at || null,
    resolution_notes: overrides.resolution_notes || null,
  };

  const result = await query(
    `INSERT INTO "Incident" (
      tenant_id, record_id, title, description, incident_type, severity, status,
      incident_date, pet_id, booking_id, reported_by, resolved_at, resolution_notes,
      created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.title, data.description, data.incident_type,
      data.severity, data.status, data.incident_date, data.pet_id,
      data.booking_id, data.reported_by, data.resolved_at, data.resolution_notes,
    ]
  );

  return result.rows[0];
}

/**
 * Create a time entry
 * TimeEntry table uses record_id (bigint from getNextRecordId)
 * Uses user_id (bigint) not staff_id
 * No `approved` column - uses approved_by (uuid) and approved_at
 */
async function createTimeEntry(tenantId, userRecordId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'TimeEntry');
  const clockIn = overrides.clock_in || new Date();
  const clockOut = overrides.clock_out || null; // Can be null for active entries

  const data = {
    tenant_id: tenantId,
    record_id: recordId,
    user_id: userRecordId,
    clock_in: clockIn,
    clock_out: clockOut,
    break_minutes: overrides.break_minutes || 0,
    notes: overrides.notes || null,
    status: overrides.status || 'ACTIVE',
    approved_by: overrides.approved_by || null, // uuid
    approved_at: overrides.approved_at || null,
  };

  const result = await query(
    `INSERT INTO "TimeEntry" (
      tenant_id, record_id, user_id, clock_in, clock_out,
      break_minutes, notes, status, approved_by, approved_at, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.user_id, data.clock_in,
      data.clock_out, data.break_minutes, data.notes, data.status,
      data.approved_by, data.approved_at,
    ]
  );

  return result.rows[0];
}

/**
 * Create an invoice
 * Invoice table uses record_id (bigint from getNextRecordId)
 * owner_id is bigint (owner.record_id)
 */
async function createInvoice(tenantId, ownerRecordId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Invoice');
  const timestamp = Date.now();

  const subtotal = overrides.subtotal_cents || randomInt(5000, 50000);
  const tax = overrides.tax_cents || Math.floor(subtotal * 0.0825);
  const discount = overrides.discount_cents || 0;
  const total = subtotal + tax - discount;

  const data = {
    tenant_id: tenantId,
    record_id: recordId,
    owner_id: ownerRecordId,
    invoice_number: overrides.invoice_number || `INV-${timestamp}`,
    status: overrides.status || 'SENT',
    subtotal_cents: subtotal,
    tax_cents: tax,
    discount_cents: discount,
    total_cents: total,
    paid_cents: overrides.paid_cents || 0,
    due_date: overrides.due_date || randomDate(30),
    notes: overrides.notes || null,
  };

  const result = await query(
    `INSERT INTO "Invoice" (
      tenant_id, record_id, owner_id, invoice_number, status,
      subtotal_cents, tax_cents, discount_cents, total_cents, paid_cents,
      due_date, notes, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.owner_id, data.invoice_number,
      data.status, data.subtotal_cents, data.tax_cents, data.discount_cents,
      data.total_cents, data.paid_cents, data.due_date, data.notes,
    ]
  );

  return result.rows[0];
}

/**
 * Create a payment
 * Payment table uses record_id (bigint from getNextRecordId)
 * owner_id and invoice_id are bigint record_ids
 */
async function createPayment(tenantId, ownerRecordId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Payment');

  const data = {
    tenant_id: tenantId,
    record_id: recordId,
    owner_id: ownerRecordId,
    invoice_id: overrides.invoice_id || null, // bigint invoice.record_id
    amount_cents: overrides.amount_cents || randomInt(5000, 50000),
    method: overrides.method || randomElement(['CARD', 'CASH', 'CHECK']),
    status: overrides.status || 'COMPLETED',
    notes: overrides.notes || null,
    processed_at: overrides.processed_at || new Date(),
  };

  const result = await query(
    `INSERT INTO "Payment" (
      tenant_id, record_id, owner_id, invoice_id, amount_cents,
      method, status, notes, processed_at, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.owner_id, data.invoice_id,
      data.amount_cents, data.method, data.status, data.notes, data.processed_at,
    ]
  );

  return result.rows[0];
}

/**
 * Create a segment
 * Segment table uses record_id (bigint from getNextRecordId)
 * Has additional required fields: object_type, segment_type, filters
 */
async function createSegment(tenantId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Segment');

  const data = {
    tenant_id: tenantId,
    record_id: recordId,
    name: overrides.name || `Segment ${randomInt(1, 1000)}`,
    description: overrides.description || 'Test segment',
    object_type: overrides.object_type || 'owners',
    segment_type: overrides.segment_type || 'active',
    is_automatic: overrides.is_automatic || false,
    criteria: overrides.criteria || {},
    filters: overrides.filters || { groups: [], groupLogic: 'OR' },
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
  };

  const result = await query(
    `INSERT INTO "Segment" (
      tenant_id, record_id, name, description, object_type, segment_type,
      is_automatic, criteria, filters, is_active, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.name, data.description, data.object_type,
      data.segment_type, data.is_automatic, JSON.stringify(data.criteria),
      JSON.stringify(data.filters), data.is_active,
    ]
  );

  return result.rows[0];
}

/**
 * Create a package
 * Package table uses record_id (bigint from getNextRecordId)
 * Has discount_percent, no visit_count or valid_days
 */
async function createPackage(tenantId, overrides = {}) {
  const recordId = await getNextRecordId(tenantId, 'Package');

  const data = {
    tenant_id: tenantId,
    record_id: recordId,
    name: overrides.name || `Package ${randomInt(1, 100)}`,
    description: overrides.description || 'Test package description',
    price_in_cents: overrides.price_in_cents || randomInt(10000, 100000),
    discount_percent: overrides.discount_percent || randomInt(0, 20),
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
  };

  const result = await query(
    `INSERT INTO "Package" (
      tenant_id, record_id, name, description, price_in_cents,
      discount_percent, is_active, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      data.tenant_id, data.record_id, data.name, data.description,
      data.price_in_cents, data.discount_percent, data.is_active,
    ]
  );

  return result.rows[0];
}

module.exports = {
  // Entity factories
  createOwner,
  createPet,
  createVaccination,
  // NOTE: createStaff removed - Staff table doesn't exist, use User table
  // NOTE: createFacility removed - Facility table doesn't exist, use Run/Kennel tables
  createService,
  createBooking,
  createTask,
  createIncident,
  createTimeEntry,
  createInvoice,
  createPayment,
  createSegment,
  createPackage,

  // Utilities
  randomElement,
  randomInt,
  randomEmail,
  randomPhone,
  randomDate,
  pastDate,
};
