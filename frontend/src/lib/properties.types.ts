/**
 * =============================================================================
 * Custom Properties Types
 * =============================================================================
 *
 * Type definitions for the enterprise custom fields system.
 * Properties allow tenants to define their own data model per entity type,
 * similar to enterprise custom properties or Airtable's schema editor.
 *
 * =============================================================================
 */

// Valid field types for custom properties
export type PropertyFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'url'
  | 'email'
  | 'phone'
  | 'currency'
  | 'textarea';

// Entity types that can have custom properties
export type PropertyEntityType =
  | 'pet'
  | 'owner'
  | 'booking'
  | 'staff'
  | 'service'
  | 'kennel';

// Option for select/multiselect fields
export interface PropertyOption {
  value: string;
  label: string;
  color?: string; // Optional color for visual distinction
}

// Validation rules for properties
export interface PropertyValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

// Property definition (the schema)
export interface Property {
  id: string;
  tenantId: string;
  name: string;
  label: string;
  description?: string;
  fieldType: PropertyFieldType;
  entityType: PropertyEntityType;
  options: PropertyOption[];
  required: boolean;
  defaultValue?: unknown;
  validationRules: PropertyValidationRules;
  sortOrder: number;
  propertyGroup: string;
  showInList: boolean;
  showInForm: boolean;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  usageCount?: number;
}

// Property value (the actual data)
export interface PropertyValue {
  id: string;
  tenantId: string;
  propertyId: string;
  entityType: PropertyEntityType;
  entityId: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
}

// API request/response types

export interface CreatePropertyRequest {
  name: string;
  label: string;
  fieldType: PropertyFieldType;
  entityType: PropertyEntityType;
  description?: string;
  options?: PropertyOption[];
  required?: boolean;
  defaultValue?: unknown;
  validationRules?: PropertyValidationRules;
  sortOrder?: number;
  propertyGroup?: string;
  showInList?: boolean;
  showInForm?: boolean;
}

export interface UpdatePropertyRequest {
  label?: string;
  description?: string;
  options?: PropertyOption[];
  required?: boolean;
  defaultValue?: unknown;
  validationRules?: PropertyValidationRules;
  sortOrder?: number;
  propertyGroup?: string;
  showInList?: boolean;
  showInForm?: boolean;
}

export interface ListPropertiesParams {
  entityType?: PropertyEntityType;
  objectType?: PropertyEntityType; // Alias for entityType
  includeArchived?: boolean;
  includeUsage?: boolean;
}

export interface PropertyLimits {
  currentCount: number;
  limit: number;
  canCreate: boolean;
  remaining: number;
}

export interface ListPropertiesResponse {
  success: boolean;
  properties: Property[];
  metadata: {
    total: number;
    plan: 'FREE' | 'PRO' | 'ENTERPRISE';
    limits: PropertyLimits;
  };
}

export interface GetPropertyResponse {
  success: boolean;
  property: Property;
}

export interface CreatePropertyResponse {
  success: boolean;
  message: string;
  property: Property;
}

export interface UpdatePropertyResponse {
  success: boolean;
  message: string;
  property: Property;
}

export interface DeletePropertyResponse {
  success: boolean;
  message: string;
  deletedPropertyId: string;
}

export interface ArchivePropertyRequest {
  reason?: string;
  cascadeStrategy?: 'keep' | 'delete';
}

export interface ArchivePropertyResponse {
  success: boolean;
  message: string;
  archivedPropertyId: string;
  reason?: string;
  cascadeStrategy: 'keep' | 'delete';
  valuesDeleted: number;
}

export interface RestorePropertyResponse {
  success: boolean;
  message: string;
  property: Property;
}

// Property values API

export interface GetPropertyValuesResponse {
  success: boolean;
  entityType: PropertyEntityType;
  entityId: string;
  values: Record<string, unknown>;
  properties: Array<{
    id: string;
    name: string;
    label: string;
    fieldType: PropertyFieldType;
    options: PropertyOption[];
    required: boolean;
    defaultValue?: unknown;
  }>;
}

export interface UpsertPropertyValuesRequest {
  values: Record<string, unknown>;
}

export interface UpsertPropertyValuesResponse {
  success: boolean;
  message: string;
  upserted: string[];
  errors?: Array<{
    propertyName: string;
    error: string;
  }>;
}

// Plan limits
export const PROPERTY_PLAN_LIMITS: Record<string, number> = {
  FREE: 5,
  PRO: 25,
  ENTERPRISE: Infinity,
};

// Field type configurations for UI
export const FIELD_TYPE_CONFIG: Record<PropertyFieldType, {
  label: string;
  icon: string;
  description: string;
  hasOptions: boolean;
}> = {
  text: {
    label: 'Text',
    icon: 'Type',
    description: 'Single line of text',
    hasOptions: false,
  },
  textarea: {
    label: 'Multi-line Text',
    icon: 'AlignLeft',
    description: 'Multiple lines of text',
    hasOptions: false,
  },
  number: {
    label: 'Number',
    icon: 'Hash',
    description: 'Numeric value',
    hasOptions: false,
  },
  currency: {
    label: 'Currency',
    icon: 'DollarSign',
    description: 'Monetary value',
    hasOptions: false,
  },
  date: {
    label: 'Date',
    icon: 'Calendar',
    description: 'Date picker',
    hasOptions: false,
  },
  datetime: {
    label: 'Date & Time',
    icon: 'Clock',
    description: 'Date and time picker',
    hasOptions: false,
  },
  select: {
    label: 'Dropdown',
    icon: 'ChevronDown',
    description: 'Single selection from options',
    hasOptions: true,
  },
  multiselect: {
    label: 'Multi-select',
    icon: 'CheckSquare',
    description: 'Multiple selections from options',
    hasOptions: true,
  },
  boolean: {
    label: 'Checkbox',
    icon: 'CheckCircle',
    description: 'Yes/No toggle',
    hasOptions: false,
  },
  email: {
    label: 'Email',
    icon: 'Mail',
    description: 'Email address',
    hasOptions: false,
  },
  phone: {
    label: 'Phone',
    icon: 'Phone',
    description: 'Phone number',
    hasOptions: false,
  },
  url: {
    label: 'URL',
    icon: 'Link',
    description: 'Website link',
    hasOptions: false,
  },
};

// Entity type display names
export const ENTITY_TYPE_LABELS: Record<PropertyEntityType, string> = {
  pet: 'Pet',
  owner: 'Owner',
  booking: 'Booking',
  staff: 'Staff',
  service: 'Service',
  kennel: 'Kennel',
};

// =============================================================================
// Entity Definitions (Custom Objects)
// =============================================================================

/**
 * EntityDefinition represents a tenant-specific entity type.
 * System entities (pet, owner, booking, etc.) are auto-seeded.
 * Custom entities can be created by PRO/ENTERPRISE tenants.
 */
export interface EntityDefinition {
  id: string;
  tenantId: string;
  internalName: string;
  singularName: string;
  pluralName: string;
  description?: string;
  primaryDisplayPropertyId?: string;
  secondaryDisplayPropertyIds?: string[];
  icon?: string;
  color?: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// API request/response types for Entity Definitions

export interface CreateEntityDefinitionRequest {
  internalName: string;
  singularName: string;
  pluralName: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UpdateEntityDefinitionRequest {
  singularName?: string;
  pluralName?: string;
  description?: string;
  primaryDisplayPropertyId?: string;
  secondaryDisplayPropertyIds?: string[];
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface EntityDefinitionLimits {
  currentCount: number;
  customCount: number;
  systemCount: number;
  limit: number;
  canCreate: boolean;
  remaining: number;
}

export interface ListEntityDefinitionsResponse {
  success: boolean;
  entityDefinitions: EntityDefinition[];
  metadata: {
    total: number;
    customCount: number;
    systemCount: number;
    plan: 'FREE' | 'PRO' | 'ENTERPRISE';
    limits: EntityDefinitionLimits;
  };
}

export interface GetEntityDefinitionResponse {
  success: boolean;
  entityDefinition: EntityDefinition;
}

export interface CreateEntityDefinitionResponse {
  success: boolean;
  message: string;
  entityDefinition: EntityDefinition;
}

export interface UpdateEntityDefinitionResponse {
  success: boolean;
  message: string;
  entityDefinition: EntityDefinition;
}

export interface DeleteEntityDefinitionResponse {
  success: boolean;
  message: string;
  deletedEntityDefinitionId: string;
}

// Plan limits for custom objects
export const CUSTOM_OBJECT_PLAN_LIMITS: Record<string, number> = {
  FREE: 0,
  PRO: 3,
  ENTERPRISE: Infinity,
};

// System entity types that are auto-seeded for every tenant
export const SYSTEM_ENTITY_TYPES = [
  'pet',
  'owner',
  'booking',
  'staff',
  'service',
  'kennel',
] as const;

export type SystemEntityType = typeof SYSTEM_ENTITY_TYPES[number];
