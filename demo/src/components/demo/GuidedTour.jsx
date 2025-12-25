/**
 * GuidedTour Component
 *
 * A guided tour using react-joyride that walks first-time visitors through
 * BarkBase's key features and competitive advantages.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';
import TourCompletionModal from './TourCompletionModal';

// Session storage keys
const TOUR_COMPLETED_KEY = 'barkbase_demo_tour_completed';
const TOUR_STARTED_KEY = 'barkbase_demo_tour_started';

// Demo data IDs for navigation
const DEMO_OWNER_ID = 'owner-001-a1b2c3d4';
const DEMO_PET_ID = 'pet-001-x1y2z3a4';

// Tour steps configuration - each step has a route
// Target: ~35 steps covering all key features with BarkBase differentiators
const getTourSteps = () => [
  // ============ TODAY / COMMAND CENTER ============
  {
    target: '[data-tour="sidebar-nav"]',
    content: 'Everything in one place. Clients, Operations, Communications, Finance - no tool sprawl, no switching between apps.',
    title: 'One Platform, Everything',
    placement: 'right',
    disableBeacon: true,
    route: '/today',
  },
  {
    target: '[data-tour="command-center"]',
    content: "Your daily HQ. Today's arrivals, departures, occupancy, and alerts - all at a glance. Zero clicks to see what matters.",
    title: 'Command Center',
    placement: 'bottom',
    disableBeacon: true,
    route: '/today',
  },
  {
    target: '[data-tour="quick-actions"]',
    content: "DO EVERYTHING FROM ANYWHERE. Other software: 5+ clicks per task. BarkBase: open a slideout, handle it right here - check-ins, bookings, messages - without leaving your screen.",
    title: 'FEWER CLICKS',
    placement: 'bottom',
    disableBeacon: true,
    route: '/today',
  },
  {
    target: '[data-tour="today-arrivals"]',
    content: "Today's check-ins at your fingertips. Click any arrival to check them in instantly. Use batch check-in to process multiple pets with one click.",
    title: 'Arrivals List',
    placement: 'right',
    disableBeacon: true,
    route: '/today',
  },
  {
    target: '[data-tour="today-departures"]',
    content: "Who's going home today. One-click checkout with automatic invoice generation. No forgotten charges, no manual calculations.",
    title: 'Departures List',
    placement: 'left',
    disableBeacon: true,
    route: '/today',
  },
  // ============ OWNERS ============
  {
    target: '[data-tour="owners-page"]',
    content: 'Your complete client database. Search, filter, sort by any field. See lifetime value, booking history, and balances at a glance.',
    title: 'Client Management',
    placement: 'bottom',
    disableBeacon: true,
    route: '/owners',
  },
  {
    target: '[data-tour="owners-table"]',
    content: 'Click any row for full details. Hover over pet names for quick info. Select multiple clients for bulk email or SMS campaigns.',
    title: 'Smart Table',
    placement: 'top',
    disableBeacon: true,
    route: '/owners',
  },
  {
    target: '[data-tour="inline-edit-owner"]',
    content: "Click any field - name, phone, email - and edit directly. No forms, no save buttons. Changes save automatically. Competitors make you open a modal for every edit.",
    title: 'INLINE EDITING',
    placement: 'right',
    disableBeacon: true,
    route: `/owners/${DEMO_OWNER_ID}`,
  },
  {
    target: '[data-tour="owner-pets-section"]',
    content: "All pets for this client in one card. Add new pets, check vaccination status, or jump to any pet's profile with one click. Everything connected.",
    title: 'Pet Associations',
    placement: 'left',
    disableBeacon: true,
    route: `/owners/${DEMO_OWNER_ID}`,
  },
  // ============ PETS ============
  {
    target: '[data-tour="pets-page"]',
    content: 'Every pet in your facility. Filter by species, vaccination status, or behavior flags. Expiring vaccines flagged automatically - never miss a renewal.',
    title: 'Pet Directory',
    placement: 'bottom',
    disableBeacon: true,
    route: '/pets',
  },
  {
    target: '[data-tour="pets-table"]',
    content: 'Full profiles with owner info, vaccination badges, and booking history. Color-coded status shows health compliance instantly.',
    title: 'Pet Table',
    placement: 'top',
    disableBeacon: true,
    route: '/pets',
  },
  {
    target: '[data-tour="inline-edit-pet"]',
    content: "Same inline editing here. Click name, breed, weight - update instantly. Staff spends less time on computers, more time with animals.",
    title: 'INLINE EDITING',
    placement: 'right',
    disableBeacon: true,
    route: `/pets/${DEMO_PET_ID}`,
  },
  {
    target: '[data-tour="pet-health-tab"]',
    content: "Vaccination tracking with one-click renewals. Current, expiring, or overdue - see it instantly. Click Renew and the old record archives automatically.",
    title: 'Health Records',
    placement: 'bottom',
    disableBeacon: true,
    route: `/pets/${DEMO_PET_ID}`,
  },
  {
    target: '[data-tour="pet-activity-tab"]',
    content: "Complete activity timeline - every booking, note, incident, communication. Know exactly what happened during every stay. Full audit trail.",
    title: 'Activity Timeline',
    placement: 'bottom',
    disableBeacon: true,
    route: `/pets/${DEMO_PET_ID}`,
  },
  // ============ BOOKINGS ============
  {
    target: '[data-tour="bookings-page"]',
    content: 'Your scheduling command center. Calendar, list, or timeline view - work however suits you. Switch views without losing your place.',
    title: 'Booking Management',
    placement: 'bottom',
    disableBeacon: true,
    route: '/bookings',
  },
  {
    target: '[data-tour="bookings-calendar"]',
    content: 'Visual scheduling. See your entire week at a glance. Color-coded by status - confirmed, checked-in, overdue. Know what needs attention.',
    title: 'Calendar View',
    placement: 'bottom',
    disableBeacon: true,
    route: '/bookings',
  },
  {
    target: '[data-tour="bookings-new"]',
    content: 'Create bookings in seconds. Smart forms auto-fill client info, check for conflicts, and calculate pricing automatically.',
    title: 'Quick Booking',
    placement: 'left',
    disableBeacon: true,
    route: '/bookings',
  },
  // ============ SCHEDULE ============
  {
    target: '[data-tour="schedule-page"]',
    content: 'Advanced scheduling with capacity planning. Real-time occupancy, check-in/out tracking, and overbooking prevention built in.',
    title: 'Schedule & Capacity',
    placement: 'bottom',
    disableBeacon: true,
    route: '/schedule',
  },
  // ============ WORKFLOWS ============
  {
    target: '[data-tour="workflows-page"]',
    content: "Vaccination reminders 2 weeks before expiry. Welcome emails for new clients. Post-stay feedback requests. Set it once, it runs forever.",
    title: 'AUTOMATION INCLUDED',
    placement: 'bottom',
    disableBeacon: true,
    route: '/workflows',
  },
  {
    target: '[data-tour="workflows-list"]',
    content: 'All automations in one place. Active, paused, or draft. Clone workflows to create variations. No coding required - visual builder.',
    title: 'Workflow Dashboard',
    placement: 'top',
    disableBeacon: true,
    route: '/workflows',
  },
  // ============ KENNELS ============
  {
    target: '[data-tour="kennels-page"]',
    content: "Real-time run availability. Know exactly what's open - no whiteboards, no guessing. Visual layout matches your actual facility.",
    title: 'Facility Map',
    placement: 'bottom',
    disableBeacon: true,
    route: '/kennels',
  },
  {
    target: '[data-tour="kennels-grid"]',
    content: 'Click any kennel for current occupant, upcoming reservations, or to assign a pet. See occupancy at a glance with color indicators.',
    title: 'Kennel Grid',
    placement: 'top',
    disableBeacon: true,
    route: '/kennels',
  },
  // ============ INVOICES ============
  {
    target: '[data-tour="invoices-page"]',
    content: 'Integrated billing. Invoices generate from bookings automatically. No double-entry, no missed charges, no separate accounting app.',
    title: 'Invoicing',
    placement: 'bottom',
    disableBeacon: true,
    route: '/invoices',
  },
  {
    target: '[data-tour="invoices-stats"]',
    content: 'Revenue at a glance. Outstanding balances, overdue invoices, collection status. Know your numbers without running reports.',
    title: 'Financial KPIs',
    placement: 'bottom',
    disableBeacon: true,
    route: '/invoices',
  },
  {
    target: '[data-tour="invoices-table"]',
    content: 'One-click email send. Mark paid, void, send reminders. Integrates with Stripe, Square, and PayPal for online payments.',
    title: 'Invoice Actions',
    placement: 'top',
    disableBeacon: true,
    route: '/invoices',
  },
  // ============ REPORTS ============
  {
    target: '[data-tour="reports-page"]',
    content: 'Business intelligence built in. Revenue trends, occupancy rates, client retention - metrics that help you grow. No spreadsheets needed.',
    title: 'Reports & Analytics',
    placement: 'bottom',
    disableBeacon: true,
    route: '/reports',
  },
  // ============ MESSAGES ============
  {
    target: '[data-tour="messages-page"]',
    content: 'All client communications in one inbox. Email, SMS, and in-app messages with full history. Never lose a conversation or forget a follow-up.',
    title: 'Communications Hub',
    placement: 'bottom',
    disableBeacon: true,
    route: '/messages',
  },
  // ============ SETTINGS ============
  {
    target: '[data-tour="settings-page"]',
    content: 'Customize everything. Services, pricing, booking rules, email templates, staff permissions. Make BarkBase work exactly how your facility operates.',
    title: 'Settings',
    placement: 'right',
    disableBeacon: true,
    route: '/settings',
  },
  // ============ FINAL ============
  {
    target: '[data-tour="sidebar-nav"]',
    content: "That's the tour! Everything you've seen is fully functional - try adding pets, creating bookings, setting up automations. Welcome to BarkBase!",
    title: "You're All Set!",
    placement: 'right',
    disableBeacon: true,
    route: '/today',
  },
];

// Custom tooltip component
const CustomTooltip = ({
  index,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
}) => {
  const isStarStep = step.title?.includes('INLINE') ||
                     step.title?.includes('AUTOMATION') ||
                     step.title?.includes('FEWER');

  return (
    <div
      {...tooltipProps}
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '420px',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}
    >
      {step.title && (
        <div style={{
          color: isStarStep ? '#F59E0B' : '#f1f5f9',
          fontSize: isStarStep ? '15px' : '16px',
          fontWeight: 600,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {isStarStep && <span style={{ fontSize: '18px' }}>⭐</span>}
          {step.title}
        </div>
      )}

      <div style={{
        color: '#cbd5e1',
        fontSize: '14px',
        lineHeight: '1.7',
        marginBottom: '20px',
      }}>
        {step.content}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <button
          {...skipProps}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '8px 12px',
          }}
        >
          Skip Tour
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            {index + 1} / {size}
          </span>

          {index > 0 && (
            <button
              {...backProps}
              style={{
                background: 'none',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '10px 16px',
              }}
            >
              Back
            </button>
          )}

          <button
            {...primaryProps}
            style={{
              backgroundColor: '#F59E0B',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '10px 20px',
            }}
          >
            {index === size - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * GuidedTour component
 */
export default function GuidedTour({ startTour = false, onTourComplete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps] = useState(getTourSteps);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Resume tour after page reload (from cross-route navigation)
  useEffect(() => {
    const pendingStep = sessionStorage.getItem('tour_pending_step');
    if (pendingStep !== null) {
      const stepIdx = parseInt(pendingStep, 10);
      sessionStorage.removeItem('tour_pending_step');

      // Wait for page to settle, then resume tour at the pending step
      const timer = setTimeout(() => {
        setStepIndex(stepIdx);
        setRun(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  // Start tour when triggered - only runs ONCE on initial start
  useEffect(() => {
    if (startTour && !sessionStorage.getItem(TOUR_COMPLETED_KEY) && !sessionStorage.getItem(TOUR_STARTED_KEY)) {
      // Navigate to first step's route if needed
      const firstStep = steps[0];
      if (window.location.pathname !== firstStep.route) {
        navigate(firstStep.route);
      }

      // Start tour after a delay
      const timer = setTimeout(() => {
        setRun(true);
        sessionStorage.setItem(TOUR_STARTED_KEY, 'true');
      }, 800);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTour]); // Only depend on startTour - not location.pathname

  // Handle tour callbacks
  const handleJoyrideCallback = useCallback((data) => {
    const { action, index, status, type } = data;

    // Handle tour completion or skip
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      sessionStorage.setItem(TOUR_COMPLETED_KEY, 'true');

      if (status === STATUS.FINISHED) {
        setShowCompletionModal(true);
      } else if (onTourComplete) {
        onTourComplete();
      }
      return;
    }

    // Handle step transitions
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);

      // Bounds check
      if (nextIndex < 0 || nextIndex >= steps.length) {
        return;
      }

      const nextStep = steps[nextIndex];
      const currentPath = location.pathname;

      // Check if we need to navigate to a different route
      if (nextStep.route && nextStep.route !== currentPath) {
        // 1. STOP the tour first
        setRun(false);

        // 2. Store next step info before navigation (page will reload)
        sessionStorage.setItem('tour_pending_step', nextIndex.toString());

        // 3. NUCLEAR: Full page reload to bypass React Router state issues
        setTimeout(() => {
          window.location.href = nextStep.route;
        }, 0);

        return; // Exit callback early
      } else {
        // Same page - just advance the step
        setStepIndex(nextIndex);
      }
    }
  }, [steps, location.pathname, navigate, onTourComplete]);

  // Handle completion modal close
  const handleCompletionClose = () => {
    setShowCompletionModal(false);
    if (onTourComplete) {
      onTourComplete();
    }
  };

  // Don't render if tour was already completed
  if (sessionStorage.getItem(TOUR_COMPLETED_KEY)) {
    return null;
  }

  return (
    <>
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        hideCloseButton
        run={run}
        scrollToFirstStep
        showProgress
        showSkipButton
        stepIndex={stepIndex}
        steps={steps}
        tooltipComponent={CustomTooltip}
        disableOverlayClose
        spotlightClicks={false}
        spotlightPadding={8}
        styles={{
          options: {
            arrowColor: '#1e293b',
            backgroundColor: '#1e293b',
            overlayColor: 'rgba(0, 0, 0, 0.7)',
            primaryColor: '#F59E0B',
            spotlightShadow: '0 0 30px rgba(245, 158, 11, 0.5)',
            textColor: '#f1f5f9',
            zIndex: 10000,
          },
          spotlight: {
            borderRadius: '8px',
          },
        }}
        floaterProps={{
          disableAnimation: true,
        }}
      />

      <TourCompletionModal
        isOpen={showCompletionModal}
        onClose={handleCompletionClose}
      />
    </>
  );
}

// Export utility to check if tour should run
export const shouldRunTour = () => {
  return !sessionStorage.getItem(TOUR_COMPLETED_KEY);
};

// Export utility to reset tour
export const resetTour = () => {
  sessionStorage.removeItem(TOUR_COMPLETED_KEY);
  sessionStorage.removeItem(TOUR_STARTED_KEY);
};
