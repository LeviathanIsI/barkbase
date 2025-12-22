/**
 * E2E Test Data Factories
 *
 * Factory functions to create realistic test data in the database.
 * Each factory creates actual records and returns the created objects.
 */

const { query, generateUUID } = require('./setup');

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
 */
async function createOwner(tenantId, overrides = {}) {
  const ownerId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const data = {
    id: ownerId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `own_${timestamp}`,
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
      id, tenant_id, record_id, first_name, last_name, email, phone,
      address_street, address_city, address_state, address_zip,
      is_active, notes, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.first_name, data.last_name,
      data.email, data.phone, data.address_street, data.address_city,
      data.address_state, data.address_zip, data.is_active, data.notes,
    ]
  );

  return result.rows[0];
}

/**
 * Create a pet
 */
async function createPet(tenantId, ownerId, overrides = {}) {
  const petId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const data = {
    id: petId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `pet_${timestamp}`,
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
      id, tenant_id, record_id, name, species, breed, gender, color, weight,
      date_of_birth, status, is_active, medical_notes, dietary_notes, behavior_notes,
      created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.name, data.species,
      data.breed, data.gender, data.color, data.weight, data.date_of_birth,
      data.status, data.is_active, data.medical_notes, data.dietary_notes,
      data.behavior_notes,
    ]
  );

  // Link pet to owner
  if (ownerId) {
    await query(
      `INSERT INTO "PetOwner" (tenant_id, pet_id, owner_id, is_primary, created_at)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (pet_id, owner_id) DO NOTHING`,
      [tenantId, petId, ownerId]
    );
  }

  const pet = result.rows[0];
  pet.owner_id = ownerId;
  return pet;
}

/**
 * Create a vaccination record
 */
async function createVaccination(tenantId, petId, overrides = {}) {
  const vaccinationId = overrides.id || generateUUID();

  const data = {
    id: vaccinationId,
    tenant_id: tenantId,
    pet_id: petId,
    vaccine_name: overrides.vaccine_name || randomElement(['Rabies', 'DHPP', 'Bordetella', 'Leptospirosis']),
    administered_at: overrides.administered_at || pastDate(180),
    expires_at: overrides.expires_at || randomDate(180),
    notes: overrides.notes || null,
    verified: overrides.verified !== undefined ? overrides.verified : true,
  };

  const result = await query(
    `INSERT INTO "Vaccination" (
      id, tenant_id, pet_id, vaccine_name, administered_at, expires_at, notes, verified,
      created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.pet_id, data.vaccine_name,
      data.administered_at, data.expires_at, data.notes, data.verified,
    ]
  );

  return result.rows[0];
}

/**
 * Create a staff member
 */
async function createStaff(tenantId, overrides = {}) {
  const staffId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const data = {
    id: staffId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `stf_${timestamp}`,
    first_name: overrides.first_name || randomElement(FIRST_NAMES),
    last_name: overrides.last_name || randomElement(LAST_NAMES),
    email: overrides.email || randomEmail(),
    phone: overrides.phone || randomPhone(),
    position: overrides.position || randomElement(['Handler', 'Groomer', 'Trainer', 'Manager']),
    hire_date: overrides.hire_date || pastDate(365),
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    hourly_rate_cents: overrides.hourly_rate_cents || randomInt(1500, 3500),
  };

  const result = await query(
    `INSERT INTO "Staff" (
      id, tenant_id, record_id, first_name, last_name, email, phone,
      position, hire_date, is_active, hourly_rate_cents, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.first_name, data.last_name,
      data.email, data.phone, data.position, data.hire_date, data.is_active,
      data.hourly_rate_cents,
    ]
  );

  return result.rows[0];
}

/**
 * Create a facility
 */
async function createFacility(tenantId, overrides = {}) {
  const facilityId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const data = {
    id: facilityId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `fac_${timestamp}`,
    name: overrides.name || `Facility ${randomInt(1, 100)}`,
    type: overrides.type || randomElement(['BOARDING', 'DAYCARE', 'GROOMING', 'TRAINING']),
    capacity: overrides.capacity || randomInt(10, 50),
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    notes: overrides.notes || null,
  };

  const result = await query(
    `INSERT INTO "Facility" (
      id, tenant_id, record_id, name, type, capacity, is_active, notes,
      created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.name, data.type,
      data.capacity, data.is_active, data.notes,
    ]
  );

  return result.rows[0];
}

/**
 * Create a service
 */
async function createService(tenantId, overrides = {}) {
  const serviceId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const data = {
    id: serviceId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `svc_${timestamp}`,
    name: overrides.name || `Service ${randomInt(1, 100)}`,
    description: overrides.description || 'Test service description',
    category: overrides.category || randomElement(['BOARDING', 'DAYCARE', 'GROOMING', 'TRAINING', 'ADD_ON']),
    price_in_cents: overrides.price_in_cents || randomInt(2500, 15000),
    duration_minutes: overrides.duration_minutes || randomInt(30, 480),
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
  };

  const result = await query(
    `INSERT INTO "Service" (
      id, tenant_id, record_id, name, description, category, price_in_cents,
      duration_minutes, is_active, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.name, data.description,
      data.category, data.price_in_cents, data.duration_minutes, data.is_active,
    ]
  );

  return result.rows[0];
}

/**
 * Create a booking
 */
async function createBooking(tenantId, ownerId, overrides = {}) {
  const bookingId = overrides.id || generateUUID();
  const timestamp = Date.now();

  // Create service if not provided
  let serviceId = overrides.service_id;
  if (!serviceId) {
    const service = await createService(tenantId);
    serviceId = service.id;
  }

  const checkIn = overrides.check_in || randomDate(7);
  const checkOut = overrides.check_out || new Date(checkIn.getTime() + 3 * 24 * 60 * 60 * 1000);

  const data = {
    id: bookingId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `bkg_${timestamp}`,
    owner_id: ownerId,
    service_id: serviceId,
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
      id, tenant_id, record_id, owner_id, service_id, status, check_in, check_out,
      total_price_cents, deposit_cents, notes, special_instructions, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.owner_id, data.service_id,
      data.status, data.check_in, data.check_out, data.total_price_cents,
      data.deposit_cents, data.notes, data.special_instructions,
    ]
  );

  return result.rows[0];
}

/**
 * Create a task
 */
async function createTask(tenantId, overrides = {}) {
  const taskId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const data = {
    id: taskId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `tsk_${timestamp}`,
    title: overrides.title || `Task ${randomInt(1, 1000)}`,
    description: overrides.description || 'Test task description',
    status: overrides.status || 'pending',
    priority: overrides.priority || randomElement(['low', 'medium', 'high']),
    due_date: overrides.due_date || randomDate(7),
    assigned_to: overrides.assigned_to || null,
    pet_id: overrides.pet_id || null,
    owner_id: overrides.owner_id || null,
    booking_id: overrides.booking_id || null,
  };

  const result = await query(
    `INSERT INTO "Task" (
      id, tenant_id, record_id, title, description, status, priority,
      due_date, assigned_to, pet_id, owner_id, booking_id, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.title, data.description,
      data.status, data.priority, data.due_date, data.assigned_to,
      data.pet_id, data.owner_id, data.booking_id,
    ]
  );

  return result.rows[0];
}

/**
 * Create an incident
 */
async function createIncident(tenantId, overrides = {}) {
  const incidentId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const data = {
    id: incidentId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `inc_${timestamp}`,
    title: overrides.title || `Incident ${randomInt(1, 1000)}`,
    description: overrides.description || 'Test incident description',
    severity: overrides.severity || randomElement(['low', 'medium', 'high', 'critical']),
    status: overrides.status || 'open',
    pet_id: overrides.pet_id || null,
    reported_by: overrides.reported_by || null,
    resolved_at: overrides.resolved_at || null,
    resolution_notes: overrides.resolution_notes || null,
  };

  const result = await query(
    `INSERT INTO "Incident" (
      id, tenant_id, record_id, title, description, severity, status,
      pet_id, reported_by, resolved_at, resolution_notes, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.title, data.description,
      data.severity, data.status, data.pet_id, data.reported_by,
      data.resolved_at, data.resolution_notes,
    ]
  );

  return result.rows[0];
}

/**
 * Create a time entry
 */
async function createTimeEntry(tenantId, staffId, overrides = {}) {
  const entryId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const clockIn = overrides.clock_in || new Date();
  const clockOut = overrides.clock_out || new Date(clockIn.getTime() + 8 * 60 * 60 * 1000);

  const data = {
    id: entryId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `te_${timestamp}`,
    staff_id: staffId,
    clock_in: clockIn,
    clock_out: clockOut,
    break_minutes: overrides.break_minutes || 30,
    notes: overrides.notes || null,
    approved: overrides.approved !== undefined ? overrides.approved : false,
    approved_by: overrides.approved_by || null,
  };

  const result = await query(
    `INSERT INTO "TimeEntry" (
      id, tenant_id, record_id, staff_id, clock_in, clock_out,
      break_minutes, notes, approved, approved_by, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.staff_id, data.clock_in,
      data.clock_out, data.break_minutes, data.notes, data.approved,
      data.approved_by,
    ]
  );

  return result.rows[0];
}

/**
 * Create an invoice
 */
async function createInvoice(tenantId, ownerId, overrides = {}) {
  const invoiceId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const subtotal = overrides.subtotal_cents || randomInt(5000, 50000);
  const tax = overrides.tax_cents || Math.floor(subtotal * 0.0825);
  const discount = overrides.discount_cents || 0;
  const total = subtotal + tax - discount;

  const data = {
    id: invoiceId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `inv_${timestamp}`,
    owner_id: ownerId,
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
      id, tenant_id, record_id, owner_id, invoice_number, status,
      subtotal_cents, tax_cents, discount_cents, total_cents, paid_cents,
      due_date, notes, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.owner_id, data.invoice_number,
      data.status, data.subtotal_cents, data.tax_cents, data.discount_cents,
      data.total_cents, data.paid_cents, data.due_date, data.notes,
    ]
  );

  return result.rows[0];
}

/**
 * Create a payment
 */
async function createPayment(tenantId, ownerId, overrides = {}) {
  const paymentId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const data = {
    id: paymentId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `pmt_${timestamp}`,
    owner_id: ownerId,
    invoice_id: overrides.invoice_id || null,
    amount_cents: overrides.amount_cents || randomInt(5000, 50000),
    method: overrides.method || randomElement(['CARD', 'CASH', 'CHECK']),
    status: overrides.status || 'SUCCEEDED',
    notes: overrides.notes || null,
    processed_at: overrides.processed_at || new Date(),
  };

  const result = await query(
    `INSERT INTO "Payment" (
      id, tenant_id, record_id, owner_id, invoice_id, amount_cents,
      method, status, notes, processed_at, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.owner_id, data.invoice_id,
      data.amount_cents, data.method, data.status, data.notes, data.processed_at,
    ]
  );

  return result.rows[0];
}

/**
 * Create a segment
 */
async function createSegment(tenantId, overrides = {}) {
  const segmentId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const data = {
    id: segmentId,
    tenant_id: tenantId,
    name: overrides.name || `Segment ${randomInt(1, 1000)}`,
    description: overrides.description || 'Test segment',
    is_automatic: overrides.is_automatic || false,
    criteria: overrides.criteria || {},
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
  };

  const result = await query(
    `INSERT INTO "Segment" (
      id, tenant_id, name, description, is_automatic, criteria, is_active,
      created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.name, data.description,
      data.is_automatic, JSON.stringify(data.criteria), data.is_active,
    ]
  );

  return result.rows[0];
}

/**
 * Create a package
 */
async function createPackage(tenantId, overrides = {}) {
  const packageId = overrides.id || generateUUID();
  const timestamp = Date.now();

  const data = {
    id: packageId,
    tenant_id: tenantId,
    record_id: overrides.record_id || `pkg_${timestamp}`,
    name: overrides.name || `Package ${randomInt(1, 100)}`,
    description: overrides.description || 'Test package description',
    price_in_cents: overrides.price_in_cents || randomInt(10000, 100000),
    visit_count: overrides.visit_count || randomInt(5, 20),
    valid_days: overrides.valid_days || 365,
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
  };

  const result = await query(
    `INSERT INTO "Package" (
      id, tenant_id, record_id, name, description, price_in_cents,
      visit_count, valid_days, is_active, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING *`,
    [
      data.id, data.tenant_id, data.record_id, data.name, data.description,
      data.price_in_cents, data.visit_count, data.valid_days, data.is_active,
    ]
  );

  return result.rows[0];
}

module.exports = {
  // Entity factories
  createOwner,
  createPet,
  createVaccination,
  createStaff,
  createFacility,
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
