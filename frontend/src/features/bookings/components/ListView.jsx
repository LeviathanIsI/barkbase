import { format } from 'date-fns';
import BookingCard from './BookingCard';
import Button from '@/components/ui/Button';

const ListView = ({
  bookings,
  onBookingClick,
  onBookingSelect,
  selectedBookings,
  onSelectAll,
  onDeselectAll
}) => {
  return (
    <div className="space-y-4">
      {/* Bulk Actions Header */}
      {selectedBookings.size > 0 && (
        <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-blue-900 dark:text-blue-100">
                {selectedBookings.size} bookings selected
              </span>
              <button
                onClick={onDeselectAll}
                className="text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline"
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
        <div className="text-center py-12 bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg">
          <div className="text-gray-400 dark:text-text-tertiary text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">No bookings found</h3>
          <p className="text-gray-600 dark:text-text-secondary mb-4">
            Try adjusting your filters or create a new booking.
          </p>
          <Button variant="primary">
            Create New Booking
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.recordId || booking.id}
              booking={booking}
              onCheckIn={() => {/* Handle check-in */}}
              onCheckOut={() => {/* Handle check-out */}}
              onEdit={() => {/* Handle edit */}}
              onCancel={() => {/* Handle cancel */}}
              onContact={() => {/* Handle contact */}}
              onViewDetails={onBookingClick}
              isSelected={selectedBookings.has(booking.recordId || booking.id)}
              onSelect={onBookingSelect}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {bookings.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-text-secondary">
            Showing <span className="font-medium">1</span> to <span className="font-medium">{bookings.length}</span> of{' '}
            <span className="font-medium">{bookings.length}</span> bookings
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
