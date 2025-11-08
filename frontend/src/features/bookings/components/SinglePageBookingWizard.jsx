import { useState, useMemo } from 'react';
import { 
  Users, 
  PawPrint, 
  Calendar, 
  MapPin, 
  DollarSign, 
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useOwnerSearchQuery } from '@/features/owners/api';
import { usePetsQuery } from '@/features/pets/api';
import { useServicesQuery } from '@/features/services/api';
import { useRunTemplatesQuery } from '@/features/daycare/api-templates';
import { useCreateBookingMutation, useBookingsQuery } from '../api';
import { useDashboardStatsQuery, useUpcomingArrivalsQuery, useOccupancyQuery } from '@/features/dashboard/api';
import toast from 'react-hot-toast';

/**
 * Single-Page Booking Wizard
 * Fixes the "17 steps to schedule your dog" problem by keeping everything on one screen
 * with progressive disclosure and persistent capacity view
 */

const STEPS = [
  { id: 'owner', label: 'Owner', icon: Users },
  { id: 'pet', label: 'Pet(s)', icon: PawPrint },
  { id: 'service', label: 'Service', icon: Calendar },
  { id: 'room', label: 'Run/Room', icon: MapPin },
  { id: 'billing', label: 'Billing', icon: DollarSign },
];

const SinglePageBookingWizard = ({ onComplete, initialData = {} }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [bookingData, setBookingData] = useState({
    owner: null,
    pets: [],
    service: null,
    dateRange: { start: null, end: null },
    runTemplate: null,
    additionalServices: [],
    notes: '',
    specialRequirements: '',
    ...initialData
  });

  const createBookingMutation = useCreateBookingMutation();

  const updateBookingData = (field, value) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return bookingData.owner !== null;
      case 1: return bookingData.pets.length > 0;
      case 2: return bookingData.service && bookingData.dateRange.start && bookingData.dateRange.end;
      case 3: return bookingData.runTemplate !== null;
      case 4: return true; // Billing can be completed later
      default: return false;
    }
  };

  const handleComplete = async () => {
    if (!bookingData.owner || !bookingData.pets.length || !bookingData.service || !bookingData.dateRange.start || !bookingData.dateRange.end) {
      toast.error('Please complete all required fields');
      return;
    }

    try {
      // Create booking for each pet
      const bookingPromises = bookingData.pets.map(pet => {
        const payload = {
          ownerId: bookingData.owner.recordId || bookingData.owner.id,
          petId: pet.recordId || pet.id,
          serviceId: bookingData.service.recordId || bookingData.service.id,
          runTemplateId: bookingData.runTemplate?.recordId || bookingData.runTemplate?.id,
          checkIn: bookingData.dateRange.start,
          checkOut: bookingData.dateRange.end,
          notes: bookingData.notes || bookingData.specialRequirements,
          specialRequirements: bookingData.specialRequirements,
          status: 'PENDING'
        };

        // Calculate pricing if available
        if (bookingData.service.priceCents) {
          const days = Math.ceil((new Date(bookingData.dateRange.end) - new Date(bookingData.dateRange.start)) / (1000 * 60 * 60 * 24));
          payload.totalPriceInCents = days * bookingData.service.priceCents * bookingData.pets.length;
        }

        return createBookingMutation.mutateAsync(payload);
      });

      await Promise.all(bookingPromises);
      toast.success('Booking created successfully!');
      
      if (onComplete) {
        onComplete(bookingData);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Failed to create booking');
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Main Wizard Area - Takes up 2/3 of space */}
      <div className="flex-1 flex flex-col">
        {/* Progress Stepper - Always visible */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => index <= currentStep && setCurrentStep(index)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                      isActive && "bg-primary-600 text-white",
                      isCompleted && "bg-primary-100 text-primary-700 hover:bg-primary-200",
                      !isActive && !isCompleted && "bg-gray-100 dark:bg-surface-secondary text-gray-400 dark:text-text-tertiary"
                    )}
                    disabled={index > currentStep}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full",
                      isActive && "bg-white dark:bg-surface-primary/30 text-white",
                      isCompleted && "bg-primary-600 text-white",
                      !isActive && !isCompleted && "bg-gray-200 dark:bg-surface-border text-gray-600 dark:text-text-secondary"
                    )}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className="font-medium hidden sm:block">{step.label}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-gray-300 dark:text-text-tertiary mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content Area */}
        <Card className="flex-1 p-6 overflow-y-auto">
          {currentStep === 0 && <OwnerStep {...{ bookingData, updateBookingData }} />}
          {currentStep === 1 && <PetStep {...{ bookingData, updateBookingData }} />}
          {currentStep === 2 && <ServiceStep {...{ bookingData, updateBookingData }} />}
          {currentStep === 3 && <RoomStep {...{ bookingData, updateBookingData }} />}
          {currentStep === 4 && <BillingStep {...{ bookingData, updateBookingData }} />}
        </Card>

        {/* Action Buttons - Always visible */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          
          <div className="flex items-center gap-3">
            <Button variant="tertiary">
              Save as Draft
            </Button>
            
            {currentStep === STEPS.length - 1 ? (
              <Button 
                onClick={handleComplete}
                disabled={!canProceed() || createBookingMutation.isPending}
              >
                {createBookingMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Complete Booking'
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Persistent Capacity Panel - Always visible, takes 1/3 space */}
      <div className="w-96 flex-shrink-0">
        <CapacityPanel dateRange={bookingData.dateRange} selectedRunTemplate={bookingData.runTemplate} />
      </div>
    </div>
  );
};

// Step Components with inline editing, no modals

const OwnerStep = ({ bookingData, updateBookingData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use API search - requires at least 2 characters
  const { data: owners = [], isLoading } = useOwnerSearchQuery(
    searchTerm.length >= 2 ? searchTerm : '',
    { enabled: searchTerm.length >= 2 }
  );

  // Transform owner data to include display name and pet count
  const ownersWithDisplay = useMemo(() => {
    return owners.map(owner => ({
      ...owner,
      name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email,
      petCount: owner.petCount || 0 // This would come from a join if available
    }));
  }, [owners]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Select Owner</h3>
        <p className="text-sm text-gray-600 dark:text-text-secondary">Choose an existing customer or create a new one</p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-surface-border rounded-lg bg-white dark:bg-surface-primary text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary dark:text-text-secondary placeholder:opacity-75 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Owner List - High density, single click selection */}
      <div className="space-y-2">
        {isLoading && searchTerm.length >= 2 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-text-tertiary" />
          </div>
        ) : ownersWithDisplay.length === 0 && searchTerm.length >= 2 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-text-secondary">
            No owners found. Try a different search term.
          </div>
        ) : (
          ownersWithDisplay.map(owner => (
            <button
              key={owner.recordId || owner.id}
              onClick={() => updateBookingData('owner', owner)}
              className={cn(
                "w-full text-left p-4 rounded-lg border transition-all",
                (bookingData.owner?.recordId === owner.recordId || bookingData.owner?.id === owner.id)
                  ? "border-primary-600 bg-primary-50" 
                  : "border-gray-200 dark:border-surface-border hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-text-primary">{owner.name}</p>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">
                    {owner.email} {owner.phone ? `• ${owner.phone}` : ''}
                  </p>
                </div>
                {owner.petCount > 0 && (
                  <Badge variant="secondary">{owner.petCount} pet(s)</Badge>
                )}
              </div>
            </button>
          ))
        )}
        {searchTerm.length < 2 && (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-text-secondary">
            Type at least 2 characters to search for owners
          </div>
        )}
      </div>

      {/* Quick Add New Owner - Inline, not modal */}
      <div className="border-t border-gray-300 dark:border-surface-border pt-4">
        <Button variant="secondary" className="w-full">
          <Users className="h-4 w-4 mr-2" />
          Add New Owner
        </Button>
      </div>
    </div>
  );
};

const PetStep = ({ bookingData, updateBookingData }) => {
  // Fetch pets for selected owner
  const { data: allPets = [], isLoading } = usePetsQuery();
  
  // Filter pets by selected owner
  const availablePets = useMemo(() => {
    if (!bookingData.owner) return [];
    const ownerId = bookingData.owner.recordId || bookingData.owner.id;
    return allPets.filter(pet => {
      // Check if pet belongs to this owner
      return pet.ownerId === ownerId || 
             (pet.owners && pet.owners.some(o => o.recordId === ownerId || o.id === ownerId)) ||
             pet.primaryOwnerId === ownerId;
    }).map(pet => ({
      ...pet,
      name: pet.name,
      breed: pet.breed || 'Unknown',
      age: pet.age ? `${pet.age} ${pet.ageUnit || 'years'}` : 'Unknown',
      vaccinations: 'current' // TODO: Check vaccination status from API
    }));
  }, [allPets, bookingData.owner]);

  const togglePet = (pet) => {
    const petId = pet.recordId || pet.id;
    const isSelected = bookingData.pets.some(p => (p.recordId || p.id) === petId);
    if (isSelected) {
      updateBookingData('pets', bookingData.pets.filter(p => (p.recordId || p.id) !== petId));
    } else {
      updateBookingData('pets', [...bookingData.pets, pet]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Select Pets</h3>
        <p className="text-sm text-gray-600 dark:text-text-secondary">Choose which pets to include in this booking</p>
      </div>

      {!bookingData.owner ? (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-text-secondary">
          Please select an owner first
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-text-tertiary" />
        </div>
      ) : availablePets.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-text-secondary">
          No pets found for this owner. Please add a pet first.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availablePets.map(pet => {
          const petId = pet.recordId || pet.id;
          const isSelected = bookingData.pets.some(p => (p.recordId || p.id) === petId);
          
          return (
            <button
              key={pet.id}
              onClick={() => togglePet(pet)}
              className={cn(
                "p-4 rounded-lg border-2 transition-all text-left",
                isSelected 
                  ? "border-primary-600 bg-primary-50" 
                  : "border-gray-200 dark:border-surface-border hover:border-gray-300"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-200 dark:bg-surface-border rounded-full flex items-center justify-center">
                  <PawPrint className="h-6 w-6 text-gray-600 dark:text-text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-text-primary">{pet.name}</p>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">{pet.breed} • {pet.age}</p>
                  {pet.vaccinations === 'expires soon' && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 text-warning-600" />
                      <span className="text-xs text-warning-600">Vaccination expires soon</span>
                    </div>
                  )}
                </div>
                {isSelected && (
                  <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0" />
                )}
              </div>
            </button>
          );
        })}
        </div>
      )}

      {/* Selected count */}
      {bookingData.pets.length > 0 && (
        <div className="bg-primary-50 dark:bg-surface-primary border border-primary-200 dark:border-primary-900/30 rounded-lg p-3">
          <p className="text-sm text-primary-700 dark:text-primary-300">
            {bookingData.pets.length} pet(s) selected for this booking
          </p>
        </div>
      )}
    </div>
  );
};

const ServiceStep = ({ bookingData, updateBookingData }) => {
  const { data: services = [], isLoading } = useServicesQuery();

  // Map service category to icon
  const getServiceIcon = (category) => {
    const categoryLower = (category || '').toLowerCase();
    if (categoryLower.includes('boarding')) return '🏠';
    if (categoryLower.includes('daycare')) return '☀️';
    if (categoryLower.includes('grooming')) return '✂️';
    return '📋';
  };

  // Format price display
  const formatPrice = (service) => {
    if (service.priceCents) {
      const dollars = (service.priceCents / 100).toFixed(2);
      // Try to infer if it's per night/day from category or name
      const nameLower = (service.name || '').toLowerCase();
      const catLower = (service.category || '').toLowerCase();
      if (catLower.includes('boarding') || nameLower.includes('boarding')) {
        return `$${dollars}/night`;
      }
      if (catLower.includes('daycare') || nameLower.includes('daycare')) {
        return `$${dollars}/day`;
      }
      return `$${dollars}`;
    }
    return 'Price on request';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Select Service & Dates</h3>
        <p className="text-sm text-gray-600 dark:text-text-secondary">Choose the primary service and duration</p>
      </div>

      {/* Service Selection - Visual cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-text-tertiary" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-text-secondary">
          No services available. Please add services in Settings.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {services.filter(s => s.isActive !== false).map(service => (
            <button
              key={service.recordId || service.id}
              onClick={() => updateBookingData('service', service)}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                (bookingData.service?.recordId === service.recordId || bookingData.service?.id === service.id)
                  ? "border-primary-600 bg-primary-50"
                  : "border-gray-200 dark:border-surface-border hover:border-gray-300"
              )}
            >
              <div className="text-3xl mb-2">{getServiceIcon(service.category)}</div>
              <p className="font-medium text-gray-900 dark:text-text-primary">{service.name}</p>
              <p className="text-sm text-gray-600 dark:text-text-secondary">{formatPrice(service)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Date Selection - Inline, not modal */}
      {bookingData.service && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-text-primary">Select Dates</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Check-in</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-lg bg-white dark:bg-surface-primary text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary dark:text-text-secondary placeholder:opacity-75 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                onChange={(e) => updateBookingData('dateRange', {
                  ...bookingData.dateRange,
                  start: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Check-out</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-lg bg-white dark:bg-surface-primary text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary dark:text-text-secondary placeholder:opacity-75 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                onChange={(e) => updateBookingData('dateRange', {
                  ...bookingData.dateRange,
                  end: e.target.value
                })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Additional Services - Quick toggles */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-text-primary">Additional Services</h4>
        <div className="space-y-2">
          {['Nail Trim ($15)', 'Playtime ($20)', 'Special Feeding ($10)'].map(addon => (
            <label key={addon} className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                onChange={(e) => {
                  if (e.target.checked) {
                    updateBookingData('additionalServices', [...bookingData.additionalServices, addon]);
                  } else {
                    updateBookingData('additionalServices', 
                      bookingData.additionalServices.filter(a => a !== addon)
                    );
                  }
                }}
              />
              <span className="text-sm text-gray-700 dark:text-text-primary">{addon}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

const RoomStep = ({ bookingData, updateBookingData }) => {
  const { data: runTemplates = [], isLoading } = useRunTemplatesQuery();
  
  // Check availability for selected dates
  const { data: existingBookings = [] } = useBookingsQuery(
    bookingData.dateRange.start && bookingData.dateRange.end
      ? {
          startDate: bookingData.dateRange.start,
          endDate: bookingData.dateRange.end,
        }
      : {}
  );

  // Determine which run templates are available
  const availableRunTemplates = useMemo(() => {
    return runTemplates.map(template => {
      // Check if template is already booked for the date range
      // This is a simple check - in production, you'd want more sophisticated availability logic
      const isBooked = existingBookings.some(booking => 
        booking.runTemplateId === template.recordId &&
        booking.status !== 'CANCELLED' &&
        booking.status !== 'CHECKED_OUT'
      );
      
      return {
        ...template,
        available: !isBooked,
      };
    });
  }, [runTemplates, existingBookings]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Select Run/Room</h3>
        <p className="text-sm text-gray-600 dark:text-text-secondary">Choose from available accommodations for the selected dates</p>
      </div>

      {!bookingData.dateRange.start || !bookingData.dateRange.end ? (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-text-secondary">
          Please select dates first to see available runs
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-text-tertiary" />
        </div>
      ) : availableRunTemplates.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-text-secondary">
          No run templates available. Please configure run templates in Settings.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {availableRunTemplates.map(template => (
            <button
              key={template.recordId || template.id}
              onClick={() => template.available && updateBookingData('runTemplate', template)}
              disabled={!template.available}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                (bookingData.runTemplate?.recordId === template.recordId || bookingData.runTemplate?.id === template.id) && "border-primary-600 bg-primary-50",
                template.available && (bookingData.runTemplate?.recordId !== template.recordId && bookingData.runTemplate?.id !== template.id) && "border-gray-200 dark:border-surface-border hover:border-gray-300",
                !template.available && "border-gray-100 bg-gray-50 dark:bg-surface-secondary cursor-not-allowed opacity-60"
              )}
            >
              <div className="text-center">
                <p className="font-bold text-lg text-gray-900 dark:text-text-primary">{template.name}</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Capacity: {template.maxCapacity || 'N/A'}</p>
                <p className="text-xs text-gray-500 dark:text-text-secondary">{template.capacityType || 'total'}</p>
                {!template.available && (
                  <Badge variant="error" className="mt-2">Occupied</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Special Requirements */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-text-primary">Special Requirements</h4>
        <textarea
          placeholder="Any special notes about room placement, neighboring pets to avoid, etc."
          className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-lg bg-white dark:bg-surface-primary text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary dark:text-text-secondary placeholder:opacity-75 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          rows={3}
          onChange={(e) => updateBookingData('specialRequirements', e.target.value)}
          value={bookingData.specialRequirements || ''}
        />
      </div>
    </div>
  );
};

const BillingStep = ({ bookingData }) => {
  // Calculate nights between dates
  const nights = useMemo(() => {
    if (!bookingData.dateRange.start || !bookingData.dateRange.end) return 0;
    const start = new Date(bookingData.dateRange.start);
    const end = new Date(bookingData.dateRange.end);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [bookingData.dateRange]);

  // Calculate service total
  const serviceTotal = useMemo(() => {
    if (!bookingData.service?.priceCents || !nights || !bookingData.pets.length) return 0;
    // Service price is in cents, convert to dollars
    const pricePerUnit = bookingData.service.priceCents / 100;
    return nights * pricePerUnit * bookingData.pets.length;
  }, [bookingData.service, nights, bookingData.pets.length]);

  // Mock addon pricing (would come from services API in production)
  const addonsTotal = bookingData.additionalServices.length * 15;
  const total = serviceTotal + addonsTotal;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Review & Payment</h3>
        <p className="text-sm text-gray-600 dark:text-text-secondary">Confirm booking details and process payment</p>
      </div>

      {/* Booking Summary */}
      <div className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-text-primary">Booking Summary</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-text-secondary">Owner:</span>
            <span className="font-medium">{bookingData.owner?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-text-secondary">Pets:</span>
            <span className="font-medium">{bookingData.pets.map(p => p.name).join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-text-secondary">Service:</span>
            <span className="font-medium">{bookingData.service?.name} ({nights} nights)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-text-secondary">Run/Room:</span>
            <span className="font-medium">{bookingData.runTemplate?.name || 'Not selected'}</span>
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900 dark:text-text-primary">Price Breakdown</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-text-secondary">{bookingData.service?.name} ({nights} {nights === 1 ? 'night' : 'nights'} × {bookingData.pets.length} {bookingData.pets.length === 1 ? 'pet' : 'pets'})</span>
            <span className="font-medium">${serviceTotal.toFixed(2)}</span>
          </div>
          {bookingData.additionalServices.map(addon => (
            <div key={addon} className="flex justify-between">
              <span className="text-gray-600 dark:text-text-secondary">{addon}</span>
              <span className="font-medium">$15</span>
            </div>
          ))}
          <div className="border-t border-gray-300 dark:border-surface-border pt-1 flex justify-between font-medium">
            <span>Total</span>
            <span className="text-lg">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Options */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-text-primary">Payment Method</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-surface-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary">
            <input type="radio" name="payment" className="text-primary-600" />
            <span className="text-sm">Pay now (Card on file ending in 4242)</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-surface-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary">
            <input type="radio" name="payment" className="text-primary-600" />
            <span className="text-sm">Pay at drop-off</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-surface-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary">
            <input type="radio" name="payment" className="text-primary-600" />
            <span className="text-sm">Send invoice</span>
          </label>
        </div>
      </div>
    </div>
  );
};

// Persistent Capacity Panel - Always visible
const CapacityPanel = ({ dateRange, selectedRunTemplate }) => {
  const { data: stats } = useDashboardStatsQuery();
  const { data: occupancy } = useOccupancyQuery();
  const { data: todayArrivals = [] } = useUpcomingArrivalsQuery(1); // Today only

  // Calculate capacity data
  const capacityData = useMemo(() => {
    const today = {
      date: 'Today',
      total: occupancy?.total || stats?.totalPets || 0,
      occupied: occupancy?.current || stats?.activeBookings || 0,
      percentage: occupancy?.percentage || 0
    };
    
    // Tomorrow would require date-specific queries - using today's data as fallback
    const tomorrow = {
      date: 'Tomorrow',
      total: today.total,
      occupied: Math.min(today.occupied + (todayArrivals.length || 0), today.total),
      percentage: 0
    };
    tomorrow.percentage = tomorrow.total > 0 ? Math.round((tomorrow.occupied / tomorrow.total) * 100) : 0;

    return [today, tomorrow];
  }, [occupancy, stats, todayArrivals.length]);

  // Format arrivals for display
  const formattedArrivals = useMemo(() => {
    return todayArrivals.slice(0, 3).map(arrival => {
      const checkIn = arrival.checkIn ? new Date(arrival.checkIn) : null;
      const timeStr = checkIn ? checkIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD';
      return {
        time: timeStr,
        pet: arrival.pet?.name || arrival.petName || 'Unknown',
        owner: arrival.owner ? `${arrival.owner.firstName || ''} ${arrival.owner.lastName || ''}`.trim() : arrival.ownerName || 'Unknown'
      };
    });
  }, [todayArrivals]);

  return (
    <Card className="h-full p-6 bg-gray-50 dark:bg-surface-secondary">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Facility Status</h3>
      
      {/* Current Capacity */}
      <div className="space-y-4 mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-text-primary">Current Capacity</h4>
        {capacityData.map(item => (
          <div key={item.date} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-text-secondary">{item.date}</span>
              <span className="font-medium">{item.occupied}/{item.total}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  item.percentage < 70 && "bg-success-600",
                  item.percentage >= 70 && item.percentage < 85 && "bg-warning-600",
                  item.percentage >= 85 && "bg-error-600"
                )}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Selected Dates Availability */}
      {dateRange.start && dateRange.end && (
        <div className="mb-6 p-3 bg-white dark:bg-surface-primary rounded-lg border border-gray-200 dark:border-surface-border">
          <h4 className="text-sm font-medium text-gray-700 dark:text-text-primary mb-2">Selected Period</h4>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600 dark:text-text-secondary">
              {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
            </p>
            {selectedRunTemplate ? (
              <p className="font-medium text-success-600">✓ {selectedRunTemplate.name} selected</p>
            ) : (
              <p className="text-gray-500 dark:text-text-secondary">No run selected</p>
            )}
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-text-primary">Today's Arrivals</h4>
        {formattedArrivals.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-text-secondary">No arrivals scheduled today</div>
        ) : (
          <div className="space-y-2">
            {formattedArrivals.map((arrival, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-text-secondary">{arrival.time}</span>
                <span className="font-medium">{arrival.pet} ({arrival.owner})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warnings */}
      {capacityData[0]?.percentage >= 85 && (
        <div className="mt-6 p-3 bg-warning-50 dark:bg-surface-primary border border-warning-200 dark:border-warning-900/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-warning-600 dark:text-warning-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning-800 dark:text-warning-200">High Occupancy</p>
              <p className="text-warning-700 dark:text-warning-300 text-xs mt-1">
                {capacityData[0].percentage}% capacity - consider early drop-off
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default SinglePageBookingWizard;


