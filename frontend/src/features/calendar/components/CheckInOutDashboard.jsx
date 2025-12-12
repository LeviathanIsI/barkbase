import { useMemo } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertTriangle, Phone, CreditCard, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useBookingCheckInMutation, useBookingCheckOutMutation } from '@/features/bookings/api';
import { useAuthStore } from '@/stores/auth';
import toast from 'react-hot-toast';

const CheckInOutDashboard = ({ currentDate, bookings = [], onBookingClick }) => {
  const userId = useAuthStore((state) => state.user?.id);
  const checkInMutation = useBookingCheckInMutation();
  const checkOutMutation = useBookingCheckOutMutation();

  const today = currentDate.toISOString().split('T')[0];

  // Filter bookings for pending check-ins (check-in date is today, not yet checked in)
  const pendingCheckIns = useMemo(() => {
    return bookings.filter(b => {
      const checkInDate = b.checkInDate?.toISOString().split('T')[0];
      return checkInDate === today &&
             b.status !== 'CHECKED_IN' &&
             b.status !== 'CHECKED_OUT' &&
             b.status !== 'CANCELLED';
    }).map(b => ({
      ...b,
      scheduledTime: b.checkInDate ? format(b.checkInDate, 'h:mm a') : 'TBD',
    }));
  }, [bookings, today]);

  // Filter bookings for pending check-outs (check-out date is today, currently checked in)
  const pendingCheckOuts = useMemo(() => {
    return bookings.filter(b => {
      const checkOutDate = b.checkOutDate?.toISOString().split('T')[0];
      return checkOutDate === today &&
             b.status === 'CHECKED_IN';
    }).map(b => ({
      ...b,
      scheduledTime: b.checkOutDate ? format(b.checkOutDate, 'h:mm a') : 'TBD',
    }));
  }, [bookings, today]);

  // Handle check-in
  const handleCheckIn = async (booking) => {
    const bookingId = booking.id || booking.recordId;
    if (!bookingId) {
      toast.error('No booking ID found');
      return;
    }
    try {
      await checkInMutation.mutateAsync({ bookingId, payload: { userId } });
      toast.success(`${booking.petName} checked in!`);
    } catch (error) {
      toast.error(error?.message || 'Failed to check in');
    }
  };

  // Handle check-out
  const handleCheckOut = async (booking) => {
    const bookingId = booking.id || booking.recordId;
    if (!bookingId) {
      toast.error('No booking ID found');
      return;
    }
    try {
      await checkOutMutation.mutateAsync({ bookingId, payload: { userId } });
      toast.success(`${booking.petName} checked out!`);
    } catch (error) {
      toast.error(error?.message || 'Failed to check out');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 text-blue-800 dark:text-blue-200';
      case 'PENDING': return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 text-amber-800 dark:text-amber-200';
      case 'CHECKED_IN': return 'bg-green-100 dark:bg-green-900/30 border-green-300 text-green-800 dark:text-green-200';
      default: return 'bg-gray-100 dark:bg-surface-secondary border-gray-300 dark:border-surface-border text-gray-800 dark:text-text-primary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'CHECKED_IN': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'PENDING': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600 dark:text-text-secondary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Check-ins & Check-outs</h2>
        <span className="text-sm text-gray-600 dark:text-text-secondary">{format(currentDate, 'EEEE, MMMM d, yyyy')}</span>
      </div>

      {/* Pending Check-ins */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">
          PENDING CHECK-INS ({pendingCheckIns.length})
        </h3>

        {pendingCheckIns.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-text-secondary py-4 text-center">
            No pending check-ins for today
          </p>
        ) : (
          <div className="space-y-4">
            {pendingCheckIns.map((booking) => (
              <div key={booking.id || booking.recordId} className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(booking.status)}
                      <span className="font-medium text-gray-900 dark:text-text-primary">
                        {booking.petName}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.scheduledTime}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-text-secondary mb-2">
                      Owner: {booking.ownerName}
                      {booking.kennel?.name && ` • Kennel: ${booking.kennel.name}`}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(booking)}
                      disabled={checkInMutation.isPending}
                    >
                      {checkInMutation.isPending ? 'Checking in...' : 'Check In Now'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onBookingClick?.(booking)}>
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pending Check-outs */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">
          PENDING CHECK-OUTS ({pendingCheckOuts.length})
        </h3>

        {pendingCheckOuts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-text-secondary py-4 text-center">
            No pending check-outs for today
          </p>
        ) : (
          <div className="space-y-4">
            {pendingCheckOuts.map((booking) => (
              <div key={booking.id || booking.recordId} className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(booking.status)}
                      <span className="font-medium text-gray-900 dark:text-text-primary">
                        {booking.petName}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.scheduledTime}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-text-secondary mb-2">
                      Owner: {booking.ownerName}
                      {booking.kennel?.name && ` • Kennel: ${booking.kennel.name}`}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleCheckOut(booking)}
                      disabled={checkOutMutation.isPending}
                    >
                      {checkOutMutation.isPending ? 'Checking out...' : 'Check Out Now'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onBookingClick?.(booking)}>
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CheckInOutDashboard;
