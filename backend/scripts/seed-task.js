const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const { PrismaClient } = require('@prisma/client');
const { addDays, startOfDay } = require('date-fns');

const TENANT_ID = process.env.SEED_TENANT_ID || 'cmgss9ngv0000usrotds3tgr1';

const prisma = new PrismaClient();

async function ensureBasicBooking(tx, tenantId) {
  const existing = await tx.booking.findFirst({ where: { tenantId } });
  if (existing) return existing;

  // Fallback: create minimal owner, pet, kennel, and booking
  const owner = await tx.owner.create({
    data: {
      tenantId,
      firstName: 'Task',
      lastName: 'Owner',
      email: `task.owner.${Date.now()}@example.com`,
      phone: '555-5555',
      address: { city: 'Nowhere', state: 'NA' },
    },
  });

  const pet = await tx.pet.create({
    data: {
      tenantId,
      name: 'Tasky',
      behaviorFlags: [],
      owners: { create: [{ tenantId, ownerId: owner.recordId, isPrimary: true }] },
    },
  });

  const kennel = await tx.kennel.create({
    data: { tenantId, name: `Temp Kennel ${Date.now()}`, type: 'KENNEL', capacity: 1, amenities: '[]' },
  });

  const today = startOfDay(new Date());
  const booking = await tx.booking.create({
    data: {
      tenantId,
      petId: pet.recordId,
      ownerId: owner.recordId,
      status: 'CONFIRMED',
      checkIn: today,
      checkOut: addDays(today, 1),
      segments: {
        create: [{ tenantId, kennelId: kennel.recordId, startDate: today, endDate: addDays(today, 1), status: 'CONFIRMED' }],
      },
    },
  });

  return booking;
}

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select app.set_tenant_id(${TENANT_ID})`;

    const booking = await ensureBasicBooking(tx, TENANT_ID);

    const task = await tx.task.create({
      data: {
        tenantId: TENANT_ID,
        type: 'CLEANING',
        relatedType: 'booking',
        relatedId: booking.recordId,
        scheduledFor: new Date(),
        priority: 'NORMAL',
        notes: 'Clean after checkout',
      },
    });

    // eslint-disable-next-line no-console
    console.log('Created task', task.recordId);
  }, { timeout: 60000 });
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (err) => { console.error('Seed task failed', err); await prisma.$disconnect(); process.exit(1); });


