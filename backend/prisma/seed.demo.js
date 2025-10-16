/*
  Multi-tenant compact demo seed for BarkBase
  - Tenants: barkbase, acme, globex
  - Compact volumes (~10–30 per type) across core models
  - Safe to re-run: clears only the demo tenants' data first, then reseeds
*/

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const {
  addDays,
  subDays,
  startOfDay,
  addHours,
  format,
} = require('date-fns');

const DEFAULT_DB_NAME = process.env.SUPABASE_DB_NAME || 'postgres';
const DEFAULT_SSL_MODE = process.env.SUPABASE_SSLMODE || 'require';
const expandTemplate = (raw) => {
  if (!raw) return raw;
  return raw.replace(/\$\{([^}]+)\}/g, (_, key) => {
    if (key === 'SUPABASE_DB_NAME') return DEFAULT_DB_NAME;
    if (key === 'SUPABASE_SSLMODE') return DEFAULT_SSL_MODE;
    return process.env[key] ?? '';
  });
};

// Resolve DATABASE_URL similarly to runtime
const resolvedUrl = expandTemplate(process.env.DATABASE_URL || process.env.DEV_DATABASE_URL);
if (resolvedUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolvedUrl;
}

const prisma = new PrismaClient();

const DEMO_TENANTS = [
  { slug: 'barkbase', name: 'BarkBase Resort', seed: 101 },
  { slug: 'acme', name: 'Acme Kennels', seed: 202 },
  { slug: 'globex', name: 'Globex Pet Hotel', seed: 303 },
];

// Utility helpers
const chance = (pct) => Math.random() < pct;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const hasModel = (db, modelName) => {
  const m = db?.[modelName];
  return !!m && (typeof m.create === 'function' || typeof m.createMany === 'function');
};

async function clearDemoTenants() {
  const slugs = DEMO_TENANTS.map((t) => t.slug);
  const tenants = await prisma.tenant.findMany({ where: { slug: { in: slugs } } });
  if (tenants.length === 0) return;

  // Delete per-tenant inside a transaction with tenant GUC set
  for (const t of tenants) {
    await prisma.$transaction(async (tx) => {
      // Ensure RLS policies see this tenant context
      await tx.$executeRaw`select app.set_tenant_id(${t.recordId})`;

      const scopedDelete = async (model) => {
        if (!tx[model]?.deleteMany) return;
        await tx[model].deleteMany({ where: { tenantId: t.recordId } });
      };

      await scopedDelete('bookingService');
      await scopedDelete('bookingSegment');
      await scopedDelete('checkOut');
      await scopedDelete('checkIn');
      await scopedDelete('activityFeed');
      await scopedDelete('incidentReport');
      await scopedDelete('vaccination');
      await scopedDelete('financialTransaction');
      await scopedDelete('payment');
      await scopedDelete('packageUsage');
      await scopedDelete('package');
      await scopedDelete('invoice');
      await scopedDelete('notificationQueue');
      await scopedDelete('bookingNotification');
      await scopedDelete('communication');
      await scopedDelete('note');
      await scopedDelete('customerSegmentMember');
      await scopedDelete('customerSegment');
      await scopedDelete('customerTagMember');
      await scopedDelete('customerTag');
      await scopedDelete('campaign');
      await scopedDelete('message');
      await scopedDelete('pushSubscription');
      await scopedDelete('messageTemplate');
      await scopedDelete('signedWaiver');
      await scopedDelete('waiver');
      await scopedDelete('supportMessage');
      await scopedDelete('supportTicket');
      await scopedDelete('integration');
      await scopedDelete('syncError');
      await scopedDelete('customRole');
      await scopedDelete('permissionSet');
      await scopedDelete('userRole');
      await scopedDelete('userPermission');
      await scopedDelete('idempotencyKey');
      await scopedDelete('enhancedAuditLog');
      await scopedDelete('runAssignment');
      await scopedDelete('run');
      await scopedDelete('service');
      await scopedDelete('kennel');
      await scopedDelete('booking');
      await scopedDelete('petOwner');
      await scopedDelete('pet');
      await scopedDelete('owner');
      await scopedDelete('staff');
      await tx.membership.deleteMany({ where: { tenantId: t.recordId } });
    });
  }

  // Delete tenants last (outside tenant GUC)
  await prisma.tenant.deleteMany({ where: { recordId: { in: tenants.map((x) => x.recordId) } } });
}

async function createTenant({ slug, name }) {
  return prisma.tenant.create({
    data: {
      slug,
      name,
      plan: 'PRO',
      themeJson: { colors: { primary: '59 130 246' } },
      featureFlags: {
        waitlist: true,
        medicationReminders: true,
        incidentReporting: true,
      },
      settings: { timezone: 'America/Los_Angeles', currency: 'USD' },
    },
  });
}

async function createUsersAndStaff(db, tenantId, tenantSeed, tenantSlug) {
  faker.seed(tenantSeed + 1);
  const passwordHash = await bcrypt.hash('Passw0rd!', 10);

  // Users
  const users = [];
  const roles = ['OWNER', 'ADMIN', 'STAFF', 'STAFF', 'READONLY'];
  for (let i = 0; i < roles.length; i += 1) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `${firstName}.${lastName}.${tenantSeed}.${i}@${tenantSlug}.demo`.toLowerCase();
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name: `${firstName} ${lastName}`,
        phone: faker.phone.number('555-01##'),
        language: 'en',
      },
    });
    users.push({ ...user, role: roles[i] });
  }

  // Memberships + Staff
  const memberships = [];
  const staffRecords = [];
  for (const u of users) {
    const m = await db.membership.create({
      data: { tenantId, userId: u.recordId, role: u.role },
    });
    memberships.push(m);
    if (u.role === 'STAFF' || u.role === 'ADMIN') {
      const s = await db.staff.create({
        data: {
          tenantId,
          membershipId: m.recordId,
          title: u.role === 'ADMIN' ? 'Manager' : 'Staff',
          schedule: { shifts: [] },
        },
      });
      staffRecords.push(s);
    }
  }

  const ownerUser = users.find((x) => x.role === 'OWNER') || users[0];
  const staffUser = users.find((x) => x.role === 'STAFF') || users[2];
  const adminUser = users.find((x) => x.role === 'ADMIN') || users[1];

  return { users, memberships, staffRecords, ownerUser, staffUser, adminUser };
}

async function createOwners(db, tenantId, tenantSeed, count = 15, tenantSlug = 'demo') {
  faker.seed(tenantSeed + 2);
  const owners = [];
  for (let i = 0; i < count; i += 1) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `${firstName}.${lastName}.${tenantSeed}.${i}@owners.${tenantSlug}.demo`.toLowerCase();
    const owner = await db.owner.create({
      data: {
        tenantId,
        firstName,
        lastName,
        email,
        phone: faker.phone.number('555-02##'),
        address: {
          line1: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state({ abbreviated: true }),
          postalCode: faker.location.zipCode('#####'),
        },
        createdAt: subDays(new Date(), faker.number.int({ min: 5, max: 180 })),
      },
    });
    owners.push(owner);
  }
  return owners;
}

async function createPets(db, tenantId, owners, tenantSeed, count = 15) {
  faker.seed(tenantSeed + 3);
  const breeds = ['Labrador', 'Golden Retriever', 'German Shepherd', 'Poodle', 'Bulldog', 'Dachshund', 'Shiba Inu', 'Corgi'];
  const names = ['Luna', 'Bella', 'Charlie', 'Max', 'Cooper', 'Daisy', 'Lucy', 'Milo', 'Bailey', 'Rocky'];
  const pets = [];
  for (let i = 0; i < count; i += 1) {
    const owner = pick(owners);
    const pet = await db.pet.create({
      data: {
        tenantId,
        name: pick(names),
        breed: pick(breeds),
        birthdate: subDays(new Date(), faker.number.int({ min: 200, max: 3000 })),
        medicalNotes: chance(0.4) ? faker.lorem.sentence() : null,
        dietaryNotes: chance(0.5) ? faker.lorem.words(5) : null,
        behaviorFlags: chance(0.5) ? ['friendly'] : [],
        owners: { create: [{ tenantId, ownerId: owner.recordId, isPrimary: true }] },
      },
    });
    pets.push(pet);
  }
  return pets;
}

async function createKennels(db, tenantId) {
  const defs = [
    { name: 'Deluxe Suite 1', type: 'SUITE', capacity: 1 },
    { name: 'Deluxe Suite 2', type: 'SUITE', capacity: 1 },
    { name: 'Standard Kennel 1', type: 'KENNEL', capacity: 1 },
    { name: 'Standard Kennel 2', type: 'KENNEL', capacity: 1 },
    { name: 'Daycare Pod A', type: 'DAYCARE', capacity: 6 },
    { name: 'Daycare Pod B', type: 'DAYCARE', capacity: 6 },
    { name: 'Luxury Cabin', type: 'CABIN', capacity: 1 },
    { name: 'Medical Suite', type: 'MEDICAL', capacity: 1 },
  ];
  const records = [];
  for (const k of defs) {
    records.push(
      await db.kennel.create({ data: { tenantId, name: k.name, type: k.type, capacity: k.capacity, amenities: '[]' } }),
    );
  }
  return records;
}

async function createRuns(db, tenantId) {
  const defs = [
    { name: 'Morning Play', capacity: 10, scheduleTime: '08:00', color: '#22c55e' },
    { name: 'Afternoon Social', capacity: 12, scheduleTime: '14:00', color: '#3b82f6' },
    { name: 'Evening Walk', capacity: 8, scheduleTime: '18:00', color: '#f59e0b' },
  ];
  const runs = [];
  for (const r of defs) {
    runs.push(
      await db.run.create({ data: { tenantId, name: r.name, capacity: r.capacity, scheduleTime: r.scheduleTime, color: r.color } }),
    );
  }
  return runs;
}

async function createServices(db, tenantId) {
  const defs = [
    { name: 'Boarding - Standard', category: 'BOARDING', priceCents: 8000 },
    { name: 'Boarding - Deluxe', category: 'BOARDING', priceCents: 12000 },
    { name: 'Daycare - Half Day', category: 'DAYCARE', priceCents: 3000 },
    { name: 'Daycare - Full Day', category: 'DAYCARE', priceCents: 6000 },
    { name: 'Grooming - Bath', category: 'GROOMING', priceCents: 4000 },
    { name: 'Grooming - Full', category: 'GROOMING', priceCents: 9000 },
    { name: 'Training - Basic', category: 'TRAINING', priceCents: 7000 },
    { name: 'Extra Walk', category: 'OTHER', priceCents: 1500 },
    { name: 'Medication Admin', category: 'OTHER', priceCents: 1000 },
  ];
  const services = [];
  for (const s of defs) {
    services.push(
      await db.service.create({ data: { tenantId, name: s.name, category: s.category, priceCents: s.priceCents } }),
    );
  }
  return services;
}

async function createBookings(db, tenantId, pets, owners, kennels, services, tenantSeed, count = 24) {
  faker.seed(tenantSeed + 4);
  const today = startOfDay(new Date());
  const kennelMap = Object.fromEntries(kennels.map((k) => [k.name, k]));
  const created = [];

  for (let i = 0; i < count; i += 1) {
    const pet = pick(pets);
    // find primary owner via PetOwner relation may be expensive; we created primary at pet creation
    const petOwner = await db.petOwner.findFirst({ where: { tenantId, petId: pet.recordId, isPrimary: true } });
    if (!petOwner) continue;
    const ownerId = petOwner.ownerId;

    const start = addDays(today, faker.number.int({ min: -7, max: 10 }));
    const length = faker.number.int({ min: 1, max: 5 });
    const statusPick = pick(['PENDING', 'CONFIRMED', 'CHECKED_IN']);
    const total = faker.number.int({ min: 2000, max: 60000 });
    const deposit = Math.floor(total * 0.25);

    const booking = await db.booking.create({
      data: {
        tenantId,
        petId: pet.recordId,
        ownerId,
        status: statusPick,
        checkIn: start,
        checkOut: addDays(start, length),
        depositCents: deposit,
        totalCents: total,
        balanceDueCents: total - deposit,
        notes: chance(0.3) ? faker.lorem.sentence() : null,
        segments: {
          create: [
            {
              tenantId,
              kennelId: kennelMap['Daycare Pod A']?.recordId || kennels[0].recordId,
              startDate: start,
              endDate: addDays(start, Math.max(1, length - 1)),
              status: statusPick === 'CHECKED_IN' ? 'CHECKED_IN' : 'CONFIRMED',
            },
          ],
        },
      },
    });

    // Attach a couple of services
    const svcA = pick(services);
    const svcB = pick(services);
    await db.bookingService.createMany({
      data: [
        { tenantId, bookingId: booking.recordId, serviceId: svcA.recordId, quantity: 1, priceCents: svcA.priceCents },
        { tenantId, bookingId: booking.recordId, serviceId: svcB.recordId, quantity: 1, priceCents: svcB.priceCents },
      ],
    });

    created.push(booking);
  }
  return created;
}

async function createVaccinations(db, tenantId, pets, tenantSeed) {
  faker.seed(tenantSeed + 5);
  const types = ['Rabies', 'Bordetella', 'DHPP'];
  const records = [];
  for (const pet of pets) {
    const count = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < count; i += 1) {
      records.push(
        await db.vaccination.create({
          data: {
            tenantId,
            petId: pet.recordId,
            type: pick(types),
            administeredAt: subDays(new Date(), faker.number.int({ min: 30, max: 400 })),
            expiresAt: addDays(new Date(), faker.number.int({ min: 60, max: 365 })),
            notes: chance(0.2) ? 'Certificate on file' : null,
          },
        }),
      );
    }
  }
  return records;
}

async function createCheckinsAndIncidents(db, tenantId, bookings, staff, pets, tenantSeed) {
  faker.seed(tenantSeed + 6);
  const created = { checkIns: [], checkOuts: [], incidents: [] };
  for (const b of bookings.slice(0, Math.min(12, bookings.length))) {
    const s = staff.length ? pick(staff) : null;
    const ci = await db.checkIn.create({
      data: {
        tenantId,
        bookingId: b.recordId,
        staffId: s?.recordId ?? null,
        time: addHours(b.checkIn, 1),
        weight: faker.number.float({ min: 5, max: 50, precision: 0.1 }),
        photos: '[]',
        conditionRating: faker.number.int({ min: 3, max: 5 }),
        notes: chance(0.3) ? 'Arrived happy' : null,
      },
    });
    created.checkIns.push(ci);

    if (chance(0.5)) {
      const co = await db.checkOut.create({
        data: {
          tenantId,
          bookingId: b.recordId,
          staffId: s?.recordId ?? null,
          time: addHours(b.checkOut, 1),
          extraCharges: JSON.stringify({ lateFee: chance(0.2) ? 1000 : 0 }),
          signatureUrl: null,
        },
      });
      created.checkOuts.push(co);
    }

    if (chance(0.25)) {
      const pet = await db.pet.findFirst({ where: { recordId: b.petId } });
      const ir = await db.incidentReport.create({
        data: {
          tenantId,
          petId: pet.recordId,
          bookingId: b.recordId,
          occurredAt: addHours(b.checkIn, 2),
          severity: pick(['MINOR', 'MODERATE', 'SEVERE']),
          narrative: faker.lorem.sentences(2),
          photos: '[]',
          vetContacted: chance(0.1),
        },
      });
      created.incidents.push(ir);
    }
  }
  return created;
}

async function createFinancials(db, tenantId, bookings, tenantSeed) {
  faker.seed(tenantSeed + 7);
  const payments = [];
  const transactions = [];
  const invoices = [];
  const packages = [];
  const packageUsages = [];

  for (const b of bookings.slice(0, Math.min(12, bookings.length))) {
    const pay = await db.payment.create({
      data: {
        tenantId,
        bookingId: b.recordId,
        ownerId: b.ownerId,
        amountCents: Math.min(b.depositCents, Math.floor(b.totalCents / 2)),
        status: pick(['CAPTURED', 'AUTHORIZED', 'PENDING']),
        method: pick(['card_on_file', 'terminal', 'cash']),
        metadata: {},
      },
    });
    payments.push(pay);

    const ft = hasModel(db, 'financialTransaction')
      ? await db.financialTransaction.create({
      data: {
        tenantId,
        bookingId: b.recordId,
        ownerId: b.ownerId,
        type: pick(['CHARGE', 'PAYMENT', 'ADJUSTMENT']),
        amountCents: Math.floor(b.totalCents / 3),
        description: 'Booking transaction',
        currency: 'USD',
      },
      })
      : null;
    if (ft) transactions.push(ft);

    if (hasModel(db, 'invoice')) {
      const inv = await db.invoice.create({
        data: {
          tenantId,
          ownerId: b.ownerId,
          bookingId: b.recordId,
          invoiceNumber: `${format(new Date(), 'yyyyMMdd')}-${b.recordId.slice(0, 6)}`,
          lineItems: [{ description: 'Boarding', amountCents: b.totalCents }],
          subtotalCents: b.totalCents,
          taxCents: 0,
          totalCents: b.totalCents,
          paidCents: Math.min(b.depositCents, b.totalCents),
          status: pick(['draft', 'finalized', 'paid']),
        },
      });
      invoices.push(inv);
    }
  }

  // Packages and usage
  for (let i = 0; i < 4; i += 1) {
    const owner = await db.owner.findFirst({ where: { tenantId }, skip: i, take: 1 });
    if (!owner) continue;
    if (hasModel(db, 'package') && hasModel(db, 'packageUsage')) {
      const pkg = await db.package.create({
        data: {
          tenantId,
          ownerId: owner.recordId,
          name: `Daycare Pack ${i + 1}`,
          creditsPurchased: 10,
          creditsRemaining: 8,
          priceCents: 45000,
          status: 'active',
        },
      });
      packages.push(pkg);
      if (payments[i]) {
        const usage = await db.packageUsage.create({
          data: {
            tenantId,
            packageId: pkg.recordId,
            bookingId: payments[i].bookingId,
            creditsUsed: 2,
          },
        });
        packageUsages.push(usage);
      }
    }
  }

  return { payments, transactions, invoices, packages, packageUsages };
}

async function createCrmAndNotes(db, tenantId, owners, users, bookings, tenantSeed) {
  faker.seed(tenantSeed + 8);
  const comms = [];
  const notes = [];
  for (const owner of owners.slice(0, 12)) {
    const user = pick(users);
    // Use raw insert to avoid Prisma selecting non-existent columns on older DBs
    try {
      const rows = await db.$queryRaw`insert into "Communication" ("tenantId", "ownerId", "userId", "type", "direction", "subject", "content", "metadata", "createdAt") values (${tenantId}, ${owner.recordId}, ${user.recordId}, ${pick(['EMAIL','SMS','CALL','NOTE'])}, ${pick(['INBOUND','OUTBOUND','INTERNAL'])}, ${chance(0.5) ? faker.lorem.words(4) : null}, ${faker.lorem.sentences(2)}, '{}'::jsonb, now()) returning *`;
      if (rows?.[0]) comms.push(rows[0]);
    } catch (_) {
      // ignore per-row failure to keep overall seed flowing
    }
  }

  for (const b of bookings.slice(0, 10)) {
    const user = pick(users);
    const n = await db.note.create({
      data: {
        tenantId,
        entityType: 'booking',
        entityId: b.recordId,
        content: faker.lorem.sentences(2),
        visibility: pick(['ALL', 'STAFF', 'ADMIN']),
        authorId: user.recordId,
      },
    });
    notes.push(n);
  }
  return { comms, notes };
}

// Safer variant: perform Communication and Notes in small isolated transactions to avoid tx aborts
async function createCrmAndNotesScoped(rootClient, tenantId, owners, users, bookings, tenantSeed) {
  faker.seed(tenantSeed + 8);
  const comms = [];
  const notes = [];

  for (const owner of owners.slice(0, 12)) {
    const user = pick(users);
    try {
      const rows = await rootClient.$transaction(
        async (tx) => {
          await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
          return tx.$queryRaw`insert into "Communication" ("tenantId", "ownerId", "userId", "type", "direction", "subject", "content", "metadata", "createdAt") values (${tenantId}, ${owner.recordId}, ${user.recordId}, ${pick(['EMAIL','SMS','CALL','NOTE'])}, ${pick(['INBOUND','OUTBOUND','INTERNAL'])}, ${chance(0.5) ? faker.lorem.words(4) : null}, ${faker.lorem.sentences(2)}, '{}'::jsonb, now()) returning *`;
        },
        { timeout: 15000 },
      );
      if (rows?.[0]) comms.push(rows[0]);
    } catch (_) {
      // ignore per-row failure
    }
  }

  for (const b of bookings.slice(0, 10)) {
    const user = pick(users);
    try {
      const n = await rootClient.$transaction(
        async (tx) => {
          await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
          return tx.note.create({
            data: {
              tenantId,
              entityType: 'booking',
              entityId: b.recordId,
              content: faker.lorem.sentences(2),
              visibility: pick(['ALL', 'STAFF', 'ADMIN']),
              authorId: user.recordId,
            },
          });
        },
        { timeout: 15000 },
      );
      if (n) notes.push(n);
    } catch (_) {
      // ignore
    }
  }

  return { comms, notes };
}

async function createSegmentsTagsCampaigns(db, tenantId, owners, users, tenantSeed) {
  faker.seed(tenantSeed + 9);
  const segments = [];
  for (const name of ['High Value', 'New Customers', 'Dormant']) {
    segments.push(
      await db.customerSegment.create({
        data: { tenantId, name, conditions: { rule: 'demo' }, isAutomatic: name !== 'High Value' },
      }),
    );
  }

  const segmentMembers = [];
  for (const seg of segments) {
    for (const owner of owners.slice(0, 4)) {
      segmentMembers.push(
        await db.customerSegmentMember.create({ data: { tenantId, segmentId: seg.recordId, ownerId: owner.recordId } }),
      );
    }
  }

  const tags = [];
  for (const name of ['VIP', 'Needs Follow-up', 'Allergies', 'Trainer']) {
    tags.push(await db.customerTag.create({ data: { tenantId, name, color: '#'+faker.number.hex({length:6}) } }));
  }
  const tagMembers = [];
  for (const tag of tags) {
    for (const owner of owners.slice(0, 3)) {
      tagMembers.push(
        await db.customerTagMember.create({ data: { tenantId, tagId: tag.recordId, ownerId: owner.recordId } }),
      );
    }
  }

  const campaigns = [];
  for (const c of ['Welcome Series', 'Holiday Promo']) {
    campaigns.push(
      await db.campaign.create({
        data: {
          tenantId,
          name: c,
          type: 'EMAIL',
          content: { html: `<p>${c}</p>` },
          status: pick(['DRAFT', 'SCHEDULED', 'ACTIVE']),
          createdBy: users[0].recordId,
        },
      }),
    );
  }

  return { segments, segmentMembers, tags, tagMembers, campaigns };
}

async function createSegmentsTagsCampaignsScoped(rootClient, tenantId, owners, users, tenantSeed) {
  faker.seed(tenantSeed + 9);
  const segments = [];
  const segmentMembers = [];
  const tags = [];
  const tagMembers = [];
  const campaigns = [];

  for (const name of ['High Value', 'New Customers', 'Dormant']) {
    try {
      const seg = await rootClient.$transaction(
        async (tx) => {
          await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
          return tx.customerSegment.create({
            data: { tenantId, name, conditions: { rule: 'demo' }, isAutomatic: name !== 'High Value' },
          });
        },
        { timeout: 15000 },
      );
      segments.push(seg);
    } catch (_) {
      // ignore
    }
  }

  for (const seg of segments) {
    for (const owner of owners.slice(0, 4)) {
      try {
        const sm = await rootClient.$transaction(
          async (tx) => {
            await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
            return tx.customerSegmentMember.create({
              data: { tenantId, segmentId: seg.recordId, ownerId: owner.recordId },
            });
          },
          { timeout: 15000 },
        );
        segmentMembers.push(sm);
      } catch (_) {
        // ignore
      }
    }
  }

  for (const name of ['VIP', 'Needs Follow-up', 'Allergies', 'Trainer']) {
    try {
      const t = await rootClient.$transaction(
        async (tx) => {
          await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
          return tx.customerTag.create({ data: { tenantId, name, color: '#'+faker.number.hex({length:6}) } });
        },
        { timeout: 15000 },
      );
      tags.push(t);
    } catch (_) {
      // ignore
    }
  }

  for (const tag of tags) {
    for (const owner of owners.slice(0, 3)) {
      try {
        const tm = await rootClient.$transaction(
          async (tx) => {
            await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
            return tx.customerTagMember.create({ data: { tenantId, tagId: tag.recordId, ownerId: owner.recordId } });
          },
          { timeout: 15000 },
        );
        tagMembers.push(tm);
      } catch (_) {
        // ignore
      }
    }
  }

  for (const c of ['Welcome Series', 'Holiday Promo']) {
    try {
      const camp = await rootClient.$transaction(
        async (tx) => {
          await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
          // Prefer Prisma, but fallback to raw if schema mismatch (e.g., missing createdBy column)
          try {
            return await tx.campaign.create({
              data: {
                tenantId,
                name: c,
                type: 'EMAIL',
                content: { html: `<p>${c}</p>` },
                status: pick(['DRAFT', 'SCHEDULED', 'ACTIVE']),
                createdBy: users[0].recordId,
              },
            });
          } catch (_) {
            const rows = await tx.$queryRaw`insert into "Campaign" ("tenantId", "name", "type", "content", "status", "createdAt", "updatedAt") values (${tenantId}, ${c}, 'EMAIL', '{}'::jsonb, 'DRAFT', now(), now()) returning *`;
            return rows?.[0] ?? null;
          }
        },
        { timeout: 15000 },
      );
      if (camp) campaigns.push(camp);
    } catch (_) {
      // ignore
    }
  }

  return { segments, segmentMembers, tags, tagMembers, campaigns };
}

async function createNotifications(db, tenantId, bookings) {
  const items = [];
  for (const b of bookings.slice(0, 8)) {
    let nq = null;
    if (hasModel(db, 'notificationQueue')) {
      nq = await db.notificationQueue.create({
        data: {
          tenantId,
          recipientId: b.ownerId,
          recipientType: 'owner',
          type: 'BOOKING_CONFIRMED',
          title: 'Booking Confirmed',
          body: 'Your booking has been confirmed.',
          status: 'pending',
        },
      });
    } else {
      try {
        const rows = await db.$queryRaw`insert into "NotificationQueue" ("tenantId", "recipientId", "recipientType", "type", "title", "body", "data", "status", "createdAt") values (${tenantId}, ${b.ownerId}, 'owner', 'BOOKING_CONFIRMED', 'Booking Confirmed', 'Your booking has been confirmed.', '{}'::jsonb, 'pending', now()) returning *`;
        nq = rows?.[0] ?? null;
      } catch (_) {
        nq = null;
      }
    }
    if (nq) items.push(nq);

    if (hasModel(db, 'bookingNotification')) {
      items.push(
        await db.bookingNotification.create({ data: { tenantId, bookingId: b.recordId, type: 'CONFIRMATION' } }),
      );
    } else {
      try {
        const rows2 = await db.$queryRaw`insert into "BookingNotification" ("tenantId", "bookingId", "type", "sentAt") values (${tenantId}, ${b.recordId}, 'CONFIRMATION', now()) returning *`;
        if (rows2?.[0]) items.push(rows2[0]);
      } catch (_) {
        // ignore
      }
    }
  }
  return items;
}

async function createPermissionsAndTemplates(db, tenantId, users) {
  const roles = [];
  for (const r of ['Receptionist', 'Groomer']) {
    try {
      if (db.customRole && typeof db.customRole.create === 'function') {
        roles.push(await db.customRole.create({ data: { tenantId, name: r, description: `${r} role` } }));
      }
    } catch (_) {
      // ignore if table/column missing
    }
  }
  const sets = [];
  for (const p of ['Standard Permissions', 'Finance Permissions']) {
    try {
      if (db.permissionSet && typeof db.permissionSet.create === 'function') {
        sets.push(await db.permissionSet.create({ data: { tenantId, name: p, permissions: { scope: 'demo' } } }));
      }
    } catch (_) {
      // ignore
    }
  }
  const userRoles = [];
  if (roles.length && hasModel(db, 'userRole')) {
    try {
      userRoles.push(
        await db.userRole.create({ data: { userId: users[0].recordId, roleId: roles[0].recordId } }),
      );
    } catch (_) {
      // ignore
    }
  }
  const userPerms = [];
  if (hasModel(db, 'userPermission')) {
    try {
      userPerms.push(
        await db.userPermission.create({ data: { userId: users[0].recordId, permission: 'payments.refund', granted: true } }),
      );
    } catch (_) {
      // ignore
    }
  }

  const templates = [];
  if (hasModel(db, 'messageTemplate')) {
    try {
      templates.push(
        await db.messageTemplate.create({
          data: { tenantId, name: 'Booking Confirmation', type: 'EMAIL', subject: 'Your booking', body: 'Thanks for booking!' },
        }),
      );
    } catch (_) {
      // ignore
    }
  }

  return { roles, sets, userRoles, userPerms, templates };
}

async function createLegal(db, tenantId, owners, bookings) {
  let waiver = null;
  const signed = [];
  if (hasModel(db, 'waiver')) {
    waiver = await db.waiver.create({
      data: { tenantId, templateHtml: '<p>Demo Waiver</p>', version: 1, isActive: true },
    });
  }
  if (waiver && hasModel(db, 'signedWaiver')) {
    for (const o of owners.slice(0, 4)) {
      signed.push(
        await db.signedWaiver.create({
          data: {
            tenantId,
            waiverId: waiver.recordId,
            ownerId: o.recordId,
            bookingId: bookings[0]?.recordId ?? null,
            waiverVersion: 1,
            signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=',
            ipAddress: '127.0.0.1',
          },
        }),
      );
    }
  }
  return { waiver, signed };
}

async function createSupportAndMessages(db, tenantId, users) {
  const tickets = [];
  const messages = [];
  if (users.length >= 2 && hasModel(db, 'supportTicket')) {
    const t = await db.supportTicket.create({
      data: {
        tenantId,
        userId: users[1].recordId,
        subject: 'Portal login issue',
        description: 'User unable to login after password reset',
        priority: 'medium',
      },
    });
    tickets.push(t);
    if (hasModel(db, 'supportMessage')) {
      messages.push(
        await db.supportMessage.create({ data: { ticketId: t.recordId, userId: users[1].recordId, message: 'Details attached' } }),
      );
    }
  }

  // Internal messages
  if (hasModel(db, 'message')) {
    const convId = faker.string.uuid();
    messages.push(
      await db.message.create({
        data: {
          tenantId,
          conversationId: convId,
          senderId: users[0].recordId,
          recipientId: users[1]?.recordId ?? null,
          content: 'Hello from demo seed',
        },
      }),
    );
  }
  return { tickets, messages };
}

async function createActivity(db, tenantId, bookings) {
  const items = [];
  if (!hasModel(db, 'activityFeed')) return items;
  for (const b of bookings.slice(0, 8)) {
    items.push(
      await db.activityFeed.create({
        data: {
          tenantId,
          bookingId: b.recordId,
          petId: b.petId,
          type: 'PHOTO',
          caption: 'Playtime photo',
          metadata: {},
        },
      }),
    );
  }
  return items;
}

async function createIntegrations(db, tenantId) {
  const items = [];
  if (hasModel(db, 'integration')) {
    items.push(
      await db.integration.create({
        data: { tenantId, provider: 'stripe', accessToken: 'encrypted:demo', status: 'active' },
      }),
    );
    items.push(
      await db.integration.create({
        data: { tenantId, provider: 'quickbooks', accessToken: 'encrypted:demo', status: 'active' },
      }),
    );
  }
  return items;
}

async function createMisc(db, tenantId, users) {
  const keys = [];
  if (hasModel(db, 'idempotencyKey')) {
    try {
      keys.push(
        await db.idempotencyKey.create({
          data: {
            tenantId,
            key: `seed-${tenantId}-key-1`,
            endpoint: '/api/bookings',
            status: 'completed',
            expiresAt: addDays(new Date(), 7),
          },
        }),
      );
    } catch (_) {
      // ignore
    }
  }

  const audits = [];
  if (hasModel(db, 'enhancedAuditLog')) {
    audits.push(
      await db.enhancedAuditLog.create({
        data: {
          tenantId,
          userId: users[0]?.recordId ?? null,
          entityType: 'tenant',
          entityId: tenantId,
          action: 'created',
          changes: { before: null, after: { seeded: true } },
        },
      }),
    );
  }
  return { keys, audits };
}

async function seedTenant(def) {
  // Deterministic randomness per tenant
  faker.seed(def.seed);

  const tenant = await createTenant({ slug: def.slug, name: def.name });
  const tenantId = tenant.recordId;

  // Helper to run a scoped transaction with tenant GUC and extended timeout
  const runTenantTx = (fn) =>
    prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
        return fn(tx);
      },
      { timeout: 60000 },
    );

  // Users/Staff
  const { users, staffRecords } = await runTenantTx((tx) =>
    createUsersAndStaff(tx, tenantId, def.seed, def.slug),
  );

  // Owners, Pets
  const owners = await runTenantTx((tx) => createOwners(tx, tenantId, def.seed, 15, def.slug));
  const pets = await runTenantTx((tx) => createPets(tx, tenantId, owners, def.seed, 15));

  // Kennels, Runs, Services
  const kennels = await runTenantTx((tx) => createKennels(tx, tenantId));
  await runTenantTx((tx) => createRuns(tx, tenantId));
  const services = await runTenantTx((tx) => createServices(tx, tenantId));

  // Bookings and segments/services
  const bookings = await runTenantTx((tx) =>
    createBookings(tx, tenantId, pets, owners, kennels, services, def.seed, 24),
  );

  // Health: vaccinations, checkins/outs, incidents
  await runTenantTx((tx) => createVaccinations(tx, tenantId, pets, def.seed));
  await runTenantTx((tx) =>
    createCheckinsAndIncidents(tx, tenantId, bookings, staffRecords, pets, def.seed),
  );

  // Financials
  await runTenantTx((tx) => createFinancials(tx, tenantId, bookings, def.seed));

  // CRM/Notes
  // CRM & Notes in scoped micro-transactions to avoid tx aborts
  await createCrmAndNotesScoped(prisma, tenantId, owners, users, bookings, def.seed);

  // Segments/Tags/Campaigns
  await createSegmentsTagsCampaignsScoped(prisma, tenantId, owners, users, def.seed);

  // Notifications
  await runTenantTx((tx) => createNotifications(tx, tenantId, bookings));

  // Permissions & Templates
  await runTenantTx((tx) => createPermissionsAndTemplates(tx, tenantId, users));

  // Legal docs
  await runTenantTx((tx) => createLegal(tx, tenantId, owners, bookings));

  // Support & Messaging
  await runTenantTx((tx) => createSupportAndMessages(tx, tenantId, users));

  // Activity Feed
  await runTenantTx((tx) => createActivity(tx, tenantId, bookings));

  // Integrations
  await runTenantTx((tx) => createIntegrations(tx, tenantId));

  // Misc keys & audit
  await runTenantTx((tx) => createMisc(tx, tenantId, users));

  return { tenantId };
}

async function main() {
  // Clean previous demo tenants then seed fresh
  await clearDemoTenants();

  const summaries = [];
  for (const t of DEMO_TENANTS) {
    const s = await seedTenant(t);
    summaries.push({ slug: t.slug, tenantId: s.tenantId });
  }

  // eslint-disable-next-line no-console
  console.log('Demo seed completed:', summaries);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error('Demo seed failed', error);
    await prisma.$disconnect();
    process.exit(1);
  });


