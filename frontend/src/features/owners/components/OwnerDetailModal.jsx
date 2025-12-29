import { Users, Mail, Phone, MapPin, Calendar, PawPrint, Edit2, Trash2 } from 'lucide-react';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { useTimezoneUtils } from '@/lib/timezone';

const OwnerDetailModal = ({
  open,
  onClose,
  owner,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  const tz = useTimezoneUtils();

  if (!owner) return null;

  const totalBookings = owner.totalBookings || 0;
  const lifetimeValue = owner.lifetimeValue || 0;
  const pets = owner.pets || [];
  const address = owner.address || {};
  const hasAddress = address.street || address.city || address.state || address.zip;

  const formatAddress = () => {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    return parts.join(', ');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Owner Details"
      size="lg"
    >
      <ModalBody className="space-y-[var(--bb-space-6)]">
        {/* Header with Actions */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-[var(--bb-space-4)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bb-color-purple-soft)] text-[var(--bb-color-purple)]">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-[var(--bb-font-size-2xl)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
                {owner.name}
              </h2>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                Member since {tz.formatShortDate(owner.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-[var(--bb-space-2)]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(owner)}
            >
              <Edit2 className="h-4 w-4 mr-[var(--bb-space-2)]" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(owner.recordId)}
              disabled={isDeleting}
              className="text-[var(--bb-color-status-negative)] hover:bg-[var(--bb-color-status-negative-soft)]"
            >
              <Trash2 className="h-4 w-4 mr-[var(--bb-space-2)]" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--bb-space-6)]">
          <div>
            <h3 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-3)]">
              Contact Information
            </h3>
            <div className="space-y-[var(--bb-space-3)]">
              {owner.email && (
                <div className="flex items-center gap-[var(--bb-space-3)]">
                  <Mail className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                  <a
                    href={`mailto:${owner.email}`}
                    className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-accent)] hover:underline"
                  >
                    {owner.email}
                  </a>
                </div>
              )}
              {owner.phone && (
                <div className="flex items-center gap-[var(--bb-space-3)]">
                  <Phone className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                  <a
                    href={`tel:${owner.phone}`}
                    className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-accent)] hover:underline"
                  >
                    {owner.phone}
                  </a>
                </div>
              )}
              {hasAddress && (
                <div className="flex items-start gap-[var(--bb-space-3)]">
                  <MapPin className="h-4 w-4 text-[var(--bb-color-text-muted)] mt-0.5" />
                  <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
                    {formatAddress()}
                  </span>
                </div>
              )}
              {!owner.email && !owner.phone && !hasAddress && (
                <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] italic">
                  No contact information available
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-3)]">
              Account Summary
            </h3>
            <div className="space-y-[var(--bb-space-3)]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Total Bookings</span>
                <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
                  {totalBookings}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Lifetime Value</span>
                <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
                  {formatCurrency(lifetimeValue)}
                </span>
              </div>
              {owner.lastBooking && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Last Booking</span>
                  <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
                    {tz.formatShortDate(owner.lastBooking)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pets */}
        <div>
          <h3 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-3)]">
            Pets ({pets.length})
          </h3>
          {pets.length === 0 ? (
            <div className="rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)] p-[var(--bb-space-6)] text-center">
              <PawPrint className="h-8 w-8 text-[var(--bb-color-text-muted)] mx-auto mb-[var(--bb-space-2)]" />
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">No pets registered</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--bb-space-3)]">
              {pets.map((pet) => (
                <div
                  key={pet.id || pet.recordId}
                  className="flex items-center gap-[var(--bb-space-3)] rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)] p-[var(--bb-space-3)] hover:bg-[var(--bb-color-sidebar-item-hover-bg)] transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]">
                    <PawPrint className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] truncate">
                      {pet.name}
                    </p>
                    <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
                      {pet.breed || 'Unknown breed'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {owner.bookings && owner.bookings.length > 0 && (
          <div>
            <h3 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-3)]">
              Recent Bookings
            </h3>
            <div className="space-y-[var(--bb-space-2)]">
              {owner.bookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.id || booking.recordId}
                  className="flex items-center justify-between rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)] p-[var(--bb-space-3)]"
                >
                  <div className="flex items-center gap-[var(--bb-space-3)]">
                    <Calendar className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                    <div>
                      <p className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                        {tz.formatShortDate(booking.checkIn)} - {tz.formatShortDate(booking.checkOut)}
                      </p>
                      <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">{booking.status}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      booking.status === 'completed' ? 'success' :
                      booking.status === 'active' ? 'info' :
                      'default'
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </ModalBody>

      {/* Footer Actions */}
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default OwnerDetailModal;
