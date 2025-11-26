/**
 * SlideoutProvider - Global slideout state management
 * Provides context for opening slideout panels from anywhere in the app
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
  NOTE_CREATE: 'noteCreate',
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
  [SLIDEOUT_TYPES.NOTE_CREATE]: {
    title: 'Add Note',
    description: 'Add a note to this record',
    width: 'max-w-xl',
  },
};

// Context
const SlideoutContext = createContext(null);

/**
 * SlideoutProvider component
 * Wraps the app to provide slideout state management
 */
export function SlideoutProvider({ children }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState(null);

  const openSlideout = useCallback((type, props = {}) => {
    const config = SLIDEOUT_CONFIG[type] || {};
    setState({
      type,
      props,
      title: props.title || config.title || 'Panel',
      description: props.description || config.description,
      width: props.width || config.width || 'max-w-xl',
    });
  }, []);

  const closeSlideout = useCallback(() => {
    setState(null);
  }, []);

  // Invalidate queries after successful operations
  const invalidateQueries = useCallback((queryKeys = []) => {
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
    });
  }, [queryClient]);

  // Handle successful form submission
  const handleSuccess = useCallback((result, options = {}) => {
    closeSlideout();
    
    // Invalidate relevant queries based on the slideout type
    if (options.invalidate) {
      invalidateQueries(options.invalidate);
    }

    // Call optional callback
    if (options.onSuccess) {
      options.onSuccess(result);
    }
  }, [closeSlideout, invalidateQueries]);

  const value = {
    state,
    isOpen: state !== null,
    openSlideout,
    closeSlideout,
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

