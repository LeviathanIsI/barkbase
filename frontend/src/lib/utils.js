import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const formatCurrency = (amount, currency = 'USD') => {
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
 * @deprecated Use useTimezoneUtils() from '@/lib/timezone' instead for timezone-aware formatting.
 * This function does NOT respect user timezone settings.
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

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
 * @deprecated Use useTimezoneUtils() from '@/lib/timezone' instead for timezone-aware formatting.
 * This function does NOT respect user timezone settings.
 */
export const formatTime = (date) => {
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
 * @deprecated Use useTimezoneUtils() from '@/lib/timezone' instead for timezone-aware formatting.
 * This function does NOT respect user timezone settings.
 */
export const formatDateTime = (date) => {
  return `${formatDate(date)} at ${formatTime(date)}`;
};

/**
 * Class name utility for conditional classes
 * Merges Tailwind classes properly
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
