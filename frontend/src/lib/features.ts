type TenantPlan = 'FREE' | 'PRO' | 'ENTERPRISE';

const planFeatures: Record<TenantPlan, Set<string>> = {
  FREE: new Set(['dashboard.basic', 'bookings.core', 'pets.core']),
  PRO: new Set([
    'dashboard.basic',
    'dashboard.analytics',
    'bookings.core',
    'pets.core',
    'reports.financial',
    'theme.editor',
  ]),
  ENTERPRISE: new Set([
    'dashboard.basic',
    'dashboard.analytics',
    'bookings.core',
    'pets.core',
    'reports.financial',
    'reports.capacity',
    'theme.editor',
    'billing.portal',
  ]),
};

export const isFeatureEnabled = (
  feature: string,
  plan: TenantPlan = 'FREE',
  overrides: Record<string, boolean> = {},
) => {
  const normalized = feature.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(overrides, normalized)) {
    return overrides[normalized];
  }

  const featureSet = planFeatures[plan] ?? planFeatures.FREE;
  return featureSet.has(normalized);
};

export const enabledFeaturesForPlan = (plan: TenantPlan = 'FREE') =>
  Array.from(planFeatures[plan] ?? planFeatures.FREE);
