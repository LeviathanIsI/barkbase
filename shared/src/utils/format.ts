/**
 * Shared formatting utilities for BarkBase
 * Pure functions with no external dependencies - safe for frontend and backend
 */

/**
 * Format a currency amount from cents to display string
 * @param amount - Amount in cents (e.g., 1500 = $15.00)
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  // Convert cents to dollars
  return formatter.format(amount / 100);
};

/**
 * Format a date to display string
 * @param date - Date value (string, number, or Date)
 * @param format - 'short' | 'long' | 'iso' | 'numeric'
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | number | Date | null | undefined,
  format: 'short' | 'long' | 'iso' | 'numeric' = 'short'
): string => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  if (format === 'iso') {
    return d.toISOString().split('T')[0];
  }
  
  if (format === 'numeric') {
    return d.toLocaleDateString('en-US');
  }
  
  if (format === 'short') {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  
  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  
  return d.toLocaleDateString();
};

/**
 * Format a time to display string
 * @param date - Date value containing time
 * @returns Formatted time string (e.g., "3:30 PM")
 */
export const formatTime = (date: string | number | Date | null | undefined): string => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format a date and time together
 * @param date - Date value
 * @returns Formatted date and time string
 */
export const formatDateTime = (date: string | number | Date | null | undefined): string => {
  if (!date) return '';
  return `${formatDate(date)} at ${formatTime(date)}`;
};

/**
 * Format a phone number for display
 * @param phone - Raw phone number string
 * @returns Formatted phone number (e.g., "(555) 123-4567")
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Format as +X (XXX) XXX-XXXX for 11 digits (with country code)
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Return original if we can't format it
  return phone;
};

/**
 * Get relative time description (e.g., "2 hours ago", "in 3 days")
 * @param date - Date to compare against now
 * @returns Relative time string
 */
export const formatRelativeTime = (date: string | number | Date | null | undefined): string => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  
  if (Math.abs(diffSecs) < 60) {
    return 'just now';
  }
  
  if (Math.abs(diffMins) < 60) {
    return diffMins > 0 
      ? `in ${diffMins} minute${diffMins === 1 ? '' : 's'}`
      : `${Math.abs(diffMins)} minute${Math.abs(diffMins) === 1 ? '' : 's'} ago`;
  }
  
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0
      ? `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`
      : `${Math.abs(diffHours)} hour${Math.abs(diffHours) === 1 ? '' : 's'} ago`;
  }
  
  if (Math.abs(diffDays) < 30) {
    return diffDays > 0
      ? `in ${diffDays} day${diffDays === 1 ? '' : 's'}`
      : `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
  }
  
  return formatDate(date, 'short');
};

