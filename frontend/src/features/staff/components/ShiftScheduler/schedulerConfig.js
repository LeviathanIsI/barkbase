/**
 * Scheduler Configuration for ShiftScheduler
 * Defines colors, time ranges, and display settings
 */

// Role-based colors for shifts
export const roleColors = {
  'Kennel Tech': '#3b82f6',      // Blue
  'Kennel Attendant': '#3b82f6', // Blue
  'Groomer': '#8b5cf6',          // Purple
  'Manager': '#f97316',          // Orange
  'Trainer': '#10b981',          // Green
  'Receptionist': '#ec4899',     // Pink
  'Veterinarian': '#06b6d4',     // Cyan
  'default': '#6b7280',          // Gray
};

// Get color for a role
export const getRoleColor = (role) => {
  if (!role) return roleColors.default;
  // Check for partial matches
  const normalizedRole = role.toLowerCase();
  for (const [key, color] of Object.entries(roleColors)) {
    if (normalizedRole.includes(key.toLowerCase())) {
      return color;
    }
  }
  return roleColors.default;
};

// Scheduler configuration
export const schedulerConfig = {
  // Time range (6 AM to 10 PM)
  startTime: '06:00',
  endTime: '22:00',

  // Cell dimensions
  resourceCellWidth: 180,
  dayCellWidth: 120,
  eventItemHeight: 36,
  eventItemLineHeight: 36,

  // View settings
  defaultView: 'week',
  views: ['day', 'week'],

  // Behavior
  dragAndDropEnabled: true,
  resizable: true,
  movable: true,
  creatable: true,

  // Display
  displayWeekend: true,
  weekStartsOn: 0, // Sunday

  // Time slots
  minuteStep: 30,
  dayStartFrom: 6,
  dayStopTo: 22,

  // Headers
  resourceName: 'Staff',

  // Scroll behavior
  scrollToSpecialMoment: true,
};

// Shift status colors
export const shiftStatusColors = {
  scheduled: '#3b82f6',   // Blue - default scheduled
  confirmed: '#10b981',   // Green - confirmed by staff
  pending: '#f59e0b',     // Amber - pending approval
  cancelled: '#ef4444',   // Red - cancelled
  completed: '#6b7280',   // Gray - past/completed
};

// Get status color
export const getStatusColor = (status) => {
  return shiftStatusColors[status] || shiftStatusColors.scheduled;
};

export default schedulerConfig;
