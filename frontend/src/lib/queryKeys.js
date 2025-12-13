import { useTenantStore } from '@/stores/tenant';

// Hook to get the tenant key for query key scoping
export const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const queryKeys = {
  tenantConfig: ['tenantConfig'],
  tenant: (tenantKey) => ['tenant', tenantKey],
  // Base dashboard function for building query keys
  dashboard: (tenantKey) => [tenantKey, 'dashboard'],
  // Nested dashboard keys for backwards compatibility
  dashboardKeys: {
    stats: (tenantKey) => [tenantKey, 'dashboard', 'stats'],
    occupancy: (tenantKey) => [tenantKey, 'dashboard', 'occupancy'],
    vaccinations: (tenantKey) => [tenantKey, 'dashboard', 'vaccinations'],
    shiftHandoff: (tenantKey) => [tenantKey, 'dashboard', 'shift-handoff'],
    emergencyAccess: (tenantKey) => [tenantKey, 'dashboard', 'emergency-access'],
    wellnessMonitoring: (tenantKey) => [tenantKey, 'dashboard', 'wellness-monitoring'],
    parentCommunication: (tenantKey) => [tenantKey, 'dashboard', 'parent-communication'],
    facilityHeatmap: (tenantKey) => [tenantKey, 'dashboard', 'facility-heatmap'],
    revenueOptimizer: (tenantKey) => [tenantKey, 'dashboard', 'revenue-optimizer'],
    socialCompatibility: (tenantKey) => [tenantKey, 'dashboard', 'social-compatibility'],
    staffingIntelligence: (tenantKey) => [tenantKey, 'dashboard', 'staffing-intelligence'],
    customerCLV: (tenantKey) => [tenantKey, 'dashboard', 'customer-clv'],
    incidentAnalytics: (tenantKey) => [tenantKey, 'dashboard', 'incident-analytics'],
  },
  bookings: (tenantKey, filters = {}) => [tenantKey, 'bookings', filters],
  bookingConflicts: (tenantKey, params = {}) => [tenantKey, 'bookings', 'conflicts', params],
  pets: (tenantId) => ['pets', { tenantId }],
  userProfile: (userId, tenantId) => ['userProfile', { userId, tenantId }],
  kennels: (tenantKey, params = {}) => [tenantKey, 'kennels', params],
  owners: (tenantKey, params = {}) => [tenantKey, 'owners', params],
  payments: (tenantKey, params = {}) => [tenantKey, 'payments', params],
  paymentsSummary: (tenantKey) => [tenantKey, 'payments', 'summary'],
  incidents: (tenantKey, params = {}) => [tenantKey, 'incidents', params],
  calendar: (tenantKey, params = {}) => [tenantKey, 'calendar', params],
  occupancy: (tenantKey, params = {}) => [tenantKey, 'occupancy', params],
  suggestKennel: (tenantKey, params = {}) => [tenantKey, 'suggest-kennel', params],
  reports: {
    dashboard: (tenantKey, params = {}) => [tenantKey, 'reports', 'dashboard', params],
  },
  staff: (tenantKey) => [tenantKey, 'staff'],
  members: (tenantKey) => [tenantKey, 'members'],
  onboarding: (tenantKey) => [tenantKey, 'onboarding'],
  properties: (tenantKey, params = {}) => [tenantKey, 'properties', params],
  services: (tenantKey) => [tenantKey, 'services'],
  runs: (tenantKey, params = {}) => [tenantKey, 'runs', params],
  tasks: (tenantKey, params = {}) => [tenantKey, 'tasks', params],
  facilitySettings: (tenantKey) => [tenantKey, 'facility-settings'],
  associations: (tenantKey, params = {}) => [tenantKey, 'associations', params],
  notifications: {
    unreadCount: (tenantKey) => [tenantKey, 'notifications', 'unread-count'],
    list: (tenantKey, params = {}) => [tenantKey, 'notifications', 'list', params],
  },
  // Object Settings
  objectSettings: (tenantKey, objectType) => [tenantKey, 'objectSettings', objectType],
  objectAssociations: (tenantKey, objectType) => [tenantKey, 'objectAssociations', objectType],
  objectPipelines: (tenantKey, objectType) => [tenantKey, 'objectPipelines', objectType],
  pipelineStages: (tenantKey, objectType, pipelineId) => [tenantKey, 'pipelineStages', objectType, pipelineId],
  objectStatuses: (tenantKey, objectType) => [tenantKey, 'objectStatuses', objectType],
  recordLayouts: (tenantKey, objectType) => [tenantKey, 'recordLayouts', objectType],
  previewLayouts: (tenantKey, objectType) => [tenantKey, 'previewLayouts', objectType],
  indexSettings: (tenantKey, objectType) => [tenantKey, 'indexSettings', objectType],
  savedViews: (tenantKey, objectType) => [tenantKey, 'savedViews', objectType],
  objectProperties: (tenantKey, objectType) => [tenantKey, 'objectProperties', objectType],
};
