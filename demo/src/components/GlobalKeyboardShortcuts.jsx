/**
 * Demo GlobalKeyboardShortcuts Component
 * Simplified version for demo - handles basic navigation shortcuts.
 * Removed slideout dependency for demo simplicity.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, addDays, subDays } from 'date-fns';

// Check if user is typing in an input field
const isTypingInInput = () => {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';

  return isInput || isContentEditable;
};

// Navigation routes mapping for G+key shortcuts
const NAVIGATION_ROUTES = {
  h: '/today',       // Home/Today
  b: '/bookings',    // Bookings
  o: '/owners',      // Owners (customers)
  p: '/pets',        // Pets
  s: '/settings',    // Settings
  t: '/tasks',       // Tasks
  c: '/schedule',    // Calendar/Schedule
  m: '/messages',    // Messages
  r: '/reports',     // Reports
  k: '/kennels',     // Kennels
};

const GlobalKeyboardShortcuts = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State for G-key sequence
  const [gKeyPressed, setGKeyPressed] = useState(false);
  const gKeyTimeoutRef = useRef(null);

  // Clear G-key state
  const clearGKeyState = useCallback(() => {
    setGKeyPressed(false);
    if (gKeyTimeoutRef.current) {
      clearTimeout(gKeyTimeoutRef.current);
      gKeyTimeoutRef.current = null;
    }
  }, []);

  // Open search modal
  const openSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent('bb-open-search'));
  }, []);

  // Open keyboard shortcuts modal
  const openKeyboardShortcutsModal = useCallback(() => {
    window.dispatchEvent(new CustomEvent('bb-open-shortcuts-modal'));
  }, []);

  // Close all modals
  const closeAll = useCallback(() => {
    window.dispatchEvent(new CustomEvent('close-all-modals'));
    window.dispatchEvent(new CustomEvent('bb-close-modal'));

    // Close any dropdowns
    const dropdowns = document.querySelectorAll('[data-dropdown-open="true"]');
    dropdowns.forEach(dropdown => {
      dropdown.setAttribute('data-dropdown-open', 'false');
    });
  }, []);

  // Handle date navigation (for calendar pages)
  const handleDateNavigation = useCallback((e) => {
    if (!location.pathname.includes('schedule') &&
        !location.pathname.includes('calendar') &&
        !location.pathname.includes('today')) {
      return false;
    }

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
      return true;
    }

    // Right arrow - Next day
    if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      const nextDate = format(addDays(dateObj, 1), 'yyyy-MM-dd');
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.set('date', nextDate);
      navigate(`${location.pathname}?${newSearchParams.toString()}`);
      return true;
    }

    // Shift + Left arrow - Previous week
    if (e.key === 'ArrowLeft' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const prevWeek = format(subDays(dateObj, 7), 'yyyy-MM-dd');
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.set('date', prevWeek);
      navigate(`${location.pathname}?${newSearchParams.toString()}`);
      return true;
    }

    // Shift + Right arrow - Next week
    if (e.key === 'ArrowRight' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const nextWeek = format(addDays(dateObj, 7), 'yyyy-MM-dd');
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.set('date', nextWeek);
      navigate(`${location.pathname}?${newSearchParams.toString()}`);
      return true;
    }

    return false;
  }, [location, navigate]);

  // Main keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      const { key, ctrlKey, metaKey, shiftKey } = e;
      const modifierKey = ctrlKey || metaKey;
      const typing = isTypingInInput();

      // Escape - close all modals
      if (key === 'Escape') {
        closeAll();
        clearGKeyState();
        return;
      }

      // Ctrl+K - open search
      if (modifierKey && key === 'k') {
        e.preventDefault();
        openSearch();
        clearGKeyState();
        return;
      }

      // Ctrl+? or Ctrl+/ - keyboard shortcuts modal
      if (modifierKey && (key === '?' || (shiftKey && key === '/'))) {
        e.preventDefault();
        openKeyboardShortcutsModal();
        clearGKeyState();
        return;
      }

      // Don't handle if typing in input
      if (typing) {
        clearGKeyState();
        return;
      }

      // Shift+? - keyboard shortcuts modal
      if (key === '?' && shiftKey) {
        e.preventDefault();
        openKeyboardShortcutsModal();
        clearGKeyState();
        return;
      }

      // Handle date navigation
      if (handleDateNavigation(e)) {
        clearGKeyState();
        return;
      }

      // G-KEY NAVIGATION SEQUENCE
      if (gKeyPressed) {
        const route = NAVIGATION_ROUTES[key.toLowerCase()];
        if (route) {
          e.preventDefault();
          navigate(route);
          clearGKeyState();
          return;
        }
        clearGKeyState();
        return;
      }

      // G key press - start navigation sequence
      if ((key === 'g' || key === 'G') && !modifierKey) {
        setGKeyPressed(true);

        if (gKeyTimeoutRef.current) {
          clearTimeout(gKeyTimeoutRef.current);
        }

        gKeyTimeoutRef.current = setTimeout(() => {
          setGKeyPressed(false);
        }, 1000);
        return;
      }

      // T - jump to today (on calendar pages)
      if ((key === 't' || key === 'T') && !modifierKey && !gKeyPressed) {
        if (location.pathname.includes('schedule') ||
            location.pathname.includes('calendar') ||
            location.pathname.includes('today')) {
          e.preventDefault();
          const today = format(new Date(), 'yyyy-MM-dd');
          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.set('date', today);
          navigate(`${location.pathname}?${newSearchParams.toString()}`);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gKeyTimeoutRef.current) {
        clearTimeout(gKeyTimeoutRef.current);
      }
    };
  }, [
    gKeyPressed,
    clearGKeyState,
    closeAll,
    openSearch,
    openKeyboardShortcutsModal,
    handleDateNavigation,
    navigate,
    location,
  ]);

  // Render G-key indicator when waiting for second key
  if (!gKeyPressed) {
    return null;
  }

  return (
    <div
      className="fixed bottom-16 left-4 z-40 rounded-lg px-4 py-2 shadow-lg"
      style={{
        backgroundColor: 'var(--bb-color-bg-elevated)',
        border: '1px solid var(--bb-color-border-subtle)',
      }}
    >
      <div className="flex items-center gap-2 text-sm">
        <kbd
          className="inline-flex items-center justify-center min-w-[24px] px-2 py-1 text-xs font-medium rounded border"
          style={{
            backgroundColor: 'var(--bb-color-accent)',
            borderColor: 'var(--bb-color-accent)',
            color: 'white',
          }}
        >
          G
        </kbd>
        <span className="text-[color:var(--bb-color-text-muted)]">
          + H(ome) B(ookings) O(wners) P(ets) S(ettings)
        </span>
      </div>
    </div>
  );
};

export default GlobalKeyboardShortcuts;
