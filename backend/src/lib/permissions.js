// Permission constants and categories
const PERMISSION_CATEGORIES = {
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

// Flatten all permissions into a single object for easy access
const ALL_PERMISSIONS = {};
Object.values(PERMISSION_CATEGORIES).forEach(category => {
  Object.keys(category.permissions).forEach(permission => {
    ALL_PERMISSIONS[permission] = true;
  });
});

// System roles that cannot be deleted
const SYSTEM_ROLES = {
  OWNER: {
    name: 'Owner',
    description: 'Full system access',
    permissions: ALL_PERMISSIONS,
    isSystem: true
  },
  ADMIN: {
    name: 'Administrator', 
    description: 'Administrative access',
    permissions: { ...ALL_PERMISSIONS, MANAGE_BILLING: false },
    isSystem: true
  }
};

// Kennel-specific role templates
const KENNEL_ROLE_TEMPLATES = {
  RECEPTIONIST: {
    name: 'Receptionist',
    description: 'Front desk operations - handles bookings, check-ins, and customer service',
    permissions: {
      // Bookings
      VIEW_BOOKINGS: true,
      CREATE_BOOKING: true,
      EDIT_BOOKING: true,
      DELETE_BOOKING: false,
      MANAGE_PRICING: false,
      OVERRIDE_PRICING: false,
      VIEW_BOOKING_REPORTS: true,
      
      // Customers
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      CREATE_CUSTOMER: true,
      EDIT_CUSTOMER: true,
      DELETE_CUSTOMER: false,
      VIEW_CUSTOMER_FINANCIAL: true,
      MANAGE_CUSTOMER_NOTES: true,
      EXPORT_CUSTOMER_DATA: false,
      
      // Pets
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      CREATE_PET: true,
      EDIT_PET: true,
      DELETE_PET: false,
      VIEW_MEDICAL_RECORDS: true,
      EDIT_MEDICAL_RECORDS: false,
      MANAGE_VACCINATIONS: false,
      
      // Facility
      VIEW_KENNELS: true,
      MANAGE_KENNELS: false,
      VIEW_OCCUPANCY: true,
      
      // Financial
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      EDIT_INVOICE: false,
      VIEW_PAYMENTS: true,
      PROCESS_PAYMENT: true,
      ISSUE_REFUND: false,
      
      // Communications
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true,
      
      // Reports
      VIEW_BASIC_REPORTS: true,
      VIEW_DASHBOARDS: true
    }
  },
  
  KENNEL_ATTENDANT: {
    name: 'Kennel Attendant',
    description: 'Daily pet care - feeding, cleaning, exercise, and basic health monitoring',
    permissions: {
      // Bookings
      VIEW_BOOKINGS: true,
      CREATE_BOOKING: false,
      
      // Customers
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: false,
      MANAGE_CUSTOMER_NOTES: true, // For pet-specific notes
      
      // Pets
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      CREATE_PET: false,
      EDIT_PET: true, // For updating care notes
      VIEW_MEDICAL_RECORDS: true,
      EDIT_MEDICAL_RECORDS: true, // For recording observations
      
      // Facility
      VIEW_KENNELS: true,
      VIEW_OCCUPANCY: true,
      MANAGE_INVENTORY: true, // Food, supplies
      VIEW_MAINTENANCE: true,
      CREATE_MAINTENANCE: true, // Report issues
      
      // Communications
      VIEW_MESSAGES: true,
      SEND_MESSAGES: false,
      
      // Reports
      VIEW_BASIC_REPORTS: false,
      VIEW_DASHBOARDS: true // Task dashboard
    }
  },
  
  GROOMER: {
    name: 'Groomer',
    description: 'Pet grooming services - appointments, grooming records, and scheduling',
    permissions: {
      // Bookings
      VIEW_BOOKINGS: true, // Grooming appointments
      CREATE_BOOKING: true,
      EDIT_BOOKING: true,
      
      // Customers
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      MANAGE_CUSTOMER_NOTES: true,
      
      // Pets
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      EDIT_PET: true, // Grooming notes
      VIEW_MEDICAL_RECORDS: true, // Skin conditions, allergies
      
      // Facility
      VIEW_KENNELS: false,
      MANAGE_INVENTORY: true, // Grooming supplies
      
      // Financial
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      VIEW_PAYMENTS: true,
      PROCESS_PAYMENT: true,
      
      // Communications
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true, // Appointment reminders
      
      // Reports
      VIEW_BASIC_REPORTS: true, // Grooming reports
      VIEW_DASHBOARDS: true
    }
  },
  
  TRAINER: {
    name: 'Trainer',
    description: 'Pet training services - training sessions, progress tracking, and behavior notes',
    permissions: {
      // Bookings
      VIEW_BOOKINGS: true, // Training sessions
      CREATE_BOOKING: true,
      EDIT_BOOKING: true,
      
      // Customers
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      MANAGE_CUSTOMER_NOTES: true,
      
      // Pets
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      EDIT_PET: true, // Training progress
      VIEW_MEDICAL_RECORDS: true, // Behavioral issues
      EDIT_MEDICAL_RECORDS: true, // Behavior notes
      
      // Facility
      VIEW_KENNELS: true, // Training areas
      MANAGE_SCHEDULES: true, // Training schedules
      
      // Financial
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      
      // Communications
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true, // Progress updates
      MANAGE_TEMPLATES: true, // Training templates
      
      // Reports
      VIEW_BASIC_REPORTS: true,
      CREATE_CUSTOM_REPORTS: true // Training progress reports
    }
  },
  
  VET_TECH: {
    name: 'Veterinary Technician',
    description: 'Medical care support - medication administration, health monitoring, and medical records',
    permissions: {
      // Bookings
      VIEW_BOOKINGS: true,
      
      // Customers
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      
      // Pets
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      EDIT_PET: true,
      VIEW_MEDICAL_RECORDS: true,
      EDIT_MEDICAL_RECORDS: true,
      MANAGE_VACCINATIONS: true,
      
      // Facility
      VIEW_KENNELS: true,
      MANAGE_INVENTORY: true, // Medical supplies
      VIEW_MAINTENANCE: true,
      
      // Financial
      VIEW_INVOICES: true,
      CREATE_INVOICE: true, // Medical services
      
      // Communications
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true, // Medical updates
      
      // Reports
      VIEW_BASIC_REPORTS: true,
      VIEW_ADVANCED_REPORTS: true // Medical reports
    }
  },
  
  SHIFT_SUPERVISOR: {
    name: 'Shift Supervisor',
    description: 'Shift management - oversees daily operations, staff coordination, and problem resolution',
    permissions: {
      // All receptionist permissions plus additional
      VIEW_BOOKINGS: true,
      CREATE_BOOKING: true,
      EDIT_BOOKING: true,
      DELETE_BOOKING: true,
      MANAGE_PRICING: false,
      OVERRIDE_PRICING: true,
      VIEW_BOOKING_REPORTS: true,
      
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      CREATE_CUSTOMER: true,
      EDIT_CUSTOMER: true,
      DELETE_CUSTOMER: false,
      VIEW_CUSTOMER_FINANCIAL: true,
      MANAGE_CUSTOMER_NOTES: true,
      EXPORT_CUSTOMER_DATA: false,
      
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      CREATE_PET: true,
      EDIT_PET: true,
      DELETE_PET: false,
      VIEW_MEDICAL_RECORDS: true,
      EDIT_MEDICAL_RECORDS: false,
      MANAGE_VACCINATIONS: false,
      
      VIEW_KENNELS: true,
      MANAGE_KENNELS: true,
      VIEW_OCCUPANCY: true,
      
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      EDIT_INVOICE: true,
      VIEW_PAYMENTS: true,
      PROCESS_PAYMENT: true,
      ISSUE_REFUND: true,
      
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true,
      
      VIEW_BASIC_REPORTS: true,
      VIEW_DASHBOARDS: true,
      
      // Additional permissions
      VIEW_STAFF: true,
      VIEW_SCHEDULES: true,
      MANAGE_SCHEDULES: true,
      VIEW_TIMESHEETS: true,
      VIEW_ADVANCED_REPORTS: true,
      EXPORT_REPORTS: true
    }
  },
  
  FACILITY_MANAGER: {
    name: 'Facility Manager',
    description: 'Facility operations - manages staff, inventory, maintenance, and operational efficiency',
    permissions: {
      // Most permissions except billing and system
      VIEW_BOOKINGS: true,
      CREATE_BOOKING: true,
      EDIT_BOOKING: true,
      DELETE_BOOKING: true,
      MANAGE_PRICING: true,
      OVERRIDE_PRICING: true,
      VIEW_BOOKING_REPORTS: true,
      
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      CREATE_CUSTOMER: true,
      EDIT_CUSTOMER: true,
      DELETE_CUSTOMER: true,
      VIEW_CUSTOMER_FINANCIAL: true,
      MANAGE_CUSTOMER_NOTES: true,
      EXPORT_CUSTOMER_DATA: true,
      
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      CREATE_PET: true,
      EDIT_PET: true,
      DELETE_PET: true,
      VIEW_MEDICAL_RECORDS: true,
      EDIT_MEDICAL_RECORDS: true,
      MANAGE_VACCINATIONS: true,
      
      VIEW_KENNELS: true,
      MANAGE_KENNELS: true,
      VIEW_OCCUPANCY: true,
      MANAGE_INVENTORY: true,
      VIEW_MAINTENANCE: true,
      CREATE_MAINTENANCE: true,
      MANAGE_SCHEDULES: true,
      
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      EDIT_INVOICE: true,
      DELETE_INVOICE: false,
      VIEW_PAYMENTS: true,
      PROCESS_PAYMENT: true,
      ISSUE_REFUND: true,
      VIEW_FINANCIAL_REPORTS: true,
      EXPORT_FINANCIAL_DATA: false,
      
      VIEW_STAFF: true,
      CREATE_STAFF: true,
      EDIT_STAFF: true,
      DELETE_STAFF: true,
      VIEW_SCHEDULES: true,
      MANAGE_SCHEDULES: true,
      VIEW_TIMESHEETS: true,
      APPROVE_TIMESHEETS: true,
      
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true,
      MANAGE_TEMPLATES: true,
      VIEW_CAMPAIGNS: true,
      CREATE_CAMPAIGNS: true,
      MANAGE_AUTOMATIONS: true,
      
      VIEW_BASIC_REPORTS: true,
      VIEW_ADVANCED_REPORTS: true,
      CREATE_CUSTOM_REPORTS: true,
      EXPORT_REPORTS: true,
      VIEW_DASHBOARDS: true,
      CUSTOMIZE_DASHBOARDS: true,
      
      VIEW_SETTINGS: true,
      MANAGE_SETTINGS: false,
      VIEW_INTEGRATIONS: true,
      MANAGE_INTEGRATIONS: false,
      VIEW_AUDIT_LOGS: true,
      MANAGE_ROLES: true,
      MANAGE_USERS: true,
      MANAGE_BILLING: false
    }
  },
  
  ACCOUNTANT: {
    name: 'Accountant/Bookkeeper',
    description: 'Financial management - handles invoicing, payments, and financial reporting',
    permissions: {
      // Minimal operational access
      VIEW_BOOKINGS: true,
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      VIEW_CUSTOMER_FINANCIAL: true,
      EXPORT_CUSTOMER_DATA: true,
      
      // Full financial access
      VIEW_INVOICES: true,
      CREATE_INVOICE: true,
      EDIT_INVOICE: true,
      DELETE_INVOICE: true,
      VIEW_PAYMENTS: true,
      PROCESS_PAYMENT: true,
      ISSUE_REFUND: true,
      VIEW_FINANCIAL_REPORTS: true,
      EXPORT_FINANCIAL_DATA: true,
      
      // Reporting
      VIEW_BASIC_REPORTS: true,
      VIEW_ADVANCED_REPORTS: true,
      CREATE_CUSTOM_REPORTS: true,
      EXPORT_REPORTS: true,
      
      // Limited other access
      VIEW_STAFF: true,
      VIEW_TIMESHEETS: true,
      VIEW_AUDIT_LOGS: true
    }
  },
  
  MARKETING_COORDINATOR: {
    name: 'Marketing Coordinator',
    description: 'Marketing and customer engagement - campaigns, communications, and customer insights',
    permissions: {
      // Customer insights
      VIEW_BOOKINGS: true,
      VIEW_CUSTOMERS: true,
      VIEW_CUSTOMER_DETAILS: true,
      MANAGE_CUSTOMER_NOTES: true,
      EXPORT_CUSTOMER_DATA: true,
      
      // Communications
      VIEW_MESSAGES: true,
      SEND_MESSAGES: true,
      MANAGE_TEMPLATES: true,
      VIEW_CAMPAIGNS: true,
      CREATE_CAMPAIGNS: true,
      MANAGE_AUTOMATIONS: true,
      
      // Reports
      VIEW_BASIC_REPORTS: true,
      VIEW_ADVANCED_REPORTS: true,
      CREATE_CUSTOM_REPORTS: true,
      EXPORT_REPORTS: true,
      VIEW_DASHBOARDS: true,
      CUSTOMIZE_DASHBOARDS: true
    }
  },
  
  PART_TIME_STAFF: {
    name: 'Part-Time Staff',
    description: 'Limited access for part-time employees - basic operations only',
    permissions: {
      // Very limited access
      VIEW_BOOKINGS: true,
      VIEW_CUSTOMERS: true,
      VIEW_PETS: true,
      VIEW_PET_DETAILS: true,
      VIEW_KENNELS: true,
      VIEW_OCCUPANCY: true,
      VIEW_MESSAGES: true,
      VIEW_DASHBOARDS: true
    }
  }
};

module.exports = {
  PERMISSION_CATEGORIES,
  ALL_PERMISSIONS,
  SYSTEM_ROLES,
  KENNEL_ROLE_TEMPLATES
};

