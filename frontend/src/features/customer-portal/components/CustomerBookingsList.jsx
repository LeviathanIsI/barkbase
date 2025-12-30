import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { format } from 'date-fns';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Home,
  Loader2,
  PawPrint,
  Trash2,
  XCircle
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCancelCustomerBookingMutation, useCustomerBookingsQuery } from '../api';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  CHECKED_IN: {
    label: 'Checked In',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Home,
  },
  CHECKED_OUT: {
    label: 'Completed',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
};

/**
 * Customer Bookings List
 * Shows a list of the customer's bookings
 */
const CustomerBookingsList = ({ onViewBooking, onNewBooking }) => {
  const [filter, setFilter] = useState('upcoming');
  const [cancellingId, setCancellingId] = useState(null);

  const { data: bookings = [], isLoading, error } = useCustomerBookingsQuery({
    upcoming: filter === 'upcoming',
    status: filter === 'all' ? undefined : undefined,
  });

  const cancelMutation = useCancelCustomerBookingMutation();

  const handleCancel = async (booking) => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    setCancellingId(booking.id);
    try {
      await cancelMutation.mutateAsync(booking.id);
      toast.success('Booking cancelled successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'upcoming') {
      return new Date(booking.endDate) >= new Date() && booking.status !== 'CANCELLED';
    }
    if (filter === 'past') {
      return new Date(booking.endDate) < new Date() || booking.status === 'CANCELLED';
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="text-red-600 dark:text-red-400">Failed to load bookings</p>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Bookings</h2>
          <p className="text-gray-500 dark:text-text-secondary">View and manage your bookings</p>
        </div>
        <Button onClick={onNewBooking}>
          <Calendar className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-surface-border">
        {['upcoming', 'past', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
              filter === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-text-primary'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-text-secondary">No {filter} bookings found</p>
          {filter === 'upcoming' && (
            <Button variant="outline" className="mt-4" onClick={onNewBooking}>
              Book your first stay
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusConfig.icon;
            const canCancel = ['PENDING', 'CONFIRMED'].includes(booking.status);

            return (
              <Card
                key={booking.id}
                className="p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      {booking.serviceName && (
                        <span className="text-sm text-gray-500 dark:text-text-secondary">
                          {booking.serviceName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {format(new Date(booking.startDate), 'MMM d')} - {format(new Date(booking.endDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <PawPrint className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {booking.petNames?.join(', ') || 'No pets listed'}
                      </span>
                    </div>

                    {booking.kennelName && (
                      <div className="flex items-center gap-2 mt-1">
                        <Home className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">{booking.kennelName}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold">${booking.totalPrice?.toFixed(2) || '0.00'}</p>
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewBooking?.(booking)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canCancel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(booking)}
                          disabled={cancellingId === booking.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {cancellingId === booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerBookingsList;

