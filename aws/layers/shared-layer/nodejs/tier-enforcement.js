/**
 * =============================================================================
 * BarkBase Tier Enforcement Middleware
 * =============================================================================
 *
 * Enforces subscription tier limits and feature access on the backend.
 * This is the AUTHORITATIVE source - frontend gating is UX only.
 *
 * =============================================================================
 */

/**
 * Plan feature definitions - MUST match frontend/src/features.ts
 * This is the source of truth for backend enforcement
 */
const PLAN_FEATURES = {
  FREE: {
    billingPortal: false,
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
    portalSelfService: false,
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
    kennels: 20,
    activePets: 100,
    bookingsPerMonth: 150,
    invitesPerMonth: 2,
    storageMb: 25,
  },
  PRO: {
    billingPortal: true,
    auditLog: true,
    auditLogAccess: true,
    auditRetentionDays: 30,
    advancedReports: true,
    realtime: true,
    socketsRealtime: true,
    waitlistPromotion: true,
    noShowWorkflow: true,
    paymentsIntegrated: true,
    paymentsRecordOnly: true,
    paymentsDeposits: true,
    paymentsRefunds: true,
    portalReadOnly: true,
    portalSelfService: true,
    portalCardOnFile: true,
    portalDepositRules: true,
    exports: true,
    exportsCsv: true,
    exportsJson: true,
    api: true,
    apiKeys: true,
    apiRps: 2,
    webhooks: true,
    webhooksDaily: 100,
    offlineQueue: true,
    pwa: true,
    themePresets: true,
    themeCustom: true,
    themeEditor: true,
    automationsEmail: true,
    automationsSms: false,
    whiteLabel: false,
    sso: false,
    scim: false,
    customRoles: false,
    dataResidency: false,
    backups: false,
    sandboxTenant: false,
    sla: false,
    supportLevel: 'standard',
    supportEmail: true,
    supportChat: true,
    supportPriority: false,
    seats: 5,
    locations: 3,
    kennels: Infinity,
    activePets: Infinity,
    bookingsPerMonth: 2500,
    invitesPerMonth: Infinity,
    storageMb: 50,
  },
  ENTERPRISE: {
    billingPortal: true,
    auditLog: true,
    auditLogAccess: true,
    auditRetentionDays: 365,
    advancedReports: true,
    realtime: true,
    socketsRealtime: true,
    waitlistPromotion: true,
    noShowWorkflow: true,
    paymentsIntegrated: true,
    paymentsRecordOnly: true,
    paymentsDeposits: true,
    paymentsRefunds: true,
    portalReadOnly: true,
    portalSelfService: true,
    portalCardOnFile: true,
    portalDepositRules: true,
    exports: true,
    exportsCsv: true,
    exportsJson: true,
    api: true,
    apiKeys: true,
    apiRps: 10,
    webhooks: true,
    webhooksDaily: 2000,
    offlineQueue: true,
    pwa: true,
    themePresets: true,
    themeCustom: true,
    themeEditor: true,
    automationsEmail: true,
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
    supportEmail: true,
    supportChat: true,
    supportPriority: true,
    seats: Infinity,
    locations: Infinity,
    kennels: Infinity,
    activePets: Infinity,
    bookingsPerMonth: Infinity,
    invitesPerMonth: Infinity,
    storageMb: 5120,
  },
};

/**
 * Human-readable feature names for error messages
 */
const FEATURE_NAMES = {
  billingPortal: 'Billing Portal',
  auditLog: 'Audit Log',
  advancedReports: 'Advanced Reports',
  paymentsIntegrated: 'Integrated Payments',
  paymentsDeposits: 'Deposit Collection',
  paymentsRefunds: 'Refund Processing',
  portalSelfService: 'Customer Self-Service Portal',
  api: 'API Access',
  apiKeys: 'API Keys',
  webhooks: 'Webhooks',
  automationsEmail: 'Email Automations',
  automationsSms: 'SMS Automations',
  whiteLabel: 'White Label Branding',
  sso: 'Single Sign-On (SSO)',
  scim: 'SCIM Provisioning',
  customRoles: 'Custom Roles',
  seats: 'Team Members',
  locations: 'Locations',
  kennels: 'Kennels',
  activePets: 'Active Pets',
  bookingsPerMonth: 'Monthly Bookings',
};

/**
 * Error codes for tier limit responses
 */
const TIER_ERROR_CODES = {
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  TIER_LIMIT_EXCEEDED: 'TIER_LIMIT_EXCEEDED',
  UPGRADE_REQUIRED: 'UPGRADE_REQUIRED',
};

/**
 * Get the minimum tier required to unlock a feature
 */
function getUpgradeTier(feature) {
  if (PLAN_FEATURES.FREE[feature] === true ||
      (typeof PLAN_FEATURES.FREE[feature] === 'number' && PLAN_FEATURES.FREE[feature] > 0)) {
    return null; // Available in FREE
  }
  if (PLAN_FEATURES.PRO[feature] === true ||
      (typeof PLAN_FEATURES.PRO[feature] === 'number' && PLAN_FEATURES.PRO[feature] > 0) ||
      PLAN_FEATURES.PRO[feature] === Infinity) {
    return 'PRO';
  }
  if (PLAN_FEATURES.ENTERPRISE[feature] === true ||
      (typeof PLAN_FEATURES.ENTERPRISE[feature] === 'number' && PLAN_FEATURES.ENTERPRISE[feature] > 0) ||
      PLAN_FEATURES.ENTERPRISE[feature] === Infinity) {
    return 'ENTERPRISE';
  }
  return null;
}

/**
 * Get the tier needed to increase a numeric limit
 */
function getUpgradeTierForLimit(currentTier, feature) {
  const currentLimit = PLAN_FEATURES[currentTier]?.[feature];
  if (currentLimit === Infinity) return null; // Already unlimited

  if (currentTier === 'FREE') {
    const proLimit = PLAN_FEATURES.PRO[feature];
    if (proLimit === Infinity || (typeof proLimit === 'number' && proLimit > currentLimit)) {
      return 'PRO';
    }
    const enterpriseLimit = PLAN_FEATURES.ENTERPRISE[feature];
    if (enterpriseLimit === Infinity || (typeof enterpriseLimit === 'number' && enterpriseLimit > currentLimit)) {
      return 'ENTERPRISE';
    }
  }

  if (currentTier === 'PRO') {
    const enterpriseLimit = PLAN_FEATURES.ENTERPRISE[feature];
    if (enterpriseLimit === Infinity || (typeof enterpriseLimit === 'number' && enterpriseLimit > currentLimit)) {
      return 'ENTERPRISE';
    }
  }

  return null;
}

/**
 * Check if a feature is enabled for a given plan
 *
 * @param {string} plan - The subscription plan ('FREE', 'PRO', 'ENTERPRISE')
 * @param {string} feature - The feature key to check
 * @returns {boolean} - Whether the feature is enabled
 */
function hasFeature(plan, feature) {
  const tier = plan || 'FREE';
  const features = PLAN_FEATURES[tier] || PLAN_FEATURES.FREE;
  const value = features[feature];

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0 || value === Infinity;
  return Boolean(value);
}

/**
 * Get the limit value for a numeric feature
 *
 * @param {string} plan - The subscription plan
 * @param {string} feature - The feature key
 * @returns {number|null} - The limit (null = unlimited)
 */
function getLimit(plan, feature) {
  const tier = plan || 'FREE';
  const features = PLAN_FEATURES[tier] || PLAN_FEATURES.FREE;
  const value = features[feature];

  if (value === Infinity) return null; // null = unlimited
  if (typeof value === 'number') return value;
  return null;
}

/**
 * Check if current usage is within limit
 *
 * @param {string} plan - The subscription plan
 * @param {string} feature - The feature key
 * @param {number} currentCount - Current usage count
 * @returns {boolean} - Whether within limit
 */
function isWithinLimit(plan, feature, currentCount) {
  const limit = getLimit(plan, feature);
  if (limit === null) return true; // unlimited
  return currentCount < limit;
}

/**
 * Enforce a boolean feature check - throws if not available
 *
 * @param {string} plan - The subscription plan
 * @param {string} feature - The feature key to enforce
 * @throws {Object} - Error object with tier limit details
 */
function enforceFeature(plan, feature) {
  if (!hasFeature(plan, feature)) {
    const upgradeTo = getUpgradeTier(feature);
    const featureName = FEATURE_NAMES[feature] || feature;

    const error = new Error(`Feature "${featureName}" requires ${upgradeTo} plan`);
    error.code = TIER_ERROR_CODES.FEATURE_NOT_AVAILABLE;
    error.statusCode = 403;
    error.tierError = {
      error: TIER_ERROR_CODES.FEATURE_NOT_AVAILABLE,
      message: `${featureName} is not available on the ${plan} plan`,
      feature,
      featureName,
      currentPlan: plan,
      upgradeTo,
      upgradeUrl: '/settings/billing',
    };

    throw error;
  }
}

/**
 * Enforce a numeric limit - throws if exceeded
 *
 * @param {string} plan - The subscription plan
 * @param {string} feature - The feature key to check
 * @param {number} currentCount - Current usage count
 * @throws {Object} - Error object with tier limit details
 */
function enforceLimit(plan, feature, currentCount) {
  const limit = getLimit(plan, feature);

  if (limit !== null && currentCount >= limit) {
    const upgradeTo = getUpgradeTierForLimit(plan, feature);
    const featureName = FEATURE_NAMES[feature] || feature;

    const error = new Error(`Limit reached: ${featureName} (${currentCount}/${limit}). Upgrade to increase limit.`);
    error.code = TIER_ERROR_CODES.TIER_LIMIT_EXCEEDED;
    error.statusCode = 403;
    error.tierError = {
      error: TIER_ERROR_CODES.TIER_LIMIT_EXCEEDED,
      message: `You've reached the maximum of ${limit} ${featureName} on the ${plan} plan`,
      feature,
      featureName,
      currentUsage: currentCount,
      limit,
      currentPlan: plan,
      upgradeTo,
      upgradeUrl: '/settings/billing',
    };

    throw error;
  }
}

/**
 * Create a standardized tier error response
 *
 * @param {Object} tierError - The tier error details
 * @returns {Object} - Lambda response object
 */
function createTierErrorResponse(tierError) {
  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(tierError),
  };
}

/**
 * Middleware wrapper to handle tier enforcement errors
 *
 * @param {Function} handler - The handler function to wrap
 * @returns {Function} - Wrapped handler that catches tier errors
 */
function withTierEnforcement(handler) {
  return async (event, context) => {
    try {
      return await handler(event, context);
    } catch (error) {
      if (error.tierError) {
        console.warn('[TIER] Enforcement blocked request:', error.tierError);
        return createTierErrorResponse(error.tierError);
      }
      throw error; // Re-throw non-tier errors
    }
  };
}

/**
 * Get tenant's current plan from the user object or database
 *
 * @param {Object} event - Lambda event with user object
 * @returns {string} - The tenant's plan
 */
function getTenantPlan(event) {
  // Try to get from authenticated user
  const plan = event.user?.tenant?.plan ||
               event.user?.plan ||
               event.tenant?.plan ||
               'FREE';

  return plan;
}

module.exports = {
  // Constants
  PLAN_FEATURES,
  FEATURE_NAMES,
  TIER_ERROR_CODES,

  // Feature checks
  hasFeature,
  getLimit,
  isWithinLimit,
  getUpgradeTier,
  getUpgradeTierForLimit,

  // Enforcement functions (throw on violation)
  enforceFeature,
  enforceLimit,

  // Response helpers
  createTierErrorResponse,

  // Middleware
  withTierEnforcement,

  // Utilities
  getTenantPlan,
};
