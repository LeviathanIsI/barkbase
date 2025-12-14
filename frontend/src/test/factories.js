/**
 * Mock Data Factories
 *
 * Generate realistic test data for all entities in the BarkBase application.
 * Uses @faker-js/faker for random but consistent data generation.
 */

import { faker } from '@faker-js/faker';

// Counter for unique IDs
let idCounter = 1;
const generateId = () => `test-${idCounter++}`;

/**
 * Reset ID counter between test files
 * Call this in beforeEach if you need deterministic IDs
 */
export const resetFactories = () => {
  idCounter = 1;
  faker.seed(12345); // Reset faker seed for reproducibility
};

// ============================================================================
// OWNER FACTORY
// ============================================================================

export const createOwner = (overrides = {}) => ({
  recordId: generateId(),
  id: generateId(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  phone: faker.phone.number('###-###-####'),
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state({ abbreviated: true }),
  zipCode: faker.location.zipCode(),
  notes: faker.lorem.sentence(),
  status: 'active',
  isActive: true,
  isDeleted: false,
  emergencyContactName: faker.person.fullName(),
  emergencyContactPhone: faker.phone.number('###-###-####'),
  preferredContactMethod: faker.helpers.arrayElement(['email', 'phone', 'text']),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});

export const createOwners = (count, overrides = {}) =>
  Array.from({ length: count }, () => createOwner(overrides));

// ============================================================================
// PET FACTORY
// ============================================================================

const DOG_BREEDS = [
  'Labrador Retriever',
  'German Shepherd',
  'Golden Retriever',
  'French Bulldog',
  'Bulldog',
  'Poodle',
  'Beagle',
  'Rottweiler',
  'Dachshund',
  'Yorkshire Terrier',
];

const CAT_BREEDS = [
  'Persian',
  'Maine Coon',
  'Ragdoll',
  'British Shorthair',
  'Siamese',
  'Abyssinian',
  'Bengal',
  'Sphynx',
];

export const createPet = (overrides = {}) => {
  const species = overrides.species || faker.helpers.arrayElement(['DOG', 'CAT']);
  const breeds = species === 'DOG' ? DOG_BREEDS : CAT_BREEDS;

  return {
    recordId: generateId(),
    id: generateId(),
    name: faker.person.firstName(),
    species,
    breed: faker.helpers.arrayElement(breeds),
    color: faker.color.human(),
    weight: faker.number.float({ min: 5, max: 100, fractionDigits: 1 }),
    birthdate: faker.date.past({ years: 10 }).toISOString().split('T')[0],
    dateOfBirth: faker.date.past({ years: 10 }).toISOString().split('T')[0],
    gender: faker.helpers.arrayElement(['MALE', 'FEMALE']),
    isNeutered: faker.datatype.boolean(),
    microchipNumber: faker.string.alphanumeric(15),
    notes: faker.lorem.sentence(),
    status: 'active',
    isActive: true,
    isDeleted: false,
    vaccinationStatus: faker.helpers.arrayElement(['current', 'expiring', 'expired']),
    feedingInstructions: faker.lorem.sentence(),
    medicationNotes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
};

export const createPets = (count, overrides = {}) =>
  Array.from({ length: count }, () => createPet(overrides));

// ============================================================================
// BOOKING FACTORY
// ============================================================================

export const createBooking = (overrides = {}) => {
  const checkIn = faker.date.soon({ days: 30 });
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + faker.number.int({ min: 1, max: 14 }));

  const totalCents = faker.number.int({ min: 5000, max: 50000 });
  const paidCents = faker.helpers.arrayElement([0, totalCents, Math.floor(totalCents / 2)]);

  return {
    recordId: generateId(),
    id: generateId(),
    status: faker.helpers.arrayElement([
      'PENDING',
      'CONFIRMED',
      'CHECKED_IN',
      'CHECKED_OUT',
      'CANCELLED',
    ]),
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    totalCents,
    paidCents,
    totalAmount: totalCents / 100,
    serviceName: faker.helpers.arrayElement(['Boarding', 'Daycare', 'Grooming']),
    notes: faker.lorem.sentence(),
    specialInstructions: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }),
    pet: null,
    pets: [],
    owner: null,
    kennel: null,
    kennelId: null,
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
};

export const createBookings = (count, overrides = {}) =>
  Array.from({ length: count }, () => createBooking(overrides));

// ============================================================================
// INVOICE FACTORY
// ============================================================================

export const createInvoice = (overrides = {}) => {
  const subtotalCents = faker.number.int({ min: 5000, max: 50000 });
  const taxCents = Math.round(subtotalCents * 0.08);
  const totalCents = subtotalCents + taxCents;

  return {
    recordId: generateId(),
    id: generateId(),
    invoiceNumber: `INV-${faker.string.numeric(6)}`,
    status: faker.helpers.arrayElement(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
    subtotalCents,
    taxCents,
    totalCents,
    paidCents: 0,
    subtotal: subtotalCents / 100,
    tax: taxCents / 100,
    totalAmount: totalCents / 100,
    paidAmount: 0,
    dueDate: faker.date.soon({ days: 30 }).toISOString(),
    sentAt: null,
    paidAt: null,
    lineItems: [],
    owner: null,
    ownerId: null,
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
};

export const createInvoices = (count, overrides = {}) =>
  Array.from({ length: count }, () => createInvoice(overrides));

// ============================================================================
// PAYMENT FACTORY
// ============================================================================

export const createPayment = (overrides = {}) => {
  const amountCents = faker.number.int({ min: 1000, max: 50000 });

  return {
    recordId: generateId(),
    id: generateId(),
    amountCents,
    amount: amountCents / 100,
    method: faker.helpers.arrayElement(['CARD', 'CASH', 'CHECK', 'BANK_TRANSFER', 'ACH']),
    status: faker.helpers.arrayElement(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
    transactionId: faker.string.alphanumeric(20),
    idempotencyKey: faker.string.uuid(),
    last4: faker.string.numeric(4),
    cardBrand: faker.helpers.arrayElement(['Visa', 'Mastercard', 'Amex', null]),
    receiptUrl: faker.internet.url(),
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
    invoiceId: null,
    ownerId: null,
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
};

export const createPayments = (count, overrides = {}) =>
  Array.from({ length: count }, () => createPayment(overrides));

// ============================================================================
// KENNEL/RUN FACTORY
// ============================================================================

export const createKennel = (overrides = {}) => ({
  recordId: generateId(),
  id: generateId(),
  name: `Kennel ${faker.string.alpha({ length: 1, casing: 'upper' })}${faker.number.int({ min: 1, max: 20 })}`,
  type: faker.helpers.arrayElement(['STANDARD', 'LARGE', 'SUITE', 'OUTDOOR', 'LUXURY']),
  capacity: faker.number.int({ min: 1, max: 4 }),
  dailyRateCents: faker.number.int({ min: 2500, max: 10000 }),
  dailyRate: faker.number.float({ min: 25, max: 100, fractionDigits: 2 }),
  isActive: true,
  isAvailable: true,
  features: faker.helpers.arrayElements(
    ['heated', 'air-conditioned', 'outdoor-access', 'webcam', 'play-area'],
    { min: 0, max: 3 }
  ),
  notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});

export const createKennels = (count, overrides = {}) =>
  Array.from({ length: count }, () => createKennel(overrides));

// ============================================================================
// RUN TEMPLATE FACTORY
// ============================================================================

export const createRunTemplate = (overrides = {}) => ({
  recordId: generateId(),
  id: generateId(),
  name: `Run ${faker.string.alpha({ length: 1, casing: 'upper' })}${faker.number.int({ min: 1, max: 10 })}`,
  type: faker.helpers.arrayElement(['Standard', 'Large', 'Premium', 'Outdoor']),
  maxCapacity: faker.number.int({ min: 1, max: 6 }),
  isActive: true,
  sortOrder: faker.number.int({ min: 0, max: 100 }),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});

// ============================================================================
// STAFF/USER FACTORY
// ============================================================================

export const createStaff = (overrides = {}) => ({
  recordId: generateId(),
  id: generateId(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  phone: faker.phone.number('###-###-####'),
  role: faker.helpers.arrayElement(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']),
  isActive: true,
  hireDate: faker.date.past({ years: 5 }).toISOString().split('T')[0],
  permissions: [],
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});

export const createStaffMembers = (count, overrides = {}) =>
  Array.from({ length: count }, () => createStaff(overrides));

// ============================================================================
// VACCINATION FACTORY
// ============================================================================

export const createVaccination = (overrides = {}) => {
  const administeredDate = faker.date.past();
  const expiresAt = new Date(administeredDate);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  return {
    recordId: generateId(),
    id: generateId(),
    name: faker.helpers.arrayElement([
      'Rabies',
      'DHPP',
      'Bordetella',
      'Leptospirosis',
      'Lyme',
      'Canine Influenza',
      'FVRCP',
      'FeLV',
    ]),
    type: faker.helpers.arrayElement([
      'rabies',
      'dhpp',
      'bordetella',
      'leptospirosis',
      'lyme',
    ]),
    administeredDate: administeredDate.toISOString(),
    expiresAt: expiresAt.toISOString(),
    veterinarian: faker.person.fullName(),
    clinicName: `${faker.company.name()} Veterinary`,
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
    petId: null,
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
};

export const createVaccinations = (count, overrides = {}) =>
  Array.from({ length: count }, () => createVaccination(overrides));

// ============================================================================
// SERVICE FACTORY
// ============================================================================

export const createService = (overrides = {}) => ({
  recordId: generateId(),
  id: generateId(),
  name: faker.helpers.arrayElement([
    'Standard Boarding',
    'Premium Boarding',
    'Daycare',
    'Full Grooming',
    'Bath & Brush',
    'Nail Trim',
    'Training Session',
  ]),
  description: faker.lorem.sentence(),
  category: faker.helpers.arrayElement(['boarding', 'daycare', 'grooming', 'training']),
  priceCents: faker.number.int({ min: 1000, max: 15000 }),
  price: faker.number.float({ min: 10, max: 150, fractionDigits: 2 }),
  duration: faker.number.int({ min: 30, max: 480 }),
  isActive: true,
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});

// ============================================================================
// SEGMENT FACTORY
// ============================================================================

export const createSegment = (overrides = {}) => ({
  recordId: generateId(),
  id: generateId(),
  name: faker.helpers.arrayElement([
    'VIP Customers',
    'New Customers',
    'Frequent Visitors',
    'Expired Vaccinations',
    'High Value',
  ]),
  description: faker.lorem.sentence(),
  segment_type: faker.helpers.arrayElement(['active', 'static']),
  object_type: faker.helpers.arrayElement(['owners', 'pets']),
  memberCount: faker.number.int({ min: 0, max: 500 }),
  filters: [],
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});

// ============================================================================
// TENANT FACTORY
// ============================================================================

export const createTenant = (overrides = {}) => ({
  recordId: generateId(),
  id: generateId(),
  name: `${faker.company.name()} Kennels`,
  slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
  plan: faker.helpers.arrayElement(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
  isActive: true,
  featureFlags: {},
  settings: {},
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});

// ============================================================================
// HELPER: Create related data
// ============================================================================

/**
 * Create an owner with pets
 */
export const createOwnerWithPets = (petCount = 2, overrides = {}) => {
  const owner = createOwner(overrides.owner);
  const pets = createPets(petCount, {
    ownerId: owner.recordId,
    ownerName: `${owner.firstName} ${owner.lastName}`,
    ...overrides.pet,
  });

  return {
    owner: { ...owner, pets },
    pets,
  };
};

/**
 * Create a booking with related entities
 */
export const createBookingWithRelations = (overrides = {}) => {
  const { owner, pets } = createOwnerWithPets(1, {
    owner: overrides.owner,
    pet: overrides.pet,
  });
  const pet = pets[0];
  const kennel = createKennel(overrides.kennel);
  const booking = createBooking({
    pet,
    pets: [pet],
    owner,
    ownerId: owner.recordId,
    petId: pet.recordId,
    kennel,
    kennelId: kennel.recordId,
    ...overrides.booking,
  });

  return { booking, owner, pet, kennel };
};
