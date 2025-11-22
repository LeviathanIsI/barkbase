import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Syringe, Home, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import PetAvatar from './PetAvatar';
import { format, differenceInDays } from 'date-fns';

const PetHoverPreview = ({ children, pet, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);
  const previewRef = useRef(null);

  // Calculate vaccination status
  const getVaccinationStatus = () => {
    if (!pet?.vaccinations?.length) {
      return { status: 'missing', label: 'No vaccination records', color: 'text-red-600' };
    }

    const now = new Date();
    let hasExpired = false;
    let expiringSoon = false;

    pet.vaccinations.forEach(vax => {
      const expiryDate = new Date(vax.expiryDate);
      const daysUntilExpiry = differenceInDays(expiryDate, now);

      if (daysUntilExpiry < 0) hasExpired = true;
      else if (daysUntilExpiry <= 30) expiringSoon = true;
    });

    if (hasExpired) {
      return { status: 'expired', label: 'Vaccinations expired', color: 'text-red-600' };
    }
    if (expiringSoon) {
      return { status: 'expiring', label: 'Vaccinations expiring soon', color: 'text-yellow-600' };
    }
    return { status: 'current', label: 'Vaccinations current', color: 'text-success-600' };
  };

  const vaccinationStatus = getVaccinationStatus();

  // Get current booking status
  const getBookingStatus = () => {
    if (pet?.currentBooking) {
      const checkIn = new Date(pet.currentBooking.checkIn);
      const checkOut = new Date(pet.currentBooking.checkOut);
      const now = new Date();

      if (now >= checkIn && now <= checkOut) {
        return {
          status: 'in-facility',
          label: `In facility until ${format(checkOut, 'MMM d')}`,
          color: 'text-blue-600'
        };
      } else if (now < checkIn) {
        return {
          status: 'upcoming',
          label: `Arriving ${format(checkIn, 'MMM d')}`,
          color: 'text-indigo-600'
        };
      }
    }
    return { status: 'none', label: 'No current booking', color: 'text-gray-500' };
  };

  const bookingStatus = getBookingStatus();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const previewWidth = 320;
        const previewHeight = 200;

        // Position preview to the right of trigger by default
        let left = rect.right + 10;
        let top = rect.top;

        // Adjust if preview would go off screen
        if (left + previewWidth > window.innerWidth) {
          left = rect.left - previewWidth - 10;
        }

        if (top + previewHeight > window.innerHeight) {
          top = window.innerHeight - previewHeight - 10;
        }

        setPosition({ top, left });
        setIsVisible(true);
      }
    }, 500); // 500ms delay before showing
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 200); // Small delay to prevent flickering
  };

  // Keep preview open when hovering over it
  const handlePreviewEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handlePreviewLeave = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!pet) return <>{children}</>;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn("cursor-help", className)}
      >
        {children}
      </span>

      {isVisible && createPortal(
        <div
          ref={previewRef}
          className="fixed z-[9999] w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={handlePreviewEnter}
          onMouseLeave={handlePreviewLeave}
        >
          {/* Header with pet info */}
          <div className="flex items-start gap-3 mb-3">
            <PetAvatar pet={pet} size="lg" showStatus={false} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {pet.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {pet.breed || 'Unknown breed'} • {pet.species || 'Dog'}
              </p>
              {pet.weight && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pet.weight} lbs
                </p>
              )}
            </div>
          </div>

          {/* Status indicators */}
          <div className="space-y-2 border-t pt-3">
            {/* Vaccination status */}
            <div className="flex items-center gap-2">
              <Syringe className={cn("h-4 w-4", vaccinationStatus.color)} />
              <span className={cn("text-sm", vaccinationStatus.color)}>
                {vaccinationStatus.label}
              </span>
            </div>

            {/* Booking status */}
            <div className="flex items-center gap-2">
              <Home className={cn("h-4 w-4", bookingStatus.color)} />
              <span className={cn("text-sm", bookingStatus.color)}>
                {bookingStatus.label}
              </span>
            </div>

            {/* Last visit */}
            {pet.lastVisit && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Last visit: {format(new Date(pet.lastVisit), 'MMM d, yyyy')}
                </span>
              </div>
            )}

            {/* Medical alerts */}
            {pet.medicalAlerts && pet.medicalAlerts.length > 0 && (
              <div className="flex items-start gap-2 mt-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-600 dark:text-red-400">
                  {pet.medicalAlerts.map((alert, i) => (
                    <div key={i}>{alert}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Special needs */}
            {pet.specialNeeds && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pet.specialNeeds}
                </p>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <button className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30">
              View Profile
            </button>
            <button className="flex-1 px-3 py-1.5 text-xs font-medium text-success-600 bg-success-100 rounded hover:bg-success-200/60 dark:bg-success-600/10 dark:text-success-400 dark:hover:bg-success-600/20">
              Book Stay
            </button>
            <button className="flex-1 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30">
              Check In
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default PetHoverPreview;