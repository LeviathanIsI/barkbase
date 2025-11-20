import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Camera, User, AlertTriangle, ChevronRight, Check, X, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';

/**
 * BatchCheckIn Component
 * Addresses research finding: "check-in requires too many clicks and no batch operations"
 * Goal: Complete multiple check-ins in under 30 seconds with 2-3 clicks maximum
 */
const BatchCheckIn = () => {
  const queryClient = useQueryClient();
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [step, setStep] = useState('select'); // select, verify, confirm
  const [searchTerm, setSearchTerm] = useState('');
  const [batchData, setBatchData] = useState({
    vaccinationsVerified: true,
    weightCollected: true,
    photosRequired: false,
    notes: ''
  });

  // Fetch today's arrivals
  const { data: arrivals = [], isLoading } = useQuery({
    queryKey: ['bookings', 'arrivals', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.get(`/api/v1/bookings?date=${today}&status=pending&type=arrival`);
      const bookings = Array.isArray(response) ? response : response?.data || [];

      // Sort by arrival time
      return bookings.sort((a, b) => {
        const timeA = new Date(a.arrivalTime || a.startDate).getTime();
        const timeB = new Date(b.arrivalTime || b.startDate).getTime();
        return timeA - timeB;
      });
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Batch check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (data) => {
      const promises = data.bookingIds.map(bookingId =>
        apiClient.post(`/api/v1/bookings/${bookingId}/check-in`, {
          ...data.details,
          timestamp: new Date().toISOString(),
          batchCheckIn: true
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      toast.success(`Successfully checked in ${selectedBookings.length} pets!`);
      setSelectedBookings([]);
      setStep('select');
      setBatchData({
        vaccinationsVerified: true,
        weightCollected: true,
        photosRequired: false,
        notes: ''
      });
    },
    onError: (error) => {
      toast.error(`Check-in failed: ${error.message}`);
    }
  });

  // Filter arrivals based on search
  const filteredArrivals = useMemo(() => {
    if (!searchTerm) return arrivals;

    const search = searchTerm.toLowerCase();
    return arrivals.filter(booking => {
      const petName = (booking.petName || booking.pet?.name || '').toLowerCase();
      const ownerName = (booking.ownerName || booking.owner?.name || '').toLowerCase();
      return petName.includes(search) || ownerName.includes(search);
    });
  }, [arrivals, searchTerm]);

  // Toggle selection
  const toggleSelection = (bookingId) => {
    setSelectedBookings(prev => {
      if (prev.includes(bookingId)) {
        return prev.filter(id => id !== bookingId);
      }
      return [...prev, bookingId];
    });
  };

  // Select all visible
  const selectAll = () => {
    const visibleIds = filteredArrivals.map(a => a.id || a.recordId);
    setSelectedBookings(visibleIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedBookings([]);
  };

  // Process batch check-in
  const processBatchCheckIn = async () => {
    if (selectedBookings.length === 0) {
      toast.error('Please select at least one pet to check in');
      return;
    }

    await checkInMutation.mutateAsync({
      bookingIds: selectedBookings,
      details: batchData
    });
  };

  // Get pet photo URL or fallback to initials
  const getPetPhoto = (booking) => {
    // Check for pet photo in booking data
    if (booking.pet?.photoUrl) return booking.pet.photoUrl;
    if (booking.petPhoto) return booking.petPhoto;

    // Return null to show initials
    return null;
  };

  // Get initials for pet
  const getPetInitials = (booking) => {
    const name = booking.petName || booking.pet?.name || 'P';
    return name.charAt(0).toUpperCase();
  };

  // Format arrival time
  const formatTime = (dateString) => {
    if (!dateString) return 'Time TBD';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">
              Batch Check-In
            </h2>
            <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">
              Process multiple arrivals in under 30 seconds
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{arrivals.length}</div>
              <div className="text-xs text-gray-600 dark:text-text-secondary">Expected Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{selectedBookings.length}</div>
              <div className="text-xs text-gray-600 dark:text-text-secondary">Selected</div>
            </div>
          </div>
        </div>
      </Card>

      {step === 'select' && (
        <Card className="p-4">
          {/* Search and actions bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by pet or owner name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={filteredArrivals.length === 0}
            >
              Select All ({filteredArrivals.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              disabled={selectedBookings.length === 0}
            >
              Clear
            </Button>
          </div>

          {/* Arrivals list with checkboxes and photos */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredArrivals.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <p className="text-gray-600 dark:text-text-secondary">
                  {searchTerm ? 'No arrivals match your search' : 'No arrivals scheduled for today'}
                </p>
              </div>
            ) : (
              filteredArrivals.map((booking) => {
                const isSelected = selectedBookings.includes(booking.id || booking.recordId);
                const photo = getPetPhoto(booking);
                const hasWarnings = booking.hasExpiringVaccinations || booking.hasMedicalAlerts;

                return (
                  <div
                    key={booking.id || booking.recordId}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-gray-200 dark:border-surface-border bg-white dark:bg-surface-secondary'
                    }`}
                    onClick={() => toggleSelection(booking.id || booking.recordId)}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>

                    {/* Pet Photo or Initials */}
                    <div className="flex-shrink-0">
                      {photo ? (
                        <img
                          src={photo}
                          alt={booking.petName || booking.pet?.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-lg font-semibold text-blue-600 dark:text-blue-300">
                          {getPetInitials(booking)}
                        </div>
                      )}
                    </div>

                    {/* Pet & Owner Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-text-primary truncate">
                          {booking.petName || booking.pet?.name || 'Unknown Pet'}
                        </h4>
                        {hasWarnings && (
                          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-text-secondary">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {booking.ownerName || booking.owner?.name || 'Owner'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(booking.arrivalTime || booking.startDate)}
                        </span>
                      </div>
                      {booking.service && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-surface-tertiary rounded text-xs">
                          {booking.service}
                        </span>
                      )}
                    </div>

                    {/* Selection indicator */}
                    <div className="flex-shrink-0">
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action button */}
          {selectedBookings.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => setStep('verify')}
                className="flex items-center gap-2"
              >
                Process {selectedBookings.length} Check-ins
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </Card>
      )}

      {step === 'verify' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Verify Check-in Details</h3>

          <div className="space-y-4">
            {/* Quick verification toggles */}
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                <span className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Vaccinations Verified</span>
                </span>
                <input
                  type="checkbox"
                  checked={batchData.vaccinationsVerified}
                  onChange={(e) => setBatchData({...batchData, vaccinationsVerified: e.target.checked})}
                  className="w-5 h-5 text-green-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                <span className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Weight Recorded</span>
                </span>
                <input
                  type="checkbox"
                  checked={batchData.weightCollected}
                  onChange={(e) => setBatchData({...batchData, weightCollected: e.target.checked})}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                <span className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Photos Taken</span>
                </span>
                <input
                  type="checkbox"
                  checked={batchData.photosRequired}
                  onChange={(e) => setBatchData({...batchData, photosRequired: e.target.checked})}
                  className="w-5 h-5 text-purple-600 rounded"
                />
              </label>
            </div>

            {/* Optional notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">
                Batch Notes (Optional)
              </label>
              <textarea
                value={batchData.notes}
                onChange={(e) => setBatchData({...batchData, notes: e.target.value})}
                placeholder="Any notes that apply to all selected pets..."
                className="w-full p-3 border border-gray-300 dark:border-surface-border rounded-lg text-sm"
                rows="2"
              />
            </div>

            {/* Selected pets summary */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                Checking in {selectedBookings.length} pets:
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedBookings.map(id => {
                  const booking = arrivals.find(a => (a.id || a.recordId) === id);
                  return (
                    <span key={id} className="px-2 py-1 bg-white dark:bg-surface-primary rounded text-xs">
                      {booking?.petName || booking?.pet?.name || 'Pet'}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setStep('select')}>
              Back
            </Button>
            <Button
              onClick={() => setStep('confirm')}
              className="flex items-center gap-2"
            >
              Confirm & Check In
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'confirm' && (
        <Card className="p-6">
          <div className="text-center space-y-4">
            {checkInMutation.isPending ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full animate-pulse">
                  <Clock className="w-8 h-8 text-blue-600 dark:text-blue-300 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold">Processing Check-ins...</h3>
                <p className="text-sm text-gray-600 dark:text-text-secondary">
                  Checking in {selectedBookings.length} pets
                </p>
              </>
            ) : checkInMutation.isSuccess ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-300" />
                </div>
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-300">
                  Success!
                </h3>
                <p className="text-sm text-gray-600 dark:text-text-secondary">
                  {selectedBookings.length} pets checked in successfully
                </p>
                <Button onClick={() => {
                  setStep('select');
                  setSelectedBookings([]);
                }}>
                  Check In More Pets
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={processBatchCheckIn}
                  size="lg"
                  className="flex items-center gap-2 mx-auto"
                >
                  <CheckCircle className="w-5 h-5" />
                  Complete {selectedBookings.length} Check-ins
                </Button>
                <Button variant="outline" onClick={() => setStep('verify')}>
                  Go Back
                </Button>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default BatchCheckIn;