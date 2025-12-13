import { AlertTriangle, Building, Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

/**
 * OverbookingAlert - Shows capacity status for a date range
 *
 * Displays a warning if facility is at or near capacity for the selected dates.
 * Uses the availability endpoint to check real-time capacity.
 *
 * @param {object} props
 * @param {string} [props.kennelId] - Optional specific kennel to check
 * @param {string} props.startDate - Start date (ISO string)
 * @param {string} props.endDate - End date (ISO string)
 * @param {function} [props.onResolveOverbooking] - Callback when user wants to resolve
 */
const OverbookingAlert = ({
  kennelId,
  startDate,
  endDate,
  onResolveOverbooking,
}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const enabled = isAuthenticated && Boolean(tenantId) && !!startDate && !!endDate;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.occupancy(tenantKey, { kennelId, startDate, endDate }),
    queryFn: async () => {
      if (!enabled) return null;
      try {
        const params = new URLSearchParams({ startDate, endDate });
        if (kennelId) params.append('kennelId', kennelId);

        const res = await apiClient.get(
          `${canonicalEndpoints.bookings.list}/availability?${params.toString()}`
        );
        return res?.data;
      } catch (e) {
        console.warn('[OverbookingAlert] Failed to check availability:', e?.message);
        return null;
      }
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Don't show if loading, no data, or has capacity
  if (!startDate || !endDate || isLoading || !data) {
    return null;
  }

  // Calculate capacity percentage
  const { hasCapacity, totalCapacity, currentOccupancy, availableSlots, message } = data;

  // No capacity configured - don't show alert
  if (totalCapacity === 0 || availableSlots === -1) {
    return null;
  }

  const capacityPercentage = totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0;

  // Show danger alert if at or over capacity
  if (!hasCapacity) {
    return (
      <Alert variant="danger" icon={AlertTriangle} title="At Full Capacity">
        <p className="text-sm mb-2">
          {message || `The facility is at full capacity (${currentOccupancy}/${totalCapacity}) for the selected dates.`}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span className="flex items-center gap-1">
            <Building className="h-4 w-4" />
            {currentOccupancy}/{totalCapacity} occupied
          </span>
        </div>
        {onResolveOverbooking && (
          <Button size="sm" variant="outline" onClick={onResolveOverbooking} className="mt-3">
            View Options
          </Button>
        )}
      </Alert>
    );
  }

  // Show warning if nearly full (>80% capacity)
  if (capacityPercentage >= 80) {
    return (
      <Alert variant="warning" icon={Info} title="High Capacity">
        <p className="text-sm mb-2">
          The facility is at {capacityPercentage}% capacity for these dates. Only {availableSlots} slot{availableSlots !== 1 ? 's' : ''} remaining.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span className="flex items-center gap-1">
            <Building className="h-4 w-4" />
            {currentOccupancy}/{totalCapacity} occupied
          </span>
        </div>
      </Alert>
    );
  }

  // No alert needed - plenty of capacity
  return null;
};

export default OverbookingAlert;
