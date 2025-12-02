/**
 * =============================================================================
 * BarkBase Shared Validation Schemas
 * =============================================================================
 *
 * Centralized Zod schemas for form validation across the application.
 * These schemas can be used with react-hook-form via zodResolver.
 *
 * Usage:
 *   import { ownerSchema, petSchema } from '@/lib/validations';
 *   import { zodResolver } from '@hookform/resolvers/zod';
 *
 *   const form = useForm({
 *     resolver: zodResolver(ownerSchema),
 *     defaultValues: { ... }
 *   });
 *
 * =============================================================================
 */

import { z } from 'zod';

// =============================================================================
// COMMON FIELD VALIDATORS
// =============================================================================

/**
 * Phone number validation - accepts various formats, requires 10+ digits
 */
export const phoneSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
    { message: 'Enter a valid phone number (10-15 digits)' }
  );

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address');

/**
 * Optional email validation
 */
export const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => {
      if (!value) return true;
      return z.string().email().safeParse(value).success;
    },
    { message: 'Enter a valid email address' }
  );

/**
 * URL validation with auto-protocol handling
 */
export const urlSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => {
      if (!value) return true;
      try {
        const urlWithProtocol = value.startsWith('http://') || value.startsWith('https://')
          ? value
          : `https://${value}`;
        const url = new URL(urlWithProtocol);
        return Boolean(url.hostname);
      } catch {
        return false;
      }
    },
    { message: 'Enter a valid URL' }
  );

/**
 * Currency amount validation (positive number with up to 2 decimal places)
 */
export const currencySchema = z
  .number()
  .min(0, 'Amount must be zero or greater')
  .refine(
    (val) => Number.isFinite(val) && Math.round(val * 100) === val * 100,
    { message: 'Amount can have at most 2 decimal places' }
  );

/**
 * Date string validation (ISO format or common date formats)
 */
export const dateStringSchema = z
  .string()
  .refine(
    (value) => !isNaN(Date.parse(value)),
    { message: 'Enter a valid date' }
  );

/**
 * Time string validation (HH:MM format)
 */
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Enter a valid time (HH:MM)');

/**
 * UUID validation
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid ID format');

// =============================================================================
// ADDRESS SCHEMA
// =============================================================================

export const addressSchema = z.object({
  street: z.string().trim().max(200, 'Street address too long').optional(),
  street2: z.string().trim().max(200, 'Address line 2 too long').optional(),
  city: z.string().trim().max(100, 'City name too long').optional(),
  state: z.string().trim().max(100, 'State/Province too long').optional(),
  postalCode: z.string().trim().max(20, 'Postal code too long').optional(),
  country: z.string().trim().max(100, 'Country name too long').optional(),
});

// =============================================================================
// OWNER SCHEMA
// =============================================================================

export const ownerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or fewer'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or fewer'),
  email: emailSchema,
  phone: phoneSchema,
  alternatePhone: phoneSchema,
  address: addressSchema.optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(200, 'Name too long').optional(),
      phone: phoneSchema,
      relationship: z.string().trim().max(100, 'Relationship too long').optional(),
    })
    .optional(),
  notes: z.string().trim().max(2000, 'Notes must be 2000 characters or fewer').optional(),
  preferredContactMethod: z.enum(['email', 'phone', 'sms']).optional(),
  marketingOptIn: z.boolean().optional(),
});

// =============================================================================
// PET SCHEMA
// =============================================================================

export const petSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Pet name is required')
    .max(100, 'Pet name must be 100 characters or fewer'),
  species: z.enum(['DOG', 'CAT', 'OTHER'], {
    errorMap: () => ({ message: 'Select a species' }),
  }),
  breed: z.string().trim().max(100, 'Breed must be 100 characters or fewer').optional(),
  color: z.string().trim().max(50, 'Color must be 50 characters or fewer').optional(),
  dateOfBirth: dateStringSchema.optional(),
  sex: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).optional(),
  weight: z
    .number()
    .min(0, 'Weight must be positive')
    .max(500, 'Weight seems too high')
    .optional(),
  weightUnit: z.enum(['lb', 'kg']).optional(),
  microchipNumber: z
    .string()
    .trim()
    .max(50, 'Microchip number too long')
    .optional(),
  isSpayedNeutered: z.boolean().optional(),
  feedingInstructions: z
    .string()
    .trim()
    .max(1000, 'Feeding instructions must be 1000 characters or fewer')
    .optional(),
  medicalNotes: z
    .string()
    .trim()
    .max(2000, 'Medical notes must be 2000 characters or fewer')
    .optional(),
  behaviorNotes: z
    .string()
    .trim()
    .max(2000, 'Behavior notes must be 2000 characters or fewer')
    .optional(),
  specialNeeds: z
    .string()
    .trim()
    .max(2000, 'Special needs must be 2000 characters or fewer')
    .optional(),
  vetInfo: z
    .object({
      name: z.string().trim().max(200).optional(),
      phone: phoneSchema,
      address: z.string().trim().max(500).optional(),
    })
    .optional(),
});

// =============================================================================
// VACCINATION SCHEMA
// =============================================================================

export const vaccinationSchema = z.object({
  type: z
    .string()
    .trim()
    .min(1, 'Vaccination type is required')
    .max(100, 'Vaccination type must be 100 characters or fewer'),
  administeredAt: dateStringSchema,
  expiresAt: dateStringSchema.optional(),
  veterinarian: z.string().trim().max(200, 'Veterinarian name too long').optional(),
  notes: z.string().trim().max(500, 'Notes must be 500 characters or fewer').optional(),
});

// =============================================================================
// BOOKING SCHEMA
// =============================================================================

export const bookingSchema = z.object({
  petId: uuidSchema,
  ownerId: uuidSchema,
  serviceId: uuidSchema.optional(),
  kennelId: uuidSchema.optional(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  checkInTime: timeSchema.optional(),
  checkOutTime: timeSchema.optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']).optional(),
  notes: z.string().trim().max(2000, 'Notes must be 2000 characters or fewer').optional(),
  feedingInstructions: z.string().trim().max(1000).optional(),
  medicationInstructions: z.string().trim().max(1000).optional(),
  specialRequests: z.string().trim().max(1000).optional(),
  addOnServices: z.array(uuidSchema).optional(),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

// =============================================================================
// SERVICE SCHEMA
// =============================================================================

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Service name is required')
    .max(100, 'Service name must be 100 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must be 1000 characters or fewer')
    .optional(),
  category: z.enum(['BOARDING', 'DAYCARE', 'GROOMING', 'TRAINING', 'ADD_ONS', 'MEMBERSHIPS'], {
    errorMap: () => ({ message: 'Select a service category' }),
  }),
  basePrice: currencySchema,
  pricingType: z.enum(['per_night', 'per_day', 'per_session', 'per_hour', 'flat']).optional(),
  duration: z.number().int().min(1).max(1440).optional(), // minutes
  isActive: z.boolean().optional(),
  taxable: z.boolean().optional(),
  requiresDeposit: z.boolean().optional(),
  depositAmount: currencySchema.optional(),
});

// =============================================================================
// STAFF/TEAM MEMBER SCHEMA
// =============================================================================

export const staffSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or fewer'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or fewer'),
  email: emailSchema,
  phone: phoneSchema,
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'STAFF'], {
    errorMap: () => ({ message: 'Select a role' }),
  }),
  permissions: z.array(z.string()).optional(),
  hireDate: dateStringSchema.optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(200).optional(),
      phone: phoneSchema,
      relationship: z.string().trim().max(100).optional(),
    })
    .optional(),
  notes: z.string().trim().max(2000).optional(),
});

// =============================================================================
// INVOICE SCHEMA
// =============================================================================

export const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(500),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: currencySchema,
  taxable: z.boolean().optional(),
});

export const invoiceSchema = z.object({
  ownerId: uuidSchema,
  bookingId: uuidSchema.optional(),
  dueDate: dateStringSchema,
  lineItems: z.array(invoiceLineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().trim().max(2000).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discountAmount: currencySchema.optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

// =============================================================================
// SETTINGS SCHEMAS
// =============================================================================

/**
 * Business hours for a single day
 */
export const dayHoursSchema = z
  .object({
    isOpen: z.boolean(),
    open: z.string().nullable(),
    close: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.isOpen) return;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const toMinutes = (t) => {
      if (!t || !timeRegex.test(t)) return null;
      const [h, m] = t.split(':');
      return Number(h) * 60 + Number(m);
    };
    const openMinutes = toMinutes(value.open);
    const closeMinutes = toMinutes(value.close);
    if (openMinutes === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Opening time required', path: ['open'] });
    }
    if (closeMinutes === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Closing time required', path: ['close'] });
    }
    if (openMinutes !== null && closeMinutes !== null && closeMinutes <= openMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Closing time must be later than opening time',
        path: ['close'],
      });
    }
  });

/**
 * Holiday definition
 */
export const holidaySchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(1, 'Holiday name is required')
    .max(120, 'Holiday name must be 120 characters or fewer'),
  startDate: dateStringSchema,
  endDate: dateStringSchema.nullable().optional(),
  recurring: z.boolean().default(false),
});

/**
 * Regional settings
 */
export const regionalSettingsSchema = z.object({
  timeZone: z.string().min(1, 'Select a time zone'),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
  timeFormat: z.enum(['12-hour', '24-hour']),
  weekStartsOn: z.enum(['Sunday', 'Monday']),
});

/**
 * Currency settings
 */
export const currencySettingsSchema = z
  .object({
    supportedCurrencies: z.array(z.string().min(1)).nonempty('Select at least one currency'),
    defaultCurrency: z.string().min(1, 'Select a default currency'),
  })
  .superRefine((value, ctx) => {
    if (!value.supportedCurrencies.includes(value.defaultCurrency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Default currency must be included in supported currencies',
        path: ['defaultCurrency'],
      });
    }
  });

/**
 * Business info settings
 */
export const businessInfoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Business name is required')
    .max(100, 'Business name must be 100 characters or fewer'),
  taxId: z.string().trim().max(50, 'Tax ID must be 50 characters or fewer').optional(),
  phone: phoneSchema,
  email: optionalEmailSchema,
  website: urlSchema,
  notes: z.string().trim().max(500).optional(),
  address: addressSchema,
});

// =============================================================================
// KENNEL/RUN SCHEMA
// =============================================================================

export const kennelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Kennel name is required')
    .max(100, 'Kennel name must be 100 characters or fewer'),
  type: z.enum(['STANDARD', 'DELUXE', 'SUITE', 'OUTDOOR'], {
    errorMap: () => ({ message: 'Select a kennel type' }),
  }).optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(10, 'Capacity seems too high'),
  dailyRate: currencySchema.optional(),
  features: z.array(z.string()).optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a partial version of any schema (all fields optional)
 * Useful for update/patch operations
 */
export const makePartial = (schema) => schema.partial();

/**
 * Create a required version of an optional field
 */
export const makeRequired = (schema) => schema.unwrap();

/**
 * Helper to format Zod errors for display
 */
export const formatZodErrors = (errors) => {
  return errors.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
};

// =============================================================================
// EXPORT ALL SCHEMAS
// =============================================================================

export default {
  // Common fields
  phone: phoneSchema,
  email: emailSchema,
  optionalEmail: optionalEmailSchema,
  url: urlSchema,
  currency: currencySchema,
  dateString: dateStringSchema,
  time: timeSchema,
  uuid: uuidSchema,
  address: addressSchema,

  // Entity schemas
  owner: ownerSchema,
  pet: petSchema,
  vaccination: vaccinationSchema,
  booking: bookingSchema,
  service: serviceSchema,
  staff: staffSchema,
  invoice: invoiceSchema,
  invoiceLineItem: invoiceLineItemSchema,
  kennel: kennelSchema,

  // Settings schemas
  dayHours: dayHoursSchema,
  holiday: holidaySchema,
  regionalSettings: regionalSettingsSchema,
  currencySettings: currencySettingsSchema,
  businessInfo: businessInfoSchema,

  // Helpers
  makePartial,
  makeRequired,
  formatZodErrors,
};
