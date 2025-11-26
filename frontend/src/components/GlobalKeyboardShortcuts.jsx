import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, addDays, subDays } from 'date-fns';

/**
 * GlobalKeyboardShortcuts Component
 * Handles application-wide keyboard shortcuts
 * Phase 2 UI/UX Improvements
 */
const GlobalKeyboardShortcuts = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is typing in an input or textarea
      if (e.target.matches('input, textarea, select')) {
        return;
      }

      // Global ESC to close modals
      if (e.key === 'Escape') {
        // Close any open modals by dispatching a custom event
        window.dispatchEvent(new CustomEvent('close-all-modals'));

        // Also check for any elements with data-close-on-esc attribute
        const closeButtons = document.querySelectorAll('[data-close-on-esc]');
        closeButtons.forEach(btn => btn.click());

        // Close any dropdowns
        const dropdowns = document.querySelectorAll('[data-dropdown-open="true"]');
        dropdowns.forEach(dropdown => {
          dropdown.setAttribute('data-dropdown-open', 'false');
        });
      }

      // Arrow keys for date navigation (on schedule and calendar pages)
      if (location.pathname.includes('schedule') ||
          location.pathname.includes('calendar') ||
          location.pathname.includes('today')) {

        // Get current date from URL params or use today
        const searchParams = new URLSearchParams(location.search);
        const currentDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
        const dateObj = new Date(currentDate + 'T00:00:00');

        // Left arrow - Previous day
        if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          const prevDate = format(subDays(dateObj, 1), 'yyyy-MM-dd');
          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.set('date', prevDate);
          navigate(`${location.pathname}?${newSearchParams.toString()}`);
        }

        // Right arrow - Next day
        if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          const nextDate = format(addDays(dateObj, 1), 'yyyy-MM-dd');
          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.set('date', nextDate);
          navigate(`${location.pathname}?${newSearchParams.toString()}`);
        }

        // T for Today (jump to current date)
        if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          const today = format(new Date(), 'yyyy-MM-dd');
          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.set('date', today);
          navigate(`${location.pathname}?${newSearchParams.toString()}`);
        }

        // Shift + Left arrow - Previous week
        if (e.key === 'ArrowLeft' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          const prevWeek = format(subDays(dateObj, 7), 'yyyy-MM-dd');
          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.set('date', prevWeek);
          navigate(`${location.pathname}?${newSearchParams.toString()}`);
        }

        // Shift + Right arrow - Next week
        if (e.key === 'ArrowRight' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          const nextWeek = format(addDays(dateObj, 7), 'yyyy-MM-dd');
          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.set('date', nextWeek);
          navigate(`${location.pathname}?${newSearchParams.toString()}`);
        }
      }

      // Additional global shortcuts

      // ? for help/shortcuts reference
      if (e.key === '?' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        // Dispatch event to show help modal
        window.dispatchEvent(new CustomEvent('show-help-modal'));
      }

      // G then H for Go Home
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        // Set up listener for next key
        const handleNextKey = (e2) => {
          if (e2.key === 'h') {
            e2.preventDefault();
            navigate('/today');
          }
          window.removeEventListener('keydown', handleNextKey);
        };
        window.addEventListener('keydown', handleNextKey);

        // Remove listener after 1 second if no key pressed
        setTimeout(() => {
          window.removeEventListener('keydown', handleNextKey);
        }, 1000);
      }

      // G then P for Go to Pets & People
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        const handleNextKey = (e2) => {
          if (e2.key === 'p') {
            e2.preventDefault();
            navigate('/pets');
          }
          window.removeEventListener('keydown', handleNextKey);
        };
        window.addEventListener('keydown', handleNextKey);
        setTimeout(() => {
          window.removeEventListener('keydown', handleNextKey);
        }, 1000);
      }

      // G then B for Go to Bookings
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        const handleNextKey = (e2) => {
          if (e2.key === 'b') {
            e2.preventDefault();
            navigate('/bookings');
          }
          window.removeEventListener('keydown', handleNextKey);
        };
        window.addEventListener('keydown', handleNextKey);
        setTimeout(() => {
          window.removeEventListener('keydown', handleNextKey);
        }, 1000);
      }

      // G then S for Go to Settings
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        const handleNextKey = (e2) => {
          if (e2.key === 's') {
            e2.preventDefault();
            navigate('/settings');
          }
          window.removeEventListener('keydown', handleNextKey);
        };
        window.addEventListener('keydown', handleNextKey);
        setTimeout(() => {
          window.removeEventListener('keydown', handleNextKey);
        }, 1000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location, navigate]);

  // Component doesn't render anything, just handles keyboard events
  return null;
};

export default GlobalKeyboardShortcuts;