/**
 * Demo Query Provider
 * Provides React Query client for data fetching.
 */

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - demo data stays fresh
        gcTime: 30 * 60 * 1000,   // 30 minutes cache time
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 0, // No retries for demo
      },
      mutations: {
        retry: 0,
      },
    },
  });

const QueryProvider = ({ children }) => {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider;
