const FREE_FEATURES = Object.freeze({
  billingPortal: false,
  'billing.portal': false,
  auditLog: false,
  auditLogAccess: false,
  auditRetentionDays: 0,
  advancedReports: false,
  realtime: false,
  socketsRealtime: false,
  waitlistPromotion: false,
  noShowWorkflow: false,
  paymentsIntegrated: false,
  paymentsRecordOnly: true,
  paymentsDeposits: false,
  paymentsRefunds: false,
  portalReadOnly: true,
  'portal.readOnly': true,
  portalSelfService: false,
  'portal.selfService': false,
  portalCardOnFile: false,
  portalDepositRules: false,
  exports: true,
  exportsCsv: true,
  exportsJson: false,
  api: false,
  apiKeys: false,
  apiRps: 0,
  webhooks: false,
  webhooksDaily: 0,
  offlineQueue: true,
  pwa: true,
  themePresets: true,
  themeCustom: true,
  themeEditor: true,
  'theme.editor': true,
  automationsEmail: false,
  automationsSms: false,
  whiteLabel: false,
  sso: false,
  scim: false,
  customRoles: false,
  dataResidency: false,
  backups: false,
  sandboxTenant: false,
  sla: false,
  supportLevel: 'community',
  supportEmail: false,
  supportChat: false,
  supportPriority: false,
  seats: 2,
  locations: 1,
  activePets: 100,
  bookingsPerMonth: 150,
  invitesPerMonth: 2,
  storageMb: 25,
});

const PRO_FEATURES = Object.freeze({
  ...FREE_FEATURES,
  billingPortal: true,
  'billing.portal': true,
  auditLog: true,
  auditLogAccess: true,
  auditRetentionDays: 30,
  advancedReports: true,
  realtime: true,
  socketsRealtime: true,
  waitlistPromotion: true,
  noShowWorkflow: true,
  paymentsIntegrated: true,
  paymentsDeposits: true,
  paymentsRefunds: true,
  portalSelfService: true,
  'portal.selfService': true,
  portalCardOnFile: true,
  portalDepositRules: true,
  exportsJson: true,
  api: true,
  apiKeys: true,
  apiRps: 2,
  webhooks: true,
  webhooksDaily: 100,
  themeCustom: true,
  themeEditor: true,
  'theme.editor': true,
  automationsEmail: true,
  supportLevel: 'standard',
  supportEmail: true,
  supportChat: true,
  seats: 5,
  locations: 3,
  activePets: Infinity,
  bookingsPerMonth: 2500,
  invitesPerMonth: Infinity,
  storageMb: 50,
});

const ENTERPRISE_FEATURES = Object.freeze({
  ...PRO_FEATURES,
  automationsSms: true,
  whiteLabel: true,
  sso: true,
  scim: true,
  customRoles: true,
  dataResidency: true,
  backups: true,
  sandboxTenant: true,
  sla: true,
  supportLevel: 'priority',
  supportPriority: true,
  auditRetentionDays: 365,
  apiRps: 10,
  webhooksDaily: 2000,
  seats: Infinity,
  locations: Infinity,
  activePets: Infinity,
  bookingsPerMonth: Infinity,
  invitesPerMonth: Infinity,
  storageMb: 5120,
});

export const PLAN_FEATURES = Object.freeze({
  FREE: FREE_FEATURES,
  PRO: PRO_FEATURES,
  ENTERPRISE: ENTERPRISE_FEATURES,
});

export type TenantPlan = keyof typeof PLAN_FEATURES;
export type PlanFeatures = (typeof PLAN_FEATURES)[TenantPlan];
export type PlanFeatureKey = keyof PlanFeatures;

type FeatureOverrides = Partial<Record<PlanFeatureKey, PlanFeatures[PlanFeatureKey]>>;

export const resolvePlanFeatures = (
  plan: TenantPlan = 'FREE',
  overrides: FeatureOverrides = {},
): Record<PlanFeatureKey, PlanFeatures[PlanFeatureKey]> => ({
  ...PLAN_FEATURES.FREE,
  ...(PLAN_FEATURES[plan] ?? PLAN_FEATURES.FREE),
  ...overrides,
});

type FeatureContext = {
  plan?: TenantPlan;
  overrides?: FeatureOverrides;
  features?: Partial<Record<PlanFeatureKey, PlanFeatures[PlanFeatureKey]>>;
};

export const isFeatureEnabled = (
  feature: PlanFeatureKey | string,
  { plan = 'FREE', overrides = {}, features }: FeatureContext = {},
) => {
  if (!feature) {
    return true;
  }

  if (features && Object.prototype.hasOwnProperty.call(features, feature)) {
    const value = features[feature as PlanFeatureKey];
    return typeof value === 'boolean' ? value : Boolean(value);
  }

  const resolved = resolvePlanFeatures(plan, overrides);
  const value = resolved[feature as PlanFeatureKey];
  return typeof value === 'boolean' ? value : Boolean(value);
};

export const getPlanLimit = (
  key: Extract<PlanFeatureKey, 'seats' | 'locations' | 'activePets' | 'bookingsPerMonth' | 'invitesPerMonth' | 'storageMb' | 'apiRps' | 'webhooksDaily'>,
  { plan = 'FREE', overrides = {}, features }: FeatureContext = {},
) => {
  const resolved = features ?? resolvePlanFeatures(plan, overrides);
  return resolved[key];
};
