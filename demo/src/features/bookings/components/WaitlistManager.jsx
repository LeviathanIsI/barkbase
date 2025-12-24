import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useBookingStore } from '@/stores/booking';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';
import { promoteFromWaitlist } from '../api';

const WaitlistManager = () => {
  const waitlist = useBookingStore((state) => state.waitlist);
  const upsertBooking = useBookingStore((state) => state.upsertBooking);
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState(null);

  const handlePromote = async (entry, overrides = {}) => {
    const payload = {};
    if (overrides.kennelId) {
      payload.kennelId = overrides.kennelId;
    }
    if (overrides.startDate) {
      payload.startDate = overrides.startDate;
    }
    if (overrides.endDate) {
      payload.endDate = overrides.endDate;
    }

    setProcessingId(entry.recordId);
    try {
      const promoted = await promoteFromWaitlist(entry.recordId, payload);
      toast.success(`Promoted ${entry.pet?.name ?? 'booking'} from waitlist.`);
      const normalised = {
        ...promoted,
        petName: promoted.pet?.name ?? promoted.petName,
        ownerName: promoted.owner
          ? `${promoted.owner.firstName} ${promoted.owner.lastName}`
          : promoted.ownerName,
        dateRange: { start: promoted.checkIn, end: promoted.checkOut },
        kennelId:
          promoted.kennelId ??
          promoted.segments?.[0]?.kennelId ??
          promoted.segments?.[0]?.kennel?.recordId ??
          null,
        kennelName: promoted.kennelName ?? promoted.segments?.[0]?.kennel?.name ?? '',
      };
      upsertBooking(normalised);
      const nextState = useBookingStore.getState();
      nextState.setWaitlist(nextState.bookings.filter((item) => item.status === 'PENDING'));
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
    } catch (error) {
      toast.error(error.message ?? 'Failed to promote from waitlist.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card
      title="Waitlist"
      description="Fills cancellations automatically based on preferences and kennel capacity."
    >
      {waitlist.length === 0 ? (
        <p className="text-xs text-muted">No pets are waiting right now.</p>
      ) : (
        <ul className="space-y-4 text-sm">
          {waitlist.map((entry) => {
            const startIso = entry.dateRange?.start ?? entry.checkIn;
            const endIso = entry.dateRange?.end ?? entry.checkOut;
            const start = parseISO(startIso);
            const end = parseISO(endIso);
            const nights = differenceInCalendarDays(end, start) || 1;
            const kennelName = entry.kennelName ?? entry.segments?.[0]?.kennel?.name ?? 'Preferred';
            const kennelId = entry.kennelId ?? entry.segments?.[0]?.kennelId ?? null;

            return (
              <li key={entry.recordId} className="rounded-lg border border-border/60 bg-surface/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{entry.pet?.name ?? entry.petName}</p>
                    <p className="text-xs text-muted">
                      {entry.owner?.firstName ? `${entry.owner.firstName} ${entry.owner.lastName}` : entry.ownerName}
                    </p>
                  </div>
                  <Badge variant="info">Prefers {kennelName}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted">
                  {format(start, 'MMM d')} · {nights} night{nights > 1 ? 's' : ''}
                </p>
                {entry.notes && <p className="mt-2 text-xs text-muted">{entry.notes}</p>}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    disabled={processingId === entry.recordId}
                    onClick={() =>
                      handlePromote(entry, {
                        kennelId: kennelId ?? undefined,
                        startDate: startIso,
                        endDate: endIso,
                      })
                    }
                  >
                    {processingId === entry.recordId ? 'Promoting…' : 'Promote to Booking'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={processingId === entry.recordId}
                    onClick={() =>
                      handlePromote(entry, {
                        startDate: startIso,
                        endDate: endIso,
                      })
                    }
                  >
                    Offer Alternative
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

export default WaitlistManager;
