const PLAN_FEATURES = {
  FREE: {
    billingPortal: false,
    auditLog: false,
    advancedReports: false,
  },
  PRO: {
    billingPortal: true,
    auditLog: true,
    advancedReports: true,
  },
  ENTERPRISE: {
    billingPortal: true,
    auditLog: true,
    advancedReports: true,
  },
};

const resolvePlanFeatures = (plan = 'FREE') => ({
  ...PLAN_FEATURES.FREE,
  ...(PLAN_FEATURES[plan] ?? PLAN_FEATURES.FREE),
});

const resolveTenantFeatures = (tenant) => {
  if (!tenant) {
    return resolvePlanFeatures();
  }
  const planFeatures = resolvePlanFeatures(tenant.plan);
  const overrides = tenant.featureFlags ?? {};
  return {
    ...planFeatures,
    ...overrides,
  };
};

const isFeatureEnabled = (tenant, feature) => {
  if (!feature) {
    return true;
  }
  const features = resolveTenantFeatures(tenant);
  return Boolean(features[feature]);
};

module.exports = {
  PLAN_FEATURES,
  resolvePlanFeatures,
  resolveTenantFeatures,
  isFeatureEnabled,
};
