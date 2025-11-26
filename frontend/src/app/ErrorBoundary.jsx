import { Component } from 'react';

/**
 * Error Boundary component to catch React rendering errors and prevent white screen of death.
 * Provides fallback UI and error logging capabilities.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('React Error Boundary caught an error:', error, errorInfo);

    // Send to error monitoring service when configured
    if (window.Sentry) {
      window.Sentry.captureException(error, { 
        extra: errorInfo,
        tags: {
          component: 'ErrorBoundary'
        }
      });
    }
    
    // NOTE: Backend error logging endpoint not implemented.
    // Errors are logged to console and Sentry (when configured).

    this.setState({
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-surface-secondary px-4"
        >
          <div className="max-w-md w-full bg-white dark:bg-surface-primary rounded-lg shadow-lg p-8 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-2">
              Something went wrong
            </h1>

            <p className="text-gray-600 dark:text-text-secondary mb-6">
              We're sorry, but something unexpected happened. Please try reloading the page.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left bg-gray-100 dark:bg-surface-secondary rounded p-4 overflow-auto max-h-48">
                <summary className="cursor-pointer font-semibold text-sm text-gray-700 dark:text-text-primary mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs text-red-600 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="px-6 py-2 bg-gray-200 dark:bg-surface-border text-gray-700 dark:text-text-primary rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>

            <p className="mt-6 text-sm text-gray-500 dark:text-text-secondary">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
