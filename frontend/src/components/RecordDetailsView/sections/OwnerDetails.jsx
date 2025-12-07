import Button from '@/components/ui/Button';
import { DetailsGrid, InfoRow, TagList, KeyValue, StatusPill } from '@/components/primitives';
import OwnerInfoSection from '@/features/directory/components/OwnerInfoSection';

export default function OwnerDetails({ data, avatar, actionButtons = [] }) {
  if (!data) return null;

  const pets = data.pets || [];
  const bookings = data.bookings || [];
  const payments = data.payments || [];
  const lifetimeValue =
    payments.reduce((sum, payment) => sum + (payment.amountCents || 0), 0) / 100;

  const initials =
    (data.firstName?.[0] ?? '') + (data.lastName?.[0] ?? '');

  return (
    <OwnerInfoSection>
      <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          {avatar ?? (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-surface-secondary text-lg font-semibold text-purple-600 dark:text-purple-400">
              {initials || '👤'}
            </div>
          )}
          <div className="space-y-2">
            <div>
              <h2 className="text-xl font-semibold text-text">
                {[data.firstName, data.lastName].filter(Boolean).join(' ') || 'Owner'}
              </h2>
              {data.email && <p className="text-sm text-muted">{data.email}</p>}
              {data.phone && <p className="text-sm text-muted">{data.phone}</p>}
            </div>
            <StatusPill status={data.status ?? 'active'} />
          </div>
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
          <InfoRow label="Email" value={data.email} copyable />
          <InfoRow label="Phone" value={data.phone} />
          <InfoRow
            label="Address"
            value={
              data.address
                ? [data.address.street, data.address.city, data.address.state, data.address.zip]
                    .filter(Boolean)
                    .join(', ')
                : null
            }
          />
          <InfoRow
            label="Created"
            value={data.createdAt ? new Date(data.createdAt).toLocaleString() : null}
          />
          <InfoRow
            label="Updated"
            value={data.updatedAt ? new Date(data.updatedAt).toLocaleString() : null}
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <KeyValue label="Total Pets" value={pets.length} />
            <KeyValue label="Bookings" value={bookings.length} />
          </div>
          <div className="flex flex-col gap-2">
            <KeyValue
              label="Lifetime Value"
              value={
                lifetimeValue
                  ? lifetimeValue.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    })
                  : '$0.00'
              }
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Behavior Flags
            </p>
            <TagList tags={data.behaviorFlags || []} emptyLabel="No behavior flags" />
          </div>
        </div>
      </DetailsGrid>
      </div>
    </OwnerInfoSection>
  );
}
