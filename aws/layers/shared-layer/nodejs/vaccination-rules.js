/**
 * =============================================================================
 * BarkBase State-Specific Vaccination Rules
 * =============================================================================
 * 
 * Vaccination requirements vary by state. This module provides:
 * - State-specific vaccination requirements
 * - Validation of vaccination compliance
 * - Reminder scheduling based on state rules
 * 
 * =============================================================================
 */

/**
 * State vaccination requirements
 * 
 * Each state has:
 * - requiredVaccinations: Array of required vaccines with timing rules
 * - rabiesLaw: State rabies law details
 * - additionalRequirements: Any extra requirements
 */
const STATE_VACCINATION_RULES = {
  // Default rules (used when state not specified)
  DEFAULT: {
    name: 'Default Requirements',
    requiredVaccinations: [
      {
        name: 'Rabies',
        required: true,
        firstDoseAge: 12, // weeks
        boosterInterval: 12, // months (first booster)
        subsequentInterval: 36, // months after first booster
        species: ['dog', 'cat'],
      },
      {
        name: 'DHPP',
        required: true,
        aliases: ['Distemper', 'DA2PP', 'DA2PPV'],
        firstDoseAge: 6,
        boosterInterval: 12,
        subsequentInterval: 12,
        species: ['dog'],
      },
      {
        name: 'Bordetella',
        required: false,
        recommended: true,
        aliases: ['Kennel Cough'],
        boosterInterval: 6,
        species: ['dog'],
        notes: 'Required for boarding/daycare',
      },
    ],
    rabiesLaw: {
      mandatoryAge: 16, // weeks
      revaccinationPeriod: 36, // months
    },
  },

  // California
  CA: {
    name: 'California',
    requiredVaccinations: [
      {
        name: 'Rabies',
        required: true,
        firstDoseAge: 16,
        boosterInterval: 12,
        subsequentInterval: 36,
        species: ['dog'],
        notes: 'Dogs must be vaccinated against rabies by 4 months of age',
      },
      {
        name: 'DHPP',
        required: false,
        recommended: true,
        aliases: ['Distemper', 'DA2PP'],
        firstDoseAge: 6,
        boosterInterval: 12,
        species: ['dog'],
      },
      {
        name: 'Bordetella',
        required: false,
        recommended: true,
        boosterInterval: 6,
        species: ['dog'],
      },
    ],
    rabiesLaw: {
      mandatoryAge: 16,
      revaccinationPeriod: 36,
      exemptions: 'Medical exemptions allowed with veterinary certification',
    },
  },

  // Texas
  TX: {
    name: 'Texas',
    requiredVaccinations: [
      {
        name: 'Rabies',
        required: true,
        firstDoseAge: 16,
        boosterInterval: 12,
        subsequentInterval: 36,
        species: ['dog', 'cat'],
        notes: 'Required by Texas Health and Safety Code',
      },
      {
        name: 'DHPP',
        required: false,
        recommended: true,
        firstDoseAge: 6,
        boosterInterval: 12,
        species: ['dog'],
      },
    ],
    rabiesLaw: {
      mandatoryAge: 16,
      revaccinationPeriod: 36,
    },
  },

  // New York
  NY: {
    name: 'New York',
    requiredVaccinations: [
      {
        name: 'Rabies',
        required: true,
        firstDoseAge: 16,
        boosterInterval: 12,
        subsequentInterval: 36,
        species: ['dog', 'cat', 'ferret'],
        notes: 'Required under Agriculture & Markets Law § 109',
      },
      {
        name: 'DHPP',
        required: false,
        recommended: true,
        firstDoseAge: 6,
        boosterInterval: 12,
        species: ['dog'],
      },
    ],
    rabiesLaw: {
      mandatoryAge: 16,
      revaccinationPeriod: 36,
      penaltyForNonCompliance: 'Fine up to $200',
    },
  },

  // Florida
  FL: {
    name: 'Florida',
    requiredVaccinations: [
      {
        name: 'Rabies',
        required: true,
        firstDoseAge: 16,
        boosterInterval: 12,
        subsequentInterval: 36,
        species: ['dog', 'cat'],
        notes: 'Required by Florida Statute 828.30',
      },
      {
        name: 'DHPP',
        required: false,
        recommended: true,
        firstDoseAge: 6,
        boosterInterval: 12,
        species: ['dog'],
      },
      {
        name: 'Leptospirosis',
        required: false,
        recommended: true,
        boosterInterval: 12,
        species: ['dog'],
        notes: 'Recommended due to Florida climate',
      },
    ],
    rabiesLaw: {
      mandatoryAge: 16,
      revaccinationPeriod: 36,
    },
  },

  // Pennsylvania
  PA: {
    name: 'Pennsylvania',
    requiredVaccinations: [
      {
        name: 'Rabies',
        required: true,
        firstDoseAge: 12,
        boosterInterval: 12,
        subsequentInterval: 36,
        species: ['dog', 'cat'],
        notes: 'Required by 3 P.S. § 455.8',
      },
    ],
    rabiesLaw: {
      mandatoryAge: 12,
      revaccinationPeriod: 36,
    },
  },

  // Ohio
  OH: {
    name: 'Ohio',
    requiredVaccinations: [
      {
        name: 'Rabies',
        required: true,
        firstDoseAge: 12,
        boosterInterval: 12,
        subsequentInterval: 36,
        species: ['dog'],
        notes: 'Required by Ohio Revised Code 955.26',
      },
    ],
    rabiesLaw: {
      mandatoryAge: 12,
      revaccinationPeriod: 36,
    },
  },

  // Illinois
  IL: {
    name: 'Illinois',
    requiredVaccinations: [
      {
        name: 'Rabies',
        required: true,
        firstDoseAge: 16,
        boosterInterval: 12,
        subsequentInterval: 36,
        species: ['dog', 'cat'],
      },
    ],
    rabiesLaw: {
      mandatoryAge: 16,
      revaccinationPeriod: 36,
    },
  },

  // Georgia
  GA: {
    name: 'Georgia',
    requiredVaccinations: [
      {
        name: 'Rabies',
        required: true,
        firstDoseAge: 12,
        boosterInterval: 12,
        subsequentInterval: 36,
        species: ['dog', 'cat', 'ferret'],
        notes: 'Required by O.C.G.A. § 31-19-3',
      },
    ],
    rabiesLaw: {
      mandatoryAge: 12,
      revaccinationPeriod: 36,
    },
  },

  // Colorado
  CO: {
    name: 'Colorado',
    requiredVaccinations: [
      {
        name: 'Rabies',
        required: true,
        firstDoseAge: 16,
        boosterInterval: 12,
        subsequentInterval: 36,
        species: ['dog', 'cat'],
        notes: 'Required by C.R.S. 25-4-607',
      },
    ],
    rabiesLaw: {
      mandatoryAge: 16,
      revaccinationPeriod: 36,
    },
  },

  // Washington
  WA: {
    name: 'Washington',
    requiredVaccinations: [
      {
        name: 'Rabies',
        required: false, // No statewide mandate
        recommended: true,
        firstDoseAge: 16,
        boosterInterval: 12,
        subsequentInterval: 36,
        species: ['dog', 'cat'],
        notes: 'No statewide mandate - check local ordinances',
      },
    ],
    rabiesLaw: {
      mandatoryAge: null,
      notes: 'County-level requirements vary',
    },
  },
};

/**
 * Get vaccination rules for a state
 * @param {string} stateCode - Two-letter state code
 * @returns {object} - State vaccination rules
 */
function getStateRules(stateCode) {
  const code = stateCode?.toUpperCase();
  return STATE_VACCINATION_RULES[code] || STATE_VACCINATION_RULES.DEFAULT;
}

/**
 * Get all supported states
 * @returns {string[]} - List of state codes
 */
function getSupportedStates() {
  return Object.keys(STATE_VACCINATION_RULES).filter(k => k !== 'DEFAULT');
}

/**
 * Check if a pet is compliant with state vaccination requirements
 * @param {object} pet - Pet data
 * @param {object[]} vaccinations - Pet's vaccination records
 * @param {string} stateCode - State code
 * @returns {object} - Compliance status
 */
function checkCompliance(pet, vaccinations, stateCode) {
  const rules = getStateRules(stateCode);
  const species = (pet.species || 'dog').toLowerCase();
  const today = new Date();
  
  const result = {
    compliant: true,
    state: rules.name,
    species,
    issues: [],
    warnings: [],
    vaccinations: [],
  };
  
  // Check each required vaccination
  for (const rule of rules.requiredVaccinations) {
    // Skip if not applicable to this species
    if (rule.species && !rule.species.includes(species)) {
      continue;
    }
    
    // Find matching vaccination(s)
    const matchingVaccs = vaccinations.filter(v => {
      const vaccName = (v.vaccineName || v.vaccine_name || '').toLowerCase();
      const ruleName = rule.name.toLowerCase();
      const aliases = (rule.aliases || []).map(a => a.toLowerCase());
      
      return vaccName.includes(ruleName) || 
             aliases.some(a => vaccName.includes(a));
    });
    
    // Sort by expiration date (most recent first)
    matchingVaccs.sort((a, b) => {
      const dateA = new Date(a.expirationDate || a.expiration_date);
      const dateB = new Date(b.expirationDate || b.expiration_date);
      return dateB - dateA;
    });
    
    const currentVacc = matchingVaccs[0];
    
    const vaccStatus = {
      name: rule.name,
      required: rule.required,
      recommended: rule.recommended,
      currentVaccination: currentVacc ? {
        id: currentVacc.id,
        date: currentVacc.vaccinationDate || currentVacc.vaccination_date,
        expirationDate: currentVacc.expirationDate || currentVacc.expiration_date,
      } : null,
      status: 'missing',
    };
    
    if (currentVacc) {
      const expDate = new Date(currentVacc.expirationDate || currentVacc.expiration_date);
      
      if (expDate < today) {
        vaccStatus.status = 'expired';
        if (rule.required) {
          result.compliant = false;
          result.issues.push({
            type: 'expired',
            vaccination: rule.name,
            expirationDate: expDate.toISOString(),
            message: `${rule.name} vaccination expired on ${expDate.toLocaleDateString()}`,
          });
        } else {
          result.warnings.push({
            type: 'expired_recommended',
            vaccination: rule.name,
            message: `Recommended ${rule.name} vaccination has expired`,
          });
        }
      } else {
        vaccStatus.status = 'valid';
        
        // Check if expiring soon (within 30 days)
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (expDate <= thirtyDaysFromNow) {
          vaccStatus.status = 'expiring_soon';
          result.warnings.push({
            type: 'expiring_soon',
            vaccination: rule.name,
            expirationDate: expDate.toISOString(),
            message: `${rule.name} vaccination expires on ${expDate.toLocaleDateString()}`,
          });
        }
      }
    } else {
      // No vaccination on record
      if (rule.required) {
        result.compliant = false;
        result.issues.push({
          type: 'missing',
          vaccination: rule.name,
          message: `Required ${rule.name} vaccination not on record`,
        });
      } else if (rule.recommended) {
        result.warnings.push({
          type: 'missing_recommended',
          vaccination: rule.name,
          message: `Recommended ${rule.name} vaccination not on record`,
        });
      }
    }
    
    result.vaccinations.push(vaccStatus);
  }
  
  return result;
}

/**
 * Get boarding-specific requirements
 * Many facilities require additional vaccinations beyond state law
 */
function getBoardingRequirements() {
  return {
    name: 'Boarding Facility Requirements',
    description: 'Common vaccination requirements for boarding facilities',
    vaccinations: [
      {
        name: 'Rabies',
        required: true,
        notes: 'Must be current (not expired)',
      },
      {
        name: 'DHPP',
        required: true,
        aliases: ['Distemper', 'DA2PP', 'DA2PPV'],
        notes: 'Must be current, typically annual',
      },
      {
        name: 'Bordetella',
        required: true,
        aliases: ['Kennel Cough'],
        notes: 'Must be current, typically every 6-12 months',
      },
      {
        name: 'Canine Influenza',
        required: false,
        recommended: true,
        aliases: ['Dog Flu', 'H3N2', 'H3N8'],
        notes: 'Recommended, especially for social settings',
      },
    ],
  };
}

/**
 * Calculate when next vaccination is due
 * @param {object} vaccination - Current vaccination record
 * @param {string} stateCode - State code
 * @returns {object} - Next due date info
 */
function calculateNextDueDate(vaccination, stateCode) {
  const rules = getStateRules(stateCode);
  const vaccName = (vaccination.vaccineName || vaccination.vaccine_name || '').toLowerCase();
  
  // Find matching rule
  const rule = rules.requiredVaccinations.find(r => {
    const ruleName = r.name.toLowerCase();
    const aliases = (r.aliases || []).map(a => a.toLowerCase());
    return vaccName.includes(ruleName) || aliases.some(a => vaccName.includes(a));
  });
  
  if (!rule) {
    return { calculated: false, message: 'No rule found for this vaccination' };
  }
  
  const vaccDate = new Date(vaccination.vaccinationDate || vaccination.vaccination_date);
  const expDate = new Date(vaccination.expirationDate || vaccination.expiration_date);
  
  // Use expiration date if available, otherwise calculate based on rule
  if (vaccination.expirationDate || vaccination.expiration_date) {
    return {
      calculated: true,
      dueDate: expDate.toISOString(),
      source: 'from_record',
      rule: rule.name,
    };
  }
  
  // Calculate based on interval
  const intervalMonths = rule.subsequentInterval || rule.boosterInterval;
  const nextDue = new Date(vaccDate);
  nextDue.setMonth(nextDue.getMonth() + intervalMonths);
  
  return {
    calculated: true,
    dueDate: nextDue.toISOString(),
    source: 'calculated',
    intervalMonths,
    rule: rule.name,
  };
}

module.exports = {
  STATE_VACCINATION_RULES,
  getStateRules,
  getSupportedStates,
  checkCompliance,
  getBoardingRequirements,
  calculateNextDueDate,
};

