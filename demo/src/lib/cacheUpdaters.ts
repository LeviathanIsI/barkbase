import { QueryClient } from '@tanstack/react-query';

export const cacheUpdaters = {
  'booking.updated': (q: QueryClient, booking: any) => {
    if (!booking?.recordId) return;
    q.setQueryData(['bookings', 'id', booking.recordId], booking);
    q.setQueriesData({ queryKey: ['bookings'] }, (prev: any) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((b) => (b?.recordId === booking.recordId ? booking : b));
    });
  },
  'booking.created': (q: QueryClient, booking: any) => {
    q.setQueriesData({ queryKey: ['bookings'] }, (prev: any) => {
      if (!Array.isArray(prev)) return prev;
      const exists = prev.some((b) => b?.recordId === booking?.recordId);
      return exists ? prev : [booking, ...prev];
    });
  },
  'booking.deleted': (q: QueryClient, id: string) => {
    q.setQueriesData({ queryKey: ['bookings'] }, (prev: any) => {
      if (!Array.isArray(prev)) return prev;
      return prev.filter((b) => b?.recordId !== id);
    });
  },
  'occupancy.updated': (q: QueryClient, payload: { dateISO: string; data: any }) => {
    if (!payload?.dateISO) return;
    q.setQueryData(['facility', 'occupancy', payload.dateISO], payload.data);
  },
  'kennel.updated': (q: QueryClient, kennel: any) => {
    q.setQueriesData({ queryKey: ['kennels'] }, (prev: any) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((k) => (k?.recordId === kennel?.recordId ? kennel : k));
    });
  },
};


