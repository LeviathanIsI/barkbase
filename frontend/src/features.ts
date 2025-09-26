export const PLAN_FEATURES = {
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

export const resolvePlanFeatures = (plan = 'FREE', overrides = {}) => ({
  ...PLAN_FEATURES.FREE,
  ...(PLAN_FEATURES[plan] ?? PLAN_FEATURES.FREE),
  ...overrides,
});

export const isFeatureEnabled = (feature, { plan = 'FREE', overrides = {}, features } = {}) => {
  if (!feature) {
    return true;
  }

  if (features && Object.prototype.hasOwnProperty.call(features, feature)) {
    return Boolean(features[feature]);
  }

  const resolved = resolvePlanFeatures(plan, overrides);
  return Boolean(resolved[feature]);
};
