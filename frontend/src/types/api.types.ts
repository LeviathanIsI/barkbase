/**
 * =============================================================================
 * BarkBase API Type Definitions
 * =============================================================================
 *
 * Centralized TypeScript types for all API responses and entities.
 * These types are derived from the database schema and API contracts.
 *
 * Usage:
 *   import type { Owner, Pet, Booking, ApiResponse } from '@/types/api.types';
 *
 * =============================================================================
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Common timestamps for all entities
 */
export interface Timestamps {
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * Base entity with ID and tenant
 */
export interface BaseEntity extends Timestamps {
  id: string;
  tenant_id: string;
}

// =============================================================================
// TENANT
// =============================================================================

export type SubscriptionPlan = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface Tenant extends BaseEntity {
  slug: string;
  name: string;
  plan: SubscriptionPlan;
  storage_provider: string;
  db_provider: string;
  migration_state: string;
  migration_info?: Record<string, unknown>;
  custom_domain?: string;
  feature_flags: Record<string, boolean>;
  usage?: Record<string, unknown>;
  theme: Record<string, unknown>;
  terminology: Record<string, string>;
  settings: Record<string, unknown>;
  recovery_mode: boolean;
  onboarding_dismissed: boolean;
}

// =============================================================================
// USER
// =============================================================================

export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF';

export interface User extends BaseEntity {
  cognito_sub?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
}

// =============================================================================
// OWNER (Pet Owner / Customer)
// =============================================================================

export interface Owner extends BaseEntity {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  tags: string[];
  is_active: boolean;
  // Stripe integration
  stripe_customer_id?: string;
}

export interface OwnerWithPets extends Owner {
  pets: Pet[];
}

// =============================================================================
// PET
// =============================================================================

export type PetSpecies = 'Dog' | 'Cat' | 'Other';
export type PetGender = 'Male' | 'Female' | 'Unknown';
export type PetStatus = 'ACTIVE' | 'INACTIVE' | 'DECEASED';

export interface Pet extends BaseEntity {
  name: string;
  species: PetSpecies;
  breed?: string;
  gender?: PetGender;
  color?: string;
  weight?: number;
  date_of_birth?: string;
  microchip_number?: string;
  last_vet_visit?: string;
  medical_notes?: string;
  behavior_notes?: string;
  dietary_notes?: string;
  notes?: string;
  description?: string;
  documents: unknown[];
  behavior_flags: string[];
  status: PetStatus;
  photo_url?: string;
  is_active: boolean;
}

export interface PetWithOwners extends Pet {
  owners: Array<{
    owner: Owner;
    is_primary: boolean;
    relationship: string;
  }>;
}

// =============================================================================
// VACCINATION
// =============================================================================

export interface Vaccination extends BaseEntity {
  pet_id: string;
  type: string;
  administered_at: string;
  expires_at?: string;
  provider?: string;
  lot_number?: string;
  notes?: string;
  document_url?: string;
}

export interface VaccinationWithPet extends Vaccination {
  pet: Pet;
}

// =============================================================================
// SERVICE
// =============================================================================

export type ServiceCategory = 'boarding' | 'daycare' | 'grooming' | 'training' | 'add_ons' | 'memberships';

export interface Service extends BaseEntity {
  name: string;
  description?: string;
  category: ServiceCategory;
  price_in_cents: number;
  duration_minutes?: number;
  is_active: boolean;
  sort_order: number;
}

// =============================================================================
// KENNEL (Boarding Unit)
// =============================================================================

export type KennelCategory = 'standard' | 'deluxe' | 'suite' | 'outdoor';

export interface Kennel extends BaseEntity {
  name: string;
  category: KennelCategory;
  capacity: number;
  size?: string;
  features: string[];
  price_modifier_cents: number;
  is_active: boolean;
  sort_order: number;
}

// =============================================================================
// FACILITY (Physical Location)
// =============================================================================

export interface Facility extends BaseEntity {
  name: string;
  description?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  phone?: string;
  email?: string;
  capacity: number;
  is_primary: boolean;
  is_active: boolean;
}

// =============================================================================
// BOOKING
// =============================================================================

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'COMPLETED';

export interface Booking extends BaseEntity {
  pet_id?: string;
  owner_id?: string;
  service_id?: string;
  kennel_id?: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  service_type: string;
  service_name?: string;
  kennel_name?: string;
  room_number?: string;
  total_price_in_cents: number;
  deposit_in_cents: number;
  notes?: string;
  special_instructions?: string;
  checked_in_at?: string;
  checked_out_at?: string;
  checked_in_by?: string;
  checked_out_by?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

export interface BookingWithRelations extends Booking {
  pet?: Pet;
  owner?: Owner;
  service?: Service;
  kennel?: Kennel;
  pets?: Pet[]; // For multi-pet bookings via BookingPet junction
}

// =============================================================================
// RECURRING BOOKING
// =============================================================================

export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface RecurringBooking extends BaseEntity {
  owner_id: string;
  service_id?: string;
  kennel_id?: string;
  pattern: RecurrencePattern;
  day_of_week?: number[];
  day_of_month?: number;
  start_date: string;
  end_date?: string;
  check_in_time: string;
  check_out_time: string;
  notes?: string;
  is_active: boolean;
  next_occurrence?: string;
}

// =============================================================================
// TASK
// =============================================================================

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
export type TaskType =
  | 'FEEDING'
  | 'MEDICATION'
  | 'GROOMING'
  | 'EXERCISE'
  | 'CLEANING'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'ADMIN'
  | 'OTHER';

export interface Task extends BaseEntity {
  booking_id?: string;
  pet_id?: string;
  assigned_to?: string;
  title: string;
  description?: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: number;
  due_at?: string;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

// =============================================================================
// INVOICE
// =============================================================================

export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PAID'
  | 'PARTIAL'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'VOID';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  taxable: boolean;
}

export interface Invoice extends BaseEntity {
  booking_id?: string;
  owner_id?: string;
  invoice_number?: string;
  status: InvoiceStatus;
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  paid_cents: number;
  due_date?: string;
  issued_at?: string;
  sent_at?: string;
  paid_at?: string;
  notes?: string;
  line_items: InvoiceLineItem[];
}

// =============================================================================
// PAYMENT
// =============================================================================

export type PaymentMethod = 'card' | 'cash' | 'check' | 'bank_transfer' | 'other';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Payment extends BaseEntity {
  invoice_id?: string;
  owner_id?: string;
  amount_cents: number;
  method: PaymentMethod;
  status: PaymentStatus;
  stripe_payment_intent_id?: string;
  notes?: string;
  processed_at?: string;
  processed_by?: string;
}

// =============================================================================
// INCIDENT
// =============================================================================

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface Incident extends BaseEntity {
  booking_id?: string;
  pet_id?: string;
  reported_by: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  witnesses?: string[];
  attachments?: string[];
}

// =============================================================================
// TIME ENTRY (Staff Time Clock)
// =============================================================================

export interface TimeEntry extends BaseEntity {
  user_id: string;
  clock_in: string;
  clock_out?: string;
  break_start?: string;
  break_end?: string;
  total_minutes?: number;
  break_minutes?: number;
  notes?: string;
}

// =============================================================================
// SHIFT
// =============================================================================

export interface Shift extends BaseEntity {
  user_id: string;
  start_time: string;
  end_time: string;
  role?: string;
  notes?: string;
  is_published: boolean;
}

// =============================================================================
// AUDIT LOG
// =============================================================================

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'VIEW'
  | 'EXPORT';

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  entity_type: string;
  entity_id?: string;
  action: AuditAction;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface DashboardMetrics {
  todayCheckIns: number;
  todayCheckOuts: number;
  currentOccupancy: number;
  totalCapacity: number;
  occupancyRate: number;
  pendingBookings: number;
  upcomingBookings: number;
  revenueToday: number;
  revenueMonth: number;
}

export interface OccupancyData {
  date: string;
  occupied: number;
  capacity: number;
  rate: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

// =============================================================================
// SETTINGS TYPES
// =============================================================================

export interface BusinessHours {
  isOpen: boolean;
  open: string | null;
  close: string | null;
}

export type WeeklyBusinessHours = {
  [key in 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday']: BusinessHours;
};

export interface CalendarSettings {
  businessHours: WeeklyBusinessHours;
  timeZone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12-hour' | '24-hour';
  weekStartsOn: 'Sunday' | 'Monday';
  holidays: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate?: string;
    recurring: boolean;
  }>;
}

export interface BookingSettings {
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  minimumLeadTime: number;
  maximumAdvanceBooking: number;
  allowSameDayBooking: boolean;
  requireDeposit: boolean;
  depositPercent: number;
  cancellationPolicy: string;
}

export interface InvoicingSettings {
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultDueDays: number;
  defaultTaxRate: number;
  taxName: string;
  companyName: string;
  companyAddress: string;
  footerNotes: string;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface ApiError {
  success: false;
  error: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';
