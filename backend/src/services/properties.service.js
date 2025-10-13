/**
 * Properties Service
 * Manages property definitions for BarkBase objects (Pets, Owners, Bookings, etc.)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// System property definitions for each object type
// These correspond to the actual database columns in Prisma schema
const SYSTEM_PROPERTIES = {
  pets: [
    {
      id: 'pet_id',
      name: 'id',
      label: 'Record ID',
      type: 'uuid',
      group: 'identification',
      required: true,
      system: true,
      description: 'Unique record identifier',
    },
    {
      id: 'pet_name',
      name: 'name',
      label: 'Name',
      type: 'string',
      group: 'basic_info',
      required: true,
      system: true,
      description: 'Pet\'s name',
    },
    {
      id: 'pet_breed',
      name: 'breed',
      label: 'Breed',
      type: 'string',
      group: 'basic_info',
      required: false,
      system: true,
      description: 'Pet\'s breed',
    },
    {
      id: 'pet_birthdate',
      name: 'birthdate',
      label: 'Birthdate',
      type: 'date',
      group: 'basic_info',
      required: false,
      system: true,
      description: 'Pet\'s date of birth',
    },
    {
      id: 'pet_photo_url',
      name: 'photo_url',
      label: 'Photo',
      type: 'url',
      group: 'basic_info',
      required: false,
      system: true,
      description: 'Pet\'s photo URL',
    },
    {
      id: 'pet_medical_notes',
      name: 'medical_notes',
      label: 'Medical Notes',
      type: 'text',
      group: 'medical',
      required: false,
      system: true,
      description: 'Medical history and notes',
    },
    {
      id: 'pet_dietary_notes',
      name: 'dietary_notes',
      label: 'Dietary Notes',
      type: 'text',
      group: 'medical',
      required: false,
      system: true,
      description: 'Dietary restrictions and preferences',
    },
    {
      id: 'pet_behavior_flags',
      name: 'behavior_flags',
      label: 'Behavior Flags',
      type: 'multi_enum',
      group: 'basic_info',
      required: false,
      system: true,
      description: 'Behavioral characteristics and flags',
    },
    {
      id: 'pet_status',
      name: 'status',
      label: 'Status',
      type: 'enum',
      group: 'status',
      required: true,
      system: true,
      description: 'Pet status (active, inactive, etc.)',
      options: {
        choices: ['active', 'inactive', 'archived'],
      },
    },
    {
      id: 'pet_created_at',
      name: 'created_at',
      label: 'Created At',
      type: 'datetime',
      group: 'status',
      required: true,
      system: true,
      description: 'Record creation timestamp',
    },
    {
      id: 'pet_updated_at',
      name: 'updated_at',
      label: 'Last Updated',
      type: 'datetime',
      group: 'status',
      required: true,
      system: true,
      description: 'Last modification timestamp',
    },
  ],
  owners: [
    {
      id: 'owner_id',
      name: 'id',
      label: 'Record ID',
      type: 'uuid',
      group: 'identification',
      required: true,
      system: true,
      description: 'Unique record identifier',
    },
    {
      id: 'owner_first_name',
      name: 'first_name',
      label: 'First Name',
      type: 'string',
      group: 'basic_info',
      required: true,
      system: true,
      description: 'Owner\'s first name',
    },
    {
      id: 'owner_last_name',
      name: 'last_name',
      label: 'Last Name',
      type: 'string',
      group: 'basic_info',
      required: true,
      system: true,
      description: 'Owner\'s last name',
    },
    {
      id: 'owner_email',
      name: 'email',
      label: 'Email',
      type: 'email',
      group: 'contact_info',
      required: false,
      system: true,
      description: 'Owner\'s email address',
    },
    {
      id: 'owner_phone',
      name: 'phone',
      label: 'Phone',
      type: 'phone',
      group: 'contact_info',
      required: false,
      system: true,
      description: 'Owner\'s phone number',
    },
    {
      id: 'owner_address',
      name: 'address',
      label: 'Address',
      type: 'text',
      group: 'contact_info',
      required: false,
      system: true,
      description: 'Owner\'s address',
    },
    {
      id: 'owner_created_at',
      name: 'created_at',
      label: 'Created At',
      type: 'datetime',
      group: 'status',
      required: true,
      system: true,
      description: 'Record creation timestamp',
    },
    {
      id: 'owner_updated_at',
      name: 'updated_at',
      label: 'Last Updated',
      type: 'datetime',
      group: 'status',
      required: true,
      system: true,
      description: 'Last modification timestamp',
    },
  ],
  bookings: [
    {
      id: 'booking_id',
      name: 'id',
      label: 'Record ID',
      type: 'uuid',
      group: 'identification',
      required: true,
      system: true,
      description: 'Unique record identifier',
    },
    {
      id: 'booking_status',
      name: 'status',
      label: 'Status',
      type: 'enum',
      group: 'status',
      required: true,
      system: true,
      description: 'Booking status',
      options: {
        choices: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED'],
      },
    },
    {
      id: 'booking_check_in',
      name: 'check_in',
      label: 'Check In',
      type: 'datetime',
      group: 'basic_info',
      required: true,
      system: true,
      description: 'Check-in date and time',
    },
    {
      id: 'booking_check_out',
      name: 'check_out',
      label: 'Check Out',
      type: 'datetime',
      group: 'basic_info',
      required: true,
      system: true,
      description: 'Check-out date and time',
    },
    {
      id: 'booking_deposit_cents',
      name: 'deposit_cents',
      label: 'Deposit',
      type: 'currency',
      group: 'financial',
      required: false,
      system: true,
      description: 'Deposit amount in cents',
    },
    {
      id: 'booking_total_cents',
      name: 'total_cents',
      label: 'Total',
      type: 'currency',
      group: 'financial',
      required: false,
      system: true,
      description: 'Total amount in cents',
    },
    {
      id: 'booking_balance_due_cents',
      name: 'balance_due_cents',
      label: 'Balance Due',
      type: 'currency',
      group: 'financial',
      required: false,
      system: true,
      description: 'Balance due in cents',
    },
    {
      id: 'booking_notes',
      name: 'notes',
      label: 'Notes',
      type: 'text',
      group: 'notes',
      required: false,
      system: true,
      description: 'General booking notes',
    },
    {
      id: 'booking_special_instructions',
      name: 'special_instructions',
      label: 'Special Instructions',
      type: 'text',
      group: 'notes',
      required: false,
      system: true,
      description: 'Special care instructions',
    },
    {
      id: 'booking_source',
      name: 'source',
      label: 'Source',
      type: 'enum',
      group: 'status',
      required: false,
      system: true,
      description: 'Booking source',
      options: {
        choices: ['portal', 'phone', 'walk-in', 'website'],
      },
    },
    {
      id: 'booking_created_at',
      name: 'created_at',
      label: 'Created At',
      type: 'datetime',
      group: 'status',
      required: true,
      system: true,
      description: 'Record creation timestamp',
    },
    {
      id: 'booking_updated_at',
      name: 'updated_at',
      label: 'Last Updated',
      type: 'datetime',
      group: 'status',
      required: true,
      system: true,
      description: 'Last modification timestamp',
    },
  ],
  invoices: [
    {
      id: 'invoice_id',
      name: 'id',
      label: 'Record ID',
      type: 'uuid',
      group: 'identification',
      required: true,
      system: true,
      description: 'Unique record identifier',
    },
    {
      id: 'invoice_created_at',
      name: 'created_at',
      label: 'Created At',
      type: 'datetime',
      group: 'status',
      required: true,
      system: true,
      description: 'Invoice creation date',
    },
  ],
  payments: [
    {
      id: 'payment_id',
      name: 'id',
      label: 'Record ID',
      type: 'uuid',
      group: 'identification',
      required: true,
      system: true,
      description: 'Unique record identifier',
    },
    {
      id: 'payment_amount_cents',
      name: 'amount_cents',
      label: 'Amount',
      type: 'currency',
      group: 'financial',
      required: true,
      system: true,
      description: 'Payment amount in cents',
    },
    {
      id: 'payment_currency',
      name: 'currency',
      label: 'Currency',
      type: 'string',
      group: 'financial',
      required: true,
      system: true,
      description: 'Payment currency code',
    },
    {
      id: 'payment_status',
      name: 'status',
      label: 'Status',
      type: 'enum',
      group: 'status',
      required: true,
      system: true,
      description: 'Payment status',
      options: {
        choices: ['PENDING', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED'],
      },
    },
    {
      id: 'payment_method',
      name: 'method',
      label: 'Payment Method',
      type: 'enum',
      group: 'financial',
      required: false,
      system: true,
      description: 'Payment method used',
      options: {
        choices: ['card', 'cash', 'check', 'bank_transfer'],
      },
    },
    {
      id: 'payment_external_id',
      name: 'external_id',
      label: 'External ID',
      type: 'string',
      group: 'identification',
      required: false,
      system: true,
      description: 'External payment processor ID',
    },
    {
      id: 'payment_captured_at',
      name: 'captured_at',
      label: 'Captured At',
      type: 'datetime',
      group: 'status',
      required: false,
      system: true,
      description: 'Payment capture timestamp',
    },
    {
      id: 'payment_created_at',
      name: 'created_at',
      label: 'Created At',
      type: 'datetime',
      group: 'status',
      required: true,
      system: true,
      description: 'Record creation timestamp',
    },
    {
      id: 'payment_updated_at',
      name: 'updated_at',
      label: 'Last Updated',
      type: 'datetime',
      group: 'status',
      required: true,
      system: true,
      description: 'Last modification timestamp',
    },
  ],
  tickets: [
    {
      id: 'ticket_id',
      name: 'id',
      label: 'Record ID',
      type: 'uuid',
      group: 'identification',
      required: true,
      system: true,
      description: 'Unique record identifier',
    },
    {
      id: 'ticket_created_at',
      name: 'created_at',
      label: 'Created At',
      type: 'datetime',
      group: 'status',
      required: true,
      system: true,
      description: 'Ticket creation date',
    },
  ],
};

// Property group definitions
const PROPERTY_GROUPS = {
  basic_info: { id: 'basic_info', label: 'Basic Information', order: 1 },
  contact_info: { id: 'contact_info', label: 'Contact Information', order: 2 },
  identification: { id: 'identification', label: 'Identification', order: 3 },
  medical: { id: 'medical', label: 'Medical Information', order: 4 },
  financial: { id: 'financial', label: 'Financial', order: 5 },
  status: { id: 'status', label: 'Status', order: 6 },
  notes: { id: 'notes', label: 'Notes', order: 7 },
  custom_fields: { id: 'custom_fields', label: 'Custom Fields', order: 8 },
};

/**
 * Get properties for an object type
 */
async function getProperties(objectType, tenantId, includeArchived = false) {
  // Only include system properties when not viewing archived (system properties can't be archived)
  const systemProperties = includeArchived ? [] : (SYSTEM_PROPERTIES[objectType] || []);

  // Fetch custom properties from database
  const customProperties = await prisma.customProperty.findMany({
    where: {
      tenantId,
      objectType,
      archived: includeArchived ? true : false,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Transform custom properties to match system property format
  const transformedCustomProps = customProperties.map((prop) => ({
    id: prop.id,
    name: prop.name,
    label: prop.label,
    type: prop.type,
    group: prop.group,
    required: prop.required,
    system: false,
    description: prop.description,
    fieldConfig: prop.fieldConfig,
    archived: prop.archived,
    archivedAt: prop.archivedAt,
    createdAt: prop.createdAt,
    updatedAt: prop.updatedAt,
  }));

  // Merge system and custom properties
  const allProperties = [...systemProperties, ...transformedCustomProps];

  // Group properties by their group
  const groupedProperties = {};
  allProperties.forEach((prop) => {
    if (!groupedProperties[prop.group]) {
      groupedProperties[prop.group] = [];
    }
    groupedProperties[prop.group].push(prop);
  });

  // Build groups array
  const groups = Object.entries(groupedProperties)
    .map(([groupId, props]) => ({
      ...PROPERTY_GROUPS[groupId],
      properties: props,
    }))
    .sort((a, b) => a.order - b.order);

  return {
    object_type: objectType,
    total_properties: allProperties.length,
    system_properties: systemProperties.length,
    custom_properties: customProperties.length,
    groups,
  };
}

/**
 * Create a custom property
 */
async function createProperty(tenantId, propertyData) {
  const { objectType, name, label, description, type, group, required, fieldConfig } = propertyData;

  // Validate property doesn't already exist
  const existing = await prisma.customProperty.findUnique({
    where: {
      tenantId_objectType_name: {
        tenantId,
        objectType,
        name,
      },
    },
  });

  if (existing) {
    throw new Error(`Property with name "${name}" already exists for ${objectType}`);
  }

  // Create the property
  const property = await prisma.customProperty.create({
    data: {
      tenantId,
      objectType,
      name,
      label,
      description,
      type,
      group,
      required: required || false,
      fieldConfig: fieldConfig || null,
    },
  });

  return property;
}

/**
 * Update a property
 */
async function updateProperty(tenantId, propertyId, updates) {
  // Check if property exists and belongs to tenant
  const existing = await prisma.customProperty.findFirst({
    where: {
      id: propertyId,
      tenantId,
    },
  });

  if (!existing) {
    throw new Error('Property not found');
  }

  // If updating name, check it doesn't conflict
  if (updates.name && updates.name !== existing.name) {
    const conflict = await prisma.customProperty.findUnique({
      where: {
        tenantId_objectType_name: {
          tenantId,
          objectType: existing.objectType,
          name: updates.name,
        },
      },
    });

    if (conflict) {
      throw new Error(`Property with name "${updates.name}" already exists`);
    }
  }

  // Update the property
  const property = await prisma.customProperty.update({
    where: { id: propertyId },
    data: {
      ...updates,
      updatedAt: new Date(),
    },
  });

  return property;
}

/**
 * Delete a property permanently
 */
async function deleteProperty(tenantId, propertyId) {
  // Check if property exists and belongs to tenant
  const existing = await prisma.customProperty.findFirst({
    where: {
      id: propertyId,
      tenantId,
    },
  });

  if (!existing) {
    throw new Error('Property not found');
  }

  // Delete the property
  await prisma.customProperty.delete({
    where: { id: propertyId },
  });

  return { success: true };
}

/**
 * Archive a property (soft delete)
 */
async function archiveProperty(tenantId, propertyId) {
  // Check if property exists and belongs to tenant
  const existing = await prisma.customProperty.findFirst({
    where: {
      id: propertyId,
      tenantId,
    },
  });

  if (!existing) {
    throw new Error('Property not found');
  }

  if (existing.archived) {
    throw new Error('Property is already archived');
  }

  // Archive the property
  const property = await prisma.customProperty.update({
    where: { id: propertyId },
    data: {
      archived: true,
      archivedAt: new Date(),
    },
  });

  return property;
}

/**
 * Restore an archived property
 */
async function restoreProperty(tenantId, propertyId) {
  // Check if property exists and belongs to tenant
  const existing = await prisma.customProperty.findFirst({
    where: {
      id: propertyId,
      tenantId,
    },
  });

  if (!existing) {
    throw new Error('Property not found');
  }

  if (!existing.archived) {
    throw new Error('Property is not archived');
  }

  // Restore the property
  const property = await prisma.customProperty.update({
    where: { id: propertyId },
    data: {
      archived: false,
      archivedAt: null,
    },
  });

  return property;
}

/**
 * Get archived properties count
 */
async function getArchivedCount(tenantId, objectType) {
  const count = await prisma.customProperty.count({
    where: {
      tenantId,
      objectType,
      archived: true,
    },
  });

  return count;
}

module.exports = {
  getProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  archiveProperty,
  restoreProperty,
  getArchivedCount,
};
