const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const archiver = require('archiver');
const prisma = require('../config/prisma');
const env = require('../config/env');
const { isRecoveryMode } = require('../config/state');
const { ensureDiskSpace } = require('../lib/diskSpace');
const { resolveTenantFeatures } = require('../lib/features');
const tenantContext = require('../middleware/tenantContext');
const { forTenant } = require('../lib/tenantPrisma');
const { getUsageSnapshot } = require('./usage.service');

const invalidateTenantCache = () => {
  if (typeof tenantContext.clearCache === 'function') {
    tenantContext.clearCache();
  }
};

const serializeTenant = (tenant, { features, usage } = {}) => {
  const resolvedFeatures = features ?? resolveTenantFeatures(tenant);
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    plan: tenant.plan,
    storageProvider: tenant.storageProvider ?? 'SUPABASE',
    dbProvider: tenant.dbProvider ?? 'SUPABASE',
    migrationState: tenant.migrationState ?? 'IDLE',
    migrationInfo: tenant.migrationInfo ?? null,
    featureFlags: tenant.featureFlags ?? {},
    features: resolvedFeatures,
    usage: usage ?? null,
    theme: tenant.themeJson ?? {},
    customDomain: tenant.customDomain ?? null,
    settings: tenant.settings ?? {},
    updatedAt: tenant.updatedAt,
    createdAt: tenant.createdAt,
    recoveryMode: isRecoveryMode(),
  };
};

const jsonClone = (value) => {
  if (!value || typeof value !== 'object') {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
};

const toIsoString = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString();
};

const toCsv = (rows, columns) => {
  const escape = (input) => {
    if (input === null || input === undefined) {
      return '';
    }
    if (typeof input === 'object') {
      return escape(JSON.stringify(input));
    }
    const stringValue = String(input);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const header = columns.map((column) => escape(column.header)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((column) => {
        const value = column.accessor(row);
        return escape(value);
      })
      .join(','),
  );

  return [header, ...lines].join('\n');
};

const ensureDirectory = async (dirPath) => {
  await fsp.mkdir(dirPath, { recursive: true });
};

const writeArchive = async (filePath, entries = []) => {
  await ensureDirectory(path.dirname(filePath));

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);

    entries.forEach((entry) => {
      archive.append(entry.contents, { name: entry.name });
    });

    archive.finalize();
  });
};

const mergeExportSettings = (currentSettings = {}, next = {}) => ({
  ...currentSettings,
  exports: {
    ...(currentSettings.exports ?? {}),
    ...next,
  },
});

const resolveOnboardingChecklist = ({
  tenant,
  bookingCount,
  petCount,
  kennelCount,
  membershipCount,
  pendingInviteCount,
}) => {
  const themeCustomized = tenant.themeJson && Object.keys(tenant.themeJson).length > 0;
  const onboardingSettings = tenant.settings?.onboarding ?? {};

  const checklist = [
    {
      id: 'create-booking',
      label: 'Create your first booking',
      description: 'Drag a pet onto the calendar to confirm a stay.',
      href: '/bookings',
      done: bookingCount > 0,
    },
    {
      id: 'add-pet',
      label: 'Add a pet and owner',
      description: 'Keep vaccination, dietary notes, and owners in sync.',
      href: '/pets',
      done: petCount > 0,
    },
    {
      id: 'invite-team',
      label: 'Invite your team',
      description: 'Send teammates an invite so they can manage bookings.',
      href: '/settings/members',
      done: membershipCount > 1 || pendingInviteCount > 0,
    },
    {
      id: 'configure-kennels',
      label: 'Configure your kennels',
      description: 'Add suites, capacity, and amenities for accurate occupancy.',
      href: '/kennels',
      done: kennelCount > 0,
    },
    {
      id: 'customize-theme',
      label: 'Customize your brand theme',
      description: 'Match BarkBase to your colors so staff feels at home.',
      href: '/settings/theme',
      done: Boolean(themeCustomized),
    },
    {
      id: 'review-plan',
      label: 'Review plan benefits',
      description: 'See what PRO unlocks and choose the right tier.',
      href: '/settings/billing',
      done: tenant.plan !== 'FREE',
    },
  ];

  const completed = checklist.filter((item) => item.done).length;
  const nextStep = checklist.find((item) => !item.done) ?? null;

  return {
    dismissed: Boolean(onboardingSettings.dismissed),
    checklist,
    progress: {
      completed,
      total: checklist.length,
    },
    nextStep,
    plan: {
      name: tenant.plan,
      features: resolveTenantFeatures(tenant),
      upgradeAvailable: tenant.plan !== 'ENTERPRISE',
    },
    updatedAt: onboardingSettings.updatedAt ?? null,
  };
};

const mergeTenantSettings = (tenant, updates) => {
  const currentSettings = tenant.settings && typeof tenant.settings === 'object' ? tenant.settings : {};
  return {
    ...currentSettings,
    onboarding: {
      ...(currentSettings.onboarding ?? {}),
      ...updates,
      updatedAt: new Date().toISOString(),
    },
  };
};

const getTenant = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { statusCode: 404 });
  }
  const features = resolveTenantFeatures(tenant);
  const usage = await getUsageSnapshot({ tenantId, features });
  return serializeTenant(tenant, { features, usage });
};

const getTenantPlan = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { statusCode: 404 });
  }
  const features = resolveTenantFeatures(tenant);
  const usage = await getUsageSnapshot({ tenantId, features });
  return {
    plan: tenant.plan,
    storageProvider: tenant.storageProvider ?? 'SUPABASE',
    dbProvider: tenant.dbProvider ?? 'SUPABASE',
    migrationState: tenant.migrationState ?? 'IDLE',
    migrationInfo: tenant.migrationInfo ?? null,
    featureFlags: tenant.featureFlags ?? {},
    features,
    usage,
    recoveryMode: isRecoveryMode(),
  };
};

const getTenantExport = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      plan: true,
      featureFlags: true,
      settings: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { statusCode: 404 });
  }

  const tenantDb = forTenant(tenantId);

  const [membershipRecords, inviteRecords, ownerRecords, petRecords, kennelRecords, serviceRecords, bookingRecords, paymentRecords, vaccinationRecords, auditLogRecords] = await Promise.all([
    prisma.membership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.invite.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    }),
    tenantDb.owner.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        pets: {
          select: {
            petId: true,
            isPrimary: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    tenantDb.pet.findMany({
      select: {
        id: true,
        name: true,
        breed: true,
        birthdate: true,
        photoUrl: true,
        medicalNotes: true,
        dietaryNotes: true,
        behaviorFlags: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        owners: {
          select: {
            ownerId: true,
            isPrimary: true,
          },
        },
        vaccinations: {
          select: {
            id: true,
            type: true,
            administeredAt: true,
            expiresAt: true,
            documentUrl: true,
            notes: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    tenantDb.kennel.findMany({ orderBy: { createdAt: 'asc' } }),
    tenantDb.service.findMany({ orderBy: { createdAt: 'asc' } }),
    tenantDb.booking.findMany({
      include: {
        pet: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        segments: {
          include: {
            kennel: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    tenantDb.payment.findMany({ orderBy: { createdAt: 'asc' } }),
    tenantDb.vaccination.findMany({ orderBy: { administeredAt: 'desc' } }),
    prisma.auditLog.findMany({
      where: { tenantId },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const memberships = membershipRecords.map((membership) => ({
    id: membership.id,
    tenantId: membership.tenantId,
    userId: membership.userId,
    role: membership.role,
    localDataConsent: jsonClone(membership.localDataConsent) ?? null,
    createdAt: toIsoString(membership.createdAt),
    updatedAt: toIsoString(membership.updatedAt),
    user: membership.user
      ? {
          id: membership.user.id,
          email: membership.user.email,
          lastLoginAt: toIsoString(membership.user.lastLoginAt),
          createdAt: toIsoString(membership.user.createdAt),
          updatedAt: toIsoString(membership.user.updatedAt),
          isActive: membership.user.isActive,
        }
      : null,
  }));

  const auditLogs = auditLogRecords.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId ?? '',
    diff: log.diff ?? null,
    createdAt: toIsoString(log.createdAt),
    actor: log.actor
      ? {
          id: log.actor.id,
          email: log.actor.email,
        }
      : null,
  }));

  const payload = {
    tenant,
    generatedAt: new Date().toISOString(),
    resources: {
      memberships,
      invites: inviteRecords,
      owners: ownerRecords,
      pets: petRecords,
      kennels: kennelRecords,
      services: serviceRecords,
      bookings: bookingRecords,
      payments: paymentRecords,
      vaccinations: vaccinationRecords,
      auditLogs,
    },
  };

  const safeSlug = tenant.slug || tenant.id || 'tenant';
  const exportsDir = path.join(env.storage.root, 'tenants', safeSlug, 'exports');
  const timestamp = payload.generatedAt.replace(/[:]/g, '-');
  const filename = `${safeSlug}-export-${timestamp}.zip`;
  const filePath = path.join(exportsDir, filename);

  const csvEntries = [
    {
      name: 'memberships.csv',
      rows: memberships.map((member) => ({
        id: member.id,
        userEmail: member.user?.email ?? '',
        role: member.role,
        consentAt: member.localDataConsent?.agreedAt ? toIsoString(member.localDataConsent.agreedAt) : '',
        consentIp: member.localDataConsent?.ip ?? '',
        consentAppVersion: member.localDataConsent?.appVersion ?? '',
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      })),
      columns: [
        { header: 'id', accessor: (row) => row.id },
        { header: 'userEmail', accessor: (row) => row.userEmail },
        { header: 'role', accessor: (row) => row.role },
        { header: 'consentAt', accessor: (row) => row.consentAt },
        { header: 'consentIp', accessor: (row) => row.consentIp },
        { header: 'consentAppVersion', accessor: (row) => row.consentAppVersion },
        { header: 'createdAt', accessor: (row) => row.createdAt },
        { header: 'updatedAt', accessor: (row) => row.updatedAt },
      ],
    },
    {
      name: 'owners.csv',
      rows: ownerRecords.map((owner) => ({
        id: owner.id,
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email ?? '',
        phone: owner.phone ?? '',
        address: owner.address,
        createdAt: toIsoString(owner.createdAt),
        updatedAt: toIsoString(owner.updatedAt),
      })),
      columns: [
        { header: 'id', accessor: (row) => row.id },
        { header: 'firstName', accessor: (row) => row.firstName },
        { header: 'lastName', accessor: (row) => row.lastName },
        { header: 'email', accessor: (row) => row.email },
        { header: 'phone', accessor: (row) => row.phone },
        { header: 'address', accessor: (row) => row.address },
        { header: 'createdAt', accessor: (row) => row.createdAt },
        { header: 'updatedAt', accessor: (row) => row.updatedAt },
      ],
    },
    {
      name: 'pets.csv',
      rows: petRecords.map((pet) => ({
        id: pet.id,
        name: pet.name,
        breed: pet.breed ?? '',
        birthdate: toIsoString(pet.birthdate),
        status: pet.status,
        owners: pet.owners,
        createdAt: toIsoString(pet.createdAt),
        updatedAt: toIsoString(pet.updatedAt),
      })),
      columns: [
        { header: 'id', accessor: (row) => row.id },
        { header: 'name', accessor: (row) => row.name },
        { header: 'breed', accessor: (row) => row.breed },
        { header: 'birthdate', accessor: (row) => row.birthdate },
        { header: 'status', accessor: (row) => row.status },
        { header: 'owners', accessor: (row) => row.owners },
        { header: 'createdAt', accessor: (row) => row.createdAt },
        { header: 'updatedAt', accessor: (row) => row.updatedAt },
      ],
    },
    {
      name: 'bookings.csv',
      rows: bookingRecords.map((booking) => ({
        id: booking.id,
        petId: booking.petId,
        petName: booking.pet?.name ?? '',
        ownerId: booking.ownerId,
        ownerEmail: booking.owner?.email ?? '',
        status: booking.status,
        checkIn: toIsoString(booking.checkIn),
        checkOut: toIsoString(booking.checkOut),
        totalCents: booking.totalCents,
        balanceDueCents: booking.balanceDueCents,
        segments: booking.segments,
        services: booking.services,
        createdAt: toIsoString(booking.createdAt),
        updatedAt: toIsoString(booking.updatedAt),
      })),
      columns: [
        { header: 'id', accessor: (row) => row.id },
        { header: 'petId', accessor: (row) => row.petId },
        { header: 'petName', accessor: (row) => row.petName },
        { header: 'ownerId', accessor: (row) => row.ownerId },
        { header: 'ownerEmail', accessor: (row) => row.ownerEmail },
        { header: 'status', accessor: (row) => row.status },
        { header: 'checkIn', accessor: (row) => row.checkIn },
        { header: 'checkOut', accessor: (row) => row.checkOut },
        { header: 'totalCents', accessor: (row) => row.totalCents },
        { header: 'balanceDueCents', accessor: (row) => row.balanceDueCents },
        { header: 'segments', accessor: (row) => row.segments },
        { header: 'services', accessor: (row) => row.services },
        { header: 'createdAt', accessor: (row) => row.createdAt },
        { header: 'updatedAt', accessor: (row) => row.updatedAt },
      ],
    },
    {
      name: 'payments.csv',
      rows: paymentRecords.map((record) =>
        Object.fromEntries(
          Object.entries(record).map(([key, value]) => (value instanceof Date ? [key, toIsoString(value)] : [key, value])),
        ),
      ),
      columns: Object.keys(paymentRecords[0] ?? {}).map((key) => ({
        header: key,
        accessor: (row) => row[key],
      })),
    },
    {
      name: 'invites.csv',
      rows: inviteRecords.map((record) => ({
        ...record,
        createdAt: toIsoString(record.createdAt),
        updatedAt: toIsoString(record.updatedAt),
        expiresAt: toIsoString(record.expiresAt),
        acceptedAt: toIsoString(record.acceptedAt),
      })),
      columns: Object.keys(inviteRecords[0] ?? {}).map((key) => ({
        header: key,
        accessor: (row) => row[key],
      })),
    },
    {
      name: 'audit_logs.csv',
      rows: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId ?? '',
        diff: log.diff,
        actorEmail: log.actor?.email ?? '',
        createdAt: log.createdAt,
      })),
      columns: [
        { header: 'id', accessor: (row) => row.id },
        { header: 'action', accessor: (row) => row.action },
        { header: 'entityType', accessor: (row) => row.entityType },
        { header: 'entityId', accessor: (row) => row.entityId },
        { header: 'diff', accessor: (row) => row.diff },
        { header: 'actorEmail', accessor: (row) => row.actorEmail },
        { header: 'createdAt', accessor: (row) => row.createdAt },
      ],
    },
  ].filter((entry) => entry.columns.length > 0);

  const csvFiles = csvEntries.map((entry) => ({
    name: `csv/${entry.name}`,
    contents: toCsv(entry.rows, entry.columns),
  }));

  const jsonContents = JSON.stringify(payload, null, 2);
  const estimatedBytes = Buffer.byteLength(jsonContents, 'utf8') + csvFiles.reduce((total, file) => total + Buffer.byteLength(file.contents, 'utf8'), 0);

  await ensureDirectory(exportsDir);
  await ensureDiskSpace(exportsDir, estimatedBytes);

  await writeArchive(filePath, [
    { name: 'workspace.json', contents: jsonContents },
    ...csvFiles,
  ]);

  const nextSettings = mergeExportSettings(jsonClone(tenant.settings) ?? {}, {
    lastGeneratedAt: payload.generatedAt,
    lastFile: filename,
    lastPath: path.relative(env.storage.root, filePath),
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: nextSettings,
    },
  });

  invalidateTenantCache();

  return { filePath, filename };
};

const getOnboardingStatus = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      plan: true,
      featureFlags: true,
      settings: true,
      themeJson: true,
    },
  });

  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { statusCode: 404 });
  }

  const [bookingCount, petCount, kennelCount, membershipCount, pendingInviteCount] = await prisma.$transaction([
    prisma.booking.count({ where: { tenantId } }),
    prisma.pet.count({ where: { tenantId } }),
    prisma.kennel.count({ where: { tenantId } }),
    prisma.membership.count({ where: { tenantId } }),
    prisma.invite.count({ where: { tenantId, acceptedAt: null } }),
  ]);

  return resolveOnboardingChecklist({
    tenant,
    bookingCount,
    petCount,
    kennelCount,
    membershipCount,
    pendingInviteCount,
  });
};

const updateTheme = async (tenantId, theme) => {
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { themeJson: theme },
  });
  invalidateTenantCache();
  const features = resolveTenantFeatures(tenant);
  const usage = await getUsageSnapshot({ tenantId, features });
  return serializeTenant(tenant, { features, usage });
};

const updateFeatureFlags = async (tenantId, featureFlags) => {
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { featureFlags },
  });
  invalidateTenantCache();
  const features = resolveTenantFeatures(tenant);
  const usage = await getUsageSnapshot({ tenantId, features });
  return serializeTenant(tenant, { features, usage });
};

const updateOnboardingStatus = async (tenantId, updates) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { statusCode: 404 });
  }

  const nextSettings = mergeTenantSettings(tenant, updates);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settings: nextSettings },
  });

  return getOnboardingStatus(tenantId);
};

module.exports = {
  getTenant,
  getTenantPlan,
  getTenantExport,
  updateTheme,
  updateFeatureFlags,
  getOnboardingStatus,
  updateOnboardingStatus,
};

