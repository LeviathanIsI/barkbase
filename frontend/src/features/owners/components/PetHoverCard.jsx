import { useState, useRef, useEffect } from 'react';
import { PawPrint, Check, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { queryKeys } from '@/lib/queryKeys';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import PetQuickActionsDrawer from './PetQuickActionsDrawer';

// Timing constants
const OPEN_DELAY = 150; // ms before showing popover
const CLOSE_DELAY = 250; // ms before hiding popover (allows moving to popover)

/**
 * PetHoverCard - Shows pet details on hover for an owner
 *
 * @param {string} ownerId - Owner ID to fetch pets for
 * @param {number} petCount - Number of pets (for display when not hovering)
 * @param {React.ReactNode} children - Trigger element
 */
const PetHoverCard = ({ ownerId, petCount, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const openTimeoutRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  const tenantId = useAuthStore((state) => state.tenantId);
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

  // Only fetch when hovering and owner has pets
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.pets(tenantKey), { ownerId }],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.pets.list, {
        params: { ownerId }
      });
      // Handle various response shapes
      const items = res?.data?.data || res?.data?.pets || res?.data || [];
      return Array.isArray(items) ? items : [];
    },
    enabled: shouldFetch && !!ownerId && !!tenantId && petCount > 0,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
  });

  const pets = data || [];

  // Clear all timeouts
  const clearTimeouts = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // Open popover with delay
  const startOpenTimer = () => {
    clearTimeouts();
    openTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      setShouldFetch(true);
    }, OPEN_DELAY);
  };

  // Close popover with delay
  const startCloseTimer = () => {
    clearTimeouts();
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, CLOSE_DELAY);
  };

  // Cancel close (e.g., when moving from trigger to popover)
  const cancelClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // Handle mouse enter on trigger
  const handleTriggerMouseEnter = () => {
    if (petCount === 0) return;
    cancelClose();
    startOpenTimer();
  };

  // Handle mouse leave on trigger
  const handleTriggerMouseLeave = () => {
    startCloseTimer();
  };

  // Handle mouse enter on popover
  const handlePopoverMouseEnter = () => {
    cancelClose();
  };

  // Handle mouse leave on popover
  const handlePopoverMouseLeave = () => {
    startCloseTimer();
  };

  // Handle pet click
  const handlePetClick = (petId) => {
    setSelectedPetId(petId);
    setIsOpen(false);
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setSelectedPetId(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, []);

  // Don't wrap if no pets
  if (petCount === 0) {
    return children;
  }

  return (
    <>
      <div
        ref={containerRef}
        className="relative inline-block"
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
      >
        <div className="cursor-pointer">
          {children}
        </div>

        {isOpen && (
          <div
            ref={popoverRef}
            className={cn(
              'absolute z-50 mt-2 left-0 min-w-[300px] max-w-[360px] rounded-lg shadow-xl',
              'animate-in fade-in-0 zoom-in-95 duration-150'
            )}
            style={{
              backgroundColor: 'var(--bb-color-bg-elevated)',
              border: '1px solid var(--bb-color-border-subtle)',
            }}
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handlePopoverMouseLeave}
          >
            {/* Header */}
            <div
              className="px-3 py-2 border-b flex items-center gap-2"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <PawPrint className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                {petCount} Pet{petCount !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-[color:var(--bb-color-text-muted)] ml-auto">
                Click for details
              </span>
            </div>

            {/* Content */}
            <div className="max-h-[280px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-[color:var(--bb-color-text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading pets...</span>
                </div>
              ) : pets.length === 0 ? (
                <div className="py-4 px-3 text-center text-sm text-[color:var(--bb-color-text-muted)]">
                  No pets found
                </div>
              ) : (
                <div className="py-1">
                  {pets.map((pet) => (
                    <PetRow
                      key={pet.id || pet.recordId}
                      pet={pet}
                      onClick={() => handlePetClick(pet.id || pet.recordId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pet Quick Actions Drawer */}
      <PetQuickActionsDrawer
        petId={selectedPetId}
        isOpen={!!selectedPetId}
        onClose={handleDrawerClose}
      />
    </>
  );
};

/**
 * Individual pet row in the hover card
 */
const PetRow = ({ pet, onClick }) => {
  const speciesBreed = [
    pet.species?.toUpperCase(),
    pet.breed
  ].filter(Boolean).join(' - ') || 'Unknown';

  const isActive = pet.status === 'active' || pet.status === 'ACTIVE' || pet.is_active !== false;

  // Vaccination status - check for expiring/missing vaccinations
  const hasVaccinationIssue = pet.vaccinationStatus === 'expiring' ||
    pet.vaccinationStatus === 'missing' ||
    pet.hasExpiringVaccinations === true;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full px-3 py-2.5 flex items-center gap-3 text-left',
        'hover:bg-[var(--bb-color-bg-surface)] transition-colors',
        'focus:outline-none focus:bg-[var(--bb-color-bg-surface)]'
      )}
    >
      {/* Pet Avatar */}
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0 text-sm font-semibold"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          color: 'var(--bb-color-text-muted)',
        }}
      >
        {pet.name?.[0]?.toUpperCase() || <PawPrint className="h-4 w-4" />}
      </div>

      {/* Pet Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)] truncate">
            {pet.name || 'Unnamed'}
          </span>
          {/* Status Badge */}
          <Badge
            variant={isActive ? 'success' : 'neutral'}
            className="text-[0.65rem] px-1.5 py-0"
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="text-xs text-[color:var(--bb-color-text-muted)] truncate">
          {speciesBreed}
        </div>
      </div>

      {/* Vaccination Status Icon */}
      <div className="flex-shrink-0" title={hasVaccinationIssue ? 'Vaccinations need attention' : 'Vaccinations up to date'}>
        {hasVaccinationIssue ? (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        ) : (
          <Check className="h-4 w-4 text-emerald-500" />
        )}
      </div>

      {/* Chevron indicator */}
      <ChevronRight className="h-4 w-4 text-[color:var(--bb-color-text-muted)] flex-shrink-0" />
    </button>
  );
};

export default PetHoverCard;
