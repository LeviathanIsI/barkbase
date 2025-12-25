/**
 * OwnerHoverPreview - Quick owner info popup on hover
 * Uses token-based styling for consistent theming
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Phone, Mail, MapPin, CreditCard, PawPrint, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/cn';
import { format, formatDistanceToNow } from 'date-fns';

const OwnerHoverPreview = ({ children, owner, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);
  const previewRef = useRef(null);

  // Calculate account status
  const getAccountStatus = () => {
    if (!owner) return { status: 'unknown', label: 'Unknown status', variant: 'muted' };

    // Check for overdue payments
    if (owner.overdueBalance && owner.overdueBalance > 0) {
      return {
        status: 'overdue',
        label: `Overdue: $${owner.overdueBalance.toFixed(2)}`,
        variant: 'negative'
      };
    }

    // Check for account credits
    if (owner.accountCredit && owner.accountCredit > 0) {
      return {
        status: 'credit',
        label: `Credit: $${owner.accountCredit.toFixed(2)}`,
        variant: 'positive'
      };
    }

    // Check if VIP/Premium customer
    if (owner.isVIP || owner.membershipTier === 'premium') {
      return {
        status: 'vip',
        label: 'VIP Customer',
        variant: 'accent'
      };
    }

    return { status: 'active', label: 'Active account', variant: 'positive' };
  };

  const accountStatus = getAccountStatus();

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
        const previewHeight = 280;
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

  if (!owner) return <>{children}</>;

  // Format phone number
  const formatPhone = (phone) => {
    if (!phone) return 'No phone';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

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
          {/* Header with owner info */}
          <div className="flex items-start gap-[var(--bb-space-3)] mb-[var(--bb-space-3)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]">
              {owner.avatarUrl ? (
                <img
                  src={owner.avatarUrl}
                  alt={owner.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-[var(--bb-color-text-muted)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] truncate">
                {owner.name || `${owner.firstName} ${owner.lastName}`.trim() || 'Unknown Owner'}
              </h3>
              <p className={cn("text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)]", getStatusColor(accountStatus.variant))}>
                {accountStatus.label}
              </p>
            </div>
          </div>

          {/* Contact information */}
          <div className="space-y-[var(--bb-space-2)] border-t border-[var(--bb-color-border-subtle)] pt-[var(--bb-space-3)]">
            {/* Phone */}
            <div className="flex items-center gap-[var(--bb-space-2)]">
              <Phone className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
              <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                {formatPhone(owner.phone || owner.primaryPhone)}
              </span>
              {owner.secondaryPhone && (
                <span className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-subtle)]">
                  • {formatPhone(owner.secondaryPhone)}
                </span>
              )}
            </div>

            {/* Email */}
            {owner.email && (
              <div className="flex items-center gap-[var(--bb-space-2)]">
                <Mail className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] truncate">
                  {owner.email}
                </span>
              </div>
            )}

            {/* Address */}
            {(owner.address?.street || owner.city) && (
              <div className="flex items-start gap-[var(--bb-space-2)]">
                <MapPin className="h-4 w-4 text-[var(--bb-color-text-muted)] flex-shrink-0 mt-0.5" />
                <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                  {owner.address?.street && <div>{owner.address.street}</div>}
                  {(owner.address?.city || owner.city) && (owner.address?.state || owner.state) && (
                    <div>
                      {owner.address?.city || owner.city}, {owner.address?.state || owner.state} {owner.address?.zip || owner.zip}
                    </div>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Pet information */}
          <div className="border-t border-[var(--bb-color-border-subtle)] pt-[var(--bb-space-3)] mt-[var(--bb-space-3)]">
            <div className="flex items-center gap-[var(--bb-space-2)] mb-[var(--bb-space-2)]">
              <PawPrint className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
              <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                Pets ({owner.pets?.length || 0})
              </span>
            </div>
            {owner.pets && owner.pets.length > 0 ? (
              <div className="space-y-[var(--bb-space-1)] max-h-20 overflow-y-auto">
                {owner.pets.map((pet, index) => (
                  <div key={pet.id || index} className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                    • {pet.name} ({pet.species || 'Dog'})
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-subtle)]">No pets registered</p>
            )}
          </div>

          {/* Additional info */}
          <div className="space-y-[var(--bb-space-2)] border-t border-[var(--bb-color-border-subtle)] pt-[var(--bb-space-3)] mt-[var(--bb-space-3)]">
            {/* Last interaction */}
            {owner.lastInteraction && (
              <div className="flex items-center gap-[var(--bb-space-2)]">
                <Calendar className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                  Last visit: {formatDistanceToNow(new Date(owner.lastInteraction), { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Payment method */}
            {owner.hasPaymentMethod && (
              <div className="flex items-center gap-[var(--bb-space-2)]">
                <CreditCard className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                  Payment method on file
                </span>
              </div>
            )}

            {/* Outstanding balance */}
            {owner.balance && owner.balance !== 0 && (
              <div className="flex items-center gap-[var(--bb-space-2)]">
                <DollarSign className={cn(
                  "h-4 w-4",
                  owner.balance > 0 ? "text-[var(--bb-color-status-negative)]" : "text-[var(--bb-color-status-positive)]"
                )} />
                <span className={cn(
                  "text-[var(--bb-font-size-sm)]",
                  owner.balance > 0 ? "text-[var(--bb-color-status-negative)]" : "text-[var(--bb-color-status-positive)]"
                )}>
                  Balance: ${Math.abs(owner.balance).toFixed(2)}
                  {owner.balance < 0 && " (Credit)"}
                </span>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex gap-[var(--bb-space-2)] mt-[var(--bb-space-3)] pt-[var(--bb-space-3)] border-t border-[var(--bb-color-border-subtle)]">
            <button className="flex-1 px-[var(--bb-space-3)] py-[var(--bb-space-2)] text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)] rounded-[var(--bb-radius-md)] hover:bg-[var(--bb-color-accent)]/20 transition-colors">
              View Profile
            </button>
            <button className="flex-1 px-[var(--bb-space-3)] py-[var(--bb-space-2)] text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-status-positive)] bg-[var(--bb-color-status-positive-soft)] rounded-[var(--bb-radius-md)] hover:bg-[var(--bb-color-status-positive)]/20 transition-colors">
              Send Message
            </button>
            <button className="flex-1 px-[var(--bb-space-3)] py-[var(--bb-space-2)] text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-purple)] bg-[var(--bb-color-purple-soft)] rounded-[var(--bb-radius-md)] hover:bg-[var(--bb-color-purple)]/20 transition-colors">
              Add Payment
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default OwnerHoverPreview;
