import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle, Clock, Users, DollarSign, TrendingUp,
  AlertCircle, ChevronRight, Calendar, MapPin,
  UserCheck, UserX, Activity, Home
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import BatchCheckIn from '@/features/bookings/components/BatchCheckIn';
import apiClient from '@/lib/apiClient';
import { cn } from '@/lib/cn';

/**
 * TodayCommandCenter Component
 * Unified operational view combining dashboard and schedule
 * Addresses research finding: "need single-screen operational command center"
 */
const TodayCommandCenter = () => {
  const [activeView, setActiveView] = useState('overview'); // overview, checkin, checkout
  const [selectedRun, setSelectedRun] = useState(null);

  // Fetch today's data
  const today = new Date().toISOString().split('T')[0];

  // Fetch arrivals
  const { data: arrivals = [], isLoading: loadingArrivals } = useQuery({
    queryKey: ['bookings', 'arrivals', today],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/bookings?date=${today}&type=arrival`);
      return Array.isArray(response) ? response : response?.data || [];
    },
    refetchInterval: 30000
  });

  // Fetch departures
  const { data: departures = [], isLoading: loadingDepartures } = useQuery({
    queryKey: ['bookings', 'departures', today],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/bookings?date=${today}&type=departure`);
      return Array.isArray(response) ? response : response?.data || [];
    },
    refetchInterval: 30000
  });

  // Fetch current occupancy
  const { data: inFacility = [], isLoading: loadingOccupancy } = useQuery({
    queryKey: ['bookings', 'current'],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/bookings?status=checked-in`);
      return Array.isArray(response) ? response : response?.data || [];
    },
    refetchInterval: 30000
  });

  // Fetch runs/kennels
  const { data: runs = [], isLoading: loadingRuns } = useQuery({
    queryKey: ['kennels', 'availability'],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/kennels`);
      const kennels = Array.isArray(response) ? response : response?.data || [];

      // Map occupancy to runs
      return kennels.map(kennel => {
        const occupant = inFacility.find(b => b.kennelId === kennel.id);
        return {
          ...kennel,
          occupied: !!occupant,
          pet: occupant?.pet || null,
          booking: occupant || null
        };
      });
    },
    refetchInterval: 30000
  });

  // Calculate stats
  const stats = useMemo(() => {
    const occupiedRuns = runs.filter(r => r.occupied).length;
    const totalRuns = runs.length || 1; // Avoid division by zero
    const occupancyRate = Math.round((occupiedRuns / totalRuns) * 100);

    // Calculate today's revenue (mock)
    const revenueToday = inFacility.reduce((sum, booking) => {
      return sum + (booking.price || 50); // Default $50 per day
    }, 0);

    return {
      arrivals: arrivals.length,
      departures: departures.length,
      inFacility: inFacility.length,
      occupancyRate,
      availableRuns: totalRuns - occupiedRuns,
      revenueToday,
      staffActive: 4 // Mock data
    };
  }, [arrivals, departures, inFacility, runs]);

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
    const colorClass = isArrival ? 'text-green-600' : 'text-orange-600';

    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Icon className={cn("w-12 h-12 mx-auto mb-2 opacity-30", colorClass)} />
          <p>No {isArrival ? 'arrivals' : 'departures'} scheduled</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.slice(0, 5).map((booking, idx) => (
          <div
            key={booking.id || idx}
            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-surface-tertiary transition-colors cursor-pointer"
          >
            <PetAvatar
              pet={booking.pet || { name: booking.petName }}
              size="sm"
              showStatus={false}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">
                  {booking.petName || booking.pet?.name}
                </p>
                <Badge variant={isArrival ? "success" : "warning"} className="text-xs">
                  {formatTime(booking.arrivalTime || booking.departureTime || booking.startDate)}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 dark:text-text-secondary truncate">
                {booking.ownerName || booking.owner?.name || 'Owner'}
              </p>
            </div>
            <Icon className={cn("w-4 h-4 flex-shrink-0", colorClass)} />
          </div>
        ))}
        {items.length > 5 && (
          <p className="text-center text-xs text-gray-500 pt-2">
            +{items.length - 5} more
          </p>
        )}
      </div>
    );
  };

  // Visual Run Board Component
  const VisualRunBoard = () => {
    const runsBySize = {
      small: runs.filter(r => r.size === 'small' || r.type === 'small'),
      medium: runs.filter(r => r.size === 'medium' || r.type === 'medium'),
      large: runs.filter(r => r.size === 'large' || r.type === 'large' || !r.size)
    };

    return (
      <div className="space-y-4">
        {Object.entries(runsBySize).map(([size, sizeRuns]) => (
          <div key={size}>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              {size} Runs ({sizeRuns.filter(r => r.occupied).length}/{sizeRuns.length})
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {sizeRuns.map((run) => (
                <div
                  key={run.id || run.name}
                  onClick={() => setSelectedRun(run)}
                  className={cn(
                    "relative p-2 rounded-lg border-2 cursor-pointer transition-all",
                    run.occupied
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-gray-200 dark:border-surface-border bg-white dark:bg-surface-secondary hover:border-gray-300"
                  )}
                >
                  <div className="text-center">
                    <p className="text-xs font-semibold">{run.name || `R${run.id}`}</p>
                    {run.occupied && run.pet && (
                      <div className="mt-1">
                        <PetAvatar
                          pet={run.pet}
                          size="xs"
                          className="mx-auto"
                          showStatus={false}
                        />
                        <p className="text-xs truncate mt-1">{run.pet.name}</p>
                      </div>
                    )}
                    {!run.occupied && (
                      <p className="text-xs text-gray-400 mt-2">Empty</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Loading state
  if (loadingArrivals || loadingDepartures || loadingOccupancy || loadingRuns) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary">ARRIVALS</p>
              <p className="text-2xl font-bold">{stats.arrivals}</p>
              <p className="text-xs text-green-600">Expected today</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary">IN FACILITY</p>
              <p className="text-2xl font-bold">{stats.inFacility}</p>
              <p className="text-xs text-blue-600">{stats.occupancyRate}% capacity</p>
            </div>
            <Home className="w-8 h-8 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary">DEPARTURES</p>
              <p className="text-2xl font-bold">{stats.departures}</p>
              <p className="text-xs text-orange-600">Leaving today</p>
            </div>
            <UserX className="w-8 h-8 text-orange-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary">REVENUE</p>
              <p className="text-2xl font-bold">${stats.revenueToday}</p>
              <p className="text-xs text-green-600">Today's total</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeView === 'overview' ? 'primary' : 'outline'}
          onClick={() => setActiveView('overview')}
          size="sm"
        >
          Overview
        </Button>
        <Button
          variant={activeView === 'checkin' ? 'primary' : 'outline'}
          onClick={() => setActiveView('checkin')}
          size="sm"
        >
          Batch Check-in
        </Button>
        <Button
          variant={activeView === 'checkout' ? 'primary' : 'outline'}
          onClick={() => setActiveView('checkout')}
          size="sm"
        >
          Batch Check-out
        </Button>
      </div>

      {/* Main Content Area */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Arrivals & Departures */}
          <div className="space-y-6">
            {/* Arrivals */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  Arrivals ({stats.arrivals})
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveView('checkin')}
                >
                  Batch Check-in
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <ArrivalDepartureList items={arrivals} type="arrival" />
            </Card>

            {/* Departures */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <UserX className="w-5 h-5 text-orange-600" />
                  Departures ({stats.departures})
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveView('checkout')}
                >
                  Batch Check-out
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <ArrivalDepartureList items={departures} type="departure" />
            </Card>
          </div>

          {/* Right Column - Visual Run Board */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Facility Status
                </h3>
                <Badge variant="info">
                  {stats.availableRuns} runs available
                </Badge>
              </div>
              <VisualRunBoard />
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Operations
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-text-secondary">Staff Active</span>
                  <Badge variant="success">{stats.staffActive} on duty</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-text-secondary">Occupancy</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${stats.occupancyRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{stats.occupancyRate}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-text-secondary">Today's Tasks</span>
                  <Badge variant="warning">12 pending</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Batch Check-in View */}
      {activeView === 'checkin' && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView('overview')}
            className="mb-4"
          >
            ← Back to Overview
          </Button>
          <BatchCheckIn />
        </div>
      )}

      {/* Batch Check-out View (Placeholder) */}
      {activeView === 'checkout' && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView('overview')}
            className="mb-4"
          >
            ← Back to Overview
          </Button>
          <Card className="p-12 text-center">
            <UserX className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Batch Check-out</h3>
            <p className="text-gray-600 dark:text-text-secondary">
              Batch check-out functionality will be similar to check-in
            </p>
          </Card>
        </div>
      )}

      {/* Selected Run Modal */}
      {selectedRun && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedRun(null)}
        >
          <Card className="p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">
              Run {selectedRun.name || selectedRun.id}
            </h3>
            {selectedRun.occupied && selectedRun.pet ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <PetAvatar pet={selectedRun.pet} size="lg" />
                  <div>
                    <p className="font-medium">{selectedRun.pet.name}</p>
                    <p className="text-sm text-gray-600 dark:text-text-secondary">
                      {selectedRun.pet.breed || 'Unknown breed'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Owner:</span> {selectedRun.booking?.ownerName}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Check-in:</span> {new Date(selectedRun.booking?.checkIn || '').toLocaleDateString()}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Check-out:</span> {new Date(selectedRun.booking?.checkOut || '').toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">View Details</Button>
                  <Button size="sm" variant="outline" className="flex-1">Reassign</Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Home className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600 dark:text-text-secondary mb-4">This run is currently empty</p>
                <Button size="sm">Assign Pet</Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default TodayCommandCenter;