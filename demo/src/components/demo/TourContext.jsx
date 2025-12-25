import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TourContext = createContext();

// Tour configuration - maps global step index to route/page
// Expanded tour covering ~30 steps across all key pages
export const TOUR_CONFIG = [
  { route: '/today', pageSteps: [0, 1, 2, 3, 4, 28] },                 // Steps 0-4 + Step 28: Final wrap-up
  { route: '/owners', pageSteps: [5, 6] },                             // Steps 5-6: Owners page, table
  { route: '/owners/owner-001-a1b2c3d4', pageSteps: [7, 8] },         // Steps 7-8: Inline edit, Pets section
  { route: '/pets', pageSteps: [9, 10] },                              // Steps 9-10: Pets page, table
  { route: '/pets/pet-001-x1y2z3a4', pageSteps: [11, 12, 13] },       // Steps 11-13: Inline edit, Health tab, Activity tab
  { route: '/bookings', pageSteps: [14, 15, 16] },                     // Steps 14-16: Bookings page, calendar, new booking
  { route: '/schedule', pageSteps: [17] },                             // Step 17: Schedule & capacity
  { route: '/workflows', pageSteps: [18, 19] },                        // Steps 18-19: Workflows page, list
  { route: '/kennels', pageSteps: [20, 21] },                          // Steps 20-21: Kennels page, grid
  { route: '/invoices', pageSteps: [22, 23, 24] },                     // Steps 22-24: Invoices page, stats, table
  { route: '/reports', pageSteps: [25] },                              // Step 25: Reports
  { route: '/messages', pageSteps: [26] },                             // Step 26: Messages
  { route: '/settings', pageSteps: [27] },                             // Step 27: Settings
];

export const TOTAL_STEPS = 29;

export function TourProvider({ children }) {
  const [tourState, setTourState] = useState(() => ({
    active: sessionStorage.getItem('tour_active') === 'true',
    globalStepIndex: parseInt(sessionStorage.getItem('tour_step') || '0', 10),
    completed: sessionStorage.getItem('tour_completed') === 'true',
  }));

  const startTour = useCallback(() => {
    sessionStorage.setItem('tour_active', 'true');
    sessionStorage.setItem('tour_step', '0');
    sessionStorage.removeItem('tour_completed');
    setTourState({ active: true, globalStepIndex: 0, completed: false });
  }, []);

  const advanceToStep = useCallback((stepIndex) => {
    sessionStorage.setItem('tour_step', String(stepIndex));
    setTourState(s => ({ ...s, globalStepIndex: stepIndex }));
  }, []);

  const endTour = useCallback((completed = false) => {
    sessionStorage.removeItem('tour_active');
    sessionStorage.removeItem('tour_step');
    if (completed) {
      sessionStorage.setItem('tour_completed', 'true');
    }
    setTourState({ active: false, globalStepIndex: 0, completed });
  }, []);

  const skipTour = useCallback(() => {
    sessionStorage.removeItem('tour_active');
    sessionStorage.removeItem('tour_step');
    sessionStorage.setItem('tour_completed', 'true');
    setTourState({ active: false, globalStepIndex: 0, completed: true });
  }, []);

  // Get the next page config for navigation
  const getNextPageConfig = useCallback((currentGlobalStep) => {
    const nextStep = currentGlobalStep + 1;
    return TOUR_CONFIG.find(c => c.pageSteps.includes(nextStep));
  }, []);

  // Get the previous page config for back navigation
  const getPrevPageConfig = useCallback((currentGlobalStep) => {
    const prevStep = currentGlobalStep - 1;
    return TOUR_CONFIG.find(c => c.pageSteps.includes(prevStep));
  }, []);

  return (
    <TourContext.Provider value={{
      ...tourState,
      startTour,
      advanceToStep,
      endTour,
      skipTour,
      getNextPageConfig,
      getPrevPageConfig,
    }}>
      {children}
    </TourContext.Provider>
  );
}

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
