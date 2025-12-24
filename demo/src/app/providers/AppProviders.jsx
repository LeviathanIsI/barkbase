/**
 * Demo App Providers
 * Simplified providers for demo mode.
 * No auth loaders, no realtime, no token refresh.
 */

import { ThemeProvider } from '@/contexts/ThemeContext';
import { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import QueryProvider from './QueryProvider';
import PageLoader from '@/components/PageLoader';

const AppProviders = ({ children, fallback = null }) => (
  <ThemeProvider>
    <QueryProvider>
      <Suspense fallback={fallback || <PageLoader />}>
        {children}
      </Suspense>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bb-color-bg-elevated)',
            color: 'var(--bb-color-text-primary)',
            border: '1px solid var(--bb-color-border-subtle)',
          },
        }}
      />
    </QueryProvider>
  </ThemeProvider>
);

export default AppProviders;
