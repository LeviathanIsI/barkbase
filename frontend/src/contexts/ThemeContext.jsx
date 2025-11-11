import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * ThemeContext - Manages dark/light mode theme switching
 * Uses localStorage to persist user preference
 * Applies .dark class to document element for CSS-based theming
 */

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or default to 'dark'
  const [theme, setThemeState] = useState(() => {
    const savedTheme = localStorage.getItem('barkbase-theme');
    return savedTheme || 'dark';
  });

  // Apply theme class to document element
  useEffect(() => {
    const root = document.documentElement;

    // Remove both classes first
    root.classList.remove('light', 'dark');

    // Add the current theme class
    root.classList.add(theme);

    // Save to localStorage
    localStorage.setItem('barkbase-theme', theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme);
    } else {
      console.warn(`Invalid theme: ${newTheme}. Use 'light' or 'dark'`);
    }
  };

  const toggleTheme = () => {
    setThemeState(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const value = {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
