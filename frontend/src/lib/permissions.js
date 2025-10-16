// Permission constants and categories - must match backend
export const PERMISSION_CATEGORIES = {
  BOOKINGS: {
    label: 'Bookings & Reservations',
    permissions: {
      VIEW_BOOKINGS: 'View all bookings',
      CREATE_BOOKING: 'Create new bookings',
      EDIT_BOOKING: 'Edit existing bookings',
      DELETE_BOOKING: 'Delete bookings',
      MANAGE_PRICING: 'Manage pricing rules',
      OVERRIDE_PRICING: 'Override standard pricing',
      VIEW_BOOKING_REPORTS: 'View booking reports'
    }
  },
  CUSTOMERS: {
    label: 'Customer Management',
    permissions: {
      VIEW_CUSTOMERS: 'View customer list',
      VIEW_CUSTOMER_DETAILS: 'View full customer details',
      CREATE_CUSTOMER: 'Create new customers',
      EDIT_CUSTOMER: 'Edit customer information',
      DELETE_CUSTOMER: 'Delete customers',
      VIEW_CUSTOMER_FINANCIAL: 'View customer financial data',
      MANAGE_CUSTOMER_NOTES: 'Manage customer notes',
      EXPORT_CUSTOMER_DATA: 'Export customer data'
    }
  },
  PETS: {
    label: 'Pet Management',
    permissions: {
      VIEW_PETS: 'View pet list',
      VIEW_PET_DETAILS: 'View full pet details',
      CREATE_PET: 'Create new pet profiles',
      EDIT_PET: 'Edit pet information',
      DELETE_PET: 'Delete pet profiles',
      VIEW_MEDICAL_RECORDS: 'View medical records',
      EDIT_MEDICAL_RECORDS: 'Edit medical records',
      MANAGE_VACCINATIONS: 'Manage vaccination records'
    }
  },
  FACILITY: {
    label: 'Facility Operations',
    permissions: {
      VIEW_KENNELS: 'View kennel status',
      MANAGE_KENNELS: 'Manage kennel configuration',
      VIEW_OCCUPANCY: 'View occupancy reports',
      MANAGE_INVENTORY: 'Manage inventory',
      VIEW_MAINTENANCE: 'View maintenance schedules',
      CREATE_MAINTENANCE: 'Create maintenance tasks',
      MANAGE_SCHEDULES: 'Manage facility schedules'
    }
  },
  FINANCIAL: {
    label: 'Financial Management',
    permissions: {
      VIEW_INVOICES: 'View invoices',
      CREATE_INVOICE: 'Create invoices',
      EDIT_INVOICE: 'Edit invoices',
      DELETE_INVOICE: 'Delete invoices',
      VIEW_PAYMENTS: 'View payments',
      PROCESS_PAYMENT: 'Process payments',
      ISSUE_REFUND: 'Issue refunds',
      VIEW_FINANCIAL_REPORTS: 'View financial reports',
      EXPORT_FINANCIAL_DATA: 'Export financial data'
    }
  },
  STAFF: {
    label: 'Staff Management',
    permissions: {
      VIEW_STAFF: 'View staff list',
      CREATE_STAFF: 'Add new staff members',
      EDIT_STAFF: 'Edit staff information',
      DELETE_STAFF: 'Remove staff members',
      VIEW_SCHEDULES: 'View staff schedules',
      MANAGE_SCHEDULES: 'Manage staff schedules',
      VIEW_TIMESHEETS: 'View timesheets',
      APPROVE_TIMESHEETS: 'Approve timesheets'
    }
  },
  COMMUNICATIONS: {
    label: 'Communications',
    permissions: {
      VIEW_MESSAGES: 'View messages',
      SEND_MESSAGES: 'Send messages',
      MANAGE_TEMPLATES: 'Manage message templates',
      VIEW_CAMPAIGNS: 'View marketing campaigns',
      CREATE_CAMPAIGNS: 'Create marketing campaigns',
      MANAGE_AUTOMATIONS: 'Manage communication automations'
    }
  },
  REPORTS: {
    label: 'Reports & Analytics',
    permissions: {
      VIEW_BASIC_REPORTS: 'View basic reports',
      VIEW_ADVANCED_REPORTS: 'View advanced analytics',
      CREATE_CUSTOM_REPORTS: 'Create custom reports',
      EXPORT_REPORTS: 'Export report data',
      VIEW_DASHBOARDS: 'View dashboards',
      CUSTOMIZE_DASHBOARDS: 'Customize dashboards'
    }
  },
  SYSTEM: {
    label: 'System Administration',
    permissions: {
      VIEW_SETTINGS: 'View system settings',
      MANAGE_SETTINGS: 'Manage system settings',
      VIEW_INTEGRATIONS: 'View integrations',
      MANAGE_INTEGRATIONS: 'Manage integrations',
      VIEW_AUDIT_LOGS: 'View audit logs',
      MANAGE_ROLES: 'Manage roles and permissions',
      MANAGE_USERS: 'Manage user accounts',
      MANAGE_BILLING: 'Manage billing and subscription'
    }
  }
};

// Flatten all permissions for easy access
export const ALL_PERMISSIONS = {};
Object.values(PERMISSION_CATEGORIES).forEach(category => {
  Object.keys(category.permissions).forEach(permission => {
    ALL_PERMISSIONS[permission] = true;
  });
});

// Helper to get permission description
export const getPermissionDescription = (permissionKey) => {
  for (const category of Object.values(PERMISSION_CATEGORIES)) {
    if (category.permissions[permissionKey]) {
      return category.permissions[permissionKey];
    }
  }
  return permissionKey;
};

// Helper to get permission category
export const getPermissionCategory = (permissionKey) => {
  for (const [categoryKey, category] of Object.entries(PERMISSION_CATEGORIES)) {
    if (category.permissions[permissionKey]) {
      return categoryKey;
    }
  }
  return null;
};

// Helper to check if a permission exists
export const isValidPermission = (permissionKey) => {
  return ALL_PERMISSIONS.hasOwnProperty(permissionKey);
};

