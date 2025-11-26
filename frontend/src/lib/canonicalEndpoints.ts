// Guardrail: only define new frontend API usage here.
type PathBuilder = (id: string) => string;

const build = (template: string): PathBuilder => (id) => template.replace('{id}', id);
const buildWithSuffix = (template: string, suffix: string): PathBuilder => (id) =>
  `${template.replace('{id}', id)}/${suffix}`;

/**
 * Canonical API endpoints grouped by domain.
 * This file intentionally exports strings and lightweight builders only;
 * Phase 1 does not refactor existing fetch calls to use these helpers.
 */
export const canonicalEndpoints = {
  pets: {
    list: '/api/v1/pets',
    detail: build('/api/v1/pets/{id}'),
    vaccinations: build('/api/v1/pets/{id}/vaccinations'),
    expiringVaccinations: '/api/v1/pets/vaccinations/expiring',
    medicalAlerts: '/api/v1/pets/medical-alerts',
    ownerLink: '/api/v1/pets/owners',
  },
  owners: {
    list: '/api/v1/owners',
    detail: build('/api/v1/owners/{id}'),
    pets: build('/api/v1/owners/{id}/pets'),
  },
  properties: {
    // Properties domain is fully v2-only. All CRUD and advanced operations use /api/v2/properties.
    list: '/api/v2/properties',
    detail: build('/api/v2/properties/{id}'),
    create: '/api/v2/properties',
    update: build('/api/v2/properties/{id}'),
    archive: buildWithSuffix('/api/v2/properties/{id}', 'archive'),
    restore: buildWithSuffix('/api/v2/properties/{id}', 'restore'),
    dependencies: buildWithSuffix('/api/v2/properties/{id}', 'dependencies'),
    impactAnalysis: buildWithSuffix('/api/v2/properties/{id}', 'impact-analysis'),
    substitute: buildWithSuffix('/api/v2/properties/{id}', 'substitute'),
  },
  bookings: {
    list: '/api/v1/bookings',
    detail: build('/api/v1/bookings/{id}'),
    checkIn: buildWithSuffix('/api/v1/bookings/{id}', 'check-in'),
    checkOut: buildWithSuffix('/api/v1/bookings/{id}', 'check-out'),
    status: buildWithSuffix('/api/v1/bookings/{id}', 'status'),
  },
  schedule: {
    range: '/api/v1/schedule',
    capacity: '/api/v1/schedule/capacity',
  },
  runs: {
    list: '/api/v1/runs',
    detail: build('/api/v1/runs/{id}'),
    runTemplates: '/api/v1/run-templates',
    availableSlots: buildWithSuffix('/api/v1/runs/{id}', 'available-slots'),
    assignments: '/api/v1/runs/assignments',
  },
  tasks: {
    list: '/api/v1/tasks',
    detail: build('/api/v1/tasks/{id}'),
    complete: buildWithSuffix('/api/v1/tasks/{id}', 'complete'),
  },
  reports: {
    dashboardStats: '/api/v1/dashboard/stats',
    dashboardToday: '/api/v1/dashboard/today-pets',
    arrivals: '/api/v1/reports/arrivals',
    departures: '/api/v1/reports/departures',
    revenue: '/api/v1/reports/revenue',
    occupancy: '/api/v1/reports/occupancy',
  },
  payments: {
    list: '/api/v1/payments',
    detail: build('/api/v1/payments/{id}'),
    invoices: '/api/v1/invoices',
    invoiceDetail: build('/api/v1/invoices/{id}'),
    billingMetrics: '/api/v1/billing/metrics',
  },
  settings: {
    tenantBySlug: '/api/v1/tenants',
    currentTenant: '/api/v1/tenants/current',
    plan: '/api/v1/tenants/current/plan',
    onboarding: '/api/v1/tenants/current/onboarding',
    theme: '/api/v1/tenants/current/theme',
    accountDefaults: '/api/v1/account-defaults',
    services: '/api/v1/services',
    packages: '/api/v1/packages',
    memberships: '/api/v1/memberships',
    roles: '/api/v1/roles',
    userPermissions: '/api/v1/user-permissions',
  },
  userProfile: {
    self: '/api/v1/users/profile',
    profiles: '/api/v1/profiles',
    userProfiles: build('/api/v1/users/{id}/profiles'),
    effectivePermissions: build('/api/v1/users/{id}/effective-permissions'),
    calculatePermissions: '/api/v1/permissions/calculate',
    invalidatePermissionCache: '/api/v1/permissions/invalidate-cache',
  },
  operations: {
    checkIns: '/api/v1/check-ins',
    checkOuts: '/api/v1/check-outs',
    kennels: '/api/v1/kennels',
    kennelOccupancy: '/api/v1/kennels/occupancy',
  },
  files: {
    uploadUrl: '/api/v1/upload-url',
    downloadUrl: '/api/v1/download-url',
  },
};

export type CanonicalEndpointGroups = typeof canonicalEndpoints;

