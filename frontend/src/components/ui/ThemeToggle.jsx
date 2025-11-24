import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ThemeToggle - Beautiful animated toggle button for dark/light mode
 * Uses --bb-color-toggle-* tokens for consistent styling across light/dark themes
 */
export const ThemeToggle = ({ className = '' }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-7 w-12 items-center rounded-full border transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-[color:var(--bb-color-accent)] focus-visible:ring-offset-transparent',
        className,
      )}
      style={{
        backgroundColor: 'var(--bb-color-toggle-track-bg)',
        borderColor: 'var(--bb-color-toggle-track-border)',
      }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Sliding toggle knob */}
      <span
        className={cn(
          'pointer-events-none absolute inline-flex h-5 w-5 transform items-center justify-center rounded-full shadow-sm transition-transform duration-200',
          isDark ? 'translate-x-[22px]' : 'translate-x-[2px]',
        )}
        style={{
          backgroundColor: 'var(--bb-color-toggle-knob-bg)',
        }}
      >
        {isDark ? (
          <Moon
            className="h-3 w-3"
            style={{ color: 'var(--bb-color-toggle-icon-moon)' }}
          />
        ) : (
          <Sun
            className="h-3 w-3"
            style={{ color: 'var(--bb-color-toggle-icon-sun)' }}
          />
        )}
      </span>
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
      type="button"
      onClick={toggleTheme}
      className={cn(
        'p-2 rounded-lg transition-all duration-200',
        'hover:bg-[color:var(--bb-color-bg-elevated)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--bb-color-accent)]',
        className,
      )}
      style={{
        color: isDark
          ? 'var(--bb-color-toggle-icon-sun)'
          : 'var(--bb-color-toggle-icon-moon)',
      }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
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
      type="button"
      onClick={toggleTheme}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
        'hover:bg-[color:var(--bb-color-bg-elevated)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--bb-color-accent)]',
        className,
      )}
      style={{ color: 'var(--bb-color-text-primary)' }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <>
          <Moon className="h-5 w-5" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="h-5 w-5" />
          <span>Light Mode</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
