/**
 * Demo Tour Component
 *
 * Placeholder for guided tour functionality.
 * Can be implemented with driver.js or react-joyride in the future.
 *
 * Usage:
 *   <DemoTour isOpen={showTour} onComplete={() => setShowTour(false)} />
 *
 * Future implementation could include:
 * - Step-by-step walkthrough of key features
 * - Highlighting important UI elements
 * - Interactive tooltips explaining functionality
 */

import { useEffect } from 'react';

// Tour steps configuration (for future implementation)
export const TOUR_STEPS = [
  {
    id: 'dashboard',
    target: '[data-tour="dashboard"]',
    title: 'Command Center',
    description: "Your daily overview - see today's arrivals, departures, and tasks at a glance.",
  },
  {
    id: 'check-in',
    target: '[data-tour="check-in"]',
    title: 'Quick Check-In',
    description: 'Check in arriving pets with just a few clicks. All their info is pre-loaded.',
  },
  {
    id: 'owners',
    target: '[data-tour="owners"]',
    title: 'Pet Parents',
    description: 'Manage your clients, their contact info, and see their complete history.',
  },
  {
    id: 'pets',
    target: '[data-tour="pets"]',
    title: 'Pet Profiles',
    description: 'Detailed profiles with feeding instructions, medications, and behavior notes.',
  },
  {
    id: 'bookings',
    target: '[data-tour="bookings"]',
    title: 'Calendar & Bookings',
    description: 'Visual calendar showing all reservations. Drag and drop to reschedule.',
  },
  {
    id: 'quick-actions',
    target: '[data-tour="quick-actions"]',
    title: 'Do Everything From Anywhere',
    description: 'Quick actions let you check in, book, or update records from any page.',
  },
];

export function DemoTour({ isOpen = false, onComplete, onSkip }) {
  useEffect(() => {
    if (isOpen) {
      // Future: Initialize tour library here
      console.log('[Demo Tour] Tour opened - implementation pending');
    }
  }, [isOpen]);

  // Placeholder - tour UI will be rendered by the tour library
  // For now, just call onComplete immediately if opened
  useEffect(() => {
    if (isOpen && onComplete) {
      // Auto-complete for now since tour is not implemented
      // Remove this when implementing the actual tour
      // onComplete();
    }
  }, [isOpen, onComplete]);

  // Component renders nothing - tour library handles UI
  return null;
}

// Hook for managing tour state (for future use)
export function useDemoTour() {
  const startTour = () => {
    console.log('[Demo Tour] Starting tour - implementation pending');
    // Future: Initialize and start the tour
  };

  const endTour = () => {
    console.log('[Demo Tour] Ending tour');
    // Future: Clean up tour
  };

  return { startTour, endTour, steps: TOUR_STEPS };
}

export default DemoTour;
