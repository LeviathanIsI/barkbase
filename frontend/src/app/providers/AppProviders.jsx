import { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import QueryProvider from './QueryProvider';
import ThemeInitializer from './ThemeInitializer';
import TenantLoader from './TenantLoader';
import TokenRefresher from './TokenRefresher';
import AuthLoader from './AuthLoader';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { RealtimeClient } from '@/lib/realtime';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';

const OfflineBoundary = () => {
  useOfflineDetection();
  return null;
};

const RealtimeProvider = ({ children }) => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const tenant = useTenantStore((s) => s.tenant?.slug);
  const [client, setClient] = useState(null);
  useEffect(() => {
    if (!accessToken || !tenant) return;
    const url = import.meta.env.VITE_REALTIME_URL || 'ws://localhost:4000/realtime';
    const c = new RealtimeClient(url, accessToken, tenant);
    c.connect();
    setClient(c);
    return () => c.disconnect();
  }, [accessToken, tenant]);
  return children;
};

const AppProviders = ({ children, fallback = null }) => (
  <ThemeInitializer>
    <QueryProvider>
      <RealtimeProvider>
      <OfflineBoundary />
      <AuthLoader />
      <TenantLoader />
      <TokenRefresher />
      <Suspense fallback={fallback}>{children}</Suspense>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </RealtimeProvider>
    </QueryProvider>
  </ThemeInitializer>
);

export default AppProviders;
