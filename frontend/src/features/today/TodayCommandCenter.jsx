import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UserCheck, UserX, Home, AlertCircle
} from 'lucide-react';
import { Card, PageHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import BatchCheckIn from '@/features/bookings/components/BatchCheckIn';
import Modal from '@/components/ui/Modal';
import apiClient from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

/**
 * TodayCommandCenter Component
 * Simplified operational view focused on arrivals and departures
 * Provides calm, focused interface for daily operations
 */
const TodayCommandCenter = () => {
  const [showBatchCheckIn, setShowBatchCheckIn] = useState(false);
  const [showBatchCheckOut, setShowBatchCheckOut] = useState(false);

  // Fetch today's data
  const today = new Date().toISOString().split('T')[0];
  
  // Get kennel name from user profile or settings
  const { data: userProfile } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/v1/users/profile');
        return response?.data || response || {};
      } catch (error) {
        return {};
      }
    }
  });
  
  const kennelName = userProfile?.propertyName || userProfile?.businessName || '';

  // Fetch arrivals - bookings starting today (PENDING or CONFIRMED)
  const { data: arrivals = [], isLoading: loadingArrivals } = useQuery({
    queryKey: ['bookings', 'arrivals', today],
    queryFn: async () => {
      // Fetch all bookings for today and filter by status
      const response = await apiClient.get(`/api/v1/bookings?date=${today}`);
      const bookings = Array.isArray(response) ? response : response?.data || [];

      // Filter to PENDING or CONFIRMED bookings starting today
      return bookings.filter(b => {
        const status = b.status || b.bookingStatus;
        const isPendingOrConfirmed = status === 'PENDING' || status === 'CONFIRMED';
        const startDate = new Date(b.startDate || b.checkInDate).toISOString().split('T')[0];
        return isPendingOrConfirmed && startDate === today;
      });
    },
    refetchInterval: 30000
  });

  // Fetch departures - bookings ending today (currently CHECKED_IN)
  const { data: departures = [], isLoading: loadingDepartures } = useQuery({
    queryKey: ['bookings', 'departures', today],
    queryFn: async () => {
      // Fetch checked-in bookings ending today
      const response = await apiClient.get(`/api/v1/bookings?status=CHECKED_IN`);
      const bookings = Array.isArray(response) ? response : response?.data || [];

      // Filter to only those ending today
      return bookings.filter(b => {
        const endDate = new Date(b.endDate || b.checkOutDate).toISOString().split('T')[0];
        return endDate === today;
      });
    },
    refetchInterval: 30000
  });

  // Fetch current occupancy - pets currently checked in
  const { data: inFacility = [], isLoading: loadingOccupancy } = useQuery({
    queryKey: ['bookings', 'checked-in', today],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/bookings?status=CHECKED_IN`);
      return Array.isArray(response) ? response : response?.data || [];
    },
    refetchInterval: 30000
  });

  // Fetch dashboard stats from backend
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard', 'stats', today],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/dashboard/stats');
      return response?.data || response || {};
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch issues/attention items (vaccinations, unpaid bookings)
  const { data: attentionItems = 0 } = useQuery({
    queryKey: ['attention', 'items', today],
    queryFn: async () => {
      try {
        // Check for bookings with issues
        const unpaidResponse = await apiClient.get('/api/v1/bookings?status=UNPAID');
        const unpaidBookings = Array.isArray(unpaidResponse) ? unpaidResponse : unpaidResponse?.data || [];
        
        // Check arrivals for vaccination issues
        const vaccinationIssues = arrivals.filter(b => b.hasExpiringVaccinations).length;
        
        return unpaidBookings.length + vaccinationIssues;
      } catch (error) {
        return 0;
      }
    },
    enabled: arrivals.length > 0,
    refetchInterval: 60000
  });

  // Calculate stats
  const stats = useMemo(() => {
    return {
      arrivals: arrivals.length,
      departures: departures.length,
      inFacility: inFacility.length,
      attentionItems
    };
  }, [arrivals, departures, inFacility, attentionItems]);

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Arrival/Departure List Component
  const ArrivalDepartureList = ({ items, type }) => {
    const isArrival = type === 'arrival';
    const Icon = isArrival ? UserCheck : UserX;
    const colorClass = isArrival ? 'text-success-600' : 'text-warning-600';

    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Icon className={cn("w-16 h-16 mx-auto mb-3 opacity-20", colorClass)} />
          <p className="text-lg">No {isArrival ? 'arrivals' : 'departures'} scheduled today</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((booking, idx) => (
          <div
            key={booking.id || idx}
            className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-surface-tertiary transition-colors"
          >
            <PetAvatar
              pet={booking.pet || { name: booking.petName }}
              size="md"
              showStatus={false}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <p className="font-semibold text-base truncate">
                  {booking.petName || booking.pet?.name}
                </p>
                <Badge variant={isArrival ? "success" : "warning"} className="text-sm">
                  {formatTime(booking.arrivalTime || booking.departureTime || booking.startDate)}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-text-secondary truncate">
                {booking.ownerName || booking.owner?.name || 'Owner'}
              </p>
              {booking.service && (
                <p className="text-xs text-gray-500 mt-1">
                  {booking.service}
                </p>
              )}
            </div>
            {booking.hasExpiringVaccinations && (
              <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Batch Check-out Component (simplified inline)
  const BatchCheckOut = () => {
    const [selectedDepartures, setSelectedDepartures] = useState([]);
    const [processing, setProcessing] = useState(false);
    
    const handleBatchCheckOut = async () => {
      setProcessing(true);
      try {
        // Process check-outs
        for (const bookingId of selectedDepartures) {
          await apiClient.post(`/api/v1/bookings/${bookingId}/check-out`, {
            timestamp: new Date().toISOString()
          });
        }
        toast.success(`Successfully checked out ${selectedDepartures.length} pets!`);
        setShowBatchCheckOut(false);
        // Refresh data
        window.location.reload();
      } catch (error) {
        toast.error('Failed to process check-outs');
      } finally {
        setProcessing(false);
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-text-secondary mb-4">
          Select pets to check out:
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {departures.map((booking) => {
            const isSelected = selectedDepartures.includes(booking.id);
            return (
              <div
                key={booking.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer",
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    : "border-gray-200 dark:border-surface-border bg-white dark:bg-surface-secondary"
                )}
                onClick={() => {
                  setSelectedDepartures(prev => 
                    isSelected 
                      ? prev.filter(id => id !== booking.id)
                      : [...prev, booking.id]
                  );
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <PetAvatar pet={booking.pet || { name: booking.petName }} size="sm" showStatus={false} />
                <div className="flex-1">
                  <p className="font-medium">{booking.petName || booking.pet?.name}</p>
                  <p className="text-sm text-gray-600">{booking.ownerName || booking.owner?.name}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setShowBatchCheckOut(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleBatchCheckOut} 
            disabled={selectedDepartures.length === 0 || processing}
          >
            {processing ? 'Processing...' : `Check Out ${selectedDepartures.length} Pets`}
          </Button>
        </div>
      </div>
    );
  };

  const formattedDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [],
  );

  // Loading state
  if (loadingArrivals || loadingDepartures || loadingOccupancy) {
    return (
      <div className="space-y-6 px-4 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-6 px-4 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 rounded-xl p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Today{kennelName ? ` at ${kennelName}` : ''}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          {formattedDate}
        </p>
        
        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-5 h-5 text-success-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Arriving</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.arrivals}</p>
          </div>
          
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <UserX className="w-5 h-5 text-warning-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Departing</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.departures}</p>
          </div>
          
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Home className="w-5 h-5 text-primary-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">In Facility</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inFacility}</p>
          </div>
          
          {stats.attentionItems > 0 && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-5 h-5 text-error-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Attention</span>
              </div>
              <p className="text-2xl font-bold text-error-600">{stats.attentionItems}</p>
            </div>
          )}
        </div>
        
        {/* Primary CTA */}
        <div className="mt-6">
          <Button variant="primary" size="lg" className="font-semibold">
            New Booking
          </Button>
        </div>
      </div>

      {/* Main Content - Arrivals and Departures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Arrivals */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-success-600" />
              Today's Arrivals
              <Badge variant="success" className="ml-2">{stats.arrivals}</Badge>
            </h2>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowBatchCheckIn(true)}
              disabled={arrivals.length === 0}
            >
              Batch Check-in
            </Button>
          </div>
          <ArrivalDepartureList items={arrivals} type="arrival" />
        </Card>
        
        {/* Departures */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <UserX className="w-6 h-6 text-warning-600" />
              Today's Departures
              <Badge variant="warning" className="ml-2">{stats.departures}</Badge>
            </h2>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowBatchCheckOut(true)}
              disabled={departures.length === 0}
            >
              Batch Check-out
            </Button>
          </div>
          <ArrivalDepartureList items={departures} type="departure" />
        </Card>
      </div>

      {/* Batch Check-in Modal */}
      <Modal
        open={showBatchCheckIn}
        onClose={() => setShowBatchCheckIn(false)}
        title="Batch Check-in"
        className="max-w-4xl"
      >
        <BatchCheckIn />
      </Modal>

      {/* Batch Check-out Modal */}
      <Modal
        open={showBatchCheckOut}
        onClose={() => setShowBatchCheckOut(false)}
        title="Batch Check-out"
        className="max-w-2xl"
      >
        <BatchCheckOut />
      </Modal>
    </div>
  );
};

export default TodayCommandCenter;