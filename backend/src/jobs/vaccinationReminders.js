const cron = require('node-cron');
const { addDays, formatISO, startOfDay, endOfDay } = require('date-fns');
const prisma = require('../config/prisma');
const { sendMail } = require('../lib/mailer');
const logger = require('../utils/logger');

const reminderWindows = [30, 60, 90];

const scheduleVaccinationReminders = () => {
  cron.schedule('15 6 * * *', async () => {
    try {
      const today = new Date();
      for (const days of reminderWindows) {
        const targetDate = addDays(today, days);
        const vaccinations = await prisma.vaccination.findMany({
          where: {
            expiresAt: {
              gte: startOfDay(targetDate),
              lte: endOfDay(targetDate),
            },
          },
          include: {
            pet: {
              include: {
                owners: {
                  include: { owner: true },
                },
              },
            },
            tenant: true,
          },
        });

        await Promise.all(
          vaccinations.map(async (vaccination) => {
            const primaryOwner = vaccination.pet.owners.find((entry) => entry.isPrimary)?.owner;
            if (!primaryOwner?.email) return;
            await sendMail({
              to: primaryOwner.email,
              subject: `Vaccination expiring in ${days} days for ${vaccination.pet.name}`,
              text: `Vaccination ${vaccination.type} expires on ${formatISO(vaccination.expiresAt, { representation: 'date' })}.`,
            });
          }),
        );
      }
    } catch (error) {
      logger.error({ error }, 'Failed to send vaccination reminders');
    }
  });
};

module.exports = {
  scheduleVaccinationReminders,
};
