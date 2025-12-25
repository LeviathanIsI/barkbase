// Guardrail: only define new frontend API usage here.
type PathBuilder = (id: string) => string;

const build = (template: string): PathBuilder => (id) => template.replace('{id}', id);
const buildWithSuffix = (template: string, suffix: string): PathBuilder => (id) =>
  `${template.replace('{id}', id)}/${suffix}`;

/**
 * Canonical API endpoints grouped by domain.
 *
 * IMPORTANT: All routes go through service-oriented Lambda functions:
 * - /api/v1/entity/*     → entity-service (pets, owners, staff, tenants, facilities)
 * - /api/v1/operations/* → operations-service (bookings, tasks, schedules, notifications)
 * - /api/v1/analytics/*  → analytics-service (dashboard, reports, metrics)
 * - /api/v1/config/*     → config-service (settings, features, integrations)
 * - /api/v1/financial/*  → financial-service (invoices, payments, pricing)
 * - /api/v1/profile/*    → user-profile-service (user profile management)
 * - /api/v1/auth/*       → auth-api (login, register, session management)
 */
export const canonicalEndpoints = {
  // Entity Service - /api/v1/entity/*
  pets: {
    list: '/api/v1/entity/pets',
    detail: build('/api/v1/entity/pets/{id}'),
    owners: build('/api/v1/entity/pets/{id}/owners'),
    vaccinations: build('/api/v1/entity/pets/{id}/vaccinations'),
    vaccinationDetail: (petId: string, vaccinationId: string) =>
      `/api/v1/entity/pets/${petId}/vaccinations/${vaccinationId}`,
    vaccinationRenew: (petId: string, vaccinationId: string) =>
      `/api/v1/entity/pets/${petId}/vaccinations/${vaccinationId}/renew`,
    expiringVaccinations: '/api/v1/entity/pets/vaccinations/expiring',
    medicalAlerts: '/api/v1/entity/pets/medical-alerts',
    ownerLink: '/api/v1/entity/pets/owners',
  },
  owners: {
    list: '/api/v1/entity/owners',
    detail: build('/api/v1/entity/owners/{id}'),
    pets: build('/api/v1/entity/owners/{id}/pets'),
  },
  staff: {
    list: '/api/v1/entity/staff',
    detail: build('/api/v1/entity/staff/{id}'),
    create: '/api/v1/entity/staff',
    update: build('/api/v1/entity/staff/{id}'),
    delete: build('/api/v1/entity/staff/{id}'),
    bulkDelete: '/api/v1/entity/staff/bulk/delete',
    bulkUpdate: '/api/v1/entity/staff/bulk/update',
  },
  facilities: {
    list: '/api/v1/entity/facilities',
    detail: build('/api/v1/entity/facilities/{id}'),
  },
  tenants: {
    list: '/api/v1/entity/tenants',
    detail: build('/api/v1/entity/tenants/{id}'),
  },

  // Operations Service - /api/v1/operations/*
  bookings: {
    list: '/api/v1/operations/bookings',
    detail: build('/api/v1/operations/bookings/{id}'),
    checkIn: buildWithSuffix('/api/v1/operations/bookings/{id}', 'checkin'),
    checkOut: buildWithSuffix('/api/v1/operations/bookings/{id}', 'checkout'),
    status: buildWithSuffix('/api/v1/operations/bookings/{id}', 'status'),
  },
  schedule: {
    list: '/api/v1/operations/schedules',
    staff: '/api/v1/operations/schedules/staff',
    detail: build('/api/v1/operations/schedules/{id}'),
    capacity: '/api/v1/operations/schedules/capacity',
  },
  tasks: {
    list: '/api/v1/operations/tasks',
    detail: build('/api/v1/operations/tasks/{id}'),
    complete: buildWithSuffix('/api/v1/operations/tasks/{id}', 'complete'),
  },
  notifications: {
    list: '/api/v1/operations/notifications',
    broadcast: '/api/v1/operations/notifications/broadcast',
    markRead: buildWithSuffix('/api/v1/operations/notifications/{id}', 'read'),
  },
  batch: {
    import: '/api/v1/operations/batch/import',
    export: '/api/v1/operations/batch/export',
    update: '/api/v1/operations/batch/update',
    delete: '/api/v1/operations/batch/delete',
  },

  // Calendar API - /api/v1/calendar/*
  // Routed through operations-service
  calendar: {
    events: '/api/v1/calendar/events',
    occupancy: '/api/v1/calendar/occupancy',
  },

  // Analytics Service - /api/v1/analytics/*
  reports: {
    dashboard: '/api/v1/analytics/dashboard',
    dashboardSummary: '/api/v1/analytics/dashboard/summary',
    dashboardKpis: '/api/v1/analytics/dashboard/kpis',
    revenue: '/api/v1/analytics/revenue',
    revenueDaily: '/api/v1/analytics/revenue/daily',
    revenueMonthly: '/api/v1/analytics/revenue/monthly',
    occupancy: '/api/v1/analytics/occupancy',
    occupancyCurrent: '/api/v1/analytics/occupancy/current',
    occupancyForecast: '/api/v1/analytics/occupancy/forecast',
    customers: '/api/v1/analytics/customers',
    customerRetention: '/api/v1/analytics/customers/retention',
    pets: '/api/v1/analytics/pets',
    petBreeds: '/api/v1/analytics/pets/breeds',
    petServices: '/api/v1/analytics/pets/services',
    list: '/api/v1/analytics/reports',
    detail: build('/api/v1/analytics/reports/{id}'),
    generate: '/api/v1/analytics/reports/generate',
    // Custom Report Builder
    query: '/api/v1/analytics/reports/query',
    saved: '/api/v1/analytics/reports/saved',
    savedDetail: build('/api/v1/analytics/reports/saved/{id}'),
    // Export endpoints
    exportRevenue: '/api/v1/analytics/export/revenue',
    exportBookings: '/api/v1/analytics/export/bookings',
    exportCustomers: '/api/v1/analytics/export/customers',
    exportOccupancy: '/api/v1/analytics/export/occupancy',
    exportPets: '/api/v1/analytics/export/pets',
    exportVaccinations: '/api/v1/analytics/export/vaccinations',
  },

  // Financial Service - /api/v1/financial/*
  payments: {
    list: '/api/v1/financial/payments',
    detail: build('/api/v1/financial/payments/{id}'),
    refund: buildWithSuffix('/api/v1/financial/payments/{id}', 'refund'),
    capture: buildWithSuffix('/api/v1/financial/payments/{id}', 'capture'),
  },
  invoices: {
    list: '/api/v1/financial/invoices',
    detail: build('/api/v1/financial/invoices/{id}'),
    send: buildWithSuffix('/api/v1/financial/invoices/{id}', 'send'),
    void: buildWithSuffix('/api/v1/financial/invoices/{id}', 'void'),
    pdf: buildWithSuffix('/api/v1/financial/invoices/{id}', 'pdf'),
  },
  paymentMethods: {
    list: '/api/v1/financial/payment-methods',
    detail: build('/api/v1/financial/payment-methods/{id}'),
    setDefault: buildWithSuffix('/api/v1/financial/payment-methods/{id}', 'default'),
  },
  pricing: {
    list: '/api/v1/financial/pricing',
    detail: build('/api/v1/financial/pricing/{id}'),
    calculate: '/api/v1/financial/pricing/calculate',
  },
  billing: {
    summary: '/api/v1/financial/billing/summary',
    history: '/api/v1/financial/billing/history',
    upcoming: '/api/v1/financial/billing/upcoming',
    charge: '/api/v1/financial/billing/charge',
    usage: '/api/v1/financial/billing/usage',
    upgrade: '/api/v1/financial/billing/upgrade',
  },
  subscriptions: {
    list: '/api/v1/financial/subscriptions',
    detail: build('/api/v1/financial/subscriptions/{id}'),
    cancel: buildWithSuffix('/api/v1/financial/subscriptions/{id}', 'cancel'),
    pause: buildWithSuffix('/api/v1/financial/subscriptions/{id}', 'pause'),
    resume: buildWithSuffix('/api/v1/financial/subscriptions/{id}', 'resume'),
  },
  // Stripe Payment Processing
  stripe: {
    createPaymentIntent: '/api/v1/financial/stripe/payment-intent',
    confirmPayment: '/api/v1/financial/stripe/confirm',
    createCustomer: '/api/v1/financial/stripe/customers',
    getCustomer: build('/api/v1/financial/stripe/customers/{id}'),
    attachPaymentMethod: '/api/v1/financial/stripe/payment-methods',
    listPaymentMethods: build('/api/v1/financial/stripe/payment-methods/owner/{id}'),
    detachPaymentMethod: build('/api/v1/financial/stripe/payment-methods/{id}'),
    createSetupIntent: '/api/v1/financial/stripe/setup-intent',
  },

  // Config Service - /api/v1/config/*
  settings: {
    system: '/api/v1/config/system',
    systemFeatures: '/api/v1/config/system/features',
    tenant: '/api/v1/config/tenant',
    tenantTheme: '/api/v1/config/tenant/theme',
    tenantFeatures: '/api/v1/config/tenant/features',
    all: '/api/v1/config/settings',
    category: build('/api/v1/config/settings/{id}'),
    reset: '/api/v1/config/settings/reset',
  },

  // Custom Properties API (v2) - Enterprise custom fields system
  // Allows tenants to define their own data model per entity type
  // Note: /list suffix required because API Gateway {proxy+} doesn't match base path
  properties: {
    list: '/api/v2/properties/list',
    create: '/api/v2/properties/create',
    detail: build('/api/v2/properties/{id}'),
    update: build('/api/v2/properties/{id}'),
    delete: build('/api/v2/properties/{id}'),
    archive: build('/api/v2/properties/{id}/archive'),
    restore: build('/api/v2/properties/{id}/restore'),
    dependencies: build('/api/v2/properties/{id}/dependencies'),
    impactAnalysis: build('/api/v2/properties/{id}/impact-analysis'),
  },

  // Property Groups API (v2) - Organize properties into sections
  propertyGroups: {
    list: '/api/v2/property-groups',
    create: '/api/v2/property-groups',
    detail: build('/api/v2/property-groups/{id}'),
    update: build('/api/v2/property-groups/{id}'),
    delete: build('/api/v2/property-groups/{id}'),
  },

  // Property Logic Rules API (v2) - Conditional property visibility
  propertyLogic: {
    list: '/api/v2/property-logic',
    create: '/api/v2/property-logic',
    detail: build('/api/v2/property-logic/{id}'),
    update: build('/api/v2/property-logic/{id}'),
    delete: build('/api/v2/property-logic/{id}'),
  },

  // Property Templates API (v2) - Quick-add templates
  propertyTemplates: {
    list: '/api/v2/property-templates',
  },

  // Property Values - Get/set custom field values for entities
  propertyValues: {
    get: (entityType: string, entityId: string) => `/api/v2/properties/values/${entityType}/${entityId}`,
    upsert: (entityType: string, entityId: string) => `/api/v2/properties/values/${entityType}/${entityId}`,
  },

  // Entity Definitions API (v2) - Custom Objects
  // Allows tenants to define custom entity types beyond built-in ones
  entityDefinitions: {
    list: '/api/v2/entities/list',
    create: '/api/v2/entities/create',
    detail: build('/api/v2/entities/{id}'),
    update: build('/api/v2/entities/{id}'),
    delete: build('/api/v2/entities/{id}'),
  },

  // Enterprise Memberships API - /api/v1/memberships
  // Staff/team management for current tenant
  memberships: {
    list: '/api/v1/memberships',
    create: '/api/v1/memberships',
    update: build('/api/v1/memberships/{id}'),
    delete: build('/api/v1/memberships/{id}'),
  },
  // Notification Settings API - /api/v1/config/notifications/*
  notificationSettings: {
    get: '/api/v1/config/notifications',
    update: '/api/v1/config/notifications',
    test: '/api/v1/config/notifications/test',
  },
  // SMS Settings API - /api/v1/settings/sms/*
  smsSettings: {
    get: '/api/v1/settings/sms',
    update: '/api/v1/settings/sms',
    test: '/api/v1/settings/sms/test',
    verify: '/api/v1/settings/sms/verify',
    disconnect: '/api/v1/settings/sms/disconnect',
    templates: '/api/v1/settings/sms/templates',
    template: build('/api/v1/settings/sms/templates/{id}'),
  },
  // Email Settings API - /api/v1/settings/email/*
  emailSettings: {
    get: '/api/v1/settings/email',
    update: '/api/v1/settings/email',
    test: '/api/v1/settings/email/test',
    usage: '/api/v1/settings/email/usage',
    templates: '/api/v1/settings/email/templates',
    template: build('/api/v1/settings/email/templates/{id}'),
  },
  // Invoice Settings API - /api/v1/settings/invoicing/*
  invoiceSettings: {
    get: '/api/v1/settings/invoicing',
    update: '/api/v1/settings/invoicing',
    preview: '/api/v1/settings/invoicing/preview',
  },
  // Payment Settings API - /api/v1/settings/payments/*
  paymentSettings: {
    get: '/api/v1/settings/payments',
    update: '/api/v1/settings/payments',
    // Stripe
    testStripe: '/api/v1/settings/payments/test-stripe',
    stripeStatus: '/api/v1/settings/payments/stripe-status',
    disconnectStripe: '/api/v1/settings/payments/disconnect-stripe',
    // Square
    testSquare: '/api/v1/settings/payments/test-square',
    // PayPal
    testPaypal: '/api/v1/settings/payments/test-paypal',
    // Generic (multi-processor)
    test: '/api/v1/settings/payments/test',
    disconnect: '/api/v1/settings/payments/disconnect',
  },
  // Booking Settings API - /api/v1/settings/booking/*
  bookingSettings: {
    get: '/api/v1/settings/booking',
    update: '/api/v1/settings/booking',
  },
  // Calendar Settings API - /api/v1/settings/calendar/*
  calendarSettings: {
    get: '/api/v1/settings/calendar',
    update: '/api/v1/settings/calendar',
  },
  // Online Booking Settings API - /api/v1/settings/online-booking/*
  onlineBookingSettings: {
    get: '/api/v1/settings/online-booking',
    update: '/api/v1/settings/online-booking',
    checkSlug: '/api/v1/settings/online-booking/check-slug',
    qrCode: '/api/v1/settings/online-booking/qr-code',
  },
  // Domain Settings API - /api/v1/settings/domain/*
  domainSettings: {
    get: '/api/v1/settings/domain',
    update: '/api/v1/settings/domain',
    verify: '/api/v1/settings/domain/verify',
    status: '/api/v1/settings/domain/status',
  },
  // Policies API - /api/v1/policies/*
  policies: {
    list: '/api/v1/policies',
    create: '/api/v1/policies',
    detail: build('/api/v1/policies/{id}'),
    update: build('/api/v1/policies/{id}'),
    delete: build('/api/v1/policies/{id}'),
    templates: '/api/v1/policies/templates',
  },
  features: {
    list: '/api/v1/config/features',
    detail: build('/api/v1/config/features/{id}'),
  },
  integrations: {
    list: '/api/v1/config/integrations',
    detail: build('/api/v1/config/integrations/{id}'),
    test: buildWithSuffix('/api/v1/config/integrations/{id}', 'test'),
  },
  plans: {
    list: '/api/v1/config/plans',
    detail: build('/api/v1/config/plans/{id}'),
  },
  templates: {
    list: '/api/v1/config/templates',
    detail: build('/api/v1/config/templates/{id}'),
    preview: buildWithSuffix('/api/v1/config/templates/{id}', 'preview'),
  },

  // Forms & Waivers API - /api/v1/forms/*
  // Routed through config-service
  forms: {
    list: '/api/v1/forms',
    create: '/api/v1/forms',
    detail: build('/api/v1/forms/{id}'),
    update: build('/api/v1/forms/{id}'),
    delete: build('/api/v1/forms/{id}'),
    submissions: build('/api/v1/forms/{id}/submissions'),
    submissionsList: '/api/v1/forms/submissions',
    submissionDetail: build('/api/v1/forms/submissions/{id}'),
  },

  // User Profile Service - /api/v1/profile/*
  userProfile: {
    self: '/api/v1/profile',
    detail: build('/api/v1/profile/{id}'),
    preferences: '/api/v1/profile/preferences',
    notifications: '/api/v1/profile/notifications',
  },

  // Auth Service - /api/v1/auth/*
  auth: {
    login: '/api/v1/auth/login',
    register: '/api/v1/auth/register',
    refresh: '/api/v1/auth/refresh',
    logout: '/api/v1/auth/logout',
    me: '/api/v1/auth/me',
    sessions: '/api/v1/auth/sessions',
  },

  // Customer Self-Service Portal - /api/v1/customer/*
  customer: {
    availability: '/api/v1/customer/availability',
    services: '/api/v1/customer/services',
    pets: '/api/v1/customer/pets',
    bookings: '/api/v1/customer/bookings',
    bookingDetail: build('/api/v1/customer/bookings/{id}'),
    profile: '/api/v1/customer/profile',
  },

  // Commission Tracking - /api/v1/financial/commissions/*
  commissions: {
    list: '/api/v1/financial/commissions',
    detail: build('/api/v1/financial/commissions/{id}'),
    approve: build('/api/v1/financial/commissions/{id}/approve'),
    markPaid: build('/api/v1/financial/commissions/{id}/paid'),
    rates: '/api/v1/financial/commissions/rates',
    rateDetail: build('/api/v1/financial/commissions/rates/{id}'),
    staffSummary: build('/api/v1/financial/commissions/staff/{id}'),
    calculate: '/api/v1/financial/commissions/calculate',
  },

  // Package Templates - /api/v1/package-templates/*
  // Prepaid credit packages facilities offer for purchase
  packageTemplates: {
    list: '/api/v1/package-templates',
    create: '/api/v1/package-templates',
    detail: build('/api/v1/package-templates/{id}'),
    update: build('/api/v1/package-templates/{id}'),
    delete: build('/api/v1/package-templates/{id}'),
  },

  // Services - /api/v1/services/*
  // Primary services (boarding, daycare, grooming, training)
  services: {
    list: '/api/v1/services',
    create: '/api/v1/services',
    detail: build('/api/v1/services/{id}'),
    update: build('/api/v1/services/{id}'),
    delete: build('/api/v1/services/{id}'),
  },

  // Add-On Services - /api/v1/addon-services/*
  // Optional extras customers can add to bookings
  addonServices: {
    list: '/api/v1/addon-services',
    create: '/api/v1/addon-services',
    detail: build('/api/v1/addon-services/{id}'),
    update: build('/api/v1/addon-services/{id}'),
    delete: build('/api/v1/addon-services/{id}'),
  },

  // Health check
  health: '/api/v1/health',
};

export type CanonicalEndpointGroups = typeof canonicalEndpoints;

