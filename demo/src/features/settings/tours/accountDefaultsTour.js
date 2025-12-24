/**
 * Account Defaults Settings Tour Definition
 *
 * Comprehensive product tour for the Account Defaults settings page.
 * Navigates through all tabs: Business Profile, Scheduling, Locale, and Billing.
 */

export const ACCOUNT_DEFAULTS_TOUR_ID = 'settings-account-defaults-v1';

/**
 * Creates tour steps with tab navigation callbacks
 * @param {Function} setActiveTab - Function to switch tabs
 */
export const createAccountDefaultsTourSteps = (setActiveTab) => [
  // ═══════════════════════════════════════════════════════════════════════════
  // INTRO & HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-header"]',
    popover: {
      title: 'Account Defaults',
      description:
        'Your business foundation. Configure branding, operating hours, locale preferences, and billing defaults that power every booking and invoice.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-plan-badges"]',
    popover: {
      title: 'Plan & Tenant Info',
      description:
        'Your current subscription plan and tenant slug. Some features like multi-currency require upgraded plans.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="settings-tabs"]',
    popover: {
      title: 'Settings Categories',
      description:
        'Four sections: Business Profile, Scheduling & Availability, Locale & Formatting, and Currency & Billing. Let\'s walk through each one.',
      side: 'bottom',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 1: BUSINESS PROFILE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-brand-identity"]',
    popover: {
      title: 'Brand Identity',
      description:
        'Your business name, tax ID, contact info, and website. This information appears on invoices, emails, and the customer portal.',
      side: 'bottom',
      align: 'start',
    },
    onHighlightStarted: () => {
      setActiveTab?.('business');
    },
  },
  {
    element: '[data-tour="settings-logo-upload"]',
    popover: {
      title: 'Business Logo',
      description:
        'Upload your logo (PNG, JPG, or WebP up to 5MB). Square images work best. Appears on invoices and booking confirmations.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-address"]',
    popover: {
      title: 'Business Address',
      description:
        'Your physical location and mailing address. Used on invoices, legal notices, and outbound communications.',
      side: 'top',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 2: SCHEDULING & AVAILABILITY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-operating-hours"]',
    popover: {
      title: 'Weekly Operating Hours',
      description:
        'Set open/close times for each day. These hours drive booking availability and appear on customer confirmations. Toggle days closed when needed.',
      side: 'bottom',
      align: 'start',
    },
    onHighlightStarted: () => {
      setActiveTab?.('scheduling');
    },
  },
  {
    element: '[data-tour="settings-holidays"]',
    popover: {
      title: 'Holiday Schedule',
      description:
        'Add closure dates to automatically block bookings. Set recurring holidays (like Christmas) to repeat yearly. Free plans allow up to 12 closures.',
      side: 'top',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 3: LOCALE & FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-timezone"]',
    popover: {
      title: 'Primary Time Zone',
      description:
        'All bookings, reminders, and staff calendars use this time zone. Select your facility\'s local time zone.',
      side: 'bottom',
      align: 'start',
    },
    onHighlightStarted: () => {
      setActiveTab?.('regional');
    },
  },
  {
    element: '[data-tour="settings-formatting"]',
    popover: {
      title: 'Formatting Preferences',
      description:
        'Choose date format (MM/DD/YYYY vs DD/MM/YYYY), 12 or 24-hour time, and which day starts your week.',
      side: 'top',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 4: CURRENCY & BILLING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-currencies"]',
    popover: {
      title: 'Supported Currencies',
      description:
        'Select which currencies you accept. Free plans are limited to USD. Upgrade to accept multiple currencies for international customers.',
      side: 'bottom',
      align: 'start',
    },
    onHighlightStarted: () => {
      setActiveTab?.('billing');
    },
  },
  {
    element: '[data-tour="settings-default-currency"]',
    popover: {
      title: 'Default Currency',
      description:
        'The primary currency for new invoices and pricing. Must be one of your supported currencies.',
      side: 'top',
      align: 'start',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER & FINISH
  // ═══════════════════════════════════════════════════════════════════════════
  {
    element: '[data-tour="settings-save"]',
    popover: {
      title: 'Save Your Changes',
      description:
        'Click Save Changes when done. The button activates when you have unsaved changes. Settings apply immediately after saving.',
      side: 'top',
      align: 'end',
    },
  },
  {
    element: '[data-tour="settings-help-button"]',
    popover: {
      title: 'Replay Tour',
      description: 'Click here anytime to replay this guided tour of Account Defaults.',
      side: 'bottom',
      align: 'end',
    },
    onHighlightStarted: () => {
      // Return to first tab when tour ends
      setActiveTab?.('business');
    },
  },
];

/**
 * Static steps for reference (without tab navigation)
 */
export const accountDefaultsTourSteps = createAccountDefaultsTourSteps(() => {});

/**
 * Create tour config with tab navigation
 * @param {Function} setActiveTab - Function to switch tabs
 */
export const createAccountDefaultsTourConfig = (setActiveTab) => ({
  id: ACCOUNT_DEFAULTS_TOUR_ID,
  steps: createAccountDefaultsTourSteps(setActiveTab),
});

export const accountDefaultsTourConfig = {
  id: ACCOUNT_DEFAULTS_TOUR_ID,
  steps: accountDefaultsTourSteps,
};

export default accountDefaultsTourConfig;
