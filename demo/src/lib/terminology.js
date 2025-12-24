import { useTenantStore } from '@/stores/tenant';

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

