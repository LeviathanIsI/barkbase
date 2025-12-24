/**
 * Demo NotFound Page
 * Shows when user navigates to a route not available in demo.
 */

import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center"
      style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
    >
      <span className="text-4xl">🐕</span>
    </div>

    <div className="space-y-2">
      <p
        className="text-xs uppercase tracking-widest font-semibold"
        style={{ color: 'var(--bb-color-accent)' }}
      >
        Demo Mode
      </p>
      <h1
        className="text-2xl font-semibold"
        style={{ color: 'var(--bb-color-text-primary)' }}
      >
        This page isn't in the demo
      </h1>
      <p
        className="max-w-md text-sm"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        The demo includes Dashboard, Owners, Pets, Bookings, Vaccinations, and Check-in.
        Sign up for the full BarkBase experience!
      </p>
    </div>

    <div className="flex gap-3">
      <Link
        to="/today"
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors"
        style={{
          backgroundColor: 'var(--bb-color-accent)',
          color: 'white',
        }}
      >
        <Home className="w-4 h-4" />
        Go to Dashboard
      </Link>
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border transition-colors"
        style={{
          borderColor: 'var(--bb-color-border-default)',
          color: 'var(--bb-color-text-primary)',
          backgroundColor: 'var(--bb-color-bg-surface)',
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Go Back
      </button>
    </div>
  </div>
);

export default NotFound;
