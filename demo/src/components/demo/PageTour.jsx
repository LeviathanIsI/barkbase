import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useTour, TOUR_CONFIG, TOTAL_STEPS } from './TourContext';

// Custom tooltip styles matching BarkBase dark theme
const tooltipStyles = {
  options: {
    backgroundColor: '#1e293b',
    textColor: '#e2e8f0',
    primaryColor: '#3b82f6',
    arrowColor: '#1e293b',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid #334155',
  },
  tooltipTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  tooltipContent: {
    fontSize: '14px',
    lineHeight: '1.6',
  },
  buttonNext: {
    backgroundColor: '#3b82f6',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
  },
  buttonBack: {
    color: '#94a3b8',
    marginRight: '10px',
  },
  buttonSkip: {
    color: '#64748b',
  },
};

export function PageTour({ pageRoute, steps }) {
  const navigate = useNavigate();
  const { active, globalStepIndex, advanceToStep, endTour } = useTour();
  const [run, setRun] = useState(false);
  const [localStepIndex, setLocalStepIndex] = useState(0);

  // Find this page's config - must match both route AND contain the current step
  // (handles pages like /today that appear twice in TOUR_CONFIG for different step ranges)
  const pageConfig = TOUR_CONFIG.find(c => c.route === pageRoute && c.pageSteps.includes(globalStepIndex))
    || TOUR_CONFIG.find(c => c.route === pageRoute);

  // Should this page show tour?
  const shouldRun = active && pageConfig?.pageSteps.includes(globalStepIndex);

  useEffect(() => {
    if (shouldRun && pageConfig) {
      // Calculate local step index within this page's steps
      const localIdx = pageConfig.pageSteps.indexOf(globalStepIndex);
      setLocalStepIndex(localIdx >= 0 ? localIdx : 0);

      // Delay to let page render
      const timer = setTimeout(() => setRun(true), 400);
      return () => clearTimeout(timer);
    } else {
      setRun(false);
    }
  }, [shouldRun, globalStepIndex, pageConfig]);

  const handleCallback = useCallback((data) => {
    const { action, index, status, type } = data;

    // Handle skip or close
    if (status === STATUS.SKIPPED) {
      setRun(false);
      endTour(false);
      return;
    }

    // Handle tour finished on this page
    if (status === STATUS.FINISHED) {
      setRun(false);

      // Check if this is the last step globally
      const lastPageStep = pageConfig.pageSteps[pageConfig.pageSteps.length - 1];
      if (lastPageStep >= TOTAL_STEPS - 1) {
        endTour(true);
        return;
      }

      // Find next page
      const nextGlobalStep = lastPageStep + 1;
      const nextPage = TOUR_CONFIG.find(c => c.pageSteps.includes(nextGlobalStep));

      if (nextPage) {
        advanceToStep(nextGlobalStep);
        // Use window.location for reliable navigation
        window.location.href = nextPage.route;
      } else {
        endTour(true);
      }
      return;
    }

    // Handle step navigation
    if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
      const nextLocalIndex = index + 1;

      // Are we done with this page's steps? Use pageConfig.pageSteps.length, not steps.length
      if (nextLocalIndex >= pageConfig.pageSteps.length) {
        setRun(false);

        // Find next page
        const currentGlobalStep = pageConfig.pageSteps[index];
        const nextGlobalStep = currentGlobalStep + 1;
        const nextPage = TOUR_CONFIG.find(c => c.pageSteps.includes(nextGlobalStep));

        if (nextPage) {
          advanceToStep(nextGlobalStep);
          // Use window.location for reliable navigation
          window.location.href = nextPage.route;
        } else {
          endTour(true);
        }
      } else {
        // Move to next step on same page
        setLocalStepIndex(nextLocalIndex);
        advanceToStep(pageConfig.pageSteps[nextLocalIndex]);
      }
    }

    // Handle back navigation
    if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV) {
      const prevLocalIndex = index - 1;

      if (prevLocalIndex < 0) {
        // Going back to previous page
        setRun(false);
        const currentGlobalStep = pageConfig.pageSteps[0];
        const prevGlobalStep = currentGlobalStep - 1;
        const prevPage = TOUR_CONFIG.find(c => c.pageSteps.includes(prevGlobalStep));

        if (prevPage) {
          advanceToStep(prevGlobalStep);
          window.location.href = prevPage.route;
        }
      } else {
        setLocalStepIndex(prevLocalIndex);
        advanceToStep(pageConfig.pageSteps[prevLocalIndex]);
      }
    }
  }, [pageConfig, steps.length, advanceToStep, endTour]);

  if (!shouldRun || !pageConfig) return null;

  // Determine if this is the last page of the tour
  const lastPageStep = pageConfig.pageSteps[pageConfig.pageSteps.length - 1];
  const isLastPage = lastPageStep >= TOTAL_STEPS - 1;
  const lastButtonText = isLastPage ? 'Finish Tour' : 'Next Page →';

  return (
    <Joyride
      callback={handleCallback}
      continuous
      run={run}
      stepIndex={localStepIndex}
      steps={steps}
      showProgress
      showSkipButton
      disableOverlayClose
      spotlightClicks
      styles={tooltipStyles}
      locale={{
        back: 'Back',
        close: 'Close',
        last: lastButtonText,
        next: 'Next',
        skip: 'Skip Tour',
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}
