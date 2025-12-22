/**
 * Unit Tests - Wait Calculation
 *
 * Tests the wait time calculation functions from the step executor.
 * Verifies duration, time of day, date property, calendar date, and day of week calculations.
 */

// Wait calculation functions (mimics Lambda logic)
function calculateDurationWait(config) {
  const value = parseInt(config.value || config.duration) || 0;
  const unit = config.unit || 'hours';

  if (value <= 0) {
    return new Date(); // Return now if invalid
  }

  const now = new Date();
  let msToAdd;

  switch (unit.toLowerCase()) {
    case 'minutes':
      msToAdd = value * 60 * 1000;
      break;
    case 'hours':
      msToAdd = value * 60 * 60 * 1000;
      break;
    case 'days':
      msToAdd = value * 24 * 60 * 60 * 1000;
      break;
    case 'weeks':
      msToAdd = value * 7 * 24 * 60 * 60 * 1000;
      break;
    default:
      msToAdd = value * 60 * 60 * 1000; // Default to hours
  }

  return new Date(now.getTime() + msToAdd);
}

function calculateTimeOfDayWait(config) {
  const targetTime = config.time || '09:00';
  const [hours, minutes] = targetTime.split(':').map(Number);

  const now = new Date();
  const target = new Date(now);

  target.setHours(hours, minutes, 0, 0);

  // If target time is in the past, move to next day
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

function calculateDateFieldWait(config, recordData) {
  const dateField = config.dateField || config.property;

  if (!dateField || !recordData) {
    return null;
  }

  // Get date value from record
  let dateValue = recordData.record?.[dateField] || recordData[dateField];

  if (!dateValue) {
    return null;
  }

  const baseDate = new Date(dateValue);
  if (isNaN(baseDate.getTime())) {
    return null;
  }

  // Apply offset if configured
  const timing = config.timing || 'on';
  const offsetValue = parseInt(config.offsetValue) || 0;
  const offsetUnit = config.offsetUnit || 'days';

  let targetDate = new Date(baseDate);

  if (timing === 'before' && offsetValue > 0) {
    targetDate = subtractTime(targetDate, offsetValue, offsetUnit);
  } else if (timing === 'after' && offsetValue > 0) {
    targetDate = addTime(targetDate, offsetValue, offsetUnit);
  }

  // Apply time if specified
  if (config.time) {
    const [hours, minutes] = config.time.split(':').map(Number);
    targetDate.setHours(hours, minutes, 0, 0);
  }

  return targetDate;
}

function calculateCalendarDateWait(config) {
  const dateStr = config.date || config.calendarDate;

  if (!dateStr) {
    return null;
  }

  const targetDate = new Date(dateStr);

  if (isNaN(targetDate.getTime())) {
    return null;
  }

  // Apply time if specified
  if (config.time) {
    const [hours, minutes] = config.time.split(':').map(Number);
    targetDate.setHours(hours, minutes, 0, 0);
  }

  return targetDate;
}

function calculateDayOfWeekWait(config) {
  const targetDay = config.dayOfWeek || config.day;
  const targetTime = config.time || '09:00';

  if (!targetDay) {
    return null;
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDayIndex = dayNames.indexOf(targetDay.toLowerCase());

  if (targetDayIndex === -1) {
    return null;
  }

  const now = new Date();
  const currentDayIndex = now.getDay();

  let daysUntilTarget = targetDayIndex - currentDayIndex;

  // If target day is today, check if target time is in the future
  if (daysUntilTarget === 0) {
    const [hours, minutes] = targetTime.split(':').map(Number);
    const targetToday = new Date(now);
    targetToday.setHours(hours, minutes, 0, 0);

    if (targetToday <= now) {
      daysUntilTarget = 7; // Move to next week
    }
  } else if (daysUntilTarget < 0) {
    daysUntilTarget += 7; // Move to next week
  }

  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + daysUntilTarget);

  // Set the target time
  const [hours, minutes] = targetTime.split(':').map(Number);
  targetDate.setHours(hours, minutes, 0, 0);

  return targetDate;
}

// Helper functions
function addTime(date, value, unit) {
  const result = new Date(date);
  switch (unit.toLowerCase()) {
    case 'days':
      result.setDate(result.getDate() + value);
      break;
    case 'weeks':
      result.setDate(result.getDate() + (value * 7));
      break;
    case 'months':
      result.setMonth(result.getMonth() + value);
      break;
    default:
      result.setDate(result.getDate() + value);
  }
  return result;
}

function subtractTime(date, value, unit) {
  return addTime(date, -value, unit);
}

describe('Wait Calculation', () => {
  // Mock the current date for predictable tests
  const mockNow = new Date('2024-12-15T10:00:00Z');
  let originalDate;

  beforeAll(() => {
    originalDate = Date;
    global.Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) {
          return new originalDate(mockNow);
        }
        return new originalDate(...args);
      }

      static now() {
        return mockNow.getTime();
      }
    };
  });

  afterAll(() => {
    global.Date = originalDate;
  });

  describe('Duration Wait', () => {
    test('calculates minutes wait correctly', () => {
      const result = calculateDurationWait({ value: 30, unit: 'minutes' });

      expect(result.getTime()).toBe(mockNow.getTime() + 30 * 60 * 1000);
    });

    test('calculates hours wait correctly', () => {
      const result = calculateDurationWait({ value: 2, unit: 'hours' });

      expect(result.getTime()).toBe(mockNow.getTime() + 2 * 60 * 60 * 1000);
    });

    test('calculates days wait correctly', () => {
      const result = calculateDurationWait({ value: 3, unit: 'days' });

      expect(result.getTime()).toBe(mockNow.getTime() + 3 * 24 * 60 * 60 * 1000);
    });

    test('calculates weeks wait correctly', () => {
      const result = calculateDurationWait({ value: 2, unit: 'weeks' });

      expect(result.getTime()).toBe(mockNow.getTime() + 14 * 24 * 60 * 60 * 1000);
    });

    test('defaults to hours for unknown unit', () => {
      const result = calculateDurationWait({ value: 1, unit: 'unknown' });

      expect(result.getTime()).toBe(mockNow.getTime() + 60 * 60 * 1000);
    });

    test('handles legacy duration field', () => {
      const result = calculateDurationWait({ duration: 5, unit: 'hours' });

      expect(result.getTime()).toBe(mockNow.getTime() + 5 * 60 * 60 * 1000);
    });

    test('returns now for zero or negative value', () => {
      const result = calculateDurationWait({ value: 0, unit: 'hours' });

      expect(result.getTime()).toBe(mockNow.getTime());
    });
  });

  describe('Time of Day Wait', () => {
    test('calculates wait until future time today', () => {
      // Mock now is 10:00 local, wait until 14:00
      const result = calculateTimeOfDayWait({ time: '14:00' });

      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(0);
      // Result should be same day or later (depending on timezone)
      expect(result.getTime()).toBeGreaterThanOrEqual(mockNow.getTime());
    });

    test('calculates wait until tomorrow for past time', () => {
      // Mock now is 10:00 local, wait until 08:00 should be tomorrow
      const result = calculateTimeOfDayWait({ time: '08:00' });

      expect(result.getHours()).toBe(8);
      expect(result.getMinutes()).toBe(0);
      // Result should be greater than now (next day)
      expect(result.getTime()).toBeGreaterThan(mockNow.getTime());
    });

    test('defaults to 09:00 when no time specified', () => {
      const result = calculateTimeOfDayWait({});

      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe('Date Field Wait', () => {
    test('waits until date from record field', () => {
      const recordData = {
        record: {
          check_in: '2024-12-20T14:00:00Z',
        },
      };

      const result = calculateDateFieldWait({ dateField: 'check_in' }, recordData);

      expect(result.getTime()).toBe(new originalDate('2024-12-20T14:00:00Z').getTime());
    });

    test('applies before offset', () => {
      const recordData = {
        record: {
          check_in: '2024-12-20T14:00:00Z',
        },
      };

      const result = calculateDateFieldWait({
        dateField: 'check_in',
        timing: 'before',
        offsetValue: 2,
        offsetUnit: 'days',
      }, recordData);

      expect(result.getTime()).toBe(new originalDate('2024-12-18T14:00:00Z').getTime());
    });

    test('applies after offset', () => {
      const recordData = {
        record: {
          check_out: '2024-12-20T10:00:00Z',
        },
      };

      const result = calculateDateFieldWait({
        dateField: 'check_out',
        timing: 'after',
        offsetValue: 3,
        offsetUnit: 'days',
      }, recordData);

      expect(result.getTime()).toBe(new originalDate('2024-12-23T10:00:00Z').getTime());
    });

    test('applies specific time to date', () => {
      const recordData = {
        record: {
          check_in: '2024-12-20T00:00:00Z',
        },
      };

      const result = calculateDateFieldWait({
        dateField: 'check_in',
        timing: 'on',
        time: '09:00',
      }, recordData);

      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(0);
    });

    test('returns null for missing date field', () => {
      const recordData = { record: {} };

      const result = calculateDateFieldWait({ dateField: 'check_in' }, recordData);

      expect(result).toBeNull();
    });

    test('returns null for invalid date', () => {
      const recordData = {
        record: {
          check_in: 'invalid-date',
        },
      };

      const result = calculateDateFieldWait({ dateField: 'check_in' }, recordData);

      expect(result).toBeNull();
    });

    test('handles weeks offset', () => {
      const recordData = {
        record: {
          due_date: '2024-12-20T10:00:00Z',
        },
      };

      const result = calculateDateFieldWait({
        dateField: 'due_date',
        timing: 'before',
        offsetValue: 1,
        offsetUnit: 'weeks',
      }, recordData);

      expect(result.getTime()).toBe(new originalDate('2024-12-13T10:00:00Z').getTime());
    });
  });

  describe('Calendar Date Wait', () => {
    test('waits until specific calendar date', () => {
      // Use ISO format with time to avoid timezone issues
      const result = calculateCalendarDateWait({ date: '2024-12-25T00:00:00' });

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11); // December is 11
      expect(result.getDate()).toBe(25);
    });

    test('applies specific time to calendar date', () => {
      const result = calculateCalendarDateWait({
        date: '2024-12-25T00:00:00',
        time: '10:30',
      });

      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(30);
    });

    test('handles calendarDate field name', () => {
      // Use local time format to get expected local date
      const result = calculateCalendarDateWait({ calendarDate: '2024-12-31T00:00:00' });

      expect(result.getDate()).toBe(31);
    });

    test('returns null for missing date', () => {
      const result = calculateCalendarDateWait({});

      expect(result).toBeNull();
    });

    test('returns null for invalid date', () => {
      const result = calculateCalendarDateWait({ date: 'not-a-date' });

      expect(result).toBeNull();
    });
  });

  describe('Day of Week Wait', () => {
    // Mock now is Sunday 2024-12-15 at 10:00 UTC
    test('waits until next occurrence of day', () => {
      const result = calculateDayOfWeekWait({ dayOfWeek: 'monday', time: '09:00' });

      expect(result.getDay()).toBe(1); // Monday
      // Should be in the future
      expect(result.getTime()).toBeGreaterThan(mockNow.getTime());
    });

    test('waits until later same day if time is in future', () => {
      // Wait until 14:00 on the current day of week
      const now = new Date();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const result = calculateDayOfWeekWait({ dayOfWeek: dayName, time: '23:59' });

      expect(result.getDay()).toBe(now.getDay());
      expect(result.getHours()).toBe(23);
    });

    test('waits until next week if same day time passed', () => {
      // Wait until 08:00 on the current day of week (time already passed)
      const now = new Date();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const result = calculateDayOfWeekWait({ dayOfWeek: dayName, time: '00:01' });

      expect(result.getDay()).toBe(now.getDay());
      // Should be next week (7 days from now roughly)
      expect(result.getTime()).toBeGreaterThan(mockNow.getTime());
    });

    test('calculates days until Friday correctly', () => {
      const result = calculateDayOfWeekWait({ dayOfWeek: 'friday', time: '09:00' });

      expect(result.getDay()).toBe(5); // Friday
      expect(result.getTime()).toBeGreaterThan(mockNow.getTime());
    });

    test('handles case insensitivity', () => {
      const result = calculateDayOfWeekWait({ dayOfWeek: 'MONDAY', time: '09:00' });

      expect(result.getDay()).toBe(1);
    });

    test('handles day field alias', () => {
      const result = calculateDayOfWeekWait({ day: 'tuesday', time: '09:00' });

      expect(result.getDay()).toBe(2);
    });

    test('defaults to 09:00 if no time specified', () => {
      const result = calculateDayOfWeekWait({ dayOfWeek: 'monday' });

      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(0);
    });

    test('returns null for invalid day name', () => {
      const result = calculateDayOfWeekWait({ dayOfWeek: 'funday' });

      expect(result).toBeNull();
    });

    test('returns null for missing day', () => {
      const result = calculateDayOfWeekWait({ time: '09:00' });

      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('handles string number values in duration', () => {
      const result = calculateDurationWait({ value: '5', unit: 'hours' });

      expect(result.getTime()).toBe(mockNow.getTime() + 5 * 60 * 60 * 1000);
    });

    test('handles undefined config gracefully', () => {
      const result = calculateDurationWait({});

      // Should return now or close to now
      expect(result.getTime()).toBe(mockNow.getTime());
    });
  });
});
