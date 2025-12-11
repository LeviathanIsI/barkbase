/**
 * Master Settings Tour Definition
 *
 * Comprehensive product tour for the entire Settings area.
 * Walks through all 8 sections and 31+ settings pages via the sidebar.
 */

export const SETTINGS_MASTER_TOUR_ID = 'settings-master-v1';

export const settingsMasterTourSteps = [
  // ═══════════════════════════════════════════════════════════════════════════
  // INTRO
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-sidebar"]',
    popover: {
      title: 'Welcome to Settings',
      description:
        'This is your command center for configuring every aspect of your business. 8 sections, 30+ pages—let\'s walk through what each one does.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-back-button"]',
    popover: {
      title: 'Return to App',
      description:
        'Click here anytime to go back to the main application. Your settings are saved automatically.',
      side: 'right',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: YOUR PREFERENCES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-section-personal"]',
    popover: {
      title: 'Your Preferences',
      description:
        'Personal settings that only affect your account—not your team or business.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-profile"]',
    popover: {
      title: 'Profile',
      description:
        'Your name, email, avatar, and personal details. This is how you appear to your team.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-notifications"]',
    popover: {
      title: 'Notifications',
      description:
        'Control which emails and alerts you receive—booking confirmations, reminders, system updates, and more.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-security"]',
    popover: {
      title: 'Security',
      description:
        'Password management, two-factor authentication, and active sessions. Keep your account secure.',
      side: 'right',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: ACCOUNT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-section-account"]',
    popover: {
      title: 'Account Management',
      description:
        'Core business settings—your company info, team members, integrations, and feature controls.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-account"]',
    popover: {
      title: 'Account Defaults',
      description:
        'Business name, address, operating hours, holidays, time zone, and currency settings. The foundation of your account.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-team"]',
    popover: {
      title: 'Users & Teams',
      description:
        'Add staff members, assign roles, set permissions, and organize your team into groups.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-integrations"]',
    popover: {
      title: 'Integrations',
      description:
        'Connect third-party apps—QuickBooks, Mailchimp, Google Calendar, Stripe, and more.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-branding"]',
    popover: {
      title: 'Branding',
      description:
        'Upload your logo, set brand colors, and customize the look of customer-facing pages.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-domain"]',
    popover: {
      title: 'Domain & SSL',
      description:
        'Set up a custom domain (like booking.yourbusiness.com) with automatic SSL certificates.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-features"]',
    popover: {
      title: 'Feature Toggles',
      description:
        'Enable or disable specific features for your account. Useful for phased rollouts or simplifying your workflow.',
      side: 'right',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: FACILITY & SERVICES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-section-facility"]',
    popover: {
      title: 'Facility & Services',
      description:
        'Configure your physical location, accommodations, service offerings, and online booking portal.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-facility"]',
    popover: {
      title: 'Facility Setup',
      description:
        'Define your locations, buildings, rooms, kennels, and runs. Set capacity limits and amenities for each.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-services"]',
    popover: {
      title: 'Services & Pricing',
      description:
        'Create service offerings (boarding, daycare, grooming, training), set prices, durations, and availability.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-online-booking"]',
    popover: {
      title: 'Online Booking',
      description:
        'Configure your customer booking portal—what services are bookable, required deposits, and intake questions.',
      side: 'right',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: SCHEDULING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-section-scheduling"]',
    popover: {
      title: 'Scheduling',
      description:
        'Control how your calendar works and set rules for booking behavior.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-calendar"]',
    popover: {
      title: 'Calendar Settings',
      description:
        'Default calendar view, time slots, color coding, and display preferences for your schedule.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-booking-rules"]',
    popover: {
      title: 'Booking Rules',
      description:
        'Minimum notice, maximum advance booking, cancellation policies, overbooking limits, and blackout dates.',
      side: 'right',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: BILLING & PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-section-billing"]',
    popover: {
      title: 'Billing & Payments',
      description:
        'Manage your subscription, payment processing, invoices, and prepaid packages.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-subscription"]',
    popover: {
      title: 'Subscription',
      description:
        'Your current plan, usage stats, billing history, and upgrade options.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-payment-processing"]',
    popover: {
      title: 'Payment Processing',
      description:
        'Connect Stripe or other payment gateways. Configure fees, payout schedules, and accepted payment methods.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-invoicing"]',
    popover: {
      title: 'Invoicing',
      description:
        'Invoice templates, numbering, payment terms, late fees, and automatic invoice generation settings.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-products"]',
    popover: {
      title: 'Packages & Add-Ons',
      description:
        'Create prepaid packages (10-visit passes), add-on services, and retail products to sell.',
      side: 'right',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-section-communication"]',
    popover: {
      title: 'Communication',
      description:
        'Email templates, SMS settings, and automated notification triggers.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-email"]',
    popover: {
      title: 'Email Templates',
      description:
        'Customize booking confirmations, reminders, receipts, and marketing emails with your branding.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-sms"]',
    popover: {
      title: 'SMS Settings',
      description:
        'Enable text messaging, set your sender number, and configure SMS templates for quick notifications.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-triggers"]',
    popover: {
      title: 'Notification Triggers',
      description:
        'Set up automated alerts—send reminders before appointments, follow-ups after visits, birthday messages, and more.',
      side: 'right',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: DATA MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-section-data"]',
    popover: {
      title: 'Data Management',
      description:
        'Custom fields, forms, documents, file storage, and data import/export tools.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-properties"]',
    popover: {
      title: 'Properties',
      description:
        'Create custom fields for pets, owners, and bookings. Track vaccination dates, special needs, or any data unique to your business.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-forms"]',
    popover: {
      title: 'Forms',
      description:
        'Build intake forms, waivers, and questionnaires that customers fill out during booking.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-documents"]',
    popover: {
      title: 'Documents',
      description:
        'View and manage documents uploaded by customers—vaccination records, vet notes, and signed waivers.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-files"]',
    popover: {
      title: 'Files',
      description:
        'Upload templates and files to send to customers—care instructions, policies, welcome packets.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-import-export"]',
    popover: {
      title: 'Import & Export',
      description:
        'Migrate data from other systems or export your data as CSV/Excel for backups and reporting.',
      side: 'right',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-section-compliance"]',
    popover: {
      title: 'Compliance',
      description:
        'Audit logs, privacy controls, and legal documents to keep your business compliant.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-audit"]',
    popover: {
      title: 'Audit Log',
      description:
        'Complete history of who did what and when. Track changes to bookings, payments, and settings for accountability.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-privacy"]',
    popover: {
      title: 'Privacy Settings',
      description:
        'Data retention policies, customer consent management, and GDPR/CCPA compliance controls.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-item-terms"]',
    popover: {
      title: 'Terms & Policies',
      description:
        'Manage your terms of service, privacy policy, cancellation policy, and liability waivers.',
      side: 'right',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN CONTENT AREA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-content"]',
    popover: {
      title: 'Settings Content',
      description:
        'Click any item in the sidebar to load its settings here. Changes save automatically or with a Save button.',
      side: 'left',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FINISH
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-help-button"]',
    popover: {
      title: 'Replay This Tour',
      description:
        'Click here anytime to replay this settings overview. Each settings page also has its own detailed tour.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const settingsMasterTourConfig = {
  id: SETTINGS_MASTER_TOUR_ID,
  steps: settingsMasterTourSteps,
};

export default settingsMasterTourConfig;
