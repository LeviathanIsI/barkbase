const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');
const { tenantContext } = require('../../middleware/tenantContext');

const wipeDatabase = async () => {
  await prisma.handlerRunLog.deleteMany();
  await prisma.handlerJob.deleteMany();
  await prisma.handlerRun.deleteMany();
  await prisma.handlerFlow.deleteMany();
  if (prisma.handlerEvent) {
    await prisma.handlerEvent.deleteMany();
  }
  await prisma.auditLog.deleteMany();
  await prisma.usageCounter.deleteMany();
  await prisma.bookingService.deleteMany();
  await prisma.bookingSegment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.vaccination.deleteMany();
  await prisma.petOwner.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.kennel.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
};

const seedTenants = async () => {
  const acme = await prisma.tenant.create({
    data: {
      name: 'Acme Animal Care',
      slug: 'acme',
      plan: 'PRO',
      themeJson: {},
    },
  });

  const globex = await prisma.tenant.create({
    data: {
      name: 'Globex Boarding',
      slug: 'globex',
      plan: 'FREE',
      themeJson: {},
    },
  });

  return { acme, globex };
};

const seedUsers = async ({ acme, globex }) => {
  const passwordHash = await bcrypt.hash('Passw0rd!', 12);
  const acmeOwner = await prisma.user.create({
    data: {
      email: 'owner@acme.test',
      passwordHash,
      emailVerified: true,
    },
  });

  const globexOwner = await prisma.user.create({
    data: {
      email: 'owner@globex.test',
      passwordHash,
      emailVerified: true,
    },
  });

  const consentReceipt = {
    agreedAt: new Date().toISOString(),
    ip: '127.0.0.1',
    appVersion: 'test-suite',
  };

  await prisma.membership.create({
    data: {
      tenantId: acme.recordId,
      userId: acmeOwner.recordId,
      role: 'OWNER',
      localDataConsent: consentReceipt,
    },
  });

  await prisma.membership.create({
    data: {
      tenantId: globex.recordId,
      userId: globexOwner.recordId,
      role: 'OWNER',
      localDataConsent: consentReceipt,
    },
  });

  return { acmeOwner, globexOwner };
};

const seedAcmeData = async (acme) => {
  const owner = await prisma.owner.create({
    data: {
      tenantId: acme.recordId,
      firstName: 'Alex',
      lastName: 'Anderson',
      email: 'alex@example.com',
      address: { city: 'Test City', state: 'WA' },
    },
  });

  const pet = await prisma.pet.create({
    data: {
      tenantId: acme.recordId,
      name: 'Riley',
      breed: 'Labrador',
      behaviorFlags: [],
      medicalNotes: '',
      dietaryNotes: '',
      status: 'active',
      owners: {
        create: {
          tenantId: acme.recordId,
          ownerId: owner.recordId,
          isPrimary: true,
        },
      },
    },
    include: { owners: true },
  });

  const kennel = await prisma.kennel.create({
    data: {
      tenantId: acme.recordId,
      name: 'Suite 1',
      type: 'SUITE',
      capacity: 1,
      amenities: '[]',
      isActive: true,
    },
  });

  return { owner, pet, kennel };
};

const resetAndSeed = async () => {
  await wipeDatabase();
  if (typeof tenantContext.clearCache === 'function') {
    tenantContext.clearCache();
  }
  const tenants = await seedTenants();
  const users = await seedUsers(tenants);
  const resources = await seedAcmeData(tenants.acme);
  return { ...tenants, ...users, ...resources };
};

module.exports = {
  resetAndSeed,
};
