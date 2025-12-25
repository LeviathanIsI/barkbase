/**
 * Demo App Entry Point
 * Main application component for BarkBase demo.
 */

import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import AppProviders from '@/app/providers/AppProviders';
import { router } from '@/app/router';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-body, #0f172a)' }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
        >
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">
            Something went wrong
          </h1>
          <p className="text-gray-400">
            The demo encountered an error. This might happen with incomplete features.
          </p>
        </div>

        <pre className="text-sm text-left bg-gray-800 p-4 rounded-lg overflow-auto max-h-32 text-red-400 border border-gray-700">
          {error.message}
        </pre>

        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/today'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function logError() {
  // Error logging disabled in demo
}

const App = () => (
  <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </ErrorBoundary>
);

export default App;
