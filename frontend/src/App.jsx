import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import AppProviders from '@/app/providers/AppProviders';
import { router } from '@/app/router';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-surface-primary p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-text-primary">
          Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-text-secondary">
          We've been notified and are working on it. Please try again.
        </p>
        <pre className="text-sm text-left bg-gray-100 dark:bg-surface-secondary p-4 rounded-lg overflow-auto max-h-32 text-red-600 dark:text-red-400">
          {error.message}
        </pre>
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-200 dark:bg-surface-secondary text-gray-700 dark:text-text-primary rounded-md hover:bg-gray-300 dark:hover:bg-surface-tertiary transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}

function logError(error, info) {
  // TODO: Send to error tracking service (Sentry, etc.)
  console.error('Error caught by boundary:', error);
  console.error('Component stack:', info.componentStack);
}

const App = () => (
  <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
    <AppProviders fallback={<Skeleton className="h-screen w-full" />}>
      <RouterProvider router={router} />
    </AppProviders>
  </ErrorBoundary>
);

export default App;
