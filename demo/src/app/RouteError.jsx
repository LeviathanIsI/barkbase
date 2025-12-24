/**
 * Demo Route Error Component
 * Shows when a route fails to render.
 */

import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

export default function RouteError() {
  const err = useRouteError();
  console.error('[RouteError]', err);

  const isResponseError = isRouteErrorResponse(err);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-body)' }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--bb-color-status-negative-soft)' }}
        >
          <AlertTriangle
            className="w-8 h-8"
            style={{ color: 'var(--bb-color-status-negative)' }}
          />
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {isResponseError ? `${err.status} Error` : 'Something went wrong'}
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            {isResponseError
              ? err.statusText
              : "We hit a snag loading this page. This is a demo, so things might be a bit rough around the edges!"}
          </p>
        </div>

        {err?.message && (
          <pre
            className="text-xs text-left p-4 rounded-lg overflow-auto max-h-32"
            style={{
              backgroundColor: 'var(--bb-color-bg-elevated)',
              color: 'var(--bb-color-status-negative)',
              border: '1px solid var(--bb-color-border-subtle)',
            }}
          >
            {err.message}
          </pre>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bb-color-accent)',
              color: 'white',
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
          <Link
            to="/today"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              borderColor: 'var(--bb-color-border-default)',
              color: 'var(--bb-color-text-primary)',
              backgroundColor: 'var(--bb-color-bg-surface)',
            }}
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
