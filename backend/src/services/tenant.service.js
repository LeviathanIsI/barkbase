const prisma = require('../config/prisma');

const serializeTenant = (tenant) => ({
  id: tenant.id,
  slug: tenant.slug,
  name: tenant.name,
  plan: tenant.plan,
  featureFlags: tenant.featureFlags ?? {},
  theme: tenant.themeJson ?? {},
  customDomain: tenant.customDomain ?? null,
  settings: tenant.settings ?? {},
  updatedAt: tenant.updatedAt,
  createdAt: tenant.createdAt,
});

const getTenant = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { statusCode: 404 });
  }
  return serializeTenant(tenant);
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

module.exports = {
  getTenant,
  updateTheme,
  updateFeatureFlags,
};
