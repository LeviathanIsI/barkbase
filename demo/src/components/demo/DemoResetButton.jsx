/**
 * Demo Reset Button
 *
 * Button to reset demo state and refresh the page.
 * Can be placed in the UI for users to start fresh.
 */

import { RotateCcw } from 'lucide-react';
import { resetDemoState } from '@/lib/apiClient';

export function DemoResetButton({ variant = 'default', className = '' }) {
  const handleReset = () => {
    // Reset the in-memory mock data
    resetDemoState();

    // Clear demo-specific localStorage
    try {
      localStorage.removeItem('barkbase-demo-auth');
      localStorage.removeItem('barkbase-demo-tenant');
      localStorage.removeItem('barkbase-demo-ui');
    } catch {
      // Ignore storage errors
    }

    // Refresh the page to reset all React state
    window.location.reload();
  };

  // Variant styles
  const variants = {
    default: `
      inline-flex items-center gap-2 px-4 py-2
      bg-surface-secondary hover:bg-surface-elevated
      text-text-primary
      border border-border
      rounded-md
      text-sm font-medium
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background-primary
    `,
    subtle: `
      inline-flex items-center gap-1.5 px-3 py-1.5
      text-text-secondary hover:text-text-primary
      text-xs font-medium
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-primary-500
    `,
    banner: `
      inline-flex items-center gap-1.5 px-3 py-1
      bg-white/10 hover:bg-white/20
      text-white
      rounded
      text-xs font-medium
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-white/50
    `,
  };

  return (
    <button
      type="button"
      onClick={handleReset}
      className={`${variants[variant]} ${className}`}
      aria-label="Reset demo to initial state"
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Reset Demo</span>
    </button>
  );
}

export default DemoResetButton;
