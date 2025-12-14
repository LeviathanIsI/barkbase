import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_ENV || 'production',

      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],

      // Performance monitoring
      tracesSampleRate: 0.1, // 10% of transactions

      // Session replay for errors
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Filter out noise
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error promise rejection captured',
        /Loading chunk \d+ failed/,
        /Network Error/,
        /AbortError/,
        /ChunkLoadError/,
      ],

      // Don't send PII
      beforeSend(event) {
        // Remove sensitive data
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['X-Tenant-Id'];
        }
        return event;
      },
    });
  }
}

// Set user context after login
export function setSentryUser(user) {
  if (import.meta.env.PROD && user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      // Don't include name for privacy
    });
  }
}

// Clear user on logout
export function clearSentryUser() {
  Sentry.setUser(null);
}

// Set tenant context
export function setSentryTenant(tenant) {
  if (import.meta.env.PROD && tenant) {
    Sentry.setTag('tenant_id', tenant.id);
    Sentry.setTag('tenant_name', tenant.name);
  }
}

// Capture custom error with context
export function captureError(error, context = {}) {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error:', error, context);
  }
}

// Track custom event
export function trackEvent(name, data = {}) {
  if (import.meta.env.PROD) {
    Sentry.captureMessage(name, {
      level: 'info',
      extra: data,
    });
  }
}

// Export Sentry for ErrorBoundary usage
export { Sentry };
