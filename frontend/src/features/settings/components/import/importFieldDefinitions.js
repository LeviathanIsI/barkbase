/**
 * Field definitions for import mapping
 * Defines required/optional fields and auto-mapping aliases for each entity type
 */

export const ENTITY_TYPES = {
  owners: {
    id: 'owners',
    label: 'Owners',
    description: 'Pet owners and their contact information',
    icon: 'Users',
    fields: [
      { key: 'first_name', label: 'First Name', required: true, aliases: ['firstname', 'first', 'fname', 'given_name'] },
      { key: 'last_name', label: 'Last Name', required: true, aliases: ['lastname', 'last', 'lname', 'surname', 'family_name'] },
      { key: 'email', label: 'Email', required: true, aliases: ['email_address', 'e-mail', 'mail'] },
      { key: 'phone', label: 'Phone', required: false, aliases: ['phone_number', 'telephone', 'mobile', 'cell', 'contact_number'] },
      { key: 'address_line1', label: 'Address Line 1', required: false, aliases: ['address', 'street', 'street_address', 'address1'] },
      { key: 'address_line2', label: 'Address Line 2', required: false, aliases: ['address2', 'apt', 'suite', 'unit'] },
      { key: 'city', label: 'City', required: false, aliases: ['town', 'municipality'] },
      { key: 'state', label: 'State/Province', required: false, aliases: ['province', 'region', 'state_province'] },
      { key: 'postal_code', label: 'Postal Code', required: false, aliases: ['zip', 'zipcode', 'zip_code', 'postcode'] },
      { key: 'country', label: 'Country', required: false, aliases: [] },
      { key: 'emergency_contact_name', label: 'Emergency Contact Name', required: false, aliases: ['emergency_name', 'alt_contact'] },
      { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', required: false, aliases: ['emergency_phone', 'alt_phone'] },
      { key: 'notes', label: 'Notes', required: false, aliases: ['comments', 'remarks', 'owner_notes'] },
      { key: 'status', label: 'Status', required: false, aliases: ['owner_status', 'account_status'] },
    ],
  },
  pets: {
    id: 'pets',
    label: 'Pets',
    description: 'Pet profiles with breed, weight, and medical info',
    icon: 'PawPrint',
    fields: [
      { key: 'name', label: 'Pet Name', required: true, aliases: ['pet_name', 'animal_name'] },
      { key: 'species', label: 'Species', required: true, aliases: ['animal_type', 'type', 'pet_type'] },
      { key: 'breed', label: 'Breed', required: false, aliases: ['pet_breed', 'animal_breed'] },
      { key: 'gender', label: 'Gender', required: false, aliases: ['sex'] },
      { key: 'color', label: 'Color', required: false, aliases: ['coat_color', 'fur_color'] },
      { key: 'weight', label: 'Weight', required: false, aliases: ['pet_weight', 'weight_lbs', 'weight_kg'] },
      { key: 'date_of_birth', label: 'Date of Birth', required: false, aliases: ['dob', 'birth_date', 'birthday', 'birthdate'] },
      { key: 'microchip_number', label: 'Microchip Number', required: false, aliases: ['microchip', 'chip_number', 'chip_id'] },
      { key: 'owner_email', label: 'Owner Email', required: false, aliases: ['owner', 'parent_email', 'customer_email'] },
      { key: 'medical_notes', label: 'Medical Notes', required: false, aliases: ['health_notes', 'medical_info', 'health_info'] },
      { key: 'dietary_notes', label: 'Dietary Notes', required: false, aliases: ['diet', 'food_notes', 'feeding_notes'] },
      { key: 'behavior_notes', label: 'Behavior Notes', required: false, aliases: ['behavior', 'temperament', 'personality'] },
      { key: 'is_spayed_neutered', label: 'Spayed/Neutered', required: false, aliases: ['fixed', 'altered', 'neutered', 'spayed'] },
      { key: 'status', label: 'Status', required: false, aliases: ['pet_status'] },
    ],
  },
  bookings: {
    id: 'bookings',
    label: 'Bookings',
    description: 'Reservations for boarding, daycare, and grooming',
    icon: 'Calendar',
    fields: [
      { key: 'pet_name', label: 'Pet Name', required: true, aliases: ['pet', 'animal_name'] },
      { key: 'owner_email', label: 'Owner Email', required: true, aliases: ['owner', 'customer_email', 'client_email'] },
      { key: 'start_date', label: 'Start Date', required: true, aliases: ['check_in', 'checkin', 'arrival', 'from_date', 'start'] },
      { key: 'end_date', label: 'End Date', required: true, aliases: ['check_out', 'checkout', 'departure', 'to_date', 'end'] },
      { key: 'service_type', label: 'Service Type', required: false, aliases: ['type', 'booking_type', 'service'] },
      { key: 'kennel_name', label: 'Kennel/Room', required: false, aliases: ['kennel', 'room', 'unit', 'accommodation'] },
      { key: 'status', label: 'Status', required: false, aliases: ['booking_status', 'reservation_status'] },
      { key: 'notes', label: 'Notes', required: false, aliases: ['booking_notes', 'special_requests', 'comments'] },
      { key: 'total_amount', label: 'Total Amount', required: false, aliases: ['total', 'price', 'cost', 'amount'] },
    ],
  },
  services: {
    id: 'services',
    label: 'Services',
    description: 'Service offerings like grooming, training, and add-ons',
    icon: 'Scissors',
    fields: [
      { key: 'name', label: 'Service Name', required: true, aliases: ['service_name', 'title'] },
      { key: 'description', label: 'Description', required: false, aliases: ['details', 'info'] },
      { key: 'category', label: 'Category', required: false, aliases: ['service_category', 'type'] },
      { key: 'price', label: 'Price', required: false, aliases: ['cost', 'rate', 'amount', 'fee'] },
      { key: 'duration_minutes', label: 'Duration (minutes)', required: false, aliases: ['duration', 'time', 'length'] },
      { key: 'is_active', label: 'Active', required: false, aliases: ['active', 'enabled', 'available'] },
    ],
  },
  staff: {
    id: 'staff',
    label: 'Staff',
    description: 'Team members and their roles',
    icon: 'BadgeCheck',
    fields: [
      { key: 'first_name', label: 'First Name', required: true, aliases: ['firstname', 'fname'] },
      { key: 'last_name', label: 'Last Name', required: true, aliases: ['lastname', 'lname'] },
      { key: 'email', label: 'Email', required: true, aliases: ['email_address', 'work_email'] },
      { key: 'phone', label: 'Phone', required: false, aliases: ['phone_number', 'mobile'] },
      { key: 'role', label: 'Role', required: false, aliases: ['position', 'job_title', 'title'] },
      { key: 'hire_date', label: 'Hire Date', required: false, aliases: ['start_date', 'joined'] },
      { key: 'is_active', label: 'Active', required: false, aliases: ['active', 'employed', 'status'] },
    ],
  },
  invoices: {
    id: 'invoices',
    label: 'Invoices',
    description: 'Billing records and payment history',
    icon: 'Receipt',
    fields: [
      { key: 'owner_email', label: 'Owner Email', required: true, aliases: ['customer_email', 'client_email', 'email'] },
      { key: 'invoice_number', label: 'Invoice Number', required: false, aliases: ['invoice_id', 'number', 'id'] },
      { key: 'invoice_date', label: 'Invoice Date', required: true, aliases: ['date', 'created_date', 'issue_date'] },
      { key: 'due_date', label: 'Due Date', required: false, aliases: ['payment_due', 'due'] },
      { key: 'subtotal', label: 'Subtotal', required: false, aliases: ['sub_total'] },
      { key: 'tax', label: 'Tax', required: false, aliases: ['tax_amount', 'vat'] },
      { key: 'total', label: 'Total', required: true, aliases: ['total_amount', 'amount', 'grand_total'] },
      { key: 'status', label: 'Status', required: false, aliases: ['payment_status', 'invoice_status'] },
      { key: 'notes', label: 'Notes', required: false, aliases: ['description', 'memo'] },
    ],
  },
  vaccinations: {
    id: 'vaccinations',
    label: 'Vaccinations',
    description: 'Vaccination records and expiration dates',
    icon: 'Syringe',
    fields: [
      { key: 'pet_name', label: 'Pet Name', required: true, aliases: ['pet', 'animal_name'] },
      { key: 'owner_email', label: 'Owner Email', required: false, aliases: ['owner', 'customer_email'] },
      { key: 'vaccine_name', label: 'Vaccine Name', required: true, aliases: ['vaccine', 'vaccination', 'shot', 'name'] },
      { key: 'administered_date', label: 'Date Administered', required: true, aliases: ['date', 'given_date', 'shot_date', 'vaccination_date'] },
      { key: 'expiration_date', label: 'Expiration Date', required: true, aliases: ['expires', 'expiry', 'valid_until', 'due_date'] },
      { key: 'administered_by', label: 'Administered By', required: false, aliases: ['vet', 'veterinarian', 'provider', 'clinic'] },
      { key: 'batch_number', label: 'Batch/Lot Number', required: false, aliases: ['lot_number', 'batch', 'lot'] },
      { key: 'notes', label: 'Notes', required: false, aliases: ['comments', 'remarks'] },
    ],
  },
};

/**
 * Auto-map columns based on field aliases
 */
export function autoMapColumns(headers, entityType) {
  const entity = ENTITY_TYPES[entityType];
  if (!entity) return {};

  const mappings = {};
  const normalizeHeader = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

  headers.forEach((header) => {
    const normalized = normalizeHeader(header);

    // Check each field for a match
    for (const field of entity.fields) {
      // Exact match on key
      if (normalized === field.key) {
        mappings[header] = field.key;
        break;
      }

      // Check aliases
      if (field.aliases.some(alias => normalizeHeader(alias) === normalized)) {
        mappings[header] = field.key;
        break;
      }

      // Partial match (header contains field name)
      if (normalized.includes(field.key.replace(/_/g, '')) ||
          field.key.replace(/_/g, '').includes(normalized)) {
        if (!mappings[header]) {
          mappings[header] = field.key;
        }
      }
    }
  });

  return mappings;
}

/**
 * Get required fields that are not yet mapped
 */
export function getUnmappedRequiredFields(mappings, entityType) {
  const entity = ENTITY_TYPES[entityType];
  if (!entity) return [];

  const mappedFields = new Set(Object.values(mappings));
  return entity.fields.filter(f => f.required && !mappedFields.has(f.key));
}

/**
 * Validate mappings for an entity type
 */
export function validateMappings(mappings, entityType) {
  const unmappedRequired = getUnmappedRequiredFields(mappings, entityType);

  return {
    isValid: unmappedRequired.length === 0,
    errors: unmappedRequired.map(f => `Required field "${f.label}" is not mapped`),
    warnings: [],
  };
}
