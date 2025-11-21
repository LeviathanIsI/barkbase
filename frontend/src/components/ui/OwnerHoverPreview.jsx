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
    if (!owner) return { status: 'unknown', label: 'Unknown status', color: 'text-gray-500' };

    // Check for overdue payments
    if (owner.overdueBalance && owner.overdueBalance > 0) {
      return {
        status: 'overdue',
        label: `Overdue: $${owner.overdueBalance.toFixed(2)}`,
        color: 'text-red-600'
      };
    }

    // Check for account credits
    if (owner.accountCredit && owner.accountCredit > 0) {
      return {
        status: 'credit',
        label: `Credit: $${owner.accountCredit.toFixed(2)}`,
        color: 'text-green-600'
      };
    }

    // Check if VIP/Premium customer
    if (owner.isVIP || owner.membershipTier === 'premium') {
      return {
        status: 'vip',
        label: 'VIP Customer',
        color: 'text-purple-600'
      };
    }

    return { status: 'active', label: 'Active account', color: 'text-green-600' };
  };

  const accountStatus = getAccountStatus();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const previewWidth = 320;
        const previewHeight = 280;

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
          className="fixed z-[9999] w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={handlePreviewEnter}
          onMouseLeave={handlePreviewLeave}
        >
          {/* Header with owner info */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              {owner.avatarUrl ? (
                <img
                  src={owner.avatarUrl}
                  alt={owner.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {owner.name || `${owner.firstName} ${owner.lastName}`.trim() || 'Unknown Owner'}
              </h3>
              <p className={cn("text-sm font-medium", accountStatus.color)}>
                {accountStatus.label}
              </p>
            </div>
          </div>

          {/* Contact information */}
          <div className="space-y-2 border-t pt-3">
            {/* Phone */}
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formatPhone(owner.phone || owner.primaryPhone)}
              </span>
              {owner.secondaryPhone && (
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  • {formatPhone(owner.secondaryPhone)}
                </span>
              )}
            </div>

            {/* Email */}
            {owner.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {owner.email}
                </span>
              </div>
            )}

            {/* Address */}
            {(owner.address?.street || owner.city) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
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
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <PawPrint className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pets ({owner.pets?.length || 0})
              </span>
            </div>
            {owner.pets && owner.pets.length > 0 ? (
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {owner.pets.map((pet, index) => (
                  <div key={pet.id || index} className="text-sm text-gray-600 dark:text-gray-400">
                    • {pet.name} ({pet.species || 'Dog'})
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-500">No pets registered</p>
            )}
          </div>

          {/* Additional info */}
          <div className="space-y-2 border-t pt-3 mt-3">
            {/* Last interaction */}
            {owner.lastInteraction && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Last visit: {formatDistanceToNow(new Date(owner.lastInteraction), { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Payment method */}
            {owner.hasPaymentMethod && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Payment method on file
                </span>
              </div>
            )}

            {/* Outstanding balance */}
            {owner.balance && owner.balance !== 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className={cn(
                  "h-4 w-4",
                  owner.balance > 0 ? "text-red-500" : "text-green-500"
                )} />
                <span className={cn(
                  "text-sm",
                  owner.balance > 0 ? "text-red-600" : "text-green-600"
                )}>
                  Balance: ${Math.abs(owner.balance).toFixed(2)}
                  {owner.balance < 0 && " (Credit)"}
                </span>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <button className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30">
              View Profile
            </button>
            <button className="flex-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30">
              Send Message
            </button>
            <button className="flex-1 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30">
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