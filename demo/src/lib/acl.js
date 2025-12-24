import { isFeatureEnabled } from '@/features';

const RULES = {
  manageMembers: {
    roles: ['OWNER', 'ADMIN'],
  },
  manageBilling: {
    roles: ['OWNER', 'ADMIN'],
    feature: 'billingPortal',
  },
  viewAuditLog: {
    roles: ['OWNER', 'ADMIN'],
    feature: 'auditLog',
  },
  viewPayments: {
    roles: ['OWNER', 'ADMIN'],
    feature: 'billingPortal',
  },
  viewReports: {
    roles: ['OWNER', 'ADMIN', 'STAFF'],
    feature: 'advancedReports',
  },
  manageStaff: {
    roles: ['OWNER', 'ADMIN'],
  },
  manageTenant: {
    roles: ['OWNER', 'ADMIN'],
  },
  readOnly: {
    roles: ['OWNER', 'ADMIN', 'STAFF', 'READONLY'],
  },
};

const extractContext = (subject, fallback = {}) => {
  if (subject && typeof subject === 'object') {
    return subject;
  }
  return fallback;
};

export const can = (subject, action, context = {}) => {
  const rule = RULES[action];
  if (!rule) {
    return false;
  }

  const role = typeof subject === 'string' ? subject : subject?.role ?? context.role;
  if (!role) {
    return false;
  }

  const normalizedRole = String(role).toUpperCase();
  if (!rule.roles.includes(normalizedRole)) {
    return false;
  }

  if (!rule.feature) {
    return true;
  }

  const ctx = extractContext(subject, context);
  return isFeatureEnabled(rule.feature, {
    plan: ctx.plan,
    overrides: ctx.featureFlags,
    features: ctx.features,
  });
};

export const Can = Object.fromEntries(Object.entries(RULES).map(([key, value]) => [key, value.roles]));
