const { Client } = require('pg');
const { randomUUID } = require('crypto');

// Your existing IDs
const TENANT_ID = '1cebbebe-c614-4a40-a22c-d4f3e2ccf480';
const USER_ID = '6d8a355c-0659-41d1-935e-4d211f2b5404';
const MEMBERSHIP_ID = 'fa542cf2-281e-41a1-ac40-f4f8352a8621';

(async () => {
  const client = new Client({
    host: 'barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com',
    port: 5432,
    database: 'barkbase',
    user: 'postgres',
    password: 'd9ZOrLo13E1iAjtUlWN1LiRm.1GZ-s',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // ==================== STAFF ====================
    console.log('Creating Staff...');
    const staffId = randomUUID();
    await client.query(`
      INSERT INTO "Staff" ("recordId", "tenantId", "membershipId", "title", "phone", "schedule", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, 'Owner/Manager', '555-0100', '{"monday": ["09:00-17:00"], "tuesday": ["09:00-17:00"], "wednesday": ["09:00-17:00"], "thursday": ["09:00-17:00"], "friday": ["09:00-17:00"]}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [staffId, TENANT_ID, MEMBERSHIP_ID]);
    console.log(`  ✓ Staff created: ${staffId}\n`);

    // ==================== OWNERS ====================
    console.log('Creating Owners...');
    const owners = [
      { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@email.com', phone: '555-0101' },
      { firstName: 'Michael', lastName: 'Chen', email: 'michael.chen@email.com', phone: '555-0102' },
      { firstName: 'Emily', lastName: 'Rodriguez', email: 'emily.rodriguez@email.com', phone: '555-0103' },
      { firstName: 'David', lastName: 'Williams', email: 'david.williams@email.com', phone: '555-0104' },
      { firstName: 'Jessica', lastName: 'Brown', email: 'jessica.brown@email.com', phone: '555-0105' }
    ];
    
    const ownerIds = [];
    for (const owner of owners) {
      const ownerId = randomUUID();
      ownerIds.push(ownerId);
      await client.query(`
        INSERT INTO "Owner" ("recordId", "tenantId", "firstName", "lastName", "email", "phone", "address", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [ownerId, TENANT_ID, owner.firstName, owner.lastName, owner.email, owner.phone, 
          JSON.stringify({ street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701' })]);
      console.log(`  ✓ Owner: ${owner.firstName} ${owner.lastName}`);
    }
    console.log('');

    // ==================== PETS ====================
    console.log('Creating Pets...');
    const pets = [
      { name: 'Max', species: 'Dog', breed: 'Golden Retriever', ownerId: ownerIds[0], weight: 65 },
      { name: 'Luna', species: 'Dog', breed: 'German Shepherd', ownerId: ownerIds[0], weight: 70 },
      { name: 'Charlie', species: 'Dog', breed: 'Labrador', ownerId: ownerIds[1], weight: 75 },
      { name: 'Bella', species: 'Dog', breed: 'French Bulldog', ownerId: ownerIds[2], weight: 25 },
      { name: 'Cooper', species: 'Dog', breed: 'Beagle', ownerId: ownerIds[2], weight: 30 },
      { name: 'Daisy', species: 'Dog', breed: 'Poodle', ownerId: ownerIds[3], weight: 45 },
      { name: 'Rocky', species: 'Dog', breed: 'Boxer', ownerId: ownerIds[4], weight: 68 },
      { name: 'Molly', species: 'Cat', breed: 'Maine Coon', ownerId: ownerIds[4], weight: 12 }
    ];

    const petIds = [];
    for (const pet of pets) {
      const petId = randomUUID();
      petIds.push(petId);
      await client.query(`
        INSERT INTO "Pet" ("recordId", "tenantId", "name", "species", "breed", "birthdate", "weight", "medicalNotes", "dietaryNotes", "behaviorFlags", "status", "primaryOwnerId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [petId, TENANT_ID, pet.name, pet.species, pet.breed, 
          new Date(Date.now() - Math.random() * 157680000000), // Random age up to 5 years
          pet.weight, 
          'No known medical issues', 
          'Standard diet', 
          JSON.stringify({ friendly: true, energetic: true }), 
          pet.ownerId]);
      console.log(`  ✓ Pet: ${pet.name} (${pet.breed})`);

      // Create PetOwner relationship
      const petOwnerId = randomUUID();
      await client.query(`
        INSERT INTO "PetOwner" ("recordId", "tenantId", "petId", "ownerId", "isPrimary")
        VALUES ($1, $2, $3, $4, true)
      `, [petOwnerId, TENANT_ID, petId, pet.ownerId]);
    }
    console.log('');

    // ==================== VACCINATIONS ====================
    console.log('Creating Vaccinations...');
    const vaccinationTypes = ['Rabies', 'Distemper', 'Bordetella', 'Parvo', 'Feline Leukemia'];
    for (let i = 0; i < petIds.length; i++) {
      const vaccId = randomUUID();
      const type = vaccinationTypes[i % vaccinationTypes.length];
      const administeredAt = new Date(Date.now() - Math.random() * 31536000000); // Within last year
      const expiresAt = new Date(administeredAt.getTime() + 31536000000); // 1 year later
      
      await client.query(`
        INSERT INTO "Vaccination" ("recordId", "tenantId", "petId", "type", "administeredAt", "expiresAt", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [vaccId, TENANT_ID, petIds[i], type, administeredAt, expiresAt]);
      console.log(`  ✓ Vaccination: ${type} for ${pets[i].name}`);
    }
    console.log('');

    // ==================== KENNELS ====================
    console.log('Creating Kennels...');
    const kennels = [
      { name: 'Suite A1', type: 'SUITE', size: 'Large', capacity: 2, dailyRate: 8500 },
      { name: 'Suite A2', type: 'SUITE', size: 'Large', capacity: 2, dailyRate: 8500 },
      { name: 'Kennel B1', type: 'KENNEL', size: 'Medium', capacity: 1, dailyRate: 5500 },
      { name: 'Kennel B2', type: 'KENNEL', size: 'Medium', capacity: 1, dailyRate: 5500 },
      { name: 'Kennel B3', type: 'KENNEL', size: 'Medium', capacity: 1, dailyRate: 5500 },
      { name: 'Cabin C1', type: 'CABIN', size: 'X-Large', capacity: 3, dailyRate: 12000 },
      { name: 'Daycare Area', type: 'DAYCARE', size: 'Large', capacity: 20, dailyRate: 3500 },
      { name: 'Medical Room', type: 'MEDICAL', size: 'Small', capacity: 1, dailyRate: 15000 }
    ];

    const kennelIds = [];
    for (const kennel of kennels) {
      const kennelId = randomUUID();
      kennelIds.push(kennelId);
      await client.query(`
        INSERT INTO "Kennel" ("recordId", "tenantId", "name", "type", "size", "capacity", "dailyRate", "amenities", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, '["Climate Control", "Webcam"]', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [kennelId, TENANT_ID, kennel.name, kennel.type, kennel.size, kennel.capacity, kennel.dailyRate]);
      console.log(`  ✓ Kennel: ${kennel.name} (${kennel.type})`);
    }
    console.log('');

    // ==================== SERVICES ====================
    console.log('Creating Services...');
    const services = [
      { name: 'Bath & Brush', category: 'GROOMING', price: 3500 },
      { name: 'Full Grooming', category: 'GROOMING', price: 6500 },
      { name: 'Nail Trim', category: 'GROOMING', price: 1500 },
      { name: 'Basic Training Session', category: 'TRAINING', price: 7500 },
      { name: 'Medication Administration', category: 'OTHER', price: 500 },
      { name: 'Extra Playtime', category: 'DAYCARE', price: 2000 }
    ];

    const serviceIds = [];
    for (const service of services) {
      const serviceId = randomUUID();
      serviceIds.push(serviceId);
      await client.query(`
        INSERT INTO "Service" ("recordId", "tenantId", "name", "description", "priceCents", "category", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [serviceId, TENANT_ID, service.name, `Professional ${service.name.toLowerCase()}`, service.price, service.category]);
      console.log(`  ✓ Service: ${service.name} ($${service.price / 100})`);
    }
    console.log('');

    // ==================== BOOKINGS ====================
    console.log('Creating Bookings...');
    const bookingStatuses = ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'];
    const bookingIds = [];

    for (let i = 0; i < 6; i++) {
      const bookingId = randomUUID();
      bookingIds.push(bookingId);
      
      const petId = petIds[i];
      const ownerId = pets[i].ownerId;
      const status = bookingStatuses[i % bookingStatuses.length];
      const checkIn = new Date(Date.now() - (5 - i) * 86400000); // Staggered dates
      const checkOut = new Date(checkIn.getTime() + (3 + i) * 86400000); // 3-8 days
      const totalCents = kennels[i % kennels.length].dailyRate * (3 + i);
      
      await client.query(`
        INSERT INTO "Booking" ("recordId", "tenantId", "petId", "ownerId", "status", "checkIn", "checkOut", "depositCents", "totalCents", "balanceDueCents", "notes", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Standard boarding reservation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [bookingId, TENANT_ID, petId, ownerId, status, checkIn, checkOut, totalCents * 0.3, totalCents, totalCents * 0.7]);
      console.log(`  ✓ Booking: ${pets[i].name} (${status})`);

      // Create BookingSegment
      const segmentId = randomUUID();
      await client.query(`
        INSERT INTO "BookingSegment" ("recordId", "tenantId", "bookingId", "kennelId", "startDate", "endDate", "status")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [segmentId, TENANT_ID, bookingId, kennelIds[i % kennelIds.length], checkIn, checkOut, status]);

      // Add a service to some bookings
      if (i % 2 === 0) {
        const bookingServiceId = randomUUID();
        await client.query(`
          INSERT INTO "BookingService" ("recordId", "tenantId", "bookingId", "serviceId", "quantity", "priceCents")
          VALUES ($1, $2, $3, $4, 1, $5)
        `, [bookingServiceId, TENANT_ID, bookingId, serviceIds[i % serviceIds.length], services[i % services.length].price]);
      }
    }
    console.log('');

    // ==================== PAYMENTS ====================
    console.log('Creating Payments...');
    for (let i = 0; i < bookingIds.length; i++) {
      const paymentId = randomUUID();
      const booking = i;
      const amountCents = Math.floor(kennels[i % kennels.length].dailyRate * (3 + i) * 0.3);
      
      await client.query(`
        INSERT INTO "Payment" ("recordId", "tenantId", "bookingId", "ownerId", "amountCents", "currency", "status", "method", "metadata", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, 'USD', 'SUCCESSFUL', 'card', '{"brand": "visa", "last4": "4242"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [paymentId, TENANT_ID, bookingIds[i], pets[i].ownerId, amountCents]);
      console.log(`  ✓ Payment: $${amountCents / 100} for ${pets[i].name}'s booking`);
    }
    console.log('');

    // ==================== CHECK-INS ====================
    console.log('Creating Check-Ins...');
    for (let i = 0; i < 4; i++) {
      const checkInId = randomUUID();
      await client.query(`
        INSERT INTO "CheckIn" ("recordId", "tenantId", "bookingId", "staffId", "time", "weight", "photos", "notes", "conditionRating", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, '[]', 'Pet arrived in good health', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [checkInId, TENANT_ID, bookingIds[i], staffId, pets[i].weight]);
      console.log(`  ✓ Check-In: ${pets[i].name}`);
    }
    console.log('');

    // ==================== INCIDENT REPORTS ====================
    console.log('Creating Incident Report...');
    const incidentId = randomUUID();
    await client.query(`
      INSERT INTO "IncidentReport" ("recordId", "tenantId", "petId", "bookingId", "occurredAt", "severity", "narrative", "photos", "vetContacted", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'MINOR', 'Minor scratch during playtime. Cleaned and monitored. Pet is fine.', '[]', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [incidentId, TENANT_ID, petIds[0], bookingIds[0]]);
    console.log(`  ✓ Incident Report: Minor scratch for ${pets[0].name}\n`);

    // ==================== CHECK-OUTS ====================
    console.log('Creating Check-Outs...');
    for (let i = 0; i < 2; i++) {
      const checkOutId = randomUUID();
      await client.query(`
        INSERT INTO "CheckOut" ("recordId", "tenantId", "bookingId", "staffId", "time", "extraCharges", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [checkOutId, TENANT_ID, bookingIds[i + 4], staffId]);
      console.log(`  ✓ Check-Out: ${pets[i + 4].name}`);
    }
    console.log('');

    // ==================== COMMUNICATIONS ====================
    console.log('Creating Communications...');
    const commTypes = [
      { type: 'EMAIL', direction: 'OUTBOUND', subject: 'Booking Confirmation', content: 'Your booking has been confirmed!' },
      { type: 'SMS', direction: 'OUTBOUND', subject: null, content: 'Reminder: Check-in tomorrow at 9am' },
      { type: 'CALL', direction: 'INBOUND', subject: null, content: 'Owner called to inquire about vaccination requirements' }
    ];

    for (let i = 0; i < 3; i++) {
      const commId = randomUUID();
      const comm = commTypes[i];
      await client.query(`
        INSERT INTO "Communication" ("recordId", "tenantId", "ownerId", "userId", "type", "direction", "subject", "content", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [commId, TENANT_ID, ownerIds[i], USER_ID, comm.type, comm.direction, comm.subject, comm.content]);
      console.log(`  ✓ Communication: ${comm.type} - ${comm.content.substring(0, 40)}...`);
    }
    console.log('');

    // ==================== NOTES ====================
    console.log('Creating Notes...');
    const notes = [
      { entityType: 'Pet', entityId: petIds[0], content: 'Loves treats! Very food motivated.' },
      { entityType: 'Pet', entityId: petIds[1], content: 'Needs medication at 8am daily' },
      { entityType: 'Booking', entityId: bookingIds[0], content: 'Owner requested extra playtime' }
    ];

    for (const note of notes) {
      const noteId = randomUUID();
      await client.query(`
        INSERT INTO "Note" ("recordId", "tenantId", "entityType", "entityId", "content", "visibility", "isPinned", "authorId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, 'ALL', false, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [noteId, TENANT_ID, note.entityType, note.entityId, note.content, USER_ID]);
      console.log(`  ✓ Note: ${note.entityType} - ${note.content.substring(0, 40)}...`);
    }
    console.log('');

    // ==================== TASKS ====================
    console.log('Creating Tasks...');
    const tasks = [
      { type: 'FEEDING', relatedType: 'Booking', relatedId: bookingIds[0], scheduledFor: new Date(), priority: 'HIGH' },
      { type: 'MEDICATION', relatedType: 'Pet', relatedId: petIds[1], scheduledFor: new Date(Date.now() + 3600000), priority: 'URGENT' },
      { type: 'EXERCISE', relatedType: 'Booking', relatedId: bookingIds[1], scheduledFor: new Date(Date.now() + 7200000), priority: 'NORMAL' }
    ];

    for (const task of tasks) {
      const taskId = randomUUID();
      await client.query(`
        INSERT INTO "Task" ("recordId", "tenantId", "type", "relatedType", "relatedId", "assignedTo", "scheduledFor", "priority", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [taskId, TENANT_ID, task.type, task.relatedType, task.relatedId, staffId, task.scheduledFor, task.priority]);
      console.log(`  ✓ Task: ${task.type} (${task.priority})`);
    }
    console.log('');

    // ==================== CUSTOMER SEGMENTS ====================
    console.log('Creating Customer Segments...');
    const segments = [
      { name: 'VIP Customers', description: 'High-value repeat customers', color: '#FFD700' },
      { name: 'New Customers', description: 'Customers with less than 3 bookings', color: '#4CAF50' }
    ];

    const segmentIds = [];
    for (const segment of segments) {
      const segmentId = randomUUID();
      segmentIds.push(segmentId);
      await client.query(`
        INSERT INTO "CustomerSegment" ("recordId", "tenantId", "name", "description", "conditions", "isAutomatic", "isActive", "color", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, '{}', false, true, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [segmentId, TENANT_ID, segment.name, segment.description, segment.color]);
      console.log(`  ✓ Segment: ${segment.name}`);

      // Add a member to each segment
      const memberId = randomUUID();
      await client.query(`
        INSERT INTO "CustomerSegmentMember" ("recordId", "tenantId", "segmentId", "ownerId", "isManual")
        VALUES ($1, $2, $3, $4, true)
      `, [memberId, TENANT_ID, segmentId, ownerIds[segmentIds.length - 1]]);
    }
    console.log('');

    // ==================== CUSTOMER TAGS ====================
    console.log('Creating Customer Tags...');
    const tags = [
      { name: 'Large Dogs', color: '#FF5722' },
      { name: 'Requires Special Care', color: '#9C27B0' },
      { name: 'First Time Customer', color: '#2196F3' }
    ];

    const tagIds = [];
    for (const tag of tags) {
      const tagId = randomUUID();
      tagIds.push(tagId);
      await client.query(`
        INSERT INTO "CustomerTag" ("recordId", "tenantId", "name", "color", "createdAt")
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [tagId, TENANT_ID, tag.name, tag.color]);
      console.log(`  ✓ Tag: ${tag.name}`);

      // Add tag members
      const tagMemberId = randomUUID();
      await client.query(`
        INSERT INTO "CustomerTagMember" ("recordId", "tenantId", "tagId", "ownerId")
        VALUES ($1, $2, $3, $4)
      `, [tagMemberId, TENANT_ID, tagId, ownerIds[tagIds.length - 1]]);
    }
    console.log('');

    // ==================== CAMPAIGNS ====================
    console.log('Creating Campaign...');
    const campaignId = randomUUID();
    await client.query(`
      INSERT INTO "Campaign" ("recordId", "tenantId", "name", "description", "type", "status", "segmentId", "content", "scheduledAt", "createdById", "createdAt", "updatedAt")
      VALUES ($1, $2, 'Spring Boarding Special', 'Promotional campaign for spring', 'EMAIL', 'SCHEDULED', $3, '{"subject": "20% Off Spring Boarding!", "body": "Book now!"}', $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [campaignId, TENANT_ID, segmentIds[0], new Date(Date.now() + 86400000), USER_ID]);
    console.log(`  ✓ Campaign: Spring Boarding Special\n`);

    // ==================== RUNS ====================
    console.log('Creating Runs...');
    const runs = [
      { name: 'Morning Run', capacity: 10, scheduleTime: '09:00', color: '#FFC107' },
      { name: 'Afternoon Run', capacity: 8, scheduleTime: '14:00', color: '#03A9F4' },
      { name: 'Evening Run', capacity: 6, scheduleTime: '17:00', color: '#FF5722' }
    ];

    const runIds = [];
    for (const run of runs) {
      const runId = randomUUID();
      runIds.push(runId);
      await client.query(`
        INSERT INTO "runs" ("recordId", "tenantId", "name", "capacity", "scheduleTime", "color", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [runId, TENANT_ID, run.name, run.capacity, run.scheduleTime, run.color]);
      console.log(`  ✓ Run: ${run.name} at ${run.scheduleTime}`);

      // Assign some pets to runs
      if (runIds.length <= petIds.length) {
        const assignmentId = randomUUID();
        await client.query(`
          INSERT INTO "run_assignments" ("recordId", "tenantId", "runId", "petId", "date", "createdAt")
          VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_TIMESTAMP)
        `, [assignmentId, TENANT_ID, runId, petIds[runIds.length - 1]]);
      }
    }
    console.log('');

    // ==================== MESSAGES ====================
    console.log('Creating Messages...');
    const conversationId = randomUUID();
    const messages = [
      { content: 'Hi! Question about boarding availability next week.' },
      { content: 'Yes, we have availability! What dates were you looking at?' },
      { content: 'Perfect! I need Monday through Friday for Max.' }
    ];

    for (const msg of messages) {
      const messageId = randomUUID();
      await client.query(`
        INSERT INTO "messages" ("recordId", "tenantId", "conversationId", "senderId", "content", "isRead", "createdAt")
        VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
      `, [messageId, TENANT_ID, conversationId, USER_ID, msg.content]);
      console.log(`  ✓ Message: ${msg.content.substring(0, 50)}...`);
    }
    console.log('');

    // ==================== AUDIT LOGS ====================
    console.log('Creating Audit Logs...');
    const actions = [
      { action: 'CREATE', entityType: 'Booking', entityId: bookingIds[0] },
      { action: 'UPDATE', entityType: 'Pet', entityId: petIds[0] },
      { action: 'DELETE', entityType: 'Note', entityId: randomUUID() }
    ];

    for (const log of actions) {
      const auditId = randomUUID();
      await client.query(`
        INSERT INTO "AuditLog" ("recordId", "tenantId", "actorId", "action", "entityType", "entityId", "diff", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, '{}', CURRENT_TIMESTAMP)
      `, [auditId, TENANT_ID, USER_ID, log.action, log.entityType, log.entityId]);
      console.log(`  ✓ Audit Log: ${log.action} ${log.entityType}`);
    }
    console.log('');

    // ==================== USAGE COUNTER ====================
    console.log('Creating Usage Counter...');
    const usageId = randomUUID();
    await client.query(`
      INSERT INTO "UsageCounter" ("recordId", "tenantId", "date", "bookings", "activePets", "staffSeats", "createdAt", "updatedAt")
      VALUES ($1, $2, CURRENT_DATE, $3, $4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [usageId, TENANT_ID, bookingIds.length, petIds.length]);
    console.log(`  ✓ Usage Counter: ${bookingIds.length} bookings, ${petIds.length} pets\n`);

    console.log('✅ ALL SEED DATA CREATED SUCCESSFULLY!\n');
    console.log('Summary:');
    console.log(`  - Staff: 1`);
    console.log(`  - Owners: ${owners.length}`);
    console.log(`  - Pets: ${pets.length}`);
    console.log(`  - Kennels: ${kennels.length}`);
    console.log(`  - Services: ${services.length}`);
    console.log(`  - Bookings: ${bookingIds.length}`);
    console.log(`  - Payments: ${bookingIds.length}`);
    console.log(`  - Vaccinations: ${petIds.length}`);
    console.log(`  - Check-Ins: 4`);
    console.log(`  - Check-Outs: 2`);
    console.log(`  - Incident Reports: 1`);
    console.log(`  - Communications: 3`);
    console.log(`  - Notes: 3`);
    console.log(`  - Tasks: 3`);
    console.log(`  - Segments: 2`);
    console.log(`  - Tags: 3`);
    console.log(`  - Campaigns: 1`);
    console.log(`  - Runs: 3`);
    console.log(`  - Messages: 3`);
    console.log(`  - Audit Logs: 3`);
    console.log(`  - Usage Counter: 1`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
})();

