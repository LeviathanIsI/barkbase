import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

/**
 * ThemeToggle - Beautiful animated toggle button for dark/light mode
 * Features smooth transitions and glow effects
 */
export const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-14 h-8 rounded-full
        transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${isDark
          ? 'bg-primary-600 dark:bg-primary-700 shadow-md'
          : 'bg-primary-500 shadow-sm'
        }
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Sliding toggle knob */}
      <div
        className={`
          absolute top-1 w-6 h-6 rounded-full
          bg-surface dark:bg-gray-900
          shadow-lg
          transform transition-all duration-300 ease-in-out
          flex items-center justify-center
          ${isDark ? 'translate-x-7' : 'translate-x-1'}
        `}
      >
        {isDark ? (
          <Moon className="w-4 h-4 text-primary-500" />
        ) : (
          <Sun className="w-4 h-4 text-secondary-500" />
        )}
      </div>
    </button>
  );
};

/**
 * ThemeToggleIconButton - Icon-only variant for compact spaces
 */
export const ThemeToggleIconButton = ({ className = '' }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-lg
        transition-all duration-200
        hover:bg-surface-secondary
        focus:outline-none focus:ring-2 focus:ring-primary-500
        ${isDark ? 'text-primary-400' : 'text-secondary-600'}
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
};

/**
 * ThemeToggleButton - Text button variant
 */
export const ThemeToggleButton = ({ className = '' }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg
        transition-all duration-200
        text-text
        hover:bg-surface-secondary
        focus:outline-none focus:ring-2 focus:ring-primary-500
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <>
          <Moon className="w-5 h-5" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="w-5 h-5" />
          <span>Light Mode</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
