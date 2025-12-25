import { useTenantStore } from '@/stores/tenant';

// ============================================================================
// NAVIGATION LABELS
// ============================================================================

/**
 * Default navigation labels
 * These are the built-in labels that can be customized by tenants
 */
export const defaultLabels = {
  commandCenter: 'Command Center',
  owners: 'Owners',
  pets: 'Pets',
  vaccinations: 'Vaccinations',
  bookings: 'Bookings',
  runSchedules: 'Run Schedules',
  kennels: 'Kennels',
  incidents: 'Incidents',
  messages: 'Messages',
  packages: 'Packages',
};

/**
 * Get a navigation label with custom terminology fallback
 * @param {string} key - The label key (e.g., 'owners', 'pets')
 * @param {object} terminology - Custom terminology object from tenant
 * @returns {string} The custom label or default label
 */
export const getLabel = (key, terminology = {}) => {
  return terminology[key] || defaultLabels[key] || key;
};

/**
 * Hook to get navigation label with tenant terminology
 */
export const useNavigationLabel = (key) => {
  const terminology = useTenantStore((state) => state.tenant?.terminology || {});
  return getLabel(key, terminology);
};

/**
 * Hook to get all navigation labels with tenant customization
 */
export const useNavigationLabels = () => {
  const terminology = useTenantStore((state) => state.tenant?.terminology || {});

  const labels = {};
  for (const key of Object.keys(defaultLabels)) {
    labels[key] = getLabel(key, terminology);
  }
  return labels;
};

// ============================================================================
// FACILITY TERMINOLOGY
// ============================================================================

/**
 * Get custom terminology for facility accommodations
 * Falls back to defaults if not configured
 */
export const useTerminology = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const facilitySettings = tenant?.settings?.facility || {};
  
  const terminology = {
    kennel: 'Kennel',
    suite: 'Suite',
    cabin: 'Cabin', 
    daycare: 'Daycare',
    medical: 'Medical Room',
    ...facilitySettings.terminology
  };

  return {
    // Individual terms
    ...terminology,
    
    // Helper functions
    getAccommodationType: (type) => {
      const typeMap = {
        'KENNEL': terminology.kennel,
        'SUITE': terminology.suite,
        'CABIN': terminology.cabin,
        'DAYCARE': terminology.daycare,
        'MEDICAL': terminology.medical,
      };
      return typeMap[type?.toUpperCase()] || type || terminology.kennel;
    },
    
    // Pluralization helpers
    kennels: terminology.kennel.toLowerCase() + 's',
    suites: terminology.suite.toLowerCase() + 's',
    cabins: terminology.cabin.toLowerCase() + 's',
    
    // Formatted display names
    getDisplayName: (type, name, number) => {
      const typeName = terminology.getAccommodationType?.(type) || terminology.kennel;
      const kennelNaming = facilitySettings.kennelNaming || {};
      
      if (name && kennelNaming.useNames) {
        return name;
      }
      
      if (number && kennelNaming.useNumbers) {
        const prefix = kennelNaming.prefix || '';
        return `${typeName} ${prefix}${number}`;
      }
      
      return `${typeName} ${name || number || ''}`.trim();
    }
  };
};

/**
 * Static version for use in non-React contexts
 */
export const getTerminology = (tenantSettings) => {
  const facilitySettings = tenantSettings?.facility || {};
  
  return {
    kennel: 'Kennel',
    suite: 'Suite',
    cabin: 'Cabin',
    daycare: 'Daycare', 
    medical: 'Medical Room',
    ...facilitySettings.terminology
  };
};

