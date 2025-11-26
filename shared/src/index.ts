/**
 * @barkbase/shared - Main export
 * Cross-stack utilities and constants for BarkBase
 * 
 * This package contains pure utilities that work across both frontend and backend.
 * All exports are framework-agnostic with no external dependencies.
 */

// Package version
export const SHARED_VERSION = '1.0.0';

// Format utilities
export {
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  formatPhone,
  formatRelativeTime,
} from './utils/format';

// Validation utilities
export {
  isValidEmail,
  isValidPhone,
  isValidUUID,
  isEmpty,
  isValidDate,
  isPastDate,
  isFutureDate,
  isToday,
  isValidPropertyName,
} from './utils/validation';

// String utilities
export {
  capitalize,
  toTitleCase,
  toKebabCase,
  toSnakeCase,
  toCamelCase,
  truncate,
  getInitials,
  pluralize,
  slugify,
  mask,
} from './utils/strings';

// Constants
export {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  PET_STATUS,
  INVOICE_STATUS,
  TASK_STATUS,
  TASK_PRIORITY,
  PAGINATION,
  DATE_TIME,
  HTTP_STATUS,
} from './utils/constants';

// Type exports
export type {
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  PetStatus,
  InvoiceStatus,
  TaskStatus,
  TaskPriority,
} from './utils/constants';
