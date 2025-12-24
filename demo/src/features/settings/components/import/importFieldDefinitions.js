/**
 * Field definitions for import mapping - HubSpot Style
 *
 * KEY CONCEPTS:
 * 1. ENTITY_TYPES - Define fields for each object type
 * 2. REQUIRED_FIELDS - Fields required when CREATING records of that type
 * 3. UNIQUE_IDENTIFIERS - Fields that can be used to FIND existing records for associations
 * 4. ASSOCIATIONS - What objects can link to what other objects
 */

// ============================================================================
// REQUIRED FIELDS - Only needed when CREATING records of that type
// ============================================================================
export const REQUIRED_FIELDS = {
  owners: ['email'], // first_name, last_name are optional for import (can be populated later)
  pets: ['name'],
  bookings: ['start_date', 'end_date'],
  services: ['name'],
  staff: ['email'],
  invoices: ['total'],
  vaccinations: ['vaccine_name', 'administered_date'],
};

// ============================================================================
// UNIQUE IDENTIFIERS - Fields that can identify existing records for associations
// ============================================================================
export const UNIQUE_IDENTIFIERS = {
  owners: [
    { key: 'email', label: 'Email' },
    { key: 'id', label: 'Record ID' },
    { key: 'phone', label: 'Phone' },
  ],
  pets: [
    { key: 'id', label: 'Record ID' },
    { key: 'name', label: 'Name' }, // Note: May need owner context for uniqueness
  ],
  bookings: [
    { key: 'id', label: 'Record ID' },
  ],
  services: [
    { key: 'name', label: 'Name' },
    { key: 'id', label: 'Record ID' },
  ],
  staff: [
    { key: 'email', label: 'Email' },
    { key: 'id', label: 'Record ID' },
  ],
  invoices: [
    { key: 'id', label: 'Record ID' },
    { key: 'invoice_number', label: 'Invoice Number' },
  ],
  vaccinations: [
    { key: 'id', label: 'Record ID' },
  ],
};

// ============================================================================
// ASSOCIATIONS - What objects can be linked to what
// When importing TYPE X, you can create associations to these other types
// ============================================================================
export const ASSOCIATIONS = {
  owners: [], // Owners don't associate TO anything, things associate TO owners
  pets: ['owners'], // Pets can be associated to existing Owners
  bookings: ['owners', 'pets', 'services', 'staff'],
  services: [], // Standalone
  staff: [], // Standalone
  invoices: ['owners', 'bookings'],
  vaccinations: ['pets'],
};

// ============================================================================
// ENTITY TYPES - Full field definitions
// ============================================================================
export const ENTITY_TYPES = {
  owners: {
    id: 'owners',
    label: 'Owners',
    labelSingular: 'Owner',
    description: 'Pet parents and their contact information',
    icon: 'Users',
    fields: [
      { key: 'first_name', label: 'First Name', aliases: ['firstname', 'first', 'fname', 'given_name'] },
      { key: 'last_name', label: 'Last Name', aliases: ['lastname', 'last', 'lname', 'surname', 'family_name'] },
      { key: 'email', label: 'Email', aliases: ['email_address', 'e-mail', 'mail'] },
      { key: 'phone', label: 'Phone', aliases: ['phone_number', 'telephone', 'mobile', 'cell', 'contact_number'] },
      { key: 'address_street', label: 'Street Address', aliases: ['address', 'street', 'street_address', 'address1', 'address_line1'] },
      { key: 'address_city', label: 'City', aliases: ['city', 'town', 'municipality'] },
      { key: 'address_state', label: 'State/Province', aliases: ['state', 'province', 'region', 'state_province'] },
      { key: 'address_zip', label: 'Postal Code', aliases: ['zip', 'zipcode', 'zip_code', 'postcode', 'postal_code'] },
      { key: 'address_country', label: 'Country', aliases: ['country'] },
      { key: 'emergency_contact_name', label: 'Emergency Contact Name', aliases: ['emergency_name', 'alt_contact'] },
      { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', aliases: ['emergency_phone', 'alt_phone'] },
      { key: 'notes', label: 'Notes', aliases: ['comments', 'remarks', 'owner_notes'] },
      { key: 'is_active', label: 'Active', aliases: ['status', 'active', 'owner_status', 'account_status'] },
    ],
  },
  pets: {
    id: 'pets',
    label: 'Pets',
    labelSingular: 'Pet',
    description: 'Animals in your care with medical and behavior info',
    icon: 'PawPrint',
    fields: [
      { key: 'name', label: 'Pet Name', aliases: ['pet_name', 'animal_name'] },
      { key: 'species', label: 'Species', aliases: ['animal_type', 'type', 'pet_type'] },
      { key: 'breed', label: 'Breed', aliases: ['pet_breed', 'animal_breed'] },
      { key: 'gender', label: 'Gender', aliases: ['sex'] },
      { key: 'color', label: 'Color', aliases: ['coat_color', 'fur_color'] },
      { key: 'weight', label: 'Weight', aliases: ['pet_weight', 'weight_lbs', 'weight_kg'] },
      { key: 'date_of_birth', label: 'Date of Birth', aliases: ['dob', 'birth_date', 'birthday', 'birthdate'] },
      { key: 'microchip_number', label: 'Microchip Number', aliases: ['microchip', 'chip_number', 'chip_id'] },
      { key: 'medical_notes', label: 'Medical Notes', aliases: ['health_notes', 'medical_info', 'health_info'] },
      { key: 'dietary_notes', label: 'Dietary Notes', aliases: ['diet', 'food_notes', 'feeding_notes'] },
      { key: 'behavior_notes', label: 'Behavior Notes', aliases: ['behavior', 'temperament', 'personality'] },
      { key: 'is_spayed_neutered', label: 'Spayed/Neutered', aliases: ['fixed', 'altered', 'neutered', 'spayed'] },
      { key: 'status', label: 'Status', aliases: ['pet_status'] },
    ],
  },
  bookings: {
    id: 'bookings',
    label: 'Bookings',
    labelSingular: 'Booking',
    description: 'Reservations for boarding, daycare, grooming',
    icon: 'Calendar',
    fields: [
      { key: 'start_date', label: 'Start Date', aliases: ['check_in', 'checkin', 'arrival', 'from_date', 'start'] },
      { key: 'end_date', label: 'End Date', aliases: ['check_out', 'checkout', 'departure', 'to_date', 'end'] },
      { key: 'service_type', label: 'Service Type', aliases: ['type', 'booking_type', 'service'] },
      { key: 'kennel_name', label: 'Kennel/Room', aliases: ['kennel', 'room', 'unit', 'accommodation'] },
      { key: 'status', label: 'Status', aliases: ['booking_status', 'reservation_status'] },
      { key: 'notes', label: 'Notes', aliases: ['booking_notes', 'special_requests', 'comments'] },
      { key: 'total_amount', label: 'Total Amount', aliases: ['total', 'price', 'cost', 'amount'] },
    ],
  },
  services: {
    id: 'services',
    label: 'Services',
    labelSingular: 'Service',
    description: 'Service types you offer (boarding, grooming, etc.)',
    icon: 'Scissors',
    fields: [
      { key: 'name', label: 'Service Name', aliases: ['service_name', 'title'] },
      { key: 'description', label: 'Description', aliases: ['details', 'info'] },
      { key: 'category', label: 'Category', aliases: ['service_category', 'type'] },
      { key: 'price', label: 'Price', aliases: ['cost', 'rate', 'amount', 'fee'] },
      { key: 'duration_minutes', label: 'Duration (minutes)', aliases: ['duration', 'time', 'length'] },
      { key: 'is_active', label: 'Active', aliases: ['active', 'enabled', 'available'] },
    ],
  },
  staff: {
    id: 'staff',
    label: 'Staff',
    labelSingular: 'Staff Member',
    description: 'Your team members',
    icon: 'BadgeCheck',
    fields: [
      { key: 'first_name', label: 'First Name', aliases: ['firstname', 'fname'] },
      { key: 'last_name', label: 'Last Name', aliases: ['lastname', 'lname'] },
      { key: 'email', label: 'Email', aliases: ['email_address', 'work_email'] },
      { key: 'phone', label: 'Phone', aliases: ['phone_number', 'mobile'] },
      { key: 'role', label: 'Role', aliases: ['position', 'job_title', 'title'] },
      { key: 'hire_date', label: 'Hire Date', aliases: ['start_date', 'joined'] },
      { key: 'is_active', label: 'Active', aliases: ['active', 'employed', 'status'] },
    ],
  },
  invoices: {
    id: 'invoices',
    label: 'Invoices',
    labelSingular: 'Invoice',
    description: 'Billing records and payments',
    icon: 'Receipt',
    fields: [
      { key: 'invoice_number', label: 'Invoice Number', aliases: ['invoice_id', 'number', 'id'] },
      { key: 'invoice_date', label: 'Invoice Date', aliases: ['date', 'created_date', 'issue_date'] },
      { key: 'due_date', label: 'Due Date', aliases: ['payment_due', 'due'] },
      { key: 'subtotal', label: 'Subtotal', aliases: ['sub_total'] },
      { key: 'tax', label: 'Tax', aliases: ['tax_amount', 'vat'] },
      { key: 'total', label: 'Total', aliases: ['total_amount', 'amount', 'grand_total'] },
      { key: 'status', label: 'Status', aliases: ['payment_status', 'invoice_status'] },
      { key: 'notes', label: 'Notes', aliases: ['description', 'memo'] },
    ],
  },
  vaccinations: {
    id: 'vaccinations',
    label: 'Vaccinations',
    labelSingular: 'Vaccination',
    description: 'Pet vaccination records',
    icon: 'Syringe',
    fields: [
      { key: 'vaccine_name', label: 'Vaccine Name', aliases: ['vaccine', 'vaccination', 'shot', 'name'] },
      { key: 'administered_date', label: 'Date Administered', aliases: ['date', 'given_date', 'shot_date', 'vaccination_date'] },
      { key: 'expiration_date', label: 'Expiration Date', aliases: ['expires', 'expiry', 'valid_until', 'due_date'] },
      { key: 'administered_by', label: 'Administered By', aliases: ['vet', 'veterinarian', 'provider', 'clinic'] },
      { key: 'batch_number', label: 'Batch/Lot Number', aliases: ['lot_number', 'batch', 'lot'] },
      { key: 'notes', label: 'Notes', aliases: ['comments', 'remarks'] },
    ],
  },
};

// ============================================================================
// ASSOCIATION RULES - What can be imported together in one file
// ============================================================================
export const ASSOCIATION_RULES = {
  owners: ['pets', 'bookings'],
  pets: ['owners', 'bookings', 'vaccinations'],
  bookings: ['owners', 'pets', 'services', 'staff'],
  vaccinations: ['pets'],
  services: ['bookings'],
  staff: ['bookings'],
  invoices: [], // Standalone only
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get entities that can be associated with already selected types
 */
export function getAssociableEntities(selectedTypes) {
  if (selectedTypes.length === 0) {
    return Object.keys(ENTITY_TYPES);
  }

  if (selectedTypes.length >= 2) {
    return selectedTypes;
  }

  const firstType = selectedTypes[0];
  const canAssociate = ASSOCIATION_RULES[firstType] || [];
  return [firstType, ...canAssociate];
}

/**
 * Get tooltip message for why an entity is disabled
 */
export function getDisabledTooltip(entityId, selectedTypes) {
  if (selectedTypes.length === 0) return null;
  if (selectedTypes.length >= 2 && !selectedTypes.includes(entityId)) {
    return 'Maximum of 2 object types per import. Use separate files for additional types.';
  }

  const firstType = selectedTypes[0];
  const firstLabel = ENTITY_TYPES[firstType]?.label || firstType;
  return `Cannot be associated with ${firstLabel} in the same import`;
}

/**
 * Get "Import As" dropdown options based on selected entity types
 *
 * @param {string[]} selectedTypes - Currently selected entity types
 * @param {string} primaryType - The primary (first) selected type
 * @returns {Array} Options for the "Import As" dropdown
 */
export function getImportAsOptions(selectedTypes, primaryType) {
  const options = [];

  // Add property options for each selected type
  selectedTypes.forEach(type => {
    const entity = ENTITY_TYPES[type];
    if (entity) {
      options.push({
        value: `${type}_properties`,
        label: `${entity.labelSingular || entity.label} properties`,
        entityType: type,
      });
    }
  });

  // Add Association option if there are associable types for the primary
  const associableTypes = ASSOCIATIONS[primaryType] || [];
  if (associableTypes.length > 0) {
    options.push({
      value: 'association',
      label: 'Association',
      isAssociation: true,
    });
  }

  // Always add "Don't import column"
  options.push({
    value: 'skip',
    label: "Don't import column",
    isSkip: true,
  });

  return options;
}

/**
 * Get association property options when "Association" is selected
 * Shows unique identifiers of objects that the primary type can associate TO
 *
 * @param {string} primaryType - The primary entity type being imported
 * @returns {Array} Options showing unique identifiers of associable objects
 */
export function getAssociationPropertyOptions(primaryType) {
  const associableTypes = ASSOCIATIONS[primaryType] || [];
  const options = [];

  associableTypes.forEach(assocType => {
    const entity = ENTITY_TYPES[assocType];
    const identifiers = UNIQUE_IDENTIFIERS[assocType] || [];

    identifiers.forEach(identifier => {
      options.push({
        value: `${assocType}.${identifier.key}`,
        label: `${identifier.label} (${entity?.labelSingular || entity?.label || assocType})`,
        entityType: assocType,
        field: identifier.key,
      });
    });
  });

  return options;
}

/**
 * Get property options for a specific entity type
 *
 * @param {string} entityType - The entity type
 * @returns {Array} Field options for the dropdown
 */
export function getPropertyOptions(entityType) {
  const entity = ENTITY_TYPES[entityType];
  if (!entity) return [];

  return entity.fields.map(field => ({
    value: field.key,
    label: field.label,
    field: field.key,
  }));
}

/**
 * Auto-map columns based on field aliases
 * Returns the NEW mapping structure: { csvHeader: { importAs, property, entityType } }
 */
export function autoMapColumns(headers, selectedTypes) {
  const mappings = {};
  const primaryType = selectedTypes[0];

  const normalizeHeader = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

  // Collect all association keywords for detection
  const associationKeywords = {
    owners: ['owner', 'owner_email', 'parent', 'customer', 'client'],
    pets: ['pet', 'pet_name', 'animal'],
    services: ['service', 'service_name', 'service_type'],
    staff: ['staff', 'staff_email', 'employee', 'caregiver'],
  };

  headers.forEach((header) => {
    const normalized = normalizeHeader(header);
    let matched = false;

    // First, check if this looks like an association field
    // (e.g., owner_email when importing pets)
    for (const [assocType, keywords] of Object.entries(associationKeywords)) {
      if (matched) break;
      if (!selectedTypes.includes(assocType) && ASSOCIATIONS[primaryType]?.includes(assocType)) {
        // This is an associable type that's NOT being created in this import
        for (const keyword of keywords) {
          if (normalized.includes(keyword.replace(/_/g, ''))) {
            // Check if this matches a unique identifier
            const identifiers = UNIQUE_IDENTIFIERS[assocType] || [];
            for (const identifier of identifiers) {
              if (normalized.includes(identifier.key) ||
                  (identifier.key === 'email' && normalized.includes('email')) ||
                  (identifier.key === 'name' && normalized.includes('name'))) {
                mappings[header] = {
                  importAs: 'association',
                  property: `${assocType}.${identifier.key}`,
                  entityType: assocType,
                  field: identifier.key,
                };
                matched = true;
                break;
              }
            }
            if (matched) break;
          }
        }
      }
    }

    if (matched) return;

    // Then check regular fields for each selected type
    for (const type of selectedTypes) {
      if (matched) break;
      const entity = ENTITY_TYPES[type];
      if (!entity) continue;

      for (const field of entity.fields) {
        // Exact match on key
        if (normalized === field.key.replace(/_/g, '')) {
          mappings[header] = {
            importAs: `${type}_properties`,
            property: field.key,
            entityType: type,
            field: field.key,
          };
          matched = true;
          break;
        }

        // Check aliases
        if (field.aliases?.some(alias => normalizeHeader(alias) === normalized)) {
          mappings[header] = {
            importAs: `${type}_properties`,
            property: field.key,
            entityType: type,
            field: field.key,
          };
          matched = true;
          break;
        }
      }
    }
  });

  return mappings;
}

/**
 * Get required fields that are not yet mapped for the PRIMARY object type only
 *
 * IMPORTANT: This only checks the primary type, not association types.
 * When importing Pets, we only require Pet fields, not Owner fields.
 *
 * @param {Object} mappings - Current mappings { csvHeader: { importAs, property, entityType } }
 * @param {string[]} selectedTypes - Selected entity types
 * @returns {Array} Unmapped required fields for the primary type
 */
export function getUnmappedRequiredFields(mappings, selectedTypes) {
  if (!selectedTypes || selectedTypes.length === 0) return [];

  const primaryType = selectedTypes[0];
  const entity = ENTITY_TYPES[primaryType];
  if (!entity) return [];

  const required = REQUIRED_FIELDS[primaryType] || [];

  // Get all fields mapped as properties of the primary type
  const mappedFields = new Set();
  Object.values(mappings).forEach(mapping => {
    if (mapping.importAs === `${primaryType}_properties` && mapping.field) {
      mappedFields.add(mapping.field);
    }
  });

  // Find required fields that aren't mapped
  return required
    .filter(fieldKey => !mappedFields.has(fieldKey))
    .map(fieldKey => {
      const field = entity.fields.find(f => f.key === fieldKey);
      return { key: fieldKey, label: field?.label || fieldKey };
    });
}

/**
 * Validate mappings - only validates required fields for PRIMARY type
 */
export function validateMappings(mappings, selectedTypes) {
  const unmappedRequired = getUnmappedRequiredFields(mappings, selectedTypes);

  return {
    isValid: unmappedRequired.length === 0,
    errors: unmappedRequired.map(f => `Required field "${f.label}" is not mapped`),
    warnings: [],
  };
}

/**
 * Get statistics about current mappings
 */
export function getMappingStats(mappings, selectedTypes) {
  const primaryType = selectedTypes[0];
  let propertyCount = 0;
  let associationCount = 0;
  let skippedCount = 0;

  Object.values(mappings).forEach(mapping => {
    if (!mapping || mapping.importAs === 'skip') {
      skippedCount++;
    } else if (mapping.importAs === 'association') {
      associationCount++;
    } else {
      propertyCount++;
    }
  });

  const unmappedRequired = getUnmappedRequiredFields(mappings, selectedTypes);

  return {
    propertyCount,
    associationCount,
    skippedCount,
    unmappedCount: Object.keys(mappings).length === 0 ? 0 : skippedCount,
    requiredMissing: unmappedRequired.length,
    isValid: unmappedRequired.length === 0,
  };
}

/**
 * Transform row data based on mappings
 * Separates properties from associations
 */
export function transformRowWithMappings(row, mappings, primaryType) {
  const record = {};
  const associations = [];

  Object.entries(mappings).forEach(([header, mapping]) => {
    if (!mapping || mapping.importAs === 'skip') return;

    const value = row[header];
    if (value === undefined || value === null || value === '') return;

    if (mapping.importAs === 'association') {
      // This is an association lookup
      associations.push({
        type: mapping.entityType,
        field: mapping.field,
        value: value,
      });
    } else if (mapping.importAs === `${primaryType}_properties`) {
      // This is a property of the primary record
      record[mapping.field] = value;
    }
    // For multi-object imports, handle secondary type properties separately
  });

  return { record, associations };
}
