/**
 * =============================================================================
 * BarkBase Seed Runs Script
 * =============================================================================
 *
 * Seeds RunTemplates, Runs, and RunAssignments with proper data model:
 *
 * - Kennels = boarding spaces (A1, A2, B1, etc.) - already seeded
 * - Runs = daycare play areas (SOCIAL, INDIVIDUAL, TRAINING types)
 * - RunTemplates = scheduled session templates (morning play, afternoon training, etc.)
 * - RunAssignments = assigns pets to runs for specific dates
 *
 * Usage: npm run db:seed:runs
 *
 * =============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.development') });
const { Pool } = require('pg');
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

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function seedRuns() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL not found');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('BarkBase Seed Runs Script');
  console.log('='.repeat(60));
  console.log('');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing data to start fresh
    console.log('Clearing existing RunAssignments, Runs, and RunTemplates...');
    await client.query('DELETE FROM "RunAssignment" WHERE tenant_id = $1', [TENANT_ID]);
    await client.query('DELETE FROM "Run" WHERE tenant_id = $1', [TENANT_ID]);
    await client.query('DELETE FROM "RunTemplate" WHERE tenant_id = $1', [TENANT_ID]);

    // Fetch existing data we need
    const { rows: bookings } = await client.query(
      `SELECT b.id, b.status, b.check_in, b.check_out
       FROM "Booking" b
       WHERE b.tenant_id = $1
       ORDER BY b.check_in DESC`,
      [TENANT_ID]
    );

    const { rows: bookingPets } = await client.query(
      `SELECT bp.booking_id, bp.pet_id, p.name as pet_name, p.species
       FROM "BookingPet" bp
       JOIN "Pet" p ON bp.pet_id = p.id
       WHERE bp.tenant_id = $1`,
      [TENANT_ID]
    );

    console.log(`Found ${bookings.length} bookings, ${bookingPets.length} booking-pet links`);
    console.log('');

    // =========================================================================
    // 1. SEED RUN TEMPLATES (Scheduled Activity Sessions)
    // =========================================================================
    console.log('Creating run templates...');

    // Days of week as integers: 0=Sunday, 1=Monday, ..., 6=Saturday
    const MON_SAT = [1, 2, 3, 4, 5, 6];
    const MON_FRI = [1, 2, 3, 4, 5];
    const MON_WED_FRI = [1, 3, 5];
    const TUE_THU = [2, 4];
    const TUE_THU_SAT = [2, 4, 6];
    const SAT_SUN = [0, 6];
    const SUN_ONLY = [0];

    const runTemplateDefinitions = [
      // Morning sessions
      { name: 'Morning Social Play', description: 'Group play session for social dogs', capacity: 15, startTime: '08:00', endTime: '10:00', runType: 'SOCIAL', daysOfWeek: MON_SAT },
      { name: 'Morning Individual Time', description: 'One-on-one play for dogs needing individual attention', capacity: 5, startTime: '08:00', endTime: '10:00', runType: 'INDIVIDUAL', daysOfWeek: MON_SAT },
      { name: 'Morning Training', description: 'Basic obedience and enrichment activities', capacity: 8, startTime: '09:00', endTime: '10:30', runType: 'TRAINING', daysOfWeek: MON_WED_FRI },

      // Midday sessions
      { name: 'Midday Social Play', description: 'Afternoon group play for energetic dogs', capacity: 15, startTime: '11:00', endTime: '13:00', runType: 'SOCIAL', daysOfWeek: MON_SAT },
      { name: 'Puppy Playgroup', description: 'Supervised play for puppies under 1 year', capacity: 10, startTime: '11:00', endTime: '12:00', runType: 'SOCIAL', daysOfWeek: MON_WED_FRI },
      { name: 'Small Dog Social', description: 'Play group for dogs under 25 lbs', capacity: 12, startTime: '11:30', endTime: '13:00', runType: 'SOCIAL', daysOfWeek: TUE_THU_SAT },

      // Afternoon sessions
      { name: 'Afternoon Social Play', description: 'Late afternoon group play session', capacity: 15, startTime: '14:00', endTime: '16:00', runType: 'SOCIAL', daysOfWeek: MON_SAT },
      { name: 'Afternoon Individual Time', description: 'One-on-one time for shy or reactive dogs', capacity: 5, startTime: '14:00', endTime: '16:00', runType: 'INDIVIDUAL', daysOfWeek: MON_SAT },
      { name: 'Afternoon Training', description: 'Agility and advanced training', capacity: 6, startTime: '15:00', endTime: '16:30', runType: 'TRAINING', daysOfWeek: TUE_THU },

      // Evening sessions
      { name: 'Evening Wind-Down', description: 'Calm play before boarding pickup', capacity: 12, startTime: '16:30', endTime: '18:00', runType: 'SOCIAL', daysOfWeek: MON_FRI },

      // Weekend specials
      { name: 'Weekend Adventure', description: 'Extended outdoor play with activities', capacity: 15, startTime: '10:00', endTime: '14:00', runType: 'SOCIAL', daysOfWeek: SAT_SUN },
      { name: 'Sunday Splash', description: 'Water play and pool time (summer)', capacity: 10, startTime: '11:00', endTime: '13:00', runType: 'SOCIAL', daysOfWeek: SUN_ONLY },
    ];

    const runTemplates = [];
    for (const def of runTemplateDefinitions) {
      const templateId = uuid();
      await client.query(
        `INSERT INTO "RunTemplate" (id, tenant_id, name, description, capacity, start_time, end_time, days_of_week, run_type, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())`,
        [templateId, TENANT_ID, def.name, def.description, def.capacity, def.startTime, def.endTime, def.daysOfWeek, def.runType]
      );
      runTemplates.push({ id: templateId, ...def });
    }
    console.log(`  Created ${runTemplates.length} run templates`);

    // =========================================================================
    // 2. SEED RUNS (Physical Daycare Play Areas)
    // =========================================================================
    console.log('Creating runs (play areas)...');

    const runDefinitions = [
      // Social play yards
      { name: 'Main Yard', description: 'Large outdoor play area for social dogs', capacity: 20, runType: 'SOCIAL' },
      { name: 'Small Dog Yard', description: 'Fenced area for dogs under 25 lbs', capacity: 12, runType: 'SOCIAL' },
      { name: 'Puppy Pen', description: 'Safe play space for puppies', capacity: 10, runType: 'SOCIAL' },
      { name: 'Indoor Play Room A', description: 'Climate-controlled indoor play space', capacity: 15, runType: 'SOCIAL' },
      { name: 'Indoor Play Room B', description: 'Secondary indoor play area', capacity: 12, runType: 'SOCIAL' },

      // Individual exercise areas
      { name: 'Private Yard 1', description: 'Individual exercise area', capacity: 2, runType: 'INDIVIDUAL' },
      { name: 'Private Yard 2', description: 'Individual exercise area', capacity: 2, runType: 'INDIVIDUAL' },
      { name: 'Private Yard 3', description: 'Individual exercise area', capacity: 2, runType: 'INDIVIDUAL' },
      { name: 'Quiet Room', description: 'Calm space for shy or senior dogs', capacity: 4, runType: 'INDIVIDUAL' },

      // Training areas
      { name: 'Training Ring', description: 'Main training and agility area', capacity: 8, runType: 'TRAINING' },
      { name: 'Obedience Room', description: 'Indoor training classroom', capacity: 6, runType: 'TRAINING' },

      // Special areas
      { name: 'Splash Pool', description: 'Water play area (seasonal)', capacity: 8, runType: 'SOCIAL' },
      { name: 'Enrichment Zone', description: 'Puzzle toys and mental stimulation', capacity: 6, runType: 'TRAINING' },
    ];

    const runs = [];
    for (const def of runDefinitions) {
      const runId = uuid();
      await client.query(
        `INSERT INTO "Run" (id, tenant_id, name, description, capacity, run_type, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
        [runId, TENANT_ID, def.name, def.description, def.capacity, def.runType]
      );
      runs.push({ id: runId, ...def });
    }
    console.log(`  Created ${runs.length} runs`);

    // =========================================================================
    // 3. SEED RUN ASSIGNMENTS
    // =========================================================================
    console.log('Creating run assignments...');

    // Build a map of booking_id -> pets
    const bookingPetsMap = {};
    for (const bp of bookingPets) {
      if (!bookingPetsMap[bp.booking_id]) {
        bookingPetsMap[bp.booking_id] = [];
      }
      bookingPetsMap[bp.booking_id].push(bp);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Track run occupancy by date to avoid overbooking
    const runOccupancy = {}; // { runId_date: count }

    function getOccupancyKey(runId, date) {
      return `${runId}_${formatDate(date)}`;
    }

    function isRunAvailable(run, date, petsToAdd = 1) {
      const key = getOccupancyKey(run.id, date);
      const currentOccupancy = runOccupancy[key] || 0;
      return currentOccupancy + petsToAdd <= run.capacity;
    }

    function addToRun(run, date, petsCount = 1) {
      const key = getOccupancyKey(run.id, date);
      runOccupancy[key] = (runOccupancy[key] || 0) + petsCount;
    }

    let assignmentCount = 0;
    let currentAssignments = 0;
    let historicalAssignments = 0;

    // Process bookings in order (most recent first)
    for (const booking of bookings) {
      const pets = bookingPetsMap[booking.id] || [];
      if (pets.length === 0) continue;

      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);

      // Determine if this is current or historical
      const isCurrent = booking.status === 'CHECKED_IN' ||
                       (booking.status === 'CONFIRMED' && checkIn <= today);

      // Only process a subset of historical bookings (last 60 days)
      const sixtyDaysAgo = new Date(today);
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      if (checkOut < sixtyDaysAgo && booking.status === 'CHECKED_OUT') {
        continue; // Skip old historical bookings
      }

      // For each day of the booking, create run assignments
      const startDate = new Date(Math.max(checkIn.getTime(), sixtyDaysAgo.getTime()));
      const endDate = new Date(Math.min(checkOut.getTime(), today.getTime() + 7 * 24 * 60 * 60 * 1000)); // Up to 7 days in future

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const currentDate = new Date(d);

        // Assign each pet to a run for this day
        for (const pet of pets) {
          // Determine appropriate run type based on pet
          let preferredRunType = 'SOCIAL';
          if (Math.random() < 0.2) preferredRunType = 'INDIVIDUAL'; // 20% need individual
          if (Math.random() < 0.1) preferredRunType = 'TRAINING'; // 10% in training

          // Find available run of preferred type
          const availableRuns = runs.filter(r =>
            r.runType === preferredRunType && isRunAvailable(r, currentDate)
          );

          // Fallback to any available social run
          const fallbackRuns = runs.filter(r =>
            r.runType === 'SOCIAL' && isRunAvailable(r, currentDate)
          );

          const targetRun = availableRuns.length > 0
            ? randomElement(availableRuns)
            : fallbackRuns.length > 0
              ? randomElement(fallbackRuns)
              : null;

          if (targetRun) {
            // Random time slot
            const timeSlots = [
              { start: '08:00', end: '12:00' },
              { start: '09:00', end: '13:00' },
              { start: '10:00', end: '14:00' },
              { start: '13:00', end: '17:00' },
              { start: '14:00', end: '18:00' },
            ];
            const slot = randomElement(timeSlots);

            await client.query(
              `INSERT INTO "RunAssignment" (id, tenant_id, run_id, booking_id, pet_id, assigned_date, start_time, end_time, is_individual, notes, created_at, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)`,
              [
                uuid(),
                TENANT_ID,
                targetRun.id,
                booking.id,
                pet.pet_id,
                formatDate(currentDate),
                slot.start,
                slot.end,
                preferredRunType === 'INDIVIDUAL',
                null,
                ADMIN_USER_ID
              ]
            );

            addToRun(targetRun, currentDate);
            assignmentCount++;

            if (currentDate >= today) {
              currentAssignments++;
            } else {
              historicalAssignments++;
            }
          }
        }
      }

      // Limit total assignments to keep reasonable
      if (assignmentCount > 500) break;
    }

    console.log(`  Created ${assignmentCount} run assignments`);
    console.log(`    - Current/upcoming: ${currentAssignments}`);
    console.log(`    - Historical: ${historicalAssignments}`);

    // =========================================================================
    // COMMIT
    // =========================================================================
    await client.query('COMMIT');

    console.log('');
    console.log('='.repeat(60));
    console.log('Run seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('');

    // =========================================================================
    // VERIFICATION
    // =========================================================================
    console.log('Verification:');

    const templateCount = await client.query('SELECT COUNT(*) FROM "RunTemplate" WHERE tenant_id = $1', [TENANT_ID]);
    console.log(`  RunTemplates: ${templateCount.rows[0].count}`);

    const runCount = await client.query('SELECT run_type, COUNT(*) FROM "Run" WHERE tenant_id = $1 GROUP BY run_type', [TENANT_ID]);
    console.log('  Runs by type:');
    runCount.rows.forEach(r => console.log(`    - ${r.run_type}: ${r.count}`));

    const totalRuns = await client.query('SELECT COUNT(*) FROM "Run" WHERE tenant_id = $1', [TENANT_ID]);
    console.log(`  Total Runs: ${totalRuns.rows[0].count}`);

    const assignmentStats = await client.query(`
      SELECT
        CASE WHEN assigned_date >= CURRENT_DATE THEN 'current' ELSE 'historical' END as period,
        COUNT(*) as count
      FROM "RunAssignment"
      WHERE tenant_id = $1
      GROUP BY period
    `, [TENANT_ID]);
    console.log('  RunAssignments:');
    assignmentStats.rows.forEach(r => console.log(`    - ${r.period}: ${r.count}`));

    // Current occupancy
    const todayOccupancy = await client.query(`
      SELECT r.name, r.capacity, COUNT(ra.id) as occupied
      FROM "Run" r
      LEFT JOIN "RunAssignment" ra ON r.id = ra.run_id AND ra.assigned_date = CURRENT_DATE
      WHERE r.tenant_id = $1
      GROUP BY r.id, r.name, r.capacity
      ORDER BY r.name
    `, [TENANT_ID]);

    console.log('  Today\'s run occupancy:');
    todayOccupancy.rows.forEach(r => {
      const status = r.occupied > 0 ? `${r.occupied}/${r.capacity}` : 'empty';
      console.log(`    - ${r.name}: ${status}`);
    });

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

seedRuns().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
