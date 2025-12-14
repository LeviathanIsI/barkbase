/**
 * =============================================================================
 * BarkBase Seed Missing Data Script
 * =============================================================================
 *
 * Seeds additional data for tables that were empty after initial seed:
 * - Segments & SegmentMembers
 * - RunAssignments
 * - Incidents
 * - Messages & Conversations
 * - Packages & PackageService
 * - Activities & Notes
 * - TimeEntry & TimePunch
 *
 * Usage: npm run db:seed:missing
 *
 * =============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.development') });
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');
const crypto = require('crypto');

const TENANT_ID = '038db85c-4c00-4547-ba36-616db24151da';
const ADMIN_USER_ID = 'f6082373-c6f5-45a9-a01d-981d7c060550';

const uuid = () => crypto.randomUUID();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDateTime(date) {
  return date.toISOString();
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function seedMissingData() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL not found');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('BarkBase Seed Missing Data Script');
  console.log('='.repeat(60));
  console.log('');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch existing data we need to reference
    const { rows: owners } = await client.query('SELECT id, first_name, last_name FROM "Owner" WHERE tenant_id = $1', [TENANT_ID]);
    const { rows: pets } = await client.query('SELECT id, name, species, weight FROM "Pet" WHERE tenant_id = $1', [TENANT_ID]);
    const { rows: bookings } = await client.query('SELECT id, owner_id, status, check_in, check_out FROM "Booking" WHERE tenant_id = $1', [TENANT_ID]);
    const { rows: services } = await client.query('SELECT id, name, category, price_in_cents FROM "Service" WHERE tenant_id = $1', [TENANT_ID]);
    const { rows: runs } = await client.query('SELECT id, name, capacity FROM "Run" WHERE tenant_id = $1', [TENANT_ID]);
    const { rows: users } = await client.query('SELECT id, first_name, last_name FROM "User" WHERE tenant_id = $1', [TENANT_ID]);
    const { rows: petOwners } = await client.query('SELECT pet_id, owner_id FROM "PetOwner" WHERE tenant_id = $1', [TENANT_ID]);

    console.log(`Found ${owners.length} owners, ${pets.length} pets, ${bookings.length} bookings, ${runs.length} runs`);
    console.log('');

    // =========================================================================
    // 1. SEGMENTS
    // =========================================================================
    console.log('Creating segments...');

    const segmentDefinitions = [
      { name: 'VIP Customers', description: 'High-value repeat customers with 10+ bookings', segmentType: 'active', objectType: 'owners' },
      { name: 'New Customers', description: 'Signed up in the last 30 days', segmentType: 'active', objectType: 'owners' },
      { name: 'At Risk', description: 'Customers who haven\'t booked in 90+ days', segmentType: 'active', objectType: 'owners' },
      { name: 'Big Dogs', description: 'Owners of large breed dogs (50+ lbs)', segmentType: 'active', objectType: 'owners' },
      { name: 'Multi-Pet Households', description: 'Owners with 3 or more pets', segmentType: 'active', objectType: 'owners' },
      { name: 'Grooming Regulars', description: 'Customers who book grooming monthly', segmentType: 'active', objectType: 'owners' },
      { name: 'Boarding Only', description: 'Customers who only use boarding services', segmentType: 'static', objectType: 'owners' },
      { name: 'Daycare Regulars', description: 'Weekly daycare customers', segmentType: 'active', objectType: 'owners' },
      { name: 'First-Time Boarders', description: 'Customers with only 1 boarding booking', segmentType: 'static', objectType: 'owners' },
      { name: 'Holiday Bookers', description: 'Customers who book during peak seasons', segmentType: 'static', objectType: 'owners' },
    ];

    const segments = [];
    for (const def of segmentDefinitions) {
      const segmentId = uuid();
      // Randomly assign 5-30 owners to each segment
      const memberCount = randomInt(5, Math.min(30, owners.length));
      const shuffledOwners = [...owners].sort(() => Math.random() - 0.5).slice(0, memberCount);

      await client.query(
        `INSERT INTO "Segment" (id, tenant_id, name, description, segment_type, object_type, is_active, member_count, percent_of_total, seven_day_change, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, NOW(), NOW())`,
        [segmentId, TENANT_ID, def.name, def.description, def.segmentType, def.objectType, memberCount,
         Math.round((memberCount / owners.length) * 100 * 100) / 100, randomInt(-5, 10), ADMIN_USER_ID]
      );

      // Add segment members
      for (const owner of shuffledOwners) {
        await client.query(
          `INSERT INTO "SegmentMember" (segment_id, owner_id, tenant_id, added_at, added_by)
           VALUES ($1, $2, $3, NOW(), $4)`,
          [segmentId, owner.id, TENANT_ID, ADMIN_USER_ID]
        );
      }

      segments.push({ id: segmentId, name: def.name, memberCount });
    }
    console.log(`  Created ${segments.length} segments with members`);

    // =========================================================================
    // 2. RUN ASSIGNMENTS
    // =========================================================================
    console.log('Creating run assignments...');

    const checkedInBookings = bookings.filter(b => b.status === 'CHECKED_IN');
    let runAssignmentCount = 0;

    // Get booking pets
    const { rows: bookingPets } = await client.query(
      `SELECT bp.booking_id, bp.pet_id FROM "BookingPet" bp
       JOIN "Booking" b ON bp.booking_id = b.id
       WHERE b.tenant_id = $1 AND b.status = 'CHECKED_IN'`,
      [TENANT_ID]
    );

    // Assign pets to runs
    for (const run of runs) {
      // Assign 0-3 pets per run
      const petsToAssign = randomInt(0, Math.min(3, bookingPets.length));
      const assignedPets = bookingPets.splice(0, petsToAssign);

      for (const bp of assignedPets) {
        const booking = checkedInBookings.find(b => b.id === bp.booking_id);
        if (booking) {
          await client.query(
            `INSERT INTO "RunAssignment" (id, tenant_id, run_id, booking_id, pet_id, assigned_date, start_time, end_time, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, '09:00', '17:00', $7, NOW())`,
            [uuid(), TENANT_ID, run.id, bp.booking_id, bp.pet_id, formatDate(new Date(booking.check_in)), ADMIN_USER_ID]
          );
          runAssignmentCount++;
        }
      }
    }
    console.log(`  Created ${runAssignmentCount} run assignments`);

    // =========================================================================
    // 3. INCIDENTS
    // =========================================================================
    console.log('Creating incidents...');

    const incidentTypes = ['INJURY', 'ILLNESS', 'BEHAVIOR', 'PROPERTY_DAMAGE', 'OTHER'];
    const severities = ['LOW', 'MEDIUM', 'HIGH'];
    const statuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

    const incidentTemplates = [
      { type: 'INJURY', title: 'Minor scratch on leg', description: 'Pet received a minor scratch during playtime. Cleaned and monitored.' },
      { type: 'INJURY', title: 'Cut paw pad', description: 'Small cut found on front paw pad. Applied antiseptic and bandaged.' },
      { type: 'INJURY', title: 'Limping observed', description: 'Pet observed limping on rear left leg. No visible injury, monitoring.' },
      { type: 'ILLNESS', title: 'Vomiting episode', description: 'Pet vomited once after morning feeding. Withheld food for 2 hours, resumed eating normally.' },
      { type: 'ILLNESS', title: 'Diarrhea reported', description: 'Loose stool observed. Started bland diet, monitoring hydration.' },
      { type: 'ILLNESS', title: 'Lethargy and not eating', description: 'Pet showing signs of lethargy, refused breakfast. Contacted owner.' },
      { type: 'ILLNESS', title: 'Eye discharge', description: 'Noticed discharge from left eye. Cleaned with saline, will monitor.' },
      { type: 'BEHAVIOR', title: 'Aggressive behavior', description: 'Pet showed aggression toward another dog during group play. Separated immediately.' },
      { type: 'BEHAVIOR', title: 'Excessive barking', description: 'Continuous barking for extended period. Moved to quieter area.' },
      { type: 'BEHAVIOR', title: 'Escape attempt', description: 'Pet attempted to escape from kennel during cleaning. Secured gate reinforced.' },
      { type: 'BEHAVIOR', title: 'Resource guarding', description: 'Pet growled when food bowl approached. Will feed separately.' },
      { type: 'PROPERTY_DAMAGE', title: 'Kennel door damaged', description: 'Pet bent kennel door latch. Repaired and reinforced.' },
      { type: 'PROPERTY_DAMAGE', title: 'Bedding destroyed', description: 'Pet destroyed bedding material. Replaced with chew-resistant option.' },
      { type: 'OTHER', title: 'Missed medication', description: 'Evening medication missed due to schedule error. Owner notified, resumed next dose.' },
      { type: 'OTHER', title: 'Owner complaint', description: 'Owner concerned about check-out delay. Apologized and offered discount.' },
      { type: 'INJURY', title: 'Nail torn', description: 'Pet tore nail during outdoor play. Stopped bleeding, trimmed nail.' },
      { type: 'ILLNESS', title: 'Coughing observed', description: 'Pet has occasional cough. Vet consulted, monitoring for kennel cough.' },
      { type: 'BEHAVIOR', title: 'Anxiety during thunderstorm', description: 'Pet extremely anxious during storm. Moved to quiet room with calming music.' },
    ];

    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    let incidentCount = 0;
    for (let i = 0; i < 18; i++) {
      const template = incidentTemplates[i % incidentTemplates.length];
      const pet = randomElement(pets);
      const booking = randomElement(bookings);
      const reporter = randomElement(users);
      const incidentDate = randomDate(threeMonthsAgo, today);
      const severity = randomElement(severities);
      const status = randomElement(statuses);

      await client.query(
        `INSERT INTO "Incident" (id, tenant_id, title, description, incident_type, severity, status, incident_date, pet_id, booking_id, reported_by, resolution_notes, resolved_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
        [uuid(), TENANT_ID, template.title, template.description, template.type, severity, status,
         formatDateTime(incidentDate), pet.id, booking?.id, reporter.id,
         status === 'RESOLVED' || status === 'CLOSED' ? 'Issue resolved. Pet recovered fully.' : null,
         status === 'RESOLVED' || status === 'CLOSED' ? formatDateTime(new Date(incidentDate.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000)) : null]
      );
      incidentCount++;
    }
    console.log(`  Created ${incidentCount} incidents`);

    // =========================================================================
    // 4. CONVERSATIONS & MESSAGES
    // =========================================================================
    console.log('Creating conversations and messages...');

    const messageTemplates = [
      { type: 'booking_confirmation', subject: 'Booking Confirmed', content: 'Your booking has been confirmed. We look forward to seeing your pet!' },
      { type: 'checkin_reminder', subject: 'Check-in Reminder', content: 'Reminder: Your pet is scheduled to check in tomorrow. Please arrive between 9am-11am.' },
      { type: 'checkout_ready', subject: 'Checkout Ready', content: 'Your pet is ready for pickup! Please come by before 6pm today.' },
      { type: 'vaccination_expiring', subject: 'Vaccination Expiring Soon', content: 'Your pet\'s vaccination records will expire soon. Please update before your next visit.' },
      { type: 'payment_received', subject: 'Payment Received', content: 'Thank you! Your payment has been processed successfully.' },
      { type: 'daily_update', subject: 'Daily Pet Update', content: 'Your pet had a great day! They enjoyed playtime and ate all their meals.' },
      { type: 'photo_update', subject: 'New Photos Available', content: 'We captured some adorable moments of your pet today! Check them out in your account.' },
      { type: 'special_offer', subject: 'Special Offer Just For You', content: 'As a valued customer, enjoy 15% off your next booking. Use code VIP15 at checkout.' },
    ];

    let conversationCount = 0;
    let messageCount = 0;
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // Create conversations for 30 random owners
    const conversationOwners = [...owners].sort(() => Math.random() - 0.5).slice(0, 30);

    for (const owner of conversationOwners) {
      const conversationId = uuid();
      const numMessages = randomInt(1, 5);
      const lastMessageDate = randomDate(twoMonthsAgo, today);

      await client.query(
        `INSERT INTO "Conversation" (id, tenant_id, owner_id, subject, unread_count, last_message_at, is_archived, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())`,
        [conversationId, TENANT_ID, owner.id, randomElement(messageTemplates).subject, randomInt(0, numMessages), formatDateTime(lastMessageDate)]
      );
      conversationCount++;

      // Add messages to conversation
      for (let i = 0; i < numMessages; i++) {
        const template = randomElement(messageTemplates);
        const messageDate = new Date(lastMessageDate.getTime() - (numMessages - i) * randomInt(1, 24) * 60 * 60 * 1000);
        const senderType = i % 2 === 0 ? 'STAFF' : 'OWNER';

        await client.query(
          `INSERT INTO "Message" (id, tenant_id, conversation_id, sender_type, sender_id, content, channel, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [uuid(), TENANT_ID, conversationId, senderType,
           senderType === 'STAFF' ? randomElement(users).id : null,
           template.content, randomElement(['EMAIL', 'SMS', 'IN_APP']), Math.random() > 0.3, formatDateTime(messageDate)]
        );
        messageCount++;
      }
    }
    console.log(`  Created ${conversationCount} conversations with ${messageCount} messages`);

    // =========================================================================
    // 5. PACKAGES
    // =========================================================================
    console.log('Creating packages...');

    const packageDefinitions = [
      { name: 'Puppy Package', description: 'First-time boarding bundle - 3 nights + bath + nail trim', priceInCents: 19900, discountPercent: 10 },
      { name: 'Spa Day', description: 'Full grooming experience - Bath, haircut, nails, teeth, bandana', priceInCents: 8900, discountPercent: 15 },
      { name: 'Weekly Daycare', description: '5 days of daycare - Save $50!', priceInCents: 14900, discountPercent: 20 },
      { name: 'Extended Stay', description: '10 nights boarding at 15% off', priceInCents: 39900, discountPercent: 15 },
      { name: 'New Client Special', description: 'First visit discount - 1 night + bath at 50% off', priceInCents: 4900, discountPercent: 50 },
      { name: 'Holiday Package', description: '5 nights + daily photo updates - Perfect for vacations', priceInCents: 29900, discountPercent: 10 },
      { name: 'Training Add-On', description: 'Basic obedience - 3 training sessions with boarding', priceInCents: 14900, discountPercent: 0 },
      { name: 'Senior Pet Care', description: 'Special accommodations - Extra potty breaks, medication admin, soft bedding', priceInCents: 6500, discountPercent: 0 },
    ];

    const packages = [];
    for (const pkg of packageDefinitions) {
      const packageId = uuid();
      await client.query(
        `INSERT INTO "Package" (id, tenant_id, name, description, price_in_cents, discount_percent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
        [packageId, TENANT_ID, pkg.name, pkg.description, pkg.priceInCents, pkg.discountPercent]
      );
      packages.push({ id: packageId, name: pkg.name });

      // Link 1-3 random services to each package
      const packageServices = [...services].sort(() => Math.random() - 0.5).slice(0, randomInt(1, 3));
      for (const service of packageServices) {
        await client.query(
          `INSERT INTO "PackageService" (package_id, service_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [packageId, service.id, randomInt(1, 5)]
        );
      }
    }
    console.log(`  Created ${packages.length} packages with linked services`);

    // =========================================================================
    // 6. ACTIVITIES & NOTES
    // =========================================================================
    console.log('Creating activities and notes...');

    const activityTypes = ['note', 'call', 'email', 'sms', 'system'];
    let activityCount = 0;
    let noteCount = 0;

    // Create activities for random owners and pets
    for (let i = 0; i < 40; i++) {
      const entityType = randomElement(['owner', 'pet', 'booking']);
      let entityId;
      if (entityType === 'owner') entityId = randomElement(owners).id;
      else if (entityType === 'pet') entityId = randomElement(pets).id;
      else entityId = randomElement(bookings).id;

      const activityType = randomElement(activityTypes);
      const activityDate = randomDate(threeMonthsAgo, today);

      await client.query(
        `INSERT INTO "Activity" (id, tenant_id, entity_type, entity_id, activity_type, subject, content, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
        [uuid(), TENANT_ID, entityType, entityId, activityType,
         activityType === 'call' ? 'Phone call' : activityType === 'email' ? 'Email sent' : 'Note added',
         faker.lorem.sentence(), randomElement(users).id, formatDateTime(activityDate)]
      );
      activityCount++;
    }

    // Create notes for owners and pets
    const noteTypes = ['GENERAL', 'IMPORTANT', 'INFO'];
    for (let i = 0; i < 30; i++) {
      const entityType = randomElement(['owner', 'pet', 'booking']);
      let entityId;
      if (entityType === 'owner') entityId = randomElement(owners).id;
      else if (entityType === 'pet') entityId = randomElement(pets).id;
      else entityId = randomElement(bookings).id;

      await client.query(
        `INSERT INTO "Note" (id, tenant_id, entity_type, entity_id, content, note_type, is_pinned, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [uuid(), TENANT_ID, entityType, entityId, faker.lorem.sentences(randomInt(1, 3)),
         randomElement(noteTypes), Math.random() > 0.8, ADMIN_USER_ID]
      );
      noteCount++;
    }
    console.log(`  Created ${activityCount} activities and ${noteCount} notes`);

    // =========================================================================
    // 7. TIME ENTRIES & TIME PUNCHES
    // =========================================================================
    console.log('Creating time entries and punches...');

    let timeEntryCount = 0;
    let timePunchCount = 0;
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    // Create time entries for past week
    for (const user of users.slice(0, 5)) {
      for (let d = -7; d <= 0; d++) {
        // Skip some days randomly (days off)
        if (Math.random() > 0.7) continue;

        const entryDate = new Date(today);
        entryDate.setDate(entryDate.getDate() + d);

        // Random shift type
        const shiftType = randomElement(['MORNING', 'AFTERNOON', 'FULL']);
        let clockIn, clockOut;

        if (shiftType === 'MORNING') {
          clockIn = new Date(entryDate.setHours(6, 0, 0, 0));
          clockOut = new Date(entryDate.setHours(14, 0, 0, 0));
        } else if (shiftType === 'AFTERNOON') {
          clockIn = new Date(entryDate.setHours(14, 0, 0, 0));
          clockOut = new Date(entryDate.setHours(22, 0, 0, 0));
        } else {
          clockIn = new Date(entryDate.setHours(8, 0, 0, 0));
          clockOut = new Date(entryDate.setHours(18, 0, 0, 0));
        }

        const timeEntryId = uuid();
        await client.query(
          `INSERT INTO "TimeEntry" (id, tenant_id, user_id, clock_in, clock_out, status, source, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'COMPLETED', 'SYSTEM', NOW(), NOW())`,
          [timeEntryId, TENANT_ID, user.id, formatDateTime(clockIn), formatDateTime(clockOut)]
        );
        timeEntryCount++;

        // Create corresponding time punches
        await client.query(
          `INSERT INTO "TimePunch" (id, tenant_id, user_id, punch_type, timestamp, time_entry_id, created_at, updated_at)
           VALUES ($1, $2, $3, 'CLOCK_IN', $4, $5, NOW(), NOW())`,
          [uuid(), TENANT_ID, user.id, formatDateTime(clockIn), timeEntryId]
        );
        await client.query(
          `INSERT INTO "TimePunch" (id, tenant_id, user_id, punch_type, timestamp, time_entry_id, created_at, updated_at)
           VALUES ($1, $2, $3, 'CLOCK_OUT', $4, $5, NOW(), NOW())`,
          [uuid(), TENANT_ID, user.id, formatDateTime(clockOut), timeEntryId]
        );
        timePunchCount += 2;
      }
    }
    console.log(`  Created ${timeEntryCount} time entries and ${timePunchCount} time punches`);

    // =========================================================================
    // COMMIT
    // =========================================================================
    await client.query('COMMIT');

    console.log('');
    console.log('='.repeat(60));
    console.log('Missing data seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log(`  Segments:        ${segments.length}`);
    console.log(`  Run Assignments: ${runAssignmentCount}`);
    console.log(`  Incidents:       ${incidentCount}`);
    console.log(`  Conversations:   ${conversationCount}`);
    console.log(`  Messages:        ${messageCount}`);
    console.log(`  Packages:        ${packages.length}`);
    console.log(`  Activities:      ${activityCount}`);
    console.log(`  Notes:           ${noteCount}`);
    console.log(`  Time Entries:    ${timeEntryCount}`);
    console.log(`  Time Punches:    ${timePunchCount}`);
    console.log('');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('');
    console.error('ERROR: Seeding failed!');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedMissingData().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
