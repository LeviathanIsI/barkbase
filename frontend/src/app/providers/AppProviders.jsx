import { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import QueryProvider from './QueryProvider';
import ThemeInitializer from './ThemeInitializer';
import TenantLoader from './TenantLoader';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

const OfflineBoundary = () => {
  useOfflineDetection();
  return null;
};

const AppProviders = ({ children, fallback = null }) => (
  <ThemeInitializer>
    <QueryProvider>
      <OfflineBoundary />
      <TenantLoader />
      <Suspense fallback={fallback}>{children}</Suspense>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </QueryProvider>
  </ThemeInitializer>
);

export default AppProviders;
