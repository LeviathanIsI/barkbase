import { Users, Mail, Phone, MapPin, Calendar, DollarSign, PawPrint, Edit2, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/utils';

const OwnerDetailModal = ({
  open,
  onClose,
  owner,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
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
      className="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-text">{owner.name}</h2>
              <p className="text-sm text-muted">
                Member since {new Date(owner.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(owner)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(owner.recordId)}
              disabled={isDeleting}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Contact Information</h3>
            <div className="space-y-3">
              {owner.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted" />
                  <a
                    href={`mailto:${owner.email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {owner.email}
                  </a>
                </div>
              )}
              {owner.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted" />
                  <a
                    href={`tel:${owner.phone}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {owner.phone}
                  </a>
                </div>
              )}
              {hasAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted mt-0.5" />
                  <span className="text-sm text-text">{formatAddress()}</span>
                </div>
              )}
              {!owner.email && !owner.phone && !hasAddress && (
                <p className="text-sm text-muted italic">No contact information available</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Account Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Total Bookings</span>
                <span className="text-sm font-semibold text-text">{totalBookings}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Lifetime Value</span>
                <span className="text-sm font-semibold text-text">{formatCurrency(lifetimeValue)}</span>
              </div>
              {owner.lastBooking && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Last Booking</span>
                  <span className="text-sm font-semibold text-text">
                    {new Date(owner.lastBooking).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pets */}
        <div>
          <h3 className="text-sm font-semibold text-text mb-3">
            Pets ({pets.length})
          </h3>
          {pets.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface/50 p-6 text-center">
              <PawPrint className="h-8 w-8 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted">No pets registered</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {pets.map((pet) => (
                <div
                  key={pet.recordId}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3 hover:bg-surface transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <PawPrint className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{pet.name}</p>
                    <p className="text-xs text-muted">{pet.breed || 'Unknown breed'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {owner.bookings && owner.bookings.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Recent Bookings</h3>
            <div className="space-y-2">
              {owner.bookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.recordId}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted" />
                    <div>
                      <p className="text-sm font-medium text-text">
                        {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted">{booking.status}</p>
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

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default OwnerDetailModal;
