/**
 * DemoModeContext - Manages demo mode state and route permissions
 *
 * Interactive routes (full CRUD): Command Center, Owners, Pets, Vaccinations,
 * Owner Details, Pet Details
 *
 * All other routes show mock data - users can explore but changes won't persist
 */
import { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

// Routes where full interactivity is allowed
const INTERACTIVE_ROUTES = [
  '/today',           // Command Center
  '/owners',          // Owners list
  '/pets',            // Pets list
  '/vaccinations',    // Vaccinations
];

// Route patterns that allow interactivity (with params)
const INTERACTIVE_PATTERNS = [
  /^\/owners\/[^/]+$/,           // Owner details (e.g., /owners/123)
  /^\/owners\/[^/]+\/record\/.+/, // Owner details new ID format
  /^\/pets\/[^/]+$/,             // Pet details (e.g., /pets/456)
  /^\/pets\/[^/]+\/record\/.+/,  // Pet details new ID format
];

const DemoModeContext = createContext({
  isViewOnly: false,
  isInteractive: true,
});

export function DemoModeProvider({ children }) {
  const location = useLocation();

  const demoState = useMemo(() => {
    const path = location.pathname;

    // Check exact route matches
    const isExactMatch = INTERACTIVE_ROUTES.some(route => path === route);

    // Check pattern matches
    const isPatternMatch = INTERACTIVE_PATTERNS.some(pattern => pattern.test(path));

    const isInteractive = isExactMatch || isPatternMatch;

    return {
      isViewOnly: !isInteractive,
      isInteractive,
      currentPath: path,
    };
  }, [location.pathname]);

  return (
    <DemoModeContext.Provider value={demoState}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
