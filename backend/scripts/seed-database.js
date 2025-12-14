/**
 * =============================================================================
 * BarkBase Database Seed Script
 * =============================================================================
 *
 * Seeds the database with comprehensive, realistic demo data.
 *
 * Data Generated:
 * - 50+ owners with realistic contact information
 * - 100+ pets (85% dogs, 15% cats) with breed/weight distribution
 * - Vaccinations for all pets
 * - 15-20 kennels and runs with varying sizes
 * - Services (boarding, daycare, grooming, etc.)
 * - 200+ bookings across past/present/future dates
 * - Invoices and payments (70% paid, 20% pending, 10% overdue)
 * - 50+ tasks in various states
 * - 5-10 staff members with different roles
 *
 * Usage: npm run db:seed
 *
 * =============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.development') });
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');
const crypto = require('crypto');

// CRITICAL: Use preserved tenant
const TENANT_ID = '038db85c-4c00-4547-ba36-616db24151da';
const ADMIN_USER_ID = 'f6082373-c6f5-45a9-a01d-981d7c060550';

// Helper to generate UUIDs
const uuid = () => crypto.randomUUID();

// Dog breeds with weights (85% of pets)
const DOG_BREEDS = [
  { breed: 'Labrador Retriever', minWeight: 55, maxWeight: 80 },
  { breed: 'German Shepherd', minWeight: 65, maxWeight: 90 },
  { breed: 'Golden Retriever', minWeight: 55, maxWeight: 75 },
  { breed: 'French Bulldog', minWeight: 16, maxWeight: 28 },
  { breed: 'Bulldog', minWeight: 40, maxWeight: 55 },
  { breed: 'Beagle', minWeight: 20, maxWeight: 30 },
  { breed: 'Poodle (Standard)', minWeight: 40, maxWeight: 70 },
  { breed: 'Rottweiler', minWeight: 80, maxWeight: 135 },
  { breed: 'Yorkshire Terrier', minWeight: 4, maxWeight: 7 },
  { breed: 'Boxer', minWeight: 55, maxWeight: 70 },
  { breed: 'Dachshund', minWeight: 11, maxWeight: 32 },
  { breed: 'Siberian Husky', minWeight: 35, maxWeight: 60 },
  { breed: 'Great Dane', minWeight: 110, maxWeight: 175 },
  { breed: 'Doberman Pinscher', minWeight: 60, maxWeight: 100 },
  { breed: 'Australian Shepherd', minWeight: 40, maxWeight: 65 },
  { breed: 'Cavalier King Charles Spaniel', minWeight: 13, maxWeight: 18 },
  { breed: 'Shih Tzu', minWeight: 9, maxWeight: 16 },
  { breed: 'Boston Terrier', minWeight: 12, maxWeight: 25 },
  { breed: 'Pomeranian', minWeight: 3, maxWeight: 7 },
  { breed: 'Border Collie', minWeight: 30, maxWeight: 55 },
  { breed: 'Mixed Breed', minWeight: 20, maxWeight: 70 },
];

// Cat breeds (15% of pets)
const CAT_BREEDS = [
  { breed: 'Domestic Shorthair', minWeight: 8, maxWeight: 15 },
  { breed: 'Domestic Longhair', minWeight: 8, maxWeight: 15 },
  { breed: 'Maine Coon', minWeight: 10, maxWeight: 25 },
  { breed: 'Siamese', minWeight: 6, maxWeight: 12 },
  { breed: 'Persian', minWeight: 7, maxWeight: 14 },
  { breed: 'Ragdoll', minWeight: 10, maxWeight: 20 },
  { breed: 'Bengal', minWeight: 8, maxWeight: 15 },
  { breed: 'British Shorthair', minWeight: 9, maxWeight: 18 },
  { breed: 'Abyssinian', minWeight: 6, maxWeight: 10 },
  { breed: 'Scottish Fold', minWeight: 6, maxWeight: 13 },
];

// Vaccination types
const DOG_VACCINES = [
  { type: 'Rabies', frequency: 365 },
  { type: 'DHPP (Distemper)', frequency: 365 },
  { type: 'Bordetella', frequency: 180 },
  { type: 'Canine Influenza', frequency: 365 },
  { type: 'Leptospirosis', frequency: 365 },
  { type: 'Lyme Disease', frequency: 365 },
];

const CAT_VACCINES = [
  { type: 'Rabies', frequency: 365 },
  { type: 'FVRCP', frequency: 365 },
  { type: 'FeLV', frequency: 365 },
];

// Service types - using correct category values from schema
const SERVICES = [
  { name: 'Overnight Boarding', description: 'Standard overnight kennel stay', priceInCents: 4500, durationMinutes: null, category: 'BOARDING', isActive: true },
  { name: 'Luxury Suite Boarding', description: 'Premium private suite with extra amenities', priceInCents: 7500, durationMinutes: null, category: 'BOARDING', isActive: true },
  { name: 'Daycare - Full Day', description: 'Full day of supervised play and socialization', priceInCents: 3500, durationMinutes: 480, category: 'DAYCARE', isActive: true },
  { name: 'Daycare - Half Day', description: 'Half day (up to 5 hours) of supervised care', priceInCents: 2200, durationMinutes: 300, category: 'DAYCARE', isActive: true },
  { name: 'Basic Grooming', description: 'Bath, brush, nail trim, and ear cleaning', priceInCents: 5500, durationMinutes: 60, category: 'GROOMING', isActive: true },
  { name: 'Full Grooming', description: 'Complete grooming with haircut/styling', priceInCents: 8500, durationMinutes: 90, category: 'GROOMING', isActive: true },
  { name: 'Nail Trim', description: 'Quick nail trimming service', priceInCents: 1500, durationMinutes: 15, category: 'GROOMING', isActive: true },
  { name: 'Basic Training Session', description: 'One-on-one training session', priceInCents: 6000, durationMinutes: 60, category: 'TRAINING', isActive: true },
  { name: 'Extra Playtime', description: 'Additional 30 minutes of one-on-one play', priceInCents: 1200, durationMinutes: 30, category: 'ADD_ON', isActive: true },
  { name: 'Medication Administration', description: 'Daily medication administration', priceInCents: 800, durationMinutes: null, category: 'ADD_ON', isActive: true },
];

// Task types - using correct task_type values from schema
const TASK_TYPES = [
  { title: 'Morning feeding', taskType: 'FEEDING', priority: 1 },
  { title: 'Evening feeding', taskType: 'FEEDING', priority: 1 },
  { title: 'Medication - morning', taskType: 'MEDICATION', priority: 1 },
  { title: 'Medication - evening', taskType: 'MEDICATION', priority: 1 },
  { title: 'Walk/Exercise', taskType: 'EXERCISE', priority: 2 },
  { title: 'Playtime session', taskType: 'EXERCISE', priority: 3 },
  { title: 'Grooming appointment', taskType: 'GROOMING', priority: 2 },
  { title: 'Kennel cleaning', taskType: 'CLEANING', priority: 3 },
  { title: 'Check water bowls', taskType: 'OTHER', priority: 4 },
  { title: 'Behavior observation', taskType: 'OTHER', priority: 3 },
];

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatDateTime(date) {
  return date.toISOString();
}

async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('BarkBase Database Seed Script');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log('');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // =========================================================================
    // 1. ROLES (System defaults)
    // =========================================================================
    console.log('Creating roles...');

    const roles = [
      { id: uuid(), name: 'admin', description: 'Full system access', isSystem: true },
      { id: uuid(), name: 'manager', description: 'Manage staff and operations', isSystem: true },
      { id: uuid(), name: 'staff', description: 'Day-to-day operations', isSystem: true },
      { id: uuid(), name: 'receptionist', description: 'Front desk operations', isSystem: true },
    ];

    for (const role of roles) {
      await client.query(
        `INSERT INTO "Role" (id, tenant_id, name, description, is_system, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (tenant_id, name) DO NOTHING`,
        [role.id, TENANT_ID, role.name, role.description, role.isSystem]
      );
    }
    console.log(`  Created ${roles.length} roles`);

    // =========================================================================
    // 2. STAFF USERS (5-10)
    // =========================================================================
    console.log('Creating staff users...');

    const staffCount = randomInt(5, 10);
    const staffUsers = [];

    for (let i = 0; i < staffCount; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const cognitoSub = `staff-${uuid()}`; // Generate unique cognito_sub
      const user = {
        id: uuid(),
        cognitoSub,
        email: faker.internet.email({ firstName, lastName, provider: 'barkbase.io' }).toLowerCase(),
        firstName,
        lastName,
        isActive: true,
        phone: faker.string.numeric(10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
        position: i === 0 ? 'Manager' : randomElement(['Kennel Technician', 'Groomer', 'Receptionist', 'Pet Care Specialist']),
        department: randomElement(['Operations', 'Grooming', 'Front Desk']),
        employmentType: randomElement(['FULL_TIME', 'PART_TIME']),
      };
      staffUsers.push(user);

      await client.query(
        `INSERT INTO "User" (id, tenant_id, cognito_sub, email, first_name, last_name, phone, is_active, position, department, employment_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [user.id, TENANT_ID, user.cognitoSub, user.email, user.firstName, user.lastName, user.phone, user.isActive, user.position, user.department, user.employmentType]
      );
    }
    console.log(`  Created ${staffUsers.length} staff users`);

    // =========================================================================
    // 3. OWNERS (50+)
    // =========================================================================
    console.log('Creating owners...');

    const ownerCount = randomInt(50, 70);
    const owners = [];

    for (let i = 0; i < ownerCount; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const owner = {
        id: uuid(),
        firstName,
        lastName,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        phone: faker.string.numeric(10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
        addressStreet: faker.location.streetAddress().substring(0, 200),
        addressCity: faker.location.city().substring(0, 100),
        addressState: faker.location.state({ abbreviated: true }).substring(0, 2),
        addressZip: faker.location.zipCode('#####').substring(0, 10),
        emergencyContactName: faker.person.fullName().substring(0, 150),
        emergencyContactPhone: faker.string.numeric(10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
        notes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        isActive: Math.random() > 0.05, // 95% active
      };
      owners.push(owner);

      await client.query(
        `INSERT INTO "Owner" (id, tenant_id, first_name, last_name, email, phone, address_street, address_city, address_state, address_zip, emergency_contact_name, emergency_contact_phone, notes, is_active, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
        [owner.id, TENANT_ID, owner.firstName, owner.lastName, owner.email, owner.phone, owner.addressStreet, owner.addressCity, owner.addressState, owner.addressZip, owner.emergencyContactName, owner.emergencyContactPhone, owner.notes, owner.isActive, ADMIN_USER_ID]
      );
    }
    console.log(`  Created ${owners.length} owners`);

    // =========================================================================
    // 4. VETERINARIANS (10-15)
    // =========================================================================
    console.log('Creating veterinarians...');

    const vetCount = randomInt(10, 15);
    const vets = [];

    for (let i = 0; i < vetCount; i++) {
      const vet = {
        id: uuid(),
        vetName: `Dr. ${faker.person.firstName()} ${faker.person.lastName()}`.substring(0, 100),
        clinicName: `${faker.location.city()} ${randomElement(['Animal Hospital', 'Veterinary Clinic', 'Pet Care Center', 'Animal Care'])}`.substring(0, 200),
        phone: faker.string.numeric(10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
        email: faker.internet.email().toLowerCase(),
        addressStreet: faker.location.streetAddress().substring(0, 200),
        addressCity: faker.location.city().substring(0, 100),
        addressState: faker.location.state({ abbreviated: true }).substring(0, 2),
        addressZip: faker.location.zipCode('#####').substring(0, 10),
      };
      vets.push(vet);

      await client.query(
        `INSERT INTO "Veterinarian" (id, tenant_id, clinic_name, vet_name, phone, email, address_street, address_city, address_state, address_zip, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())`,
        [vet.id, TENANT_ID, vet.clinicName, vet.vetName, vet.phone, vet.email, vet.addressStreet, vet.addressCity, vet.addressState, vet.addressZip]
      );
    }
    console.log(`  Created ${vets.length} veterinarians`);

    // =========================================================================
    // 5. PETS (100+, 85% dogs, 15% cats)
    // =========================================================================
    console.log('Creating pets...');

    const petCount = randomInt(100, 130);
    const pets = [];
    const dogCount = Math.floor(petCount * 0.85);

    for (let i = 0; i < petCount; i++) {
      const isDog = i < dogCount;
      const breedData = isDog ? randomElement(DOG_BREEDS) : randomElement(CAT_BREEDS);
      const owner = randomElement(owners);
      const vet = randomElement(vets);
      const birthYear = randomInt(2015, 2023);

      const pet = {
        id: uuid(),
        ownerId: owner.id,
        vetId: Math.random() > 0.3 ? vet.id : null,
        name: faker.person.firstName(),
        species: isDog ? 'DOG' : 'CAT',
        breed: breedData.breed,
        color: randomElement(['Black', 'Brown', 'White', 'Golden', 'Gray', 'Tan', 'Brindle', 'Spotted', 'Tricolor']),
        dateOfBirth: formatDate(new Date(birthYear, randomInt(0, 11), randomInt(1, 28))),
        weight: randomInt(breedData.minWeight, breedData.maxWeight),
        gender: randomElement(['MALE', 'FEMALE']),
        microchipNumber: Math.random() > 0.4 ? faker.string.alphanumeric(15).toUpperCase() : null,
        medicalNotes: Math.random() > 0.8 ? faker.lorem.sentence() : null,
        behaviorNotes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        dietaryNotes: Math.random() > 0.6 ? `${randomElement(['1 cup', '1.5 cups', '2 cups'])} ${randomElement(['morning and evening', 'twice daily', 'three times daily'])}` : null,
        isActive: Math.random() > 0.03,
        status: 'ACTIVE',
      };
      pets.push(pet);

      await client.query(
        `INSERT INTO "Pet" (id, tenant_id, vet_id, name, species, breed, color, date_of_birth, weight, gender, microchip_number, medical_notes, behavior_notes, dietary_notes, is_active, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())`,
        [pet.id, TENANT_ID, pet.vetId, pet.name, pet.species, pet.breed, pet.color, pet.dateOfBirth, pet.weight, pet.gender, pet.microchipNumber, pet.medicalNotes, pet.behaviorNotes, pet.dietaryNotes, pet.isActive, pet.status, ADMIN_USER_ID]
      );

      // Create PetOwner relationship
      await client.query(
        `INSERT INTO "PetOwner" (pet_id, owner_id, tenant_id, is_primary, created_at)
         VALUES ($1, $2, $3, true, NOW())`,
        [pet.id, pet.ownerId, TENANT_ID]
      );

      // Some pets have secondary owners
      if (Math.random() > 0.85) {
        const secondaryOwner = randomElement(owners.filter(o => o.id !== owner.id));
        await client.query(
          `INSERT INTO "PetOwner" (pet_id, owner_id, tenant_id, is_primary, created_at)
           VALUES ($1, $2, $3, false, NOW())
           ON CONFLICT DO NOTHING`,
          [pet.id, secondaryOwner.id, TENANT_ID]
        );
      }
    }
    console.log(`  Created ${pets.length} pets (${dogCount} dogs, ${petCount - dogCount} cats)`);

    // =========================================================================
    // 6. VACCINATIONS
    // =========================================================================
    console.log('Creating vaccinations...');

    let vaccinationCount = 0;
    const today = new Date();

    for (const pet of pets) {
      const vaccines = pet.species === 'DOG' ? DOG_VACCINES : CAT_VACCINES;

      for (const vaccine of vaccines) {
        // 80% of pets have this vaccine
        if (Math.random() > 0.2) {
          const daysAgo = randomInt(30, vaccine.frequency);
          const administeredDate = new Date(today);
          administeredDate.setDate(administeredDate.getDate() - daysAgo);

          const expirationDate = new Date(administeredDate);
          expirationDate.setDate(expirationDate.getDate() + vaccine.frequency);

          await client.query(
            `INSERT INTO "Vaccination" (id, tenant_id, pet_id, type, administered_at, expires_at, provider, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [uuid(), TENANT_ID, pet.id, vaccine.type, formatDate(administeredDate), formatDate(expirationDate), randomElement(vets).clinicName, ADMIN_USER_ID]
          );
          vaccinationCount++;
        }
      }
    }
    console.log(`  Created ${vaccinationCount} vaccinations`);

    // =========================================================================
    // 7. KENNELS AND RUNS (15-20)
    // =========================================================================
    console.log('Creating kennels and runs...');

    const kennels = [];
    const runs = [];
    const kennelCount = randomInt(15, 20);

    for (let i = 0; i < kennelCount; i++) {
      const size = randomElement(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE']);
      const kennel = {
        id: uuid(),
        name: `${String.fromCharCode(65 + Math.floor(i / 5))}${(i % 5) + 1}`,
        size,
        location: randomElement(['Building A', 'Building B', 'Main Building', 'East Wing', 'West Wing']),
        maxOccupancy: size === 'XLARGE' ? 2 : 1,
        isActive: true,
      };
      kennels.push(kennel);

      await client.query(
        `INSERT INTO "Kennel" (id, tenant_id, name, size, location, max_occupancy, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [kennel.id, TENANT_ID, kennel.name, kennel.size, kennel.location, kennel.maxOccupancy, kennel.isActive]
      );
    }

    // Create runs (exercise areas)
    const runCount = randomInt(4, 8);
    for (let i = 0; i < runCount; i++) {
      const run = {
        id: uuid(),
        name: `Run ${i + 1}`,
        description: `${randomElement(['Large', 'Medium', 'Small'])} exercise area`,
        capacity: randomInt(5, 15),
        runType: randomElement(['SOCIAL', 'INDIVIDUAL', 'TRAINING']),
        isActive: true,
      };
      runs.push(run);

      await client.query(
        `INSERT INTO "Run" (id, tenant_id, name, description, capacity, run_type, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [run.id, TENANT_ID, run.name, run.description, run.capacity, run.runType, run.isActive]
      );
    }
    console.log(`  Created ${kennels.length} kennels and ${runs.length} runs`);

    // =========================================================================
    // 8. SERVICES
    // =========================================================================
    console.log('Creating services...');

    const serviceRecords = [];
    for (let i = 0; i < SERVICES.length; i++) {
      const service = SERVICES[i];
      const serviceId = uuid();
      serviceRecords.push({ ...service, id: serviceId });

      await client.query(
        `INSERT INTO "Service" (id, tenant_id, name, description, category, price_in_cents, duration_minutes, is_active, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [serviceId, TENANT_ID, service.name, service.description, service.category, service.priceInCents, service.durationMinutes, service.isActive, i]
      );
    }
    console.log(`  Created ${serviceRecords.length} services`);

    // =========================================================================
    // 9. BOOKINGS (200+)
    // =========================================================================
    console.log('Creating bookings...');

    const bookingCount = randomInt(200, 250);
    const bookings = [];

    // Date ranges: 3 months past to 2 months future
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 3);
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);

    for (let i = 0; i < bookingCount; i++) {
      const pet = randomElement(pets);
      const owner = owners.find(o => o.id === pet.ownerId);
      const checkIn = randomDate(pastDate, futureDate);
      const stayLength = randomInt(1, 14);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + stayLength);

      const kennel = randomElement(kennels);
      const boardingService = serviceRecords.find(s => s.category === 'BOARDING');
      const totalPriceCents = boardingService.priceInCents * stayLength;

      // Determine status based on dates
      let status;
      let checkedInAt = null;
      let checkedOutAt = null;
      if (checkIn > today) {
        status = Math.random() > 0.1 ? 'CONFIRMED' : 'CANCELLED';
      } else if (checkOut < today) {
        status = randomElement(['CHECKED_OUT', 'CHECKED_OUT', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW']);
        if (status === 'CHECKED_OUT') {
          checkedInAt = formatDateTime(checkIn);
          checkedOutAt = formatDateTime(checkOut);
        }
      } else {
        status = 'CHECKED_IN';
        checkedInAt = formatDateTime(checkIn);
      }

      const booking = {
        id: uuid(),
        ownerId: owner.id,
        kennelId: kennel.id,
        serviceId: boardingService.id,
        checkIn: formatDateTime(checkIn),
        checkOut: formatDateTime(checkOut),
        checkedInAt,
        checkedOutAt,
        status,
        totalPriceCents,
        notes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        createdBy: randomElement([ADMIN_USER_ID, ...staffUsers.map(s => s.id)]),
      };
      bookings.push(booking);

      await client.query(
        `INSERT INTO "Booking" (id, tenant_id, owner_id, kennel_id, service_id, check_in, check_out, checked_in_at, checked_out_at, status, total_price_cents, notes, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
        [booking.id, TENANT_ID, booking.ownerId, booking.kennelId, booking.serviceId, booking.checkIn, booking.checkOut, booking.checkedInAt, booking.checkedOutAt, booking.status, booking.totalPriceCents, booking.notes, booking.createdBy]
      );

      // Create BookingPet entry
      await client.query(
        `INSERT INTO "BookingPet" (booking_id, pet_id, tenant_id, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [booking.id, pet.id, TENANT_ID]
      );
    }
    console.log(`  Created ${bookings.length} bookings`);

    // =========================================================================
    // 10. INVOICES AND PAYMENTS
    // =========================================================================
    console.log('Creating invoices and payments...');

    let invoiceCount = 0;
    let paymentCount = 0;
    let invoiceNumber = 1000;

    // Create invoices for completed bookings
    const completedBookings = bookings.filter(b => b.status === 'CHECKED_OUT');

    for (const booking of completedBookings) {
      const invoiceDate = new Date(booking.checkOut);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // Determine payment status
      const paymentRand = Math.random();
      let paymentStatus;
      if (paymentRand < 0.7) {
        paymentStatus = 'PAID';
      } else if (paymentRand < 0.9) {
        paymentStatus = 'SENT';
      } else {
        paymentStatus = 'OVERDUE';
      }

      const subtotalCents = booking.totalPriceCents;
      const taxCents = Math.round(subtotalCents * 0.08);
      const totalCents = subtotalCents + taxCents;

      const invoice = {
        id: uuid(),
        invoiceNumber: `INV-${invoiceNumber++}`,
        bookingId: booking.id,
        ownerId: booking.ownerId,
        status: paymentStatus,
        subtotalCents,
        taxCents,
        totalCents,
        paidCents: paymentStatus === 'PAID' ? totalCents : 0,
        dueDate: formatDate(dueDate),
        issuedAt: formatDateTime(invoiceDate),
        paidAt: paymentStatus === 'PAID' ? formatDateTime(new Date(invoiceDate.getTime() + randomInt(0, 15) * 24 * 60 * 60 * 1000)) : null,
      };

      await client.query(
        `INSERT INTO "Invoice" (id, tenant_id, invoice_number, owner_id, booking_id, status, subtotal_cents, tax_cents, total_cents, paid_cents, due_date, issued_at, paid_at, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
        [invoice.id, TENANT_ID, invoice.invoiceNumber, invoice.ownerId, invoice.bookingId, invoice.status, invoice.subtotalCents, invoice.taxCents, invoice.totalCents, invoice.paidCents, invoice.dueDate, invoice.issuedAt, invoice.paidAt, ADMIN_USER_ID]
      );
      invoiceCount++;

      // Create invoice line
      await client.query(
        `INSERT INTO "InvoiceLine" (id, tenant_id, invoice_id, description, quantity, unit_price_cents, total_cents, taxable, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, 0)`,
        [uuid(), TENANT_ID, invoice.id, 'Boarding Services', 1, booking.totalPriceCents, booking.totalPriceCents]
      );

      // Create payment if paid
      if (paymentStatus === 'PAID') {
        const paymentDate = new Date(invoice.issuedAt);
        paymentDate.setDate(paymentDate.getDate() + randomInt(0, 15));

        await client.query(
          `INSERT INTO "Payment" (id, tenant_id, invoice_id, owner_id, amount_cents, method, status, processed_at, processed_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [uuid(), TENANT_ID, invoice.id, invoice.ownerId, invoice.totalCents, randomElement(['CARD', 'CARD', 'CARD', 'CASH', 'CHECK']), 'COMPLETED', formatDateTime(paymentDate), ADMIN_USER_ID]
        );
        paymentCount++;
      }
    }
    console.log(`  Created ${invoiceCount} invoices and ${paymentCount} payments`);

    // =========================================================================
    // 11. TASKS (50+)
    // =========================================================================
    console.log('Creating tasks...');

    const taskCount = randomInt(50, 75);
    let createdTasks = 0;

    for (let i = 0; i < taskCount; i++) {
      const taskType = randomElement(TASK_TYPES);
      const assignee = randomElement([...staffUsers, null, null]); // Sometimes unassigned

      // Date range: today -3 days to today +7 days
      const taskDate = new Date();
      taskDate.setDate(taskDate.getDate() + randomInt(-3, 7));

      let status;
      let completedAt = null;
      if (taskDate < today) {
        status = Math.random() > 0.1 ? 'COMPLETED' : 'PENDING';
        if (status === 'COMPLETED') {
          completedAt = formatDateTime(taskDate);
        }
      } else if (taskDate.toDateString() === today.toDateString()) {
        status = randomElement(['PENDING', 'IN_PROGRESS', 'COMPLETED']);
        if (status === 'COMPLETED') {
          completedAt = formatDateTime(taskDate);
        }
      } else {
        status = 'PENDING';
      }

      // Sometimes associate with a pet
      const pet = Math.random() > 0.3 ? randomElement(pets) : null;

      await client.query(
        `INSERT INTO "Task" (id, tenant_id, title, description, task_type, priority, status, due_at, assigned_to, pet_id, completed_at, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [uuid(), TENANT_ID, taskType.title, faker.lorem.sentence(), taskType.taskType, taskType.priority, status, formatDateTime(taskDate), assignee?.id || null, pet?.id || null, completedAt, ADMIN_USER_ID]
      );
      createdTasks++;
    }
    console.log(`  Created ${createdTasks} tasks`);

    // =========================================================================
    // 12. NOTIFICATIONS (sample)
    // =========================================================================
    console.log('Creating sample notifications...');

    const notificationTypes = [
      { type: 'BOOKING_CONFIRMED', title: 'Booking Confirmed', message: 'Your booking has been confirmed.' },
      { type: 'VACCINATION_EXPIRING', title: 'Vaccination Expiring Soon', message: 'A vaccination record is expiring within 30 days.' },
      { type: 'PAYMENT_RECEIVED', title: 'Payment Received', message: 'Payment has been successfully processed.' },
      { type: 'CHECK_IN_REMINDER', title: 'Check-in Reminder', message: 'Reminder: A pet is scheduled to check in tomorrow.' },
    ];

    let notificationCount = 0;
    for (let i = 0; i < 20; i++) {
      const notif = randomElement(notificationTypes);
      const createdAt = randomDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), today);

      await client.query(
        `INSERT INTO "Notification" (id, tenant_id, user_id, type, title, message, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuid(), TENANT_ID, ADMIN_USER_ID, notif.type, notif.title, notif.message, Math.random() > 0.5, formatDateTime(createdAt)]
      );
      notificationCount++;
    }
    console.log(`  Created ${notificationCount} notifications`);

    // =========================================================================
    // COMMIT TRANSACTION
    // =========================================================================
    await client.query('COMMIT');

    console.log('');
    console.log('='.repeat(60));
    console.log('Database seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log(`  Roles:         ${roles.length}`);
    console.log(`  Staff Users:   ${staffUsers.length}`);
    console.log(`  Owners:        ${owners.length}`);
    console.log(`  Veterinarians: ${vets.length}`);
    console.log(`  Pets:          ${pets.length}`);
    console.log(`  Vaccinations:  ${vaccinationCount}`);
    console.log(`  Kennels:       ${kennels.length}`);
    console.log(`  Runs:          ${runs.length}`);
    console.log(`  Services:      ${serviceRecords.length}`);
    console.log(`  Bookings:      ${bookings.length}`);
    console.log(`  Invoices:      ${invoiceCount}`);
    console.log(`  Payments:      ${paymentCount}`);
    console.log(`  Tasks:         ${createdTasks}`);
    console.log(`  Notifications: ${notificationCount}`);
    console.log('');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('');
    console.error('ERROR: Database seeding failed!');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed
seedDatabase().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
