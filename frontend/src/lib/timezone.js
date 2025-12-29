/**
 * Timezone utilities for BarkBase
 *
 * Uses native JavaScript Intl APIs for timezone handling.
 * The user's timezone is fetched from account-defaults and cached.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from './apiClient';

// Default timezone if not configured
const DEFAULT_TIMEZONE = 'America/New_York';

/**
 * Hook to get the user's configured timezone
 * Returns the timezone string (e.g., 'America/New_York')
 */
export const useTimezone = () => {
  const { data: settings } = useQuery({
    queryKey: ['account-defaults'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/account-defaults');
      return res.data?.data || res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Lambda returns timezone in regionalSettings.timeZone
  return settings?.regionalSettings?.timeZone || settings?.timezone || DEFAULT_TIMEZONE;
};

/**
 * Hook to get timezone-aware date utilities
 * Returns helper functions that use the user's configured timezone
 */
export const useTimezoneUtils = () => {
  const timezone = useTimezone();

  /**
   * Get the current date/time in the user's timezone
   */
  const now = () => {
    return new Date();
  };

  /**
   * Get today's date at midnight in the user's timezone
   */
  const today = () => {
    const date = new Date();
    return startOfDayInTimezone(date, timezone);
  };

  /**
   * Check if two dates are the same day in the user's timezone
   */
  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1Parts = getDatePartsInTimezone(date1, timezone);
    const d2Parts = getDatePartsInTimezone(date2, timezone);
    return d1Parts.year === d2Parts.year &&
           d1Parts.month === d2Parts.month &&
           d1Parts.day === d2Parts.day;
  };

  /**
   * Check if a date is today in the user's timezone
   */
  const isToday = (date) => {
    if (!date) return false;
    return isSameDay(date, new Date());
  };

  /**
   * Check if a target date falls within a date range (inclusive) in the user's timezone
   */
  const isDateInRange = (targetDate, startDate, endDate) => {
    if (!targetDate || !startDate || !endDate) return false;
    const target = startOfDayInTimezone(targetDate, timezone);
    const start = startOfDayInTimezone(startDate, timezone);
    const end = startOfDayInTimezone(endDate, timezone);
    return target >= start && target <= end;
  };

  /**
   * Format a date in the user's timezone
   */
  const formatDate = (date, options = {}) => {
    if (!date) return '';
    const defaultOptions = {
      timeZone: timezone,
      ...options,
    };
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(new Date(date));
  };

  /**
   * Format a date as short date (e.g., "Dec 29")
   */
  const formatShortDate = (date) => {
    return formatDate(date, { month: 'short', day: 'numeric' });
  };

  /**
   * Format a date as long date (e.g., "December 29, 2025")
   */
  const formatLongDate = (date) => {
    return formatDate(date, { month: 'long', day: 'numeric', year: 'numeric' });
  };

  /**
   * Format a time (e.g., "2:30 PM")
   */
  const formatTime = (date) => {
    return formatDate(date, { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return {
    timezone,
    now,
    today,
    isSameDay,
    isToday,
    isDateInRange,
    formatDate,
    formatShortDate,
    formatLongDate,
    formatTime,
  };
};

/**
 * Get date parts (year, month, day) in a specific timezone
 */
export const getDatePartsInTimezone = (date, timezone) => {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(d);
  return {
    year: parseInt(parts.find(p => p.type === 'year')?.value || '0', 10),
    month: parseInt(parts.find(p => p.type === 'month')?.value || '0', 10),
    day: parseInt(parts.find(p => p.type === 'day')?.value || '0', 10),
  };
};

/**
 * Get the start of a day in a specific timezone
 * Returns a Date object representing midnight in that timezone
 */
export const startOfDayInTimezone = (date, timezone) => {
  const parts = getDatePartsInTimezone(date, timezone);
  // Create a date string in the timezone and parse it
  // This effectively gets midnight in that timezone
  const dateStr = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T00:00:00`;

  // Get the offset for this date in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });

  // Create a Date that represents midnight in the target timezone
  // We use the date parts to create a consistent local date for comparison
  return new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
};

/**
 * Compare two dates ignoring time, in a specific timezone
 */
export const compareDatesInTimezone = (date1, date2, timezone) => {
  const d1 = startOfDayInTimezone(date1, timezone);
  const d2 = startOfDayInTimezone(date2, timezone);
  return d1.getTime() - d2.getTime();
};

/**
 * Check if date1 is the same day as date2 in the given timezone
 */
export const isSameDayInTimezone = (date1, date2, timezone) => {
  if (!date1 || !date2) return false;
  const d1Parts = getDatePartsInTimezone(date1, timezone);
  const d2Parts = getDatePartsInTimezone(date2, timezone);
  return d1Parts.year === d2Parts.year &&
         d1Parts.month === d2Parts.month &&
         d1Parts.day === d2Parts.day;
};

/**
 * Check if a date falls within a range (inclusive) in the given timezone
 */
export const isDateInRangeInTimezone = (targetDate, startDate, endDate, timezone) => {
  if (!targetDate || !startDate || !endDate) return false;
  const target = startOfDayInTimezone(targetDate, timezone);
  const start = startOfDayInTimezone(startDate, timezone);
  const end = startOfDayInTimezone(endDate, timezone);
  return target >= start && target <= end;
};

/**
 * Get timezone offset in minutes for a specific date
 */
const getTimezoneOffsetMinutes = (date, timezone) => {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (utcDate - tzDate) / 60000;
};

/**
 * Convert a time string from one timezone to another
 * @param {string} timeStr - Time in "HH:MM" format (e.g., "08:00")
 * @param {string|Date} date - The date for DST calculation
 * @param {string} fromTimezone - Source timezone (e.g., "America/New_York")
 * @param {string} toTimezone - Target timezone (e.g., "America/Los_Angeles")
 * @returns {string} Converted time in "h:mm A" format
 */
export const convertTimeToTimezone = (timeStr, date, fromTimezone, toTimezone) => {
  if (!timeStr || !date) return '';

  const [hours, minutes] = timeStr.split(':').map(Number);

  // If timezones are the same, just format the time
  if (fromTimezone === toTimezone) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  // Parse the date
  const dateObj = new Date(date);

  const targetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: toTimezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Create a reference date with the time in UTC
  const refDate = new Date(Date.UTC(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    hours,
    minutes
  ));

  // Adjust for source timezone offset (convert from source TZ to UTC, then display in target TZ)
  const sourceOffset = getTimezoneOffsetMinutes(refDate, fromTimezone);
  const adjustedDate = new Date(refDate.getTime() + sourceOffset * 60 * 1000);

  return targetFormatter.format(adjustedDate);
};

export default {
  useTimezone,
  useTimezoneUtils,
  getDatePartsInTimezone,
  startOfDayInTimezone,
  compareDatesInTimezone,
  isSameDayInTimezone,
  isDateInRangeInTimezone,
  convertTimeToTimezone,
};
