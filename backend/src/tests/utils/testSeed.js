const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');
const tenantContext = require('../../middleware/tenantContext');

const wipeDatabase = async () => {
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
      tenantId: acme.id,
      userId: acmeOwner.id,
      role: 'OWNER',
      localDataConsent: consentReceipt,
    },
  });

  await prisma.membership.create({
    data: {
      tenantId: globex.id,
      userId: globexOwner.id,
      role: 'OWNER',
      localDataConsent: consentReceipt,
    },
  });

  return { acmeOwner, globexOwner };
};

const seedAcmeData = async (acme) => {
  const owner = await prisma.owner.create({
    data: {
      tenantId: acme.id,
      firstName: 'Alex',
      lastName: 'Anderson',
      email: 'alex@example.com',
      address: { city: 'Test City', state: 'WA' },
    },
  });

  const pet = await prisma.pet.create({
    data: {
      tenantId: acme.id,
      name: 'Riley',
      breed: 'Labrador',
      behaviorFlags: [],
      medicalNotes: '',
      dietaryNotes: '',
      status: 'active',
      owners: {
        create: {
          tenantId: acme.id,
          ownerId: owner.id,
          isPrimary: true,
        },
      },
    },
    include: { owners: true },
  });

  const kennel = await prisma.kennel.create({
    data: {
      tenantId: acme.id,
      name: 'Suite 1',
      type: 'SUITE',
      capacity: 1,
      amenities: [],
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
