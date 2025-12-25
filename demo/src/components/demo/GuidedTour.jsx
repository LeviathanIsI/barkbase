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

// Tour steps configuration
const getTourSteps = () => [
  {
    target: '[data-tour="sidebar-nav"]',
    content: 'Everything organized in one place. Clients, Operations, Communications, Finance - all accessible instantly.',
    title: 'Sidebar Navigation',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="command-center"]',
    content: "Your daily HQ. See today's arrivals, departures, occupancy, and alerts at a glance. No digging through menus.",
    title: 'Command Center',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="quick-actions"]',
    content: "This is our core philosophy. Other software makes you click through 5+ screens to complete a task. With BarkBase, open a slideout and handle it right here - check-ins, new bookings, add pets, send messages - all without leaving your current screen.",
    title: 'DO EVERYTHING FROM ANYWHERE (DEFA)',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="owners-page"]',
    content: 'Full client profiles with contact info, pets, and booking history.',
    title: 'Owners Page',
    placement: 'bottom',
    disableBeacon: true,
    route: '/owners',
  },
  {
    target: '[data-tour="inline-edit-owner"]',
    content: "Click any field - name, phone, email, address - and edit it directly. No forms to open, no save buttons to hunt for. Changes save automatically. Our competitors don't do this.",
    title: 'INLINE EDITING',
    placement: 'right',
    disableBeacon: true,
    route: `/owners/${DEMO_OWNER_ID}`,
  },
  {
    target: '[data-tour="pets-page"]',
    content: 'This page is fully interactive! Try adding a pet, editing details, or viewing health records.',
    title: 'Pets Page',
    placement: 'bottom',
    disableBeacon: true,
    route: '/pets',
  },
  {
    target: '[data-tour="inline-edit-pet"]',
    content: "Same inline editing here. Click the pet's name, breed, weight, or any field to update instantly. Staff spends less time on computers, more time with animals.",
    title: 'INLINE EDITING',
    placement: 'right',
    disableBeacon: true,
    route: `/pets/${DEMO_PET_ID}`,
  },
  {
    target: '[data-tour="pet-health-tab"]',
    content: 'Vaccination tracking with one-click renewals. See what\'s current, expiring soon, or overdue instantly. Renew a vaccine with one click - it archives the old record and creates a new one. Full history preserved.',
    title: 'Pet Health Tab',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="bookings-calendar"]',
    content: 'Visual scheduling. See your entire week at a glance. Drag-and-drop coming soon.',
    title: 'Bookings Calendar',
    placement: 'bottom',
    disableBeacon: true,
    route: '/bookings',
  },
  {
    target: '[data-tour="workflows-page"]',
    content: 'Auto-send vaccination reminders 2 weeks before expiry, welcome emails to new clients, post-stay feedback requests. Set it and forget it.',
    title: 'AUTOMATION INCLUDED',
    placement: 'bottom',
    disableBeacon: true,
    route: '/workflows',
  },
  {
    target: '[data-tour="kennels-page"]',
    content: 'Real-time run availability. Know exactly what\'s open without checking a whiteboard.',
    title: 'Kennels/Runs',
    placement: 'bottom',
    disableBeacon: true,
    route: '/kennels',
  },
  {
    target: '[data-tour="invoices-page"]',
    content: 'Integrated billing. Generate invoices from bookings automatically. No double-entry.',
    title: 'Invoices & Payments',
    placement: 'bottom',
    disableBeacon: true,
    route: '/invoices',
  },
];

// Custom tooltip styles matching BarkBase branding
const tooltipStyles = {
  options: {
    arrowColor: '#1e293b',
    backgroundColor: '#1e293b',
    overlayColor: 'rgba(0, 0, 0, 0.7)',
    primaryColor: '#F59E0B',
    spotlightShadow: '0 0 30px rgba(245, 158, 11, 0.5)',
    textColor: '#f1f5f9',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '12px',
    padding: '20px',
    maxWidth: '400px',
  },
  tooltipContainer: {
    textAlign: 'left',
  },
  tooltipTitle: {
    color: '#F59E0B',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  tooltipContent: {
    fontSize: '14px',
    lineHeight: '1.6',
  },
  buttonNext: {
    backgroundColor: '#F59E0B',
    borderRadius: '8px',
    color: '#000',
    fontSize: '14px',
    fontWeight: 600,
    padding: '10px 20px',
  },
  buttonBack: {
    color: '#94a3b8',
    fontSize: '14px',
    marginRight: '10px',
  },
  buttonSkip: {
    color: '#64748b',
    fontSize: '13px',
  },
  spotlight: {
    borderRadius: '8px',
  },
};

// Custom tooltip component
const CustomTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
}) => {
  const isStarStep = step.title?.includes('INLINE') ||
                     step.title?.includes('DEFA') ||
                     step.title?.includes('AUTOMATION');

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
          {isStarStep && <span style={{ fontSize: '18px' }}>*</span>}
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
 * @param {Object} props
 * @param {boolean} props.startTour - Whether to start the tour
 * @param {Function} props.onTourComplete - Callback when tour is completed
 */
export default function GuidedTour({ startTour = false, onTourComplete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState([]);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Initialize tour steps
  useEffect(() => {
    setSteps(getTourSteps());
  }, []);

  // Start tour when triggered
  useEffect(() => {
    if (startTour && !sessionStorage.getItem(TOUR_COMPLETED_KEY)) {
      // Navigate to Command Center first
      if (location.pathname !== '/today') {
        navigate('/today');
      }
      // Small delay to ensure page is loaded
      const timer = setTimeout(() => {
        setRun(true);
        sessionStorage.setItem(TOUR_STARTED_KEY, 'true');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [startTour, navigate, location.pathname]);

  // Handle tour callbacks
  const handleJoyrideCallback = useCallback((data) => {
    const { action, index, status, type } = data;

    // Handle step changes
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      const nextStep = steps[nextStepIndex];

      // If next step requires navigation
      if (nextStep?.route && location.pathname !== nextStep.route) {
        setRun(false);
        navigate(nextStep.route);

        // Wait for navigation and DOM update
        setTimeout(() => {
          setStepIndex(nextStepIndex);
          setRun(true);
        }, 800);
      } else {
        setStepIndex(nextStepIndex);
      }
    }

    // Handle tour completion
    if (status === STATUS.FINISHED) {
      setRun(false);
      sessionStorage.setItem(TOUR_COMPLETED_KEY, 'true');
      setShowCompletionModal(true);
    }

    // Handle tour skip
    if (status === STATUS.SKIPPED) {
      setRun(false);
      sessionStorage.setItem(TOUR_COMPLETED_KEY, 'true');
      if (onTourComplete) {
        onTourComplete();
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

  // Check if tour was already completed
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
        styles={tooltipStyles}
        tooltipComponent={CustomTooltip}
        disableOverlayClose
        spotlightClicks={false}
        spotlightPadding={8}
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
