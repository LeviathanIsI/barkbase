/**
 * Booking State Machine
 * Enforces valid state transitions and prevents impossible states
 */

const BOOKING_STATES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  IN_PROGRESS: 'IN_PROGRESS',
  CHECKED_OUT: 'CHECKED_OUT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

/**
 * Valid state transitions
 * Each state maps to array of states it can transition to
 */
const VALID_TRANSITIONS = {
  [BOOKING_STATES.PENDING]: [
    BOOKING_STATES.CONFIRMED,
    BOOKING_STATES.CANCELLED,
  ],
  [BOOKING_STATES.CONFIRMED]: [
    BOOKING_STATES.CHECKED_IN,
    BOOKING_STATES.CANCELLED,
  ],
  [BOOKING_STATES.CHECKED_IN]: [
    BOOKING_STATES.IN_PROGRESS,
    BOOKING_STATES.CHECKED_OUT,
  ],
  [BOOKING_STATES.IN_PROGRESS]: [
    BOOKING_STATES.CHECKED_OUT,
  ],
  [BOOKING_STATES.CHECKED_OUT]: [
    BOOKING_STATES.COMPLETED,
  ],
  [BOOKING_STATES.COMPLETED]: [
    // Terminal state - no transitions
  ],
  [BOOKING_STATES.CANCELLED]: [
    // Terminal state - no transitions
  ],
};

/**
 * Check if transition is valid
 */
const canTransition = (fromState, toState) => {
  const allowedStates = VALID_TRANSITIONS[fromState];
  return allowedStates && allowedStates.includes(toState);
};

/**
 * Validate and transition booking status
 * Throws error if transition is invalid
 */
const transitionBookingStatus = (currentStatus, newStatus) => {
  // Same state is always allowed (no-op)
  if (currentStatus === newStatus) {
    return { valid: true, fromState: currentStatus, toState: newStatus };
  }

  // Check if transition is valid
  if (!canTransition(currentStatus, newStatus)) {
    const error = new Error(
      `Invalid booking status transition: ${currentStatus} -> ${newStatus}`
    );
    error.statusCode = 400;
    error.currentStatus = currentStatus;
    error.requestedStatus = newStatus;
    error.allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    throw error;
  }

  return {
    valid: true,
    fromState: currentStatus,
    toState: newStatus,
  };
};

/**
 * Get allowed next states for current state
 */
const getAllowedTransitions = (currentStatus) => {
  return VALID_TRANSITIONS[currentStatus] || [];
};

/**
 * Check if state is terminal (no further transitions)
 */
const isTerminalState = (status) => {
  const transitions = VALID_TRANSITIONS[status] || [];
  return transitions.length === 0;
};

/**
 * Get human-readable state description
 */
const getStateDescription = (status) => {
  const descriptions = {
    [BOOKING_STATES.PENDING]: 'Awaiting confirmation',
    [BOOKING_STATES.CONFIRMED]: 'Confirmed, awaiting check-in',
    [BOOKING_STATES.CHECKED_IN]: 'Pet has been checked in',
    [BOOKING_STATES.IN_PROGRESS]: 'Stay in progress',
    [BOOKING_STATES.CHECKED_OUT]: 'Pet has been checked out',
    [BOOKING_STATES.COMPLETED]: 'Booking completed',
    [BOOKING_STATES.CANCELLED]: 'Booking cancelled',
  };

  return descriptions[status] || 'Unknown status';
};

module.exports = {
  BOOKING_STATES,
  VALID_TRANSITIONS,
  canTransition,
  transitionBookingStatus,
  getAllowedTransitions,
  isTerminalState,
  getStateDescription,
};

