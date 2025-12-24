import { useQuery, UseQueryOptions, QueryKey, QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { cacheUpdaters } from './cacheUpdaters';
import { RealtimeClient, useRealtime } from './realtime';

export function useLiveQuery<TQueryFnData, TError = unknown, TData = TQueryFnData>(
  key: QueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options: UseQueryOptions<TQueryFnData, TError, TData> & { client?: RealtimeClient | null; events?: string[] } = {}
) {
  const { client = null, events = [], ...rest } = options as any;
  const query = useQuery<TQueryFnData, TError, TData>({ queryKey: key, queryFn, refetchOnWindowFocus: false, ...rest });
  const qc = useQueryClient();

  useRealtime(client, events.length ? (evt) => {
    if (!events.includes(evt.type)) return;
    const updater = (cacheUpdaters as any)[evt.type];
    if (typeof updater === 'function') updater(qc as QueryClient, evt.payload);
  } : null);

  return query;
}


