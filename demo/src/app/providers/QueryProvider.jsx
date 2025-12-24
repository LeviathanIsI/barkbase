import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh longer
        gcTime: 10 * 60 * 1000,   // 10 minutes cache time
        refetchOnWindowFocus: false, // Don't refetch when user switches tabs (prevents skeleton flash)
        refetchOnReconnect: false,   // Don't auto-refetch on reconnect
        retry: 1,
        retryDelay: 1000,
      },
      mutations: {
        retry: 1,
      },
    },
  });

const QueryProvider = ({ children }) => {
  const [queryClient] = useState(() => createQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export default QueryProvider;
