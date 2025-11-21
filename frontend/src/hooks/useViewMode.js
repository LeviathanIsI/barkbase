import { useState, useEffect } from 'react';

/**
 * Hook for managing view mode preference with localStorage persistence
 *
 * @param {string} storageKey - Unique key for localStorage (e.g., 'bookings-view-mode')
 * @param {string} defaultMode - Default view mode ('table' | 'board' | 'split')
 * @returns {[string, function]} - [currentMode, setMode]
 *
 * @example
 * const [viewMode, setViewMode] = useViewMode('bookings-view', 'table');
 */
export function useViewMode(storageKey, defaultMode = 'table') {
  // Initialize from localStorage or use default
  const [mode, setMode] = useState(() => {
    if (typeof window === 'undefined') return defaultMode;

    const stored = localStorage.getItem(storageKey);
    return stored || defaultMode;
  });

  // Persist to localStorage whenever mode changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, mode);
    }
  }, [mode, storageKey]);

  return [mode, setMode];
}
