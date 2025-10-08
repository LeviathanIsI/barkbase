export const queryKeys = {
  tenant: (tenantKey) => ['tenant', tenantKey],
  dashboard: {
    stats: (tenantKey) => [tenantKey, 'dashboard', 'stats'],
    occupancy: (tenantKey) => [tenantKey, 'dashboard', 'occupancy'],
    vaccinations: (tenantKey) => [tenantKey, 'dashboard', 'vaccinations'],
  },
  bookings: (tenantKey, filters = {}) => [tenantKey, 'bookings', filters],
  pets: (tenantKey, filters = {}) => [tenantKey, 'pets', filters],
  kennels: (tenantKey, params = {}) => [tenantKey, 'kennels', params],
  owners: (tenantKey) => [tenantKey, 'owners'],
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
};
