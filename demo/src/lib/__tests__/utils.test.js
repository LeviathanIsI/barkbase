/**
 * Utils Library Tests
 * Tests for utility functions: formatCurrency, formatDate, formatTime, formatDateTime, cn
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatTime, formatDateTime, cn } from '../utils';

describe('formatCurrency', () => {
  describe('basic formatting', () => {
    it('should format cents to dollars correctly', () => {
      expect(formatCurrency(1000)).toBe('$10');
      expect(formatCurrency(1050)).toBe('$10.5');
      expect(formatCurrency(10000)).toBe('$100');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('should handle small amounts', () => {
      expect(formatCurrency(1)).toBe('$0.01');
      expect(formatCurrency(50)).toBe('$0.5');
      expect(formatCurrency(99)).toBe('$0.99');
    });

    it('should handle large amounts', () => {
      expect(formatCurrency(100000)).toBe('$1,000');
      expect(formatCurrency(1000000)).toBe('$10,000');
      expect(formatCurrency(10000000)).toBe('$100,000');
    });

    it('should remove trailing zeros when appropriate', () => {
      expect(formatCurrency(1000)).toBe('$10');
      expect(formatCurrency(10000)).toBe('$100');
    });
  });

  describe('currency options', () => {
    it('should use USD by default', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('$');
    });

    it('should support other currencies', () => {
      const eurResult = formatCurrency(1000, 'EUR');
      expect(eurResult).toContain('€');

      const gbpResult = formatCurrency(1000, 'GBP');
      expect(gbpResult).toContain('£');
    });
  });

  describe('edge cases', () => {
    it('should handle negative amounts', () => {
      const result = formatCurrency(-1000);
      expect(result).toContain('-');
    });

    it('should handle decimal precision', () => {
      expect(formatCurrency(1001)).toBe('$10.01');
      expect(formatCurrency(1099)).toBe('$10.99');
    });
  });
});

describe('formatDate', () => {
  describe('short format (default)', () => {
    it('should format date in short format by default', () => {
      // Use a date with explicit time to avoid timezone issues
      const date = new Date('2024-03-15T12:00:00');
      const result = formatDate(date);
      expect(result).toContain('Mar');
      expect(result).toContain('2024');
    });

    it('should format ISO string dates', () => {
      // Use a local time to avoid timezone shifts
      const result = formatDate('2024-03-15T12:00:00');
      expect(result).toContain('Mar');
    });
  });

  describe('long format', () => {
    it('should format date in long format', () => {
      const date = new Date('2024-03-15T12:00:00');
      const result = formatDate(date, 'long');
      expect(result).toContain('March');
      expect(result).toContain('2024');
    });

    it('should include weekday in long format', () => {
      // March 15, 2024 is a Friday
      const date = new Date('2024-03-15T12:00:00');
      const result = formatDate(date, 'long');
      // Just verify it has a weekday (could be Thursday/Friday depending on timezone)
      expect(result).toMatch(/Friday|Thursday/);
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null', () => {
      expect(formatDate(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDate('invalid-date')).toBe('');
      expect(formatDate('not-a-date')).toBe('');
    });

    it('should handle empty string', () => {
      expect(formatDate('')).toBe('');
    });
  });
});

describe('formatTime', () => {
  describe('basic formatting', () => {
    it('should format time correctly', () => {
      const date = new Date('2024-03-15T14:30:00');
      const result = formatTime(date);
      expect(result).toContain('2:30');
      expect(result).toMatch(/PM/i);
    });

    it('should handle morning times', () => {
      const date = new Date('2024-03-15T09:15:00');
      const result = formatTime(date);
      expect(result).toContain('9:15');
      expect(result).toMatch(/AM/i);
    });

    it('should handle noon', () => {
      const date = new Date('2024-03-15T12:00:00');
      const result = formatTime(date);
      expect(result).toContain('12:00');
      expect(result).toMatch(/PM/i);
    });

    it('should handle midnight', () => {
      const date = new Date('2024-03-15T00:00:00');
      const result = formatTime(date);
      expect(result).toContain('12:00');
      expect(result).toMatch(/AM/i);
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null', () => {
      expect(formatTime(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatTime(undefined)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatTime('invalid')).toBe('');
    });
  });
});

describe('formatDateTime', () => {
  it('should combine date and time', () => {
    const date = new Date('2024-03-15T14:30:00');
    const result = formatDateTime(date);
    expect(result).toContain('Mar');
    expect(result).toContain('15');
    expect(result).toContain('at');
    expect(result).toContain('2:30');
  });

  it('should handle edge cases gracefully', () => {
    expect(formatDateTime(null)).toContain('at');
  });
});

describe('cn (className utility)', () => {
  describe('basic merging', () => {
    it('should merge multiple class strings', () => {
      const result = cn('class1', 'class2');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should handle single class', () => {
      expect(cn('single-class')).toBe('single-class');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
    });
  });

  describe('conditional classes', () => {
    it('should filter out falsy values', () => {
      const result = cn('always', false && 'never', null, undefined, 'also');
      expect(result).toContain('always');
      expect(result).toContain('also');
      expect(result).not.toContain('never');
    });

    it('should handle conditional objects', () => {
      const result = cn('base', { active: true, disabled: false });
      expect(result).toContain('base');
      expect(result).toContain('active');
      expect(result).not.toContain('disabled');
    });
  });

  describe('Tailwind merge', () => {
    it('should merge conflicting Tailwind classes', () => {
      const result = cn('p-4', 'p-8');
      expect(result).toBe('p-8');
    });

    it('should keep non-conflicting classes', () => {
      const result = cn('p-4', 'm-4');
      expect(result).toContain('p-4');
      expect(result).toContain('m-4');
    });

    it('should handle responsive variants', () => {
      const result = cn('text-sm', 'md:text-lg');
      expect(result).toContain('text-sm');
      expect(result).toContain('md:text-lg');
    });

    it('should merge color classes correctly', () => {
      const result = cn('bg-red-500', 'bg-blue-500');
      expect(result).toBe('bg-blue-500');
    });
  });

  describe('array inputs', () => {
    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2']);
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should handle mixed inputs', () => {
      const result = cn('base', ['array1', 'array2'], { obj: true });
      expect(result).toContain('base');
      expect(result).toContain('array1');
      expect(result).toContain('obj');
    });
  });
});
