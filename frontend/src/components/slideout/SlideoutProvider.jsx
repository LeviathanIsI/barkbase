/**
 * SlideoutProvider - Global slideout state management
 * Provides context for opening slideout panels from anywhere in the app
 * Supports nested slideouts with back navigation
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Slideout types
export const SLIDEOUT_TYPES = {
  BOOKING_CREATE: 'bookingCreate',
  BOOKING_EDIT: 'bookingEdit',
  OWNER_CREATE: 'ownerCreate',
  OWNER_EDIT: 'ownerEdit',
  PET_CREATE: 'petCreate',
  PET_EDIT: 'petEdit',
  TASK_CREATE: 'taskCreate',
  TASK_EDIT: 'taskEdit',
  COMMUNICATION_CREATE: 'communicationCreate',
  MESSAGE_CREATE: 'messageCreate',
  SEND_RECEIPT: 'sendReceipt',
  NOTE_CREATE: 'noteCreate',
  ACTIVITY_LOG: 'activityLog',
  VACCINATION_EDIT: 'vaccinationEdit',
  BOOKING_CHECK_IN: 'bookingCheckIn',
};

// Slideout configuration for each type
export const SLIDEOUT_CONFIG = {
  [SLIDEOUT_TYPES.BOOKING_CREATE]: {
    title: 'New Booking',
    description: 'Create a new booking for a customer',
    width: 'max-w-3xl',
  },
  [SLIDEOUT_TYPES.BOOKING_EDIT]: {
    title: 'Edit Booking',
    description: 'Update booking details',
    width: 'max-w-3xl',
  },
  [SLIDEOUT_TYPES.OWNER_CREATE]: {
    title: 'New Customer',
    description: 'Add a new customer to your database',
    width: 'max-w-2xl',
  },
  [SLIDEOUT_TYPES.OWNER_EDIT]: {
    title: 'Edit Customer',
    description: 'Update customer information',
    width: 'max-w-2xl',
  },
  [SLIDEOUT_TYPES.PET_CREATE]: {
    title: 'New Pet',
    description: 'Add a new pet to your database',
    width: 'max-w-2xl',
  },
  [SLIDEOUT_TYPES.PET_EDIT]: {
    title: 'Edit Pet',
    description: 'Update pet information',
    width: 'max-w-2xl',
  },
  [SLIDEOUT_TYPES.TASK_CREATE]: {
    title: 'New Task',
    description: 'Create a new task',
    width: 'max-w-xl',
  },
  [SLIDEOUT_TYPES.TASK_EDIT]: {
    title: 'Edit Task',
    description: 'Update task details',
    width: 'max-w-xl',
  },
  [SLIDEOUT_TYPES.COMMUNICATION_CREATE]: {
    title: 'New Communication',
    description: 'Send a message to a customer',
    width: 'max-w-2xl',
  },
  [SLIDEOUT_TYPES.MESSAGE_CREATE]: {
    title: 'New Conversation',
    description: 'Start a conversation with a customer',
    width: 'max-w-xl',
  },
  [SLIDEOUT_TYPES.SEND_RECEIPT]: {
    title: 'Send Receipt',
    description: 'Email payment receipt to customer',
    width: 'max-w-xl',
  },
  [SLIDEOUT_TYPES.NOTE_CREATE]: {
    title: 'Add Note',
    description: 'Add a note to this record',
    width: 'max-w-xl',
  },
  [SLIDEOUT_TYPES.ACTIVITY_LOG]: {
    title: 'Log Activity',
    description: 'Log a manual activity or interaction',
    width: 'max-w-xl',
  },
  [SLIDEOUT_TYPES.VACCINATION_EDIT]: {
    title: 'Update Vaccination',
    description: 'Update vaccination record',
    width: 'max-w-xl',
  },
  [SLIDEOUT_TYPES.BOOKING_CHECK_IN]: {
    title: 'Check In',
    description: 'Confirm pet arrival and record check-in details',
    width: 'max-w-2xl',
  },
};

// Human-readable labels for back button
const SLIDEOUT_LABELS = {
  [SLIDEOUT_TYPES.BOOKING_CREATE]: 'Booking',
  [SLIDEOUT_TYPES.BOOKING_EDIT]: 'Booking',
  [SLIDEOUT_TYPES.OWNER_CREATE]: 'Customer',
  [SLIDEOUT_TYPES.OWNER_EDIT]: 'Customer',
  [SLIDEOUT_TYPES.PET_CREATE]: 'Pet',
  [SLIDEOUT_TYPES.PET_EDIT]: 'Pet',
  [SLIDEOUT_TYPES.TASK_CREATE]: 'Task',
  [SLIDEOUT_TYPES.TASK_EDIT]: 'Task',
  [SLIDEOUT_TYPES.COMMUNICATION_CREATE]: 'Message',
  [SLIDEOUT_TYPES.MESSAGE_CREATE]: 'Conversation',
  [SLIDEOUT_TYPES.SEND_RECEIPT]: 'Receipt',
  [SLIDEOUT_TYPES.NOTE_CREATE]: 'Note',
  [SLIDEOUT_TYPES.ACTIVITY_LOG]: 'Activity',
  [SLIDEOUT_TYPES.VACCINATION_EDIT]: 'Vaccination',
  [SLIDEOUT_TYPES.BOOKING_CHECK_IN]: 'Check In',
};

// Context
const SlideoutContext = createContext(null);

/**
 * SlideoutProvider component
 * Wraps the app to provide slideout state management
 * Now supports a stack of slideouts for nested navigation
 */
export function SlideoutProvider({ children }) {
  const queryClient = useQueryClient();
  // Stack of slideout states - current is last item
  const [stack, setStack] = useState([]);

  // Current state is the top of the stack
  const state = stack.length > 0 ? stack[stack.length - 1] : null;
  const isOpen = stack.length > 0;
  const hasHistory = stack.length > 1;

  // Get label for back button
  // Priority: returnTo label (external context) > previous slideout in stack
  const previousSlideoutLabel = state?.props?.returnTo?.label
    ? state.props.returnTo.label
    : hasHistory
      ? SLIDEOUT_LABELS[stack[stack.length - 2]?.type] || 'Previous'
      : null;

  // Check if we have a back action (either stack history or external returnTo)
  const hasBackAction = hasHistory || !!state?.props?.returnTo?.onBack;

  const openSlideout = useCallback((type, props = {}) => {
    const config = SLIDEOUT_CONFIG[type] || {};
    const newState = {
      type,
      props,
      title: props.title || config.title || 'Panel',
      description: props.description || config.description,
      width: props.width || config.width || 'max-w-xl',
    };

    setStack(currentStack => [...currentStack, newState]);
  }, []);

  // Close current slideout and go back to previous (if any)
  // Also handles external returnTo callback for panels opened from non-slideout contexts
  const goBack = useCallback(() => {
    // Check if current state has an external returnTo callback
    const currentState = stack.length > 0 ? stack[stack.length - 1] : null;
    const returnToCallback = currentState?.props?.returnTo?.onBack;

    if (returnToCallback) {
      // Close this slideout and call the external return callback
      setStack([]);
      returnToCallback();
    } else {
      // Normal stack navigation
      setStack(currentStack => {
        if (currentStack.length <= 1) return [];
        return currentStack.slice(0, -1);
      });
    }
  }, [stack]);

  // Close all slideouts
  const closeSlideout = useCallback(() => {
    setStack([]);
  }, []);

  // Invalidate queries after successful operations
  const invalidateQueries = useCallback((queryKeys = []) => {
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
    });
  }, [queryClient]);

  // Handle successful form submission
  const handleSuccess = useCallback((result, options = {}) => {
    // Invalidate relevant queries based on the slideout type
    if (options.invalidate) {
      invalidateQueries(options.invalidate);
    }

    // Call optional callback
    if (options.onSuccess) {
      options.onSuccess(result);
    }

    // Go back to previous slideout if there is one, otherwise close all
    if (stack.length > 1) {
      goBack();
    } else {
      closeSlideout();
    }
  }, [invalidateQueries, goBack, closeSlideout, stack.length]);

  const value = {
    state,
    isOpen,
    hasHistory,
    hasBackAction,
    previousSlideoutLabel,
    openSlideout,
    closeSlideout,
    goBack,
    handleSuccess,
    invalidateQueries,
  };

  return (
    <SlideoutContext.Provider value={value}>
      {children}
    </SlideoutContext.Provider>
  );
}

/**
 * useSlideout hook
 * Access slideout state and methods from any component
 */
export function useSlideout() {
  const context = useContext(SlideoutContext);
  if (!context) {
    throw new Error('useSlideout must be used within a SlideoutProvider');
  }
  return context;
}

export default SlideoutProvider;
