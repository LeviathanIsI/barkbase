import { useState, useMemo } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import {
  Calendar,
  PawPrint,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Loader2,
  Home,
  Info,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import {
  useAvailabilityQuery,
  useCustomerServicesQuery,
  useCustomerPetsQuery,
  useCreateCustomerBookingMutation,
} from '../api';
import toast from 'react-hot-toast';

const STEPS = ['Select Dates', 'Choose Pets', 'Select Service', 'Confirm'];

/**
 * Customer Self-Service Booking Portal
 * A streamlined booking flow for pet owners
 */
const CustomerBookingPortal = ({ onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [bookingData, setBookingData] = useState({
    startDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    selectedPets: [],
    serviceId: null,
    kennelId: null,
    notes: '',
  });

  // Queries
  const { data: availability, isLoading: isLoadingAvailability } = useAvailabilityQuery(
    bookingData.startDate,
    bookingData.endDate,
    bookingData.selectedPets.length || 1
  );

  const { data: services = [], isLoading: isLoadingServices } = useCustomerServicesQuery();
  const { data: pets = [], isLoading: isLoadingPets } = useCustomerPetsQuery();

  // Mutation
  const createBookingMutation = useCreateCustomerBookingMutation();

  // Calculate booking duration and price
  const bookingDuration = useMemo(() => {
    if (!bookingData.startDate || !bookingData.endDate) return 0;
    return differenceInDays(new Date(bookingData.endDate), new Date(bookingData.startDate)) || 1;
  }, [bookingData.startDate, bookingData.endDate]);

  const selectedService = services.find(s => s.id === bookingData.serviceId);
  
  const estimatedPrice = useMemo(() => {
    if (!selectedService || !bookingData.selectedPets.length) return 0;
    return selectedService.price * bookingDuration * bookingData.selectedPets.length;
  }, [selectedService, bookingDuration, bookingData.selectedPets]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      await createBookingMutation.mutateAsync({
        petIds: bookingData.selectedPets.map(p => p.id),
        serviceId: bookingData.serviceId,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        kennelId: bookingData.kennelId,
        notes: bookingData.notes,
      });
      
      toast.success('Booking request submitted! You will receive a confirmation email once approved.');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create booking');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return availability?.available;
      case 1:
        return bookingData.selectedPets.length > 0;
      case 2:
        return bookingData.serviceId !== null;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-surface-secondary text-gray-500 dark:text-text-secondary'
                )}
              >
                {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-16 h-1 mx-2',
                    index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-surface-secondary'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((step, index) => (
            <span
              key={step}
              className={cn(
                'text-xs',
                index === currentStep ? 'text-primary font-medium' : 'text-gray-500 dark:text-text-secondary'
              )}
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="p-6">
        {/* Step 1: Select Dates */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                When would you like to board your pet?
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Check-in Date</label>
                <input
                  type="date"
                  value={bookingData.startDate}
                  onChange={(e) => setBookingData({ ...bookingData, startDate: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-lg dark:bg-surface-secondary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Check-out Date</label>
                <input
                  type="date"
                  value={bookingData.endDate}
                  onChange={(e) => setBookingData({ ...bookingData, endDate: e.target.value })}
                  min={bookingData.startDate}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-lg dark:bg-surface-secondary"
                />
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-text-secondary">
              Duration: <strong>{bookingDuration} {bookingDuration === 1 ? 'night' : 'nights'}</strong>
            </div>

            {/* Availability Status */}
            <div className={cn(
              'p-4 rounded-lg border',
              isLoadingAvailability
                ? 'bg-gray-50 dark:bg-surface-secondary border-gray-200 dark:border-surface-border'
                : availability?.available
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            )}>
              {isLoadingAvailability ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking availability...</span>
                </div>
              ) : availability?.available ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-300">Dates available!</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {availability.availableSlots} slots remaining
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-300">Not available</p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Please try different dates
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Choose Pets */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PawPrint className="w-5 h-5 text-primary" />
                Which pets will be staying?
              </h3>
            </div>

            {isLoadingPets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : pets.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-text-secondary">
                <PawPrint className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pets found in your profile.</p>
                <p className="text-sm">Please contact the facility to add your pets.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pets.map((pet) => {
                  const isSelected = bookingData.selectedPets.some(p => p.id === pet.id);
                  return (
                    <button
                      key={pet.id}
                      onClick={() => {
                        if (isSelected) {
                          setBookingData({
                            ...bookingData,
                            selectedPets: bookingData.selectedPets.filter(p => p.id !== pet.id),
                          });
                        } else {
                          setBookingData({
                            ...bookingData,
                            selectedPets: [...bookingData.selectedPets, pet],
                          });
                        }
                      }}
                      className={cn(
                        'w-full p-4 rounded-lg border-2 text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-surface-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center',
                          isSelected ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-surface-secondary'
                        )}>
                          <PawPrint className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{pet.name}</p>
                          <p className="text-sm text-gray-500 dark:text-text-secondary">
                            {pet.breed} • {pet.species || 'Dog'}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-6 h-6 text-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {bookingData.selectedPets.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-text-secondary">
                Selected: <strong>{bookingData.selectedPets.length} {bookingData.selectedPets.length === 1 ? 'pet' : 'pets'}</strong>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Service */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" />
                Select a boarding package
              </h3>
            </div>

            {isLoadingServices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service) => {
                  const isSelected = bookingData.serviceId === service.id;
                  const totalPrice = service.price * bookingDuration * bookingData.selectedPets.length;
                  
                  return (
                    <button
                      key={service.id}
                      onClick={() => setBookingData({ ...bookingData, serviceId: service.id })}
                      className={cn(
                        'w-full p-4 rounded-lg border-2 text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-surface-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{service.name}</p>
                            {service.requiresVaccination && (
                              <Badge variant="outline" size="sm">Vaccines Required</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-text-secondary mt-1">
                            {service.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${totalPrice.toFixed(2)}</p>
                          <p className="text-xs text-gray-500 dark:text-text-secondary">
                            ${service.price}/night per pet
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-surface-border">
                          <CheckCircle className="w-5 h-5 text-primary inline mr-2" />
                          <span className="text-sm text-primary font-medium">Selected</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Special instructions (optional)</label>
              <textarea
                value={bookingData.notes}
                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                rows={3}
                placeholder="Any special care instructions, medications, feeding preferences..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-lg dark:bg-surface-secondary"
              />
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Review your booking
              </h3>
            </div>

            <div className="space-y-4 bg-gray-50 dark:bg-surface-secondary p-4 rounded-lg">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-surface-border">
                <span className="text-gray-600 dark:text-text-secondary">Dates</span>
                <span className="font-medium">
                  {format(new Date(bookingData.startDate), 'MMM d')} - {format(new Date(bookingData.endDate), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-surface-border">
                <span className="text-gray-600 dark:text-text-secondary">Duration</span>
                <span className="font-medium">{bookingDuration} {bookingDuration === 1 ? 'night' : 'nights'}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-surface-border">
                <span className="text-gray-600 dark:text-text-secondary">Pets</span>
                <span className="font-medium">{bookingData.selectedPets.map(p => p.name).join(', ')}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-surface-border">
                <span className="text-gray-600 dark:text-text-secondary">Service</span>
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-semibold">Estimated Total</span>
                <span className="text-2xl font-bold text-primary">${estimatedPrice.toFixed(2)}</span>
              </div>
            </div>

            {bookingData.notes && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Special Instructions:</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">{bookingData.notes}</p>
              </div>
            )}

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  <p className="font-medium mb-1">Booking Confirmation</p>
                  <p>Your booking request will be reviewed by our staff. You will receive an email confirmation once approved. Payment will be collected at check-in.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onClose : handleBack}
          disabled={createBookingMutation.isPending}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createBookingMutation.isPending}
          >
            {createBookingMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Booking Request
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CustomerBookingPortal;

