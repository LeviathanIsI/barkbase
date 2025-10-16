const { forTenant } = require('../lib/tenantPrisma');
const { mailer } = require('../lib/mailer');
const { logger } = require('../lib/logger');

/**
 * Get vaccinations expiring within a specified number of days
 */
async function getExpiringVaccinations(tenantId, daysAhead = 30) {
  const tenantDb = forTenant(tenantId);
  
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const vaccinations = await tenantDb.vaccination.findMany({
    where: {
      expiresAt: {
        gte: now,
        lte: futureDate
      }
    },
    include: {
      pet: {
        include: {
          owners: {
            include: {
              owner: {
                select: {
                  recordId: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { expiresAt: 'asc' }
  });

  return vaccinations;
}

/**
 * Send vaccination expiration reminder email
 */
async function sendExpirationReminder(vaccinationId, tenantId) {
  const tenantDb = forTenant(tenantId);
  
  const vaccination = await tenantDb.vaccination.findUnique({
    where: { recordId: vaccinationId },
    include: {
      pet: {
        include: {
          owners: {
            include: {
              owner: true
            }
          }
        }
      }
    }
  });

  if (!vaccination) {
    throw new Error('Vaccination not found');
  }

  const daysUntilExpiration = Math.ceil(
    (new Date(vaccination.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
  );

  // Send email to all owners
  const emailPromises = vaccination.pet.owners.map(async (po) => {
    try {
      await mailer.send({
        to: po.owner.email,
        subject: `${vaccination.pet.name}'s ${vaccination.type} Vaccination Expiring Soon`,
        template: 'vaccination-reminder',
        data: {
          ownerName: po.owner.firstName,
          petName: vaccination.pet.name,
          vaccinationType: vaccination.type,
          expiresAt: vaccination.expiresAt,
          daysUntilExpiration,
          administeredAt: vaccination.administeredAt
        }
      });

      logger.info(
        { vaccinationId, ownerId: po.owner.recordId, petName: vaccination.pet.name },
        'Vaccination reminder sent'
      );
    } catch (err) {
      logger.error(
        { err, vaccinationId, ownerId: po.owner.recordId },
        'Failed to send vaccination reminder'
      );
    }
  });

  await Promise.all(emailPromises);

  // Update vaccination to mark reminder as sent
  await tenantDb.vaccination.update({
    where: { recordId: vaccinationId },
    data: {
      reminderSentAt: new Date()
    }
  });

  return { success: true, emailsSent: emailPromises.length };
}

/**
 * Get vaccinations expiring in 7, 14, or 30 days (for automated reminders)
 */
async function getVaccinationsNeedingReminders(tenantId) {
  const tenantDb = forTenant(tenantId);
  
  const now = new Date();
  
  // Calculate target dates (7, 14, 30 days from now)
  const dates = [7, 14, 30].map(days => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const vaccinations = await tenantDb.vaccination.findMany({
    where: {
      OR: dates.map(date => {
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        return {
          expiresAt: {
            gte: date,
            lte: endOfDay
          },
          OR: [
            { reminderSentAt: null },
            { reminderSentAt: { lt: date } } // Resend if date changed
          ]
        };
      })
    },
    include: {
      pet: {
        include: {
          owners: {
            include: {
              owner: true
            }
          }
        }
      }
    }
  });

  return vaccinations;
}

module.exports = {
  getExpiringVaccinations,
  sendExpirationReminder,
  getVaccinationsNeedingReminders
};

