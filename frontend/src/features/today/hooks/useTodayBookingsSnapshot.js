import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';

const normalizeBookings = (response) => {
  if (!response) return [];
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

export const getTodayBookingsSnapshotKey = (date) => ['today-bookings-snapshot', date];

const useTodayBookingsSnapshot = (date) => {
  return useQuery({
    queryKey: getTodayBookingsSnapshotKey(date),
    queryFn: async () => {
      const [dateResponse, checkedInResponse] = await Promise.all([
        apiClient.get(canonicalEndpoints.bookings.list, { params: { date } }),
        apiClient.get(canonicalEndpoints.bookings.list, { params: { status: 'CHECKED_IN' } }),
      ]);

      const dateBookings = normalizeBookings(dateResponse);
      const checkedInBookings = normalizeBookings(checkedInResponse);

      const arrivalsToday = dateBookings.filter((b) => {
        const status = b.status || b.bookingStatus;
        const isPendingOrConfirmed = status === 'PENDING' || status === 'CONFIRMED';
        const startDate = new Date(b.startDate || b.checkInDate).toISOString().split('T')[0];
        return isPendingOrConfirmed && startDate === date;
      });

      const departuresToday = checkedInBookings.filter((b) => {
        const endDate = new Date(b.endDate || b.checkOutDate).toISOString().split('T')[0];
        return endDate === date;
      });

      return {
        arrivalsToday,
        departuresToday,
        inFacility: checkedInBookings,
      };
    },
    refetchInterval: 30000,
    staleTime: 30000,
    keepPreviousData: true,
  });
};

export default useTodayBookingsSnapshot;

