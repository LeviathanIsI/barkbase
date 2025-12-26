/**
 * =============================================================================
 * BarkBase Reminder Service Lambda
 * =============================================================================
 *
 * Scheduled Lambda for sending automated reminders:
 * - Booking reminders (1 day before check-in)
 * - Vaccination expiry reminders (30/14/7 days before expiry)
 *
 * Triggered by EventBridge rule (daily at 8am local time)
 *
 * =============================================================================
 */

// Import from layers (mounted at /opt/nodejs in Lambda)
let dbLayer, sharedLayer;

try {
  dbLayer = require('/opt/nodejs/db');
  sharedLayer = require('/opt/nodejs/index');
} catch (e) {
  // Local development fallback
  dbLayer = require('../../layers/db-layer/nodejs/db');
  sharedLayer = require('../../layers/shared-layer/nodejs/index');
}

const { getPoolAsync, query } = dbLayer;
const {
  sendBookingReminder,
  sendVaccinationReminder,
  createResponse,
  // Workflow event publishing
  publishPetVaccinationExpiring,
  publishPetVaccinationExpired,
  publishPetBirthday,
} = sharedLayer;

/**
 * Log email to Communication table
 */
async function logEmailToCommunication(tenantId, params) {
  const { ownerId, subject, content, status, templateUsed, recipientEmail } = params;
  
  try {
    await query(
      `INSERT INTO "Communication" (tenant_id, owner_id, type, subject, content, direction, status, sent_at, metadata)
       VALUES ($1, $2, 'EMAIL', $3, $4, 'outbound', $5, NOW(), $6)`,
      [
        tenantId,
        ownerId || null,
        subject,
        content,
        status || 'sent',
        JSON.stringify({
          template: templateUsed || null,
          recipientEmail: recipientEmail || null,
          automated: true,
        }),
      ]
    );
  } catch (error) {
    console.error('[REMINDER] Failed to log to Communication:', error.message);
  }
}

/**
 * Send booking reminders for bookings starting tomorrow
 */
async function processBookingReminders() {
  console.log('[REMINDER] Processing booking reminders...');
  
  const results = { sent: 0, failed: 0, errors: [] };

  try {
    // Find all bookings starting tomorrow across all tenants
    const bookingsResult = await query(
      `SELECT
         b.record_id as booking_id,
         b.tenant_id,
         b.check_in,
         b.check_out,
         b.service_type,
         COALESCE(b.service_name, s.name) as service_name,
         o.record_id as owner_id,
         o.first_name as owner_first_name,
         o.email as owner_email
       FROM "Booking" b
       LEFT JOIN "Owner" o ON b.owner_id = o.record_id
       LEFT JOIN "Service" s ON b.service_id = s.record_id
       WHERE b.status IN ('CONFIRMED', 'PENDING')
         AND DATE(b.check_in) = CURRENT_DATE + INTERVAL '1 day'
         AND o.email IS NOT NULL
       ORDER BY b.tenant_id, b.check_in`
    );

    console.log('[REMINDER] Found', bookingsResult.rows.length, 'bookings starting tomorrow');

    for (const booking of bookingsResult.rows) {
      try {
        // Get pets for this booking
        const petsResult = await query(
          `SELECT p.name FROM "BookingPet" bp
           JOIN "Pet" p ON bp.pet_id = p.record_id
           WHERE bp.booking_id = $1`,
          [booking.booking_id]
        );
        const petNames = petsResult.rows.map(p => p.name).join(', ') || 'Your pet';

        // Send reminder email
        await sendBookingReminder(
          {
            check_in: booking.check_in,
            check_out: booking.check_out,
            service_name: booking.service_name || booking.service_type || 'Boarding',
            service_type: booking.service_type,
          },
          {
            first_name: booking.owner_first_name,
            email: booking.owner_email,
          },
          { name: petNames }
        );

        // Log to Communication table
        await logEmailToCommunication(booking.tenant_id, {
          ownerId: booking.owner_id,
          recipientEmail: booking.owner_email,
          subject: `Reminder: Upcoming Booking for ${petNames}`,
          content: `Automated booking reminder for ${booking.check_in}`,
          status: 'sent',
          templateUsed: 'bookingReminder',
        });

        results.sent++;
        console.log('[REMINDER] Sent booking reminder to', booking.owner_email);

      } catch (error) {
        console.error('[REMINDER] Failed to send booking reminder:', error.message);
        results.failed++;
        results.errors.push({
          bookingId: booking.booking_id,
          ownerEmail: booking.owner_email,
          error: error.message,
        });
      }
    }

  } catch (error) {
    console.error('[REMINDER] Error processing booking reminders:', error.message);
    throw error;
  }

  return results;
}

/**
 * Send vaccination expiry reminders
 * Sends reminders at 30, 14, and 7 days before expiry
 */
async function processVaccinationReminders() {
  console.log('[REMINDER] Processing vaccination reminders...');
  
  const results = { sent: 0, failed: 0, errors: [] };

  try {
    // Find all vaccinations expiring at key intervals
    const vaccResult = await query(
      `SELECT DISTINCT ON (v.record_id)
         v.record_id as vaccination_id,
         v.tenant_id,
         v.type as vaccine_type,
         v.expires_at,
         p.record_id as pet_id,
         p.name as pet_name,
         o.record_id as owner_id,
         o.first_name as owner_first_name,
         o.email as owner_email,
         EXTRACT(DAY FROM v.expires_at - NOW())::integer as days_until_expiry
       FROM "Vaccination" v
       JOIN "Pet" p ON v.pet_id = p.record_id
       LEFT JOIN "PetOwner" po ON po.pet_id = p.record_id AND po.is_primary = true
       LEFT JOIN "Owner" o ON po.owner_id = o.record_id
       WHERE o.email IS NOT NULL
         AND (
           DATE(v.expires_at) = CURRENT_DATE + INTERVAL '30 days'
           OR DATE(v.expires_at) = CURRENT_DATE + INTERVAL '14 days'
           OR DATE(v.expires_at) = CURRENT_DATE + INTERVAL '7 days'
         )
       ORDER BY v.record_id, v.expires_at ASC`
    );

    console.log('[REMINDER] Found', vaccResult.rows.length, 'vaccination reminders to send');

    for (const vacc of vaccResult.rows) {
      try {
        // Send reminder email
        await sendVaccinationReminder(
          {
            vaccine_name: vacc.vaccine_type,
            expiration_date: vacc.expires_at,
          },
          {
            first_name: vacc.owner_first_name,
            email: vacc.owner_email,
          },
          { name: vacc.pet_name }
        );

        // Log to Communication table
        await logEmailToCommunication(vacc.tenant_id, {
          ownerId: vacc.owner_id,
          recipientEmail: vacc.owner_email,
          subject: `Vaccination Reminder for ${vacc.pet_name}`,
          content: `${vacc.vaccine_type} expires in ${vacc.days_until_expiry} days`,
          status: 'sent',
          templateUsed: 'vaccinationReminder',
        });

        // Publish workflow event for vaccination expiring
        publishPetVaccinationExpiring(
          { id: vacc.pet_id, name: vacc.pet_name, owner_id: vacc.owner_id, vaccination_status: 'expiring' },
          vacc.tenant_id,
          vacc.days_until_expiry,
          vacc.expires_at
        ).catch(err => {
          console.error('[REMINDER] Failed to publish workflow event:', err.message);
        });

        results.sent++;
        console.log('[REMINDER] Sent vaccination reminder to', vacc.owner_email, 'for', vacc.pet_name);

      } catch (error) {
        console.error('[REMINDER] Failed to send vaccination reminder:', error.message);
        results.failed++;
        results.errors.push({
          petName: vacc.pet_name,
          ownerEmail: vacc.owner_email,
          error: error.message,
        });
      }
    }

    // Also process already-expired vaccinations
    await processExpiredVaccinations();

  } catch (error) {
    console.error('[REMINDER] Error processing vaccination reminders:', error.message);
    throw error;
  }

  return results;
}

/**
 * Publish workflow events for expired vaccinations
 */
async function processExpiredVaccinations() {
  console.log('[REMINDER] Processing expired vaccinations for workflow events...');

  try {
    // Find vaccinations that expired today
    const expiredResult = await query(
      `SELECT DISTINCT ON (p.record_id)
         p.record_id as pet_id,
         p.name as pet_name,
         p.tenant_id,
         o.record_id as owner_id
       FROM "Vaccination" v
       JOIN "Pet" p ON v.pet_id = p.record_id
       LEFT JOIN "PetOwner" po ON po.pet_id = p.record_id AND po.is_primary = true
       LEFT JOIN "Owner" o ON po.owner_id = o.record_id
       WHERE DATE(v.expires_at) = CURRENT_DATE
       ORDER BY p.record_id, v.expires_at DESC`
    );

    console.log('[REMINDER] Found', expiredResult.rows.length, 'pets with vaccinations expiring today');

    for (const pet of expiredResult.rows) {
      publishPetVaccinationExpired(
        { id: pet.pet_id, name: pet.pet_name, owner_id: pet.owner_id },
        pet.tenant_id
      ).catch(err => {
        console.error('[REMINDER] Failed to publish vaccination expired event:', err.message);
      });
    }
  } catch (error) {
    console.error('[REMINDER] Error processing expired vaccinations:', error.message);
  }
}

/**
 * Process pet birthdays and publish workflow events
 */
async function processPetBirthdays() {
  console.log('[REMINDER] Processing pet birthdays...');

  try {
    // Find pets with birthday today
    const birthdayResult = await query(
      `SELECT
         p.record_id as pet_id,
         p.name as pet_name,
         p.tenant_id,
         p.date_of_birth,
         o.record_id as owner_id
       FROM "Pet" p
       LEFT JOIN "PetOwner" po ON po.pet_id = p.record_id AND po.is_primary = true
       LEFT JOIN "Owner" o ON po.owner_id = o.record_id
       WHERE EXTRACT(MONTH FROM p.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(DAY FROM p.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
         AND p.date_of_birth IS NOT NULL`
    );

    console.log('[REMINDER] Found', birthdayResult.rows.length, 'pets with birthday today');

    for (const pet of birthdayResult.rows) {
      publishPetBirthday(
        { id: pet.pet_id, name: pet.pet_name, owner_id: pet.owner_id, date_of_birth: pet.date_of_birth },
        pet.tenant_id
      ).catch(err => {
        console.error('[REMINDER] Failed to publish pet birthday event:', err.message);
      });
    }

    return { found: birthdayResult.rows.length };
  } catch (error) {
    console.error('[REMINDER] Error processing pet birthdays:', error.message);
    return { found: 0, error: error.message };
  }
}

/**
 * Main handler for scheduled invocation
 */
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('[REMINDER] Lambda triggered:', JSON.stringify(event));

  // Determine which reminders to process
  const processBookings = event.processBookings !== false;
  const processVaccinations = event.processVaccinations !== false;
  const processBirthdays = event.processBirthdays !== false;

  try {
    await getPoolAsync();

    const results = {
      timestamp: new Date().toISOString(),
      bookings: null,
      vaccinations: null,
      birthdays: null,
    };

    // Process booking reminders
    if (processBookings) {
      results.bookings = await processBookingReminders();
    }

    // Process vaccination reminders (also publishes workflow events)
    if (processVaccinations) {
      results.vaccinations = await processVaccinationReminders();
    }

    // Process pet birthdays (publishes workflow events)
    if (processBirthdays) {
      results.birthdays = await processPetBirthdays();
    }

    console.log('[REMINDER] Completed:', JSON.stringify(results));

    // Return summary for CloudWatch logs
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...results,
      }),
    };

  } catch (error) {
    console.error('[REMINDER] Lambda error:', error.message, error.stack);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};


// Force rebuild 12/25/2025 18:28:24
