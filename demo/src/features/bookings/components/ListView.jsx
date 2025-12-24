import { Calendar } from 'lucide-react';
import BookingCard from './BookingCard';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/emptystates';

const ListView = ({
  bookings,
  onBookingClick,
  onBookingSelect,
  selectedBookings,
  onSelectAll,
  onDeselectAll
}) => {
  return (
    <div className="space-y-[var(--bb-space-4)]">
      {/* Bulk Actions Header */}
      {selectedBookings.size > 0 && (
        <div className="bg-[var(--bb-color-status-info-soft)] border border-[var(--bb-color-status-info)] border-opacity-30 rounded-[var(--bb-radius-lg)] p-[var(--bb-space-4)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[var(--bb-space-4)]">
              <span className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                {selectedBookings.size} bookings selected
              </span>
              <button
                onClick={onDeselectAll}
                className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-accent)] hover:opacity-80 underline"
              >
                Deselect all
              </button>
            </div>
            <div className="flex gap-[var(--bb-space-2)]">
              <Button variant="primary" size="sm">
                Check In All
              </Button>
              <Button variant="secondary" size="sm">
                Send Reminder
              </Button>
              <Button variant="secondary" size="sm">
                Reschedule
              </Button>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bookings Grid */}
      {bookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No bookings found"
          description="Try adjusting your filters or create a new booking."
          actions={
            <Button variant="primary">
              Create New Booking
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id || booking.recordId}
              booking={booking}
              onCheckIn={() => {/* Handle check-in */}}
              onCheckOut={() => {/* Handle check-out */}}
              onEdit={() => {/* Handle edit */}}
              onCancel={() => {/* Handle cancel */}}
              onContact={() => {/* Handle contact */}}
              onViewDetails={onBookingClick}
              isSelected={selectedBookings.has(booking.id || booking.recordId)}
              onSelect={onBookingSelect}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {bookings.length > 0 && (
        <div className="flex items-center justify-between bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-[var(--bb-radius-lg)] p-[var(--bb-space-4)]">
          <div className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
            Showing <span className="font-[var(--bb-font-weight-medium)]">1</span> to <span className="font-[var(--bb-font-weight-medium)]">{bookings.length}</span> of{' '}
            <span className="font-[var(--bb-font-weight-medium)]">{bookings.length}</span> bookings
          </div>
          <div className="flex gap-[var(--bb-space-2)]">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="primary" size="sm">
              1
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListView;
