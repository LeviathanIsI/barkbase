/**
 * =============================================================================
 * BarkBase Type Definitions Index
 * =============================================================================
 *
 * Central export point for all TypeScript types.
 *
 * Usage:
 *   import type { Owner, Pet, Booking } from '@/types';
 *
 * =============================================================================
 */

// Core API entity types
export type {
  // Common types
  ApiResponse,
  PaginatedResponse,
  Timestamps,
  BaseEntity,
  ApiError,
  ErrorCode,

  // Tenant & User
  SubscriptionPlan,
  Tenant,
  UserRole,
  User,

  // Owner (Customer)
  Owner,
  OwnerWithPets,

  // Pet
  PetSpecies,
  PetGender,
  PetStatus,
  Pet,
  PetWithOwners,

  // Vaccination
  Vaccination,
  VaccinationWithPet,

  // Service
  ServiceCategory,
  Service,

  // Kennel (Boarding Unit)
  KennelCategory,
  Kennel,

  // Facility (Physical Location)
  Facility,

  // Booking
  BookingStatus,
  Booking,
  BookingWithRelations,

  // Recurring Booking
  RecurrencePattern,
  RecurringBooking,

  // Task
  TaskStatus,
  TaskType,
  Task,

  // Invoice & Payment
  InvoiceStatus,
  InvoiceLineItem,
  Invoice,
  PaymentMethod,
  PaymentStatus,
  Payment,

  // Incident
  IncidentSeverity,
  IncidentStatus,
  Incident,

  // Time Tracking
  TimeEntry,
  Shift,

  // Audit
  AuditAction,
  AuditLog,

  // Analytics
  DashboardMetrics,
  OccupancyData,
  RevenueData,

  // Settings
  BusinessHours,
  WeeklyBusinessHours,
  CalendarSettings,
  BookingSettings,
  InvoicingSettings,
} from './api.types';

// Re-export properties types (already existed)
export type {
  PropertyFieldType,
  PropertyEntityType,
  PropertyOption,
  PropertyValidationRules,
  Property,
  PropertyValue,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  ListPropertiesParams,
  PropertyLimits,
  ListPropertiesResponse,
  GetPropertyResponse,
  CreatePropertyResponse,
  UpdatePropertyResponse,
  DeletePropertyResponse,
  ArchivePropertyRequest,
  ArchivePropertyResponse,
  RestorePropertyResponse,
  GetPropertyValuesResponse,
  UpsertPropertyValuesRequest,
  UpsertPropertyValuesResponse,
  EntityDefinition,
  CreateEntityDefinitionRequest,
  UpdateEntityDefinitionRequest,
  EntityDefinitionLimits,
  ListEntityDefinitionsResponse,
  GetEntityDefinitionResponse,
  CreateEntityDefinitionResponse,
  UpdateEntityDefinitionResponse,
  DeleteEntityDefinitionResponse,
  SystemEntityType,
} from '../lib/properties.types';

// Re-export constants from properties
export {
  PROPERTY_PLAN_LIMITS,
  FIELD_TYPE_CONFIG,
  ENTITY_TYPE_LABELS,
  CUSTOM_OBJECT_PLAN_LIMITS,
  SYSTEM_ENTITY_TYPES,
} from '../lib/properties.types';
