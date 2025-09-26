const prisma = require('../config/prisma');
const { resolveTenantFeatures } = require('../lib/features');

const serializeTenant = (tenant) => ({
  id: tenant.id,
  slug: tenant.slug,
  name: tenant.name,
  plan: tenant.plan,
  featureFlags: tenant.featureFlags ?? {},
  features: resolveTenantFeatures(tenant),
  theme: tenant.themeJson ?? {},
  customDomain: tenant.customDomain ?? null,
  settings: tenant.settings ?? {},
  updatedAt: tenant.updatedAt,
  createdAt: tenant.createdAt,
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
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { statusCode: 404 });
  }
  return serializeTenant(tenant);
};

const getTenantPlan = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { statusCode: 404 });
  }
  return {
    plan: tenant.plan,
    featureFlags: tenant.featureFlags ?? {},
    features: resolveTenantFeatures(tenant),
  };
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
  return serializeTenant(tenant);
};

const updateFeatureFlags = async (tenantId, featureFlags) => {
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { featureFlags },
  });
  return serializeTenant(tenant);
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
  updateTheme,
  updateFeatureFlags,
  getOnboardingStatus,
  updateOnboardingStatus,
};
