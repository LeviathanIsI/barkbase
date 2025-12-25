/**
 * PetHoverPreview - Quick pet info popup on hover
 * Uses token-based styling for consistent theming
 */

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
      return { status: 'missing', label: 'No vaccination records', variant: 'negative' };
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
      return { status: 'expired', label: 'Vaccinations expired', variant: 'negative' };
    }
    if (expiringSoon) {
      return { status: 'expiring', label: 'Vaccinations expiring soon', variant: 'warning' };
    }
    return { status: 'current', label: 'Vaccinations current', variant: 'positive' };
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
          variant: 'info'
        };
      } else if (now < checkIn) {
        return {
          status: 'upcoming',
          label: `Arriving ${format(checkIn, 'MMM d')}`,
          variant: 'accent'
        };
      }
    }
    return { status: 'none', label: 'No current booking', variant: 'muted' };
  };

  const bookingStatus = getBookingStatus();

  const getStatusColor = (variant) => {
    const colors = {
      negative: 'text-[var(--bb-color-status-negative)]',
      warning: 'text-[var(--bb-color-status-warning)]',
      positive: 'text-[var(--bb-color-status-positive)]',
      info: 'text-[var(--bb-color-status-info)]',
      accent: 'text-[var(--bb-color-accent)]',
      muted: 'text-[var(--bb-color-text-muted)]',
    };
    return colors[variant] || colors.muted;
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const previewWidth = 320;
        const previewHeight = 200;
        const margin = 10;

        // Calculate available space on all four sides
        const spaceRight = window.innerWidth - rect.right;
        const spaceLeft = rect.left;
        const spaceBottom = window.innerHeight - rect.top;
        const spaceTop = rect.top;

        // Determine horizontal position
        let left;
        if (spaceRight >= previewWidth + margin) {
          // Position to the right of trigger
          left = rect.right + margin;
        } else if (spaceLeft >= previewWidth + margin) {
          // Position to the left of trigger
          left = rect.left - previewWidth - margin;
        } else {
          // Not enough space on either side, prefer right but constrain
          left = rect.right + margin;
        }

        // Determine vertical position - align top of preview with top of trigger
        let top = rect.top;

        // Adjust if it would go off bottom of screen
        if (top + previewHeight > window.innerHeight - margin) {
          top = window.innerHeight - previewHeight - margin;
        }

        // Adjust if it would go off top of screen
        if (top < margin) {
          top = margin;
        }

        // Final bounds check for horizontal position
        left = Math.max(margin, Math.min(left, window.innerWidth - previewWidth - margin));

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
          className="fixed z-[9999] w-80 rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] p-[var(--bb-space-4)] shadow-[var(--bb-elevation-card)]"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={handlePreviewEnter}
          onMouseLeave={handlePreviewLeave}
        >
          {/* Header with pet info */}
          <div className="flex items-start gap-[var(--bb-space-3)] mb-[var(--bb-space-3)]">
            <PetAvatar pet={pet} size="lg" showStatus={false} />
            <div className="flex-1 min-w-0">
              <h3 className="font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] truncate">
                {pet.name}
              </h3>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                {pet.breed || 'Unknown breed'} • {pet.species || 'Dog'}
              </p>
              {pet.weight && (
                <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                  {pet.weight} lbs
                </p>
              )}
            </div>
          </div>

          {/* Status indicators */}
          <div className="space-y-[var(--bb-space-2)] border-t border-[var(--bb-color-border-subtle)] pt-[var(--bb-space-3)]">
            {/* Vaccination status */}
            <div className="flex items-center gap-[var(--bb-space-2)]">
              <Syringe className={cn("h-4 w-4", getStatusColor(vaccinationStatus.variant))} />
              <span className={cn("text-[var(--bb-font-size-sm)]", getStatusColor(vaccinationStatus.variant))}>
                {vaccinationStatus.label}
              </span>
            </div>

            {/* Booking status */}
            <div className="flex items-center gap-[var(--bb-space-2)]">
              <Home className={cn("h-4 w-4", getStatusColor(bookingStatus.variant))} />
              <span className={cn("text-[var(--bb-font-size-sm)]", getStatusColor(bookingStatus.variant))}>
                {bookingStatus.label}
              </span>
            </div>

            {/* Last visit */}
            {pet.lastVisit && (
              <div className="flex items-center gap-[var(--bb-space-2)]">
                <Calendar className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                  Last visit: {format(new Date(pet.lastVisit), 'MMM d, yyyy')}
                </span>
              </div>
            )}

            {/* Medical alerts */}
            {pet.medicalAlerts && pet.medicalAlerts.length > 0 && (
              <div className="flex items-start gap-[var(--bb-space-2)] mt-[var(--bb-space-2)]">
                <AlertCircle className="h-4 w-4 text-[var(--bb-color-status-negative)] flex-shrink-0 mt-0.5" />
                <div className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-status-negative)]">
                  {pet.medicalAlerts.map((alert, i) => (
                    <div key={i}>{alert}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Special needs */}
            {pet.specialNeeds && (
              <div className="flex items-start gap-[var(--bb-space-2)]">
                <Clock className="h-4 w-4 text-[var(--bb-color-status-warning)] flex-shrink-0 mt-0.5" />
                <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                  {pet.specialNeeds}
                </p>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex gap-[var(--bb-space-2)] mt-[var(--bb-space-3)] pt-[var(--bb-space-3)] border-t border-[var(--bb-color-border-subtle)]">
            <button className="flex-1 px-[var(--bb-space-3)] py-[var(--bb-space-2)] text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)] rounded-[var(--bb-radius-md)] hover:bg-[var(--bb-color-accent)]/20 transition-colors">
              View Profile
            </button>
            <button className="flex-1 px-[var(--bb-space-3)] py-[var(--bb-space-2)] text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-status-positive)] bg-[var(--bb-color-status-positive-soft)] rounded-[var(--bb-radius-md)] hover:bg-[var(--bb-color-status-positive)]/20 transition-colors">
              Book Stay
            </button>
            <button className="flex-1 px-[var(--bb-space-3)] py-[var(--bb-space-2)] text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-purple)] bg-[var(--bb-color-purple-soft)] rounded-[var(--bb-radius-md)] hover:bg-[var(--bb-color-purple)]/20 transition-colors">
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
