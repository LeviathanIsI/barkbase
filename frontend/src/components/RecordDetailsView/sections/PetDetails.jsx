import Button from '@/components/ui/Button';
import { DetailsGrid, InfoRow, TagList, KeyValue, StatusPill } from '@/components/primitives';
import { PawPrint } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';

export default function PetDetails({ data, avatar, actionButtons = [] }) {
  const tz = useTimezoneUtils();
  if (!data) return null;

  const owners = data.owners || [];
  const bookings = data.bookings || [];
  const vaccinations = data.vaccinations || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        {avatar ?? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
            <PawPrint className="h-8 w-8 text-primary-600" />
          </div>
        )}
        <div className="space-y-2">
          <div>
            <h2 className="text-xl font-semibold text-text">{data.name || 'Pet'}</h2>
            {data.breed && <p className="text-sm text-muted">{data.breed}</p>}
            {data.species && <p className="text-sm text-muted">{data.species}</p>}
          </div>
          <StatusPill status={data.status ?? 'active'} />
        </div>
      </div>

      {actionButtons.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actionButtons.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.variant ?? 'outline'}
              icon={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      <DetailsGrid>
        <div className="space-y-3">
          <InfoRow label="Breed" value={data.breed} />
          <InfoRow label="Species" value={data.species || 'Dog'} />
          <InfoRow label="Age" value={data.ageYears ? `${data.ageYears} years` : null} />
          <InfoRow label="Primary Owner" value={owners[0]?.name || owners[0]?.email} />
          <InfoRow
            label="Last Vet Visit"
            value={data.lastVetVisit ? tz.formatShortDate(data.lastVetVisit) : null}
          />
          <InfoRow
            label="Created"
            value={data.createdAt ? tz.formatDate(data.createdAt, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : null}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <KeyValue label="Bookings" value={bookings.length} />
            <KeyValue label="Vaccines" value={vaccinations.length} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Behavior Flags
            </p>
            <TagList tags={data.behaviorFlags || []} emptyLabel="No flags" />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Allergies
            </p>
            <TagList tags={data.allergies || []} emptyLabel="No allergies reported" />
          </div>
        </div>
      </DetailsGrid>
    </div>
  );
}
