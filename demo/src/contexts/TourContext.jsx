/**
 * TourContext - Product Tour System for BarkBase
 *
 * Provides a reusable tour infrastructure using Driver.js that:
 * - Respects light/dark theme preferences
 * - Tracks tour completion via localStorage
 * - Supports manual triggers and first-time user auto-start
 * - Offers modular, page-specific tour definitions
 */

import { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/styles/tour.css';
import { useTheme } from '@/contexts/ThemeContext';

// ============================================================================
// CONSTANTS
// ============================================================================

const TOUR_STORAGE_KEY = 'barkbase-tours';
const TOUR_VERSION = '1.0.0'; // Increment to reset tour completion for all users

// ============================================================================
// CONTEXT
// ============================================================================

const TourContext = createContext(null);

// ============================================================================
// TOUR PERSISTENCE UTILITIES
// ============================================================================

/**
 * Get tour completion data from localStorage
 */
const getTourData = () => {
  try {
    const data = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!data) return { version: TOUR_VERSION, completedTours: {}, skippedTours: {} };

    const parsed = JSON.parse(data);
    // Reset if version changed
    if (parsed.version !== TOUR_VERSION) {
      return { version: TOUR_VERSION, completedTours: {}, skippedTours: {} };
    }
    return parsed;
  } catch {
    return { version: TOUR_VERSION, completedTours: {}, skippedTours: {} };
  }
};

/**
 * Save tour completion data to localStorage
 */
const saveTourData = (data) => {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {  }
};

/**
 * Mark a tour as completed
 */
const markTourCompleted = (tourId) => {
  const data = getTourData();
  data.completedTours[tourId] = Date.now();
  saveTourData(data);
};

/**
 * Mark a tour as skipped
 */
const markTourSkipped = (tourId) => {
  const data = getTourData();
  data.skippedTours[tourId] = Date.now();
  saveTourData(data);
};

/**
 * Check if a tour has been completed or skipped
 */
const hasTourBeenSeen = (tourId) => {
  const data = getTourData();
  return !!(data.completedTours[tourId] || data.skippedTours[tourId]);
};

/**
 * Reset a specific tour (for testing or re-showing)
 */
const resetTour = (tourId) => {
  const data = getTourData();
  delete data.completedTours[tourId];
  delete data.skippedTours[tourId];
  saveTourData(data);
};

/**
 * Reset all tours
 */
const resetAllTours = () => {
  saveTourData({ version: TOUR_VERSION, completedTours: {}, skippedTours: {} });
};

// ============================================================================
// TOUR PROVIDER
// ============================================================================

export const TourProvider = ({ children }) => {
  const { isDark } = useTheme();
  const [activeTour, setActiveTour] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const driverRef = useRef(null);

  // Cleanup driver instance on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, []);

  /**
   * Start a tour with the given configuration
   */
  const startTour = useCallback((tourConfig) => {
    const { id, steps, onComplete, onSkip, autoStart = false } = tourConfig;

    // Don't auto-start if already seen
    if (autoStart && hasTourBeenSeen(id)) {
      return false;
    }

    // Destroy any existing driver instance
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    setActiveTour(id);
    setTotalSteps(steps.length);
    setCurrentStep(0);

    // Track the current step for completion detection
    let lastKnownStep = 0;

    // Create driver instance with BarkBase configuration
    const driverInstance = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: steps.map((step, index) => ({
        ...step,
        popover: {
          ...step.popover,
          // Add step number to title if not already present
          title: step.popover?.title || `Step ${index + 1}`,
          description: step.popover?.description || '',
          // Custom progress text
          progressText: `${index + 1} of ${steps.length}`,
        },
      })),
      // Smooth animations
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayClickNext: false,
      stagePadding: 12,
      stageRadius: 8,
      // Keyboard navigation
      keyboardControl: true,
      // Button labels
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      // Popover positioning
      popoverOffset: 16,
      // Callbacks
      onHighlightStarted: (element, step, options) => {
        lastKnownStep = options.state.activeIndex;
        setCurrentStep(options.state.activeIndex);
      },
      onDestroyed: () => {
        // Check if tour was completed or skipped
        const wasCompleted = lastKnownStep >= steps.length - 1;

        if (wasCompleted) {
          markTourCompleted(id);
          onComplete?.();
        } else {
          markTourSkipped(id);
          onSkip?.();
        }

        setActiveTour(null);
        setCurrentStep(0);
        setTotalSteps(0);
        driverRef.current = null;
      },
    });

    driverRef.current = driverInstance;
    driverInstance.drive();

    return true;
  }, []);

  /**
   * Stop the current tour
   */
  const stopTour = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    setActiveTour(null);
    setCurrentStep(0);
    setTotalSteps(0);
  }, []);

  /**
   * Move to a specific step in the current tour
   */
  const goToStep = useCallback((stepIndex) => {
    if (driverRef.current) {
      driverRef.current.moveTo(stepIndex);
    }
  }, []);

  /**
   * Move to the next step
   */
  const nextStep = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.moveNext();
    }
  }, []);

  /**
   * Move to the previous step
   */
  const prevStep = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.movePrevious();
    }
  }, []);

  /**
   * Check if a specific tour has been seen
   */
  const isTourSeen = useCallback((tourId) => {
    return hasTourBeenSeen(tourId);
  }, []);

  /**
   * Reset a tour so it can be shown again
   */
  const resetTourById = useCallback((tourId) => {
    resetTour(tourId);
  }, []);

  const value = {
    // State
    activeTour,
    currentStep,
    totalSteps,
    isActive: !!activeTour,
    isDark,

    // Actions
    startTour,
    stopTour,
    goToStep,
    nextStep,
    prevStep,

    // Persistence
    isTourSeen,
    resetTour: resetTourById,
    resetAllTours,

    // Utilities
    hasTourBeenSeen,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Main hook to access tour context
 */
export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

/**
 * Hook to auto-start a tour for first-time users on a specific page
 *
 * @param {Object} tourConfig - Tour configuration with id, steps, etc.
 * @param {boolean} enabled - Whether auto-start is enabled
 * @param {number} delay - Delay in ms before starting (default: 500)
 */
export const useAutoStartTour = (tourConfig, enabled = true, delay = 500) => {
  const { startTour, isTourSeen } = useTour();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!enabled || hasStarted.current) return;

    const tourId = tourConfig?.id;
    if (!tourId || isTourSeen(tourId)) return;

    hasStarted.current = true;

    const timer = setTimeout(() => {
      startTour({ ...tourConfig, autoStart: true });
    }, delay);

    return () => clearTimeout(timer);
  }, [tourConfig, enabled, delay, startTour, isTourSeen]);
};

/**
 * Hook to create a tour trigger function for manual activation
 *
 * @param {Object} tourConfig - Tour configuration
 * @returns {Function} Function to start the tour
 */
export const useTourTrigger = (tourConfig) => {
  const { startTour, resetTour } = useTour();

  return useCallback(() => {
    // Reset the tour so it plays even if previously completed
    if (tourConfig?.id) {
      resetTour(tourConfig.id);
    }
    startTour(tourConfig);
  }, [tourConfig, startTour, resetTour]);
};

// ============================================================================
// EXPORTS
// ============================================================================

export default TourProvider;
