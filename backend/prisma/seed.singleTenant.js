/*
  Single-tenant seed for development/testing.
  - Targets a specific tenant/user/membership so you don't need to switch tenants.
  - Safe to re-run: upserts core identities and adds sample domain data.
*/

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const { addDays, subDays, startOfDay } = require('date-fns');

// Your actual test account IDs
const TENANT_ID = process.env.SEED_TENANT_ID || 'cmgtdqv000000us2sh5t96che';
const USER_ID = process.env.SEED_USER_ID || 'cmgtdqv2g0001us2syvg55ugt';
const MEMBERSHIP_ID = process.env.SEED_MEMBERSHIP_ID || 'cmgtdqv7i0003us2sysxfuxco';

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

const resolvedUrl = expandTemplate(process.env.DATABASE_URL || process.env.DEV_DATABASE_URL);
if (resolvedUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolvedUrl;
}

const prisma = new PrismaClient();

const hasModel = (db, modelName) => {
  const m = db?.[modelName];
  return !!m && (typeof m.create === 'function' || typeof m.createMany === 'function');
};

async function ensureTenant() {
  const existing = await prisma.tenant.findFirst({ where: { recordId: TENANT_ID } });
  if (existing) return existing;
  return prisma.tenant.create({
    data: {
      recordId: TENANT_ID,
      slug: 'demo',  // Change this to your actual tenant slug if different
      name: 'Demo Workspace',
      plan: 'PRO',
      featureFlags: { incidentReporting: true },
      settings: { timezone: 'America/Los_Angeles', currency: 'USD' },
    },
  });
}

async function ensureUser() {
  const existing = await prisma.user.findFirst({ where: { recordId: USER_ID } });
  if (existing) return existing;
  const passwordHash = await bcrypt.hash('Passw0rd!', 10);
  return prisma.user.create({
    data: {
      recordId: USER_ID,
      email: 'your-email@example.com',  // Change this to your actual email
      passwordHash,
      name: 'Your Name',  // Change this to your actual name
      language: 'en',
    },
  });
}

async function ensureMembership(tenantId, userId) {
  // Perform lookup and potential create within tenant-scoped transaction (RLS-safe)
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;

    const byId = await tx.membership.findFirst({ where: { recordId: MEMBERSHIP_ID } });
    if (byId) return byId;

    const byPair = await tx.membership.findFirst({ where: { tenantId, userId } });
    if (byPair) return byPair;

    return tx.membership.create({ data: { recordId: MEMBERSHIP_ID, tenantId, userId, role: 'OWNER' } });
  });
}

async function seedCoreDomain(tenantId) {
  // Run inside tenant-scoped transaction for RLS
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;

    const ensureKennel = async (name, type, capacity) => {
      const found = await tx.kennel.findFirst({ where: { tenantId, name } });
      if (found) return found;
      return tx.kennel.create({ data: { tenantId, name, type, capacity, amenities: '[]' } });
    };
    // Kennels
    const kennels = await Promise.all([
      ensureKennel('Deluxe Suite 1', 'SUITE', 1),
      ensureKennel('Standard Kennel 1', 'KENNEL', 1),
      ensureKennel('Daycare Pod A', 'DAYCARE', 8),
    ]);

    const ensureService = async (name, category, priceCents) => {
      const found = await tx.service.findFirst({ where: { tenantId, name } });
      if (found) return found;
      return tx.service.create({ data: { tenantId, name, category, priceCents } });
    };
    // Services
    const services = await Promise.all([
      ensureService('Boarding - Standard', 'BOARDING', 8000),
      ensureService('Daycare - Full Day', 'DAYCARE', 6000),
      ensureService('Grooming - Bath', 'GROOMING', 4000),
    ]);

    // Owners + Pets
    let owner = await tx.owner.findFirst({ where: { tenantId, email: 'amy.peterson@example.com' } });
    if (!owner) {
      owner = await tx.owner.create({
        data: {
          tenantId,
          firstName: 'Amy',
          lastName: 'Peterson',
          email: 'amy.peterson@example.com',
          phone: '555-0101',
          address: { city: 'Seattle', state: 'WA' },
          createdAt: subDays(new Date(), 30),
        },
      });
    }

    let pet = await tx.pet.findFirst({ where: { tenantId, name: 'Luna' } });
    if (!pet) {
      pet = await tx.pet.create({
        data: {
          tenantId,
          name: 'Luna',
          breed: 'Australian Shepherd',
          behaviorFlags: ['high-energy'],
          owners: { create: [{ tenantId, ownerId: owner.recordId, isPrimary: true }] },
        },
      });
    }

    // Bookings (a few across this week)
    const today = startOfDay(new Date());
    let booking = await tx.booking.findFirst({ where: { tenantId, petId: pet.recordId, ownerId: owner.recordId } });
    if (!booking) {
      booking = await tx.booking.create({
      data: {
        tenantId,
        petId: pet.recordId,
        ownerId: owner.recordId,
        status: 'CONFIRMED',
        checkIn: today,
        checkOut: addDays(today, 2),
        depositCents: 12000,
        totalCents: 42000,
        balanceDueCents: 30000,
        segments: {
          create: [
            {
              tenantId,
              kennelId: kennels[0].recordId,
              startDate: today,
              endDate: addDays(today, 1),
              status: 'CONFIRMED',
            },
            {
              tenantId,
              kennelId: kennels[1].recordId,
              startDate: addDays(today, 1),
              endDate: addDays(today, 2),
              status: 'CONFIRMED',
            },
          ],
        },
        },
      });
    }

    await tx.bookingService.createMany({
      data: [
        { tenantId, bookingId: booking.recordId, serviceId: services[0].recordId, quantity: 1, priceCents: 8000 },
        { tenantId, bookingId: booking.recordId, serviceId: services[2].recordId, quantity: 1, priceCents: 4000 },
      ],
    });

    // Vaccinations
    await tx.vaccination.create({
      data: { tenantId, petId: pet.recordId, type: 'Rabies', administeredAt: subDays(new Date(), 120), expiresAt: addDays(new Date(), 240) },
    });

    // Payments (guard if table exists)
    if (hasModel(tx, 'payment')) {
      await tx.payment.create({
        data: { tenantId, bookingId: booking.recordId, ownerId: owner.recordId, amountCents: 12000, status: 'CAPTURED', method: 'card_on_file', metadata: {} },
      });
    }

    // A couple of notes
    await tx.note.create({
      data: { tenantId, entityType: 'booking', entityId: booking.recordId, content: 'Welcome to your stay!', authorId: USER_ID },
    });

    return { kennels, services, owner, pet, booking };
  }, { timeout: 60000 });
}

async function ensureStaff(tenantId) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
    const existing = await tx.staff.findFirst({ where: { tenantId, membershipId: MEMBERSHIP_ID } });
    if (existing) return existing;
    return tx.staff.create({
      data: { tenantId, membershipId: MEMBERSHIP_ID, title: 'Owner/Operator', schedule: { shifts: [] } },
    });
  });
}

async function seedAllSchemas(tenantId, ctx) {
  // Small scoped transactions to avoid long tx timeouts
  const runScoped = (fn) => prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
    return fn(tx);
  }, { timeout: 60000 });

  const ensure = async (finder, creator) => {
    const existing = await finder();
    if (existing) return existing;
    return creator();
  };

  const createWithRetry = async (creator, attempts = 3) => {
    let lastErr;
    for (let i = 0; i < attempts; i += 1) {
      try {
        return await creator();
      } catch (err) {
        lastErr = err;
        // P2002 unique violation → retry
        if (err?.code !== 'P2002') break;
      }
    }
    throw lastErr;
  };

  // UsageCounter
  await runScoped((tx) => ensure(
    () => tx.usageCounter.findFirst({ where: { tenantId, date: startOfDay(new Date()) } }),
    () => tx.usageCounter.create({ data: { tenantId, date: startOfDay(new Date()), bookings: 1, activePets: 1, staffSeats: 1 } }),
  ));

  // CheckIn / Incident / CheckOut
  await runScoped(async (tx) => {
    const ci = await tx.checkIn.create({ data: { tenantId, bookingId: ctx.booking.recordId, staffId: null, weight: 18.5 } });
    const ir = await tx.incidentReport.create({ data: { tenantId, petId: ctx.pet.recordId, bookingId: ctx.booking.recordId, severity: 'MINOR', narrative: 'Minor scuffle during play.' } });
    await tx.checkOut.create({ data: { tenantId, bookingId: ctx.booking.recordId, staffId: null, incidentReportId: ir.recordId, extraCharges: '{}' } });
    return ci;
  });

  // Communication (raw for compatibility)
  await runScoped(async (tx) => {
    try {
      await tx.$queryRaw`insert into "Communication" ("tenantId", "ownerId", "userId", "type", "direction", "subject", "content", "metadata", "createdAt") values (${tenantId}, ${ctx.owner.recordId}, ${USER_ID}, 'EMAIL', 'OUTBOUND', 'Welcome', 'Hello from BarkBase!', '{}'::jsonb, now())`;
    } catch (_) {}
  });

  // Customer Segments/Tags
  const seg = await runScoped((tx) => ensure(
    () => tx.customerSegment.findFirst({ where: { tenantId, name: 'Test Segment' } }),
    () => tx.customerSegment.create({ data: { tenantId, name: 'Test Segment', conditions: { all: [] }, isAutomatic: false } }),
  ));
  await runScoped((tx) => ensure(
    () => tx.customerSegmentMember.findFirst({ where: { segmentId: seg.recordId, ownerId: ctx.owner.recordId } }),
    () => tx.customerSegmentMember.create({ data: { tenantId, segmentId: seg.recordId, ownerId: ctx.owner.recordId } }),
  ));
  const tag = await runScoped((tx) => ensure(
    () => tx.customerTag.findFirst({ where: { tenantId, name: 'VIP' } }),
    () => tx.customerTag.create({ data: { tenantId, name: 'VIP', color: '#22c55e' } }),
  ));
  await runScoped((tx) => ensure(
    () => tx.customerTagMember.findFirst({ where: { tagId: tag.recordId, ownerId: ctx.owner.recordId } }),
    () => tx.customerTagMember.create({ data: { tenantId, tagId: tag.recordId, ownerId: ctx.owner.recordId } }),
  ));

  // EmailVerificationToken & Invite
  await runScoped((tx) => ensure(
    () => tx.emailVerificationToken.findFirst({ where: { userId: USER_ID } }),
    () => tx.emailVerificationToken.create({ data: { userId: USER_ID, token: faker.string.uuid(), expiresAt: addDays(new Date(), 2) } }),
  ));
  await runScoped((tx) => ensure(
    () => tx.invite.findFirst({ where: { tenantId, email: 'invitee@example.com' } }),
    () => tx.invite.create({ data: { tenantId, email: 'invitee@example.com', token: faker.string.uuid(), role: 'STAFF', expiresAt: addDays(new Date(), 7), createdById: USER_ID } }),
  ));

  // Campaign (raw to be schema-compatible where createdById exists)
  await runScoped(async (tx) => {
    try {
      await tx.$queryRaw`insert into "Campaign" ("tenantId", "name", "type", "status", "content", "createdById", "createdAt", "updatedAt") values (${tenantId}, 'Welcome Series', 'EMAIL', 'DRAFT', '{}'::jsonb, ${USER_ID}, now(), now())`;
    } catch (_) {}
  });

  // Runs and assignments
  const run = await runScoped((tx) => ensure(
    () => tx.run.findFirst({ where: { tenantId, name: 'Morning Play' } }),
    () => tx.run.create({ data: { tenantId, name: 'Morning Play', capacity: 10, scheduleTime: '08:00', color: '#3b82f6' } }),
  ));
  await runScoped((tx) => ensure(
    () => tx.runAssignment.findFirst({ where: { runId: run.recordId, petId: ctx.pet.recordId, date: startOfDay(new Date()) } }),
    () => tx.runAssignment.create({ data: { tenantId, runId: run.recordId, petId: ctx.pet.recordId, date: startOfDay(new Date()) } }),
  ));

  // Templates & Waivers
  await runScoped(async (tx) => { if (hasModel(tx, 'messageTemplate')) { await tx.messageTemplate.create({ data: { tenantId, name: 'Booking Confirmation', type: 'EMAIL', body: 'Thanks for booking!' } }); } });
  const waiver = await runScoped(async (tx) => { if (hasModel(tx, 'waiver')) { return ensure(
    () => tx.waiver.findFirst({ where: { tenantId } }),
    () => tx.waiver.create({ data: { tenantId, templateHtml: '<p>Terms</p>', version: 1, isActive: true } }),
  ); } return null; });
  if (waiver) {
    await runScoped(async (tx) => { if (hasModel(tx, 'signedWaiver')) { await tx.signedWaiver.create({ data: { tenantId, waiverId: waiver.recordId, ownerId: ctx.owner.recordId, bookingId: ctx.booking.recordId, waiverVersion: 1, signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=' } }); } });
  }

  // Support
  let ticket = null;
  if (hasModel(prisma, 'supportTicket')) {
    ticket = await runScoped((tx) => ensure(
      () => (tx.supportTicket ? tx.supportTicket.findFirst({ where: { tenantId, userId: USER_ID } }) : null),
      () => tx.supportTicket.create({ data: { tenantId, userId: USER_ID, subject: 'Help needed', description: 'Test ticket' } }),
    ));
  }
  if (ticket && hasModel(prisma, 'supportMessage')) {
    await runScoped((tx) => ensure(
      () => (tx.supportMessage ? tx.supportMessage.findFirst({ where: { ticketId: ticket.recordId } }) : null),
      () => tx.supportMessage.create({ data: { ticketId: ticket.recordId, userId: USER_ID, message: 'First message' } }),
    ));
  }

  // Integrations & Sync
  await runScoped(async (tx) => { if (hasModel(tx, 'integration')) { await ensure(
    () => tx.integration.findFirst({ where: { tenantId, provider: 'stripe' } }),
    () => tx.integration.create({ data: { tenantId, provider: 'stripe', accessToken: 'encrypted:demo' } }),
  ); } });
  await runScoped((tx) => tx.syncError.create({ data: { tenantId, provider: 'stripe', entityType: 'payment', entityId: 'seed', error: 'Test error' } }));

  // Financials ledger & packages & invoices
  await runScoped(async (tx) => { if (hasModel(tx, 'financialTransaction')) { await tx.financialTransaction.create({ data: { tenantId, bookingId: ctx.booking.recordId, ownerId: ctx.owner.recordId, type: 'CHARGE', amountCents: 5000, description: 'Test charge' } }); } });
  const pkg = await runScoped(async (tx) => { if (hasModel(tx, 'package')) { return tx.package.create({ data: { tenantId, ownerId: ctx.owner.recordId, name: 'Daycare 10', creditsPurchased: 10, creditsRemaining: 9, priceCents: 45000, status: 'active' } }); } return null; });
  if (pkg) {
    await runScoped(async (tx) => { if (hasModel(tx, 'packageUsage')) { await tx.packageUsage.create({ data: { tenantId, packageId: pkg.recordId, bookingId: ctx.booking.recordId, creditsUsed: 1 } }); } });
  }
  await runScoped(async (tx) => { if (hasModel(tx, 'invoice')) { await tx.invoice.create({ data: { tenantId, ownerId: ctx.owner.recordId, bookingId: ctx.booking.recordId, invoiceNumber: `INV-${faker.string.alphanumeric(6)}`, lineItems: [{ description: 'Boarding', amountCents: 42000 }], subtotalCents: 42000, totalCents: 42000, paidCents: 12000, status: 'finalized' } }); } });

  // Activity & Notifications
  await runScoped(async (tx) => { if (hasModel(tx, 'activityFeed')) { await tx.activityFeed.create({ data: { tenantId, bookingId: ctx.booking.recordId, petId: ctx.pet.recordId, type: 'PHOTO', caption: 'Welcome photo' } }); } });
  await runScoped(async (tx) => { if (hasModel(tx, 'pushSubscription')) { await tx.pushSubscription.create({ data: { tenantId, userId: USER_ID, endpoint: `https://example.com/${faker.string.uuid()}`, keys: { p256dh: 'k', auth: 'a' }, platform: 'web' } }); } });
  await runScoped(async (tx) => {
    try {
      await tx.$queryRaw`insert into "NotificationQueue" ("tenantId", "recipientId", "recipientType", "type", "title", "body", "data", "status", "createdAt") values (${tenantId}, ${ctx.owner.recordId}, 'owner', 'BOOKING_CONFIRMED', 'Confirmed', 'Your booking is confirmed.', '{}'::jsonb, 'pending', now())`;
    } catch (_) {}
  });
  await runScoped(async (tx) => {
    try {
      await tx.$queryRaw`insert into "BookingNotification" ("tenantId", "bookingId", "type", "sentAt") values (${tenantId}, ${ctx.booking.recordId}, 'CONFIRMATION', now())`;
    } catch (_) {}
  });

  // Keys & Audit
  await runScoped(async (tx) => { if (hasModel(tx, 'idempotencyKey')) { await tx.idempotencyKey.create({ data: { tenantId, key: `seed-${faker.string.uuid()}`, endpoint: '/api/test', status: 'completed', expiresAt: addDays(new Date(), 7) } }); } });
  await runScoped((tx) => tx.auditLog.create({ data: { tenantId, actorId: USER_ID, action: 'seed', entityType: 'tenant', entityId: tenantId, diff: { seeded: true } } }));
  await runScoped(async (tx) => { if (hasModel(tx, 'enhancedAuditLog')) { await tx.enhancedAuditLog.create({ data: { tenantId, userId: USER_ID, entityType: 'tenant', entityId: tenantId, action: 'created', changes: { before: null, after: { seeded: true } } } }); } });

  // Permissions
  const role = await runScoped(async (tx) => { if (hasModel(tx, 'customRole')) { return ensure(
    () => tx.customRole.findFirst({ where: { tenantId, name: 'Receptionist' } }),
    () => tx.customRole.create({ data: { tenantId, name: 'Receptionist', description: 'Front desk' } }),
  ); } return null; });
  await runScoped(async (tx) => { if (hasModel(tx, 'permissionSet')) { await ensure(
    () => tx.permissionSet.findFirst({ where: { tenantId, name: 'Standard' } }),
    () => tx.permissionSet.create({ data: { tenantId, name: 'Standard', permissions: { bookings: 'rw' } } }),
  ); } });
  if (role) {
    await runScoped(async (tx) => { if (hasModel(tx, 'userRole')) { await tx.userRole.create({ data: { userId: USER_ID, roleId: role.recordId } }); } });
  }
  await runScoped(async (tx) => { if (hasModel(tx, 'userPermission')) { await tx.userPermission.create({ data: { userId: USER_ID, permission: 'bookings.view', granted: true } }); } });

  // Public messages table
  await runScoped((tx) => tx.message.create({ data: { tenantId, conversationId: faker.string.uuid(), senderId: USER_ID, recipientId: null, content: 'Hello!' } }));

  // Task (related to booking)
  await runScoped((tx) => tx.task.create({ data: { tenantId, type: 'CLEANING', relatedType: 'booking', relatedId: ctx.booking.recordId, assignedTo: null, scheduledFor: addDays(new Date(), 1), priority: 'NORMAL', notes: 'Clean kennel after checkout' } }));
}

async function main() {
  faker.seed(999);

  // Ensure identities exist
  const tenant = await ensureTenant();
  const user = await ensureUser();
  await ensureMembership(tenant.recordId, user.recordId);
  await ensureStaff(tenant.recordId);

  // Seed domain data under the tenant
  const ctx = await seedCoreDomain(tenant.recordId);
  await seedAllSchemas(tenant.recordId, ctx);

  console.log('Single-tenant seed completed for tenant:', tenant.recordId);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (err) => { console.error('Seed failed', err); await prisma.$disconnect(); process.exit(1); });


