/**
 * Shared validation utilities for BarkBase
 * Pure functions with no external dependencies - safe for frontend and backend
 */

/**
 * Validate an email address format
 * @param email - Email string to validate
 * @returns true if valid email format
 */
export const isValidEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  // RFC 5322 simplified pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

/**
 * Validate a phone number (US format)
 * @param phone - Phone string to validate
 * @returns true if valid phone format
 */
export const isValidPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Valid if 10 digits (US) or 11 digits starting with 1
  return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
};

/**
 * Validate a UUID format
 * @param uuid - String to validate
 * @returns true if valid UUID v4 format
 */
export const isValidUUID = (uuid: string | null | undefined): boolean => {
  if (!uuid) return false;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
};

/**
 * Check if a string is empty or whitespace only
 * @param str - String to check
 * @returns true if null, undefined, empty, or whitespace only
 */
export const isEmpty = (str: string | null | undefined): boolean => {
  return !str || str.trim().length === 0;
};

/**
 * Check if a value is a valid date
 * @param date - Value to check
 * @returns true if valid date
 */
export const isValidDate = (date: unknown): boolean => {
  if (!date) return false;
  const d = new Date(date as string | number | Date);
  return !isNaN(d.getTime());
};

/**
 * Check if a date is in the past
 * @param date - Date to check
 * @returns true if date is before now
 */
export const isPastDate = (date: string | number | Date | null | undefined): boolean => {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
};

/**
 * Check if a date is in the future
 * @param date - Date to check
 * @returns true if date is after now
 */
export const isFutureDate = (date: string | number | Date | null | undefined): boolean => {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  return d.getTime() > Date.now();
};

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns true if date is today
 */
export const isToday = (date: string | number | Date | null | undefined): boolean => {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * Validate a property name (alphanumeric, underscores, starts with letter)
 * @param name - Property name to validate
 * @returns true if valid property name
 */
export const isValidPropertyName = (name: string | null | undefined): boolean => {
  if (!name) return false;
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
};

