/**
 * Shared string utilities for BarkBase
 * Pure functions with no external dependencies - safe for frontend and backend
 */

/**
 * Capitalize the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export const capitalize = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert a string to title case
 * @param str - String to convert
 * @returns Title cased string
 */
export const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Convert a string to kebab-case
 * @param str - String to convert
 * @returns Kebab-cased string
 */
export const toKebabCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

/**
 * Convert a string to snake_case
 * @param str - String to convert
 * @returns Snake-cased string
 */
export const toSnakeCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
};

/**
 * Convert a string to camelCase
 * @param str - String to convert
 * @returns Camel-cased string
 */
export const toCamelCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
};

/**
 * Truncate a string to a maximum length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length (default 50)
 * @param suffix - Suffix to add (default '...')
 * @returns Truncated string
 */
export const truncate = (
  str: string | null | undefined,
  maxLength: number = 50,
  suffix: string = '...'
): string => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Generate initials from a name
 * @param name - Full name
 * @param maxInitials - Maximum number of initials (default 2)
 * @returns Initials string
 */
export const getInitials = (
  name: string | null | undefined,
  maxInitials: number = 2
): string => {
  if (!name) return '';
  return name
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, maxInitials)
    .join('');
};

/**
 * Pluralize a word based on count
 * @param word - Singular word
 * @param count - Count to determine plural
 * @param plural - Custom plural form (optional)
 * @returns Pluralized word with count
 */
export const pluralize = (
  word: string,
  count: number,
  plural?: string
): string => {
  const pluralForm = plural || `${word}s`;
  return `${count} ${count === 1 ? word : pluralForm}`;
};

/**
 * Slugify a string for URLs
 * @param str - String to slugify
 * @returns URL-safe slug
 */
export const slugify = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Mask sensitive information (e.g., email, phone)
 * @param str - String to mask
 * @param visibleStart - Characters to show at start (default 2)
 * @param visibleEnd - Characters to show at end (default 2)
 * @returns Masked string
 */
export const mask = (
  str: string | null | undefined,
  visibleStart: number = 2,
  visibleEnd: number = 2
): string => {
  if (!str) return '';
  if (str.length <= visibleStart + visibleEnd) return str;
  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd);
  const masked = '*'.repeat(Math.min(str.length - visibleStart - visibleEnd, 5));
  return `${start}${masked}${end}`;
};

