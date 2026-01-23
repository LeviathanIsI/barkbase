/**
 * EditDataSourcesModal - Modal for selecting multiple data sources in custom reports
 * Allows users to combine up to 5 related objects (e.g., Owners + Pets + Bookings)
 */

import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Info,
  PawPrint,
  Star,
  UserCog,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// Data source configuration with icons and colors
const DATA_SOURCE_OPTIONS = [
  { id: 'bookings', label: 'Bookings', icon: CalendarDays, color: 'bg-purple-500', textColor: 'text-purple-500' },
  { id: 'owners', label: 'Owners', icon: Users, color: 'bg-blue-500', textColor: 'text-blue-500' },
  { id: 'pets', label: 'Pets', icon: PawPrint, color: 'bg-green-500', textColor: 'text-green-500' },
  { id: 'services', label: 'Services', icon: Wrench, color: 'bg-amber-500', textColor: 'text-amber-500' },
  { id: 'payments', label: 'Payments', icon: CreditCard, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
  { id: 'staff', label: 'Staff', icon: UserCog, color: 'bg-rose-500', textColor: 'text-rose-500' },
];

// Entity associations map - defines which entities can be joined and how
// This is the frontend definition; backend validates and builds actual JOINs
const ENTITY_ASSOCIATIONS = {
  bookings: {
    owners: { type: 'INNER', via: 'owner_id', label: 'Booking Owner' },
    pets: { type: 'INNER', via: 'BookingPet', label: 'Booked Pets' },
    services: { type: 'INNER', via: 'service_id', label: 'Service' },
  },
  owners: {
    pets: { type: 'INNER', via: 'PetOwner', label: 'Owned Pets' },
    bookings: { type: 'LEFT', via: 'owner_id', label: 'Owner Bookings' },
    payments: { type: 'LEFT', via: 'owner_id', label: 'Owner Payments' },
  },
  pets: {
    owners: { type: 'INNER', via: 'PetOwner', label: 'Pet Owners' },
    bookings: { type: 'LEFT', via: 'BookingPet', label: 'Pet Bookings' },
  },
  services: {
    bookings: { type: 'LEFT', via: 'service_id', label: 'Service Bookings' },
  },
  payments: {
    owners: { type: 'INNER', via: 'owner_id', label: 'Payment Owner' },
    bookings: { type: 'LEFT', via: 'booking_id', label: 'Payment Booking' },
  },
  staff: {
    // Staff has limited associations currently
  },
};

const MAX_DATA_SOURCES = 5;

/**
 * Check if a source can be joined to the current selection
 * @param {string} sourceId - Source to check
 * @param {Array} selectedSources - Currently selected sources
 * @returns {boolean}
 */
function canJoinSource(sourceId, selectedSources) {
  if (selectedSources.length === 0) return true;

  // Check if any selected source has a direct association to this source
  for (const selected of selectedSources) {
    const associations = ENTITY_ASSOCIATIONS[selected.id] || {};
    if (associations[sourceId]) {
      return true;
    }
    // Also check reverse - if sourceId can join to selected
    const reverseAssociations = ENTITY_ASSOCIATIONS[sourceId] || {};
    if (reverseAssociations[selected.id]) {
      return true;
    }
  }
  return false;
}

/**
 * Get join path between two sources
 * @param {string} from - Source entity
 * @param {string} to - Target entity
 * @returns {Object|null}
 */
function getJoinPath(from, to) {
  const associations = ENTITY_ASSOCIATIONS[from];
  if (associations && associations[to]) {
    return { from, to, ...associations[to] };
  }
  // Try reverse
  const reverseAssociations = ENTITY_ASSOCIATIONS[to];
  if (reverseAssociations && reverseAssociations[from]) {
    return { from: to, to: from, ...reverseAssociations[from] };
  }
  return null;
}

/**
 * Build all join paths for selected sources
 * @param {Array} sources - Selected sources with primary marked
 * @returns {Array}
 */
function buildJoinPaths(sources) {
  if (sources.length < 2) return [];

  const primary = sources.find(s => s.isPrimary);
  if (!primary) return [];

  const paths = [];
  const secondary = sources.filter(s => !s.isPrimary);

  for (const source of secondary) {
    const path = getJoinPath(primary.id, source.id);
    if (path) {
      paths.push(path);
    }
  }

  return paths;
}

/**
 * DataSourceCard - Clickable card for a single data source
 */
const DataSourceCard = ({
  source,
  isSelected,
  isPrimary,
  isDisabled,
  onClick,
  onSetPrimary,
}) => {
  const Icon = source.icon;

  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={isDisabled && !isSelected}
        className={cn(
          "relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all w-full",
          "min-w-[100px] min-h-[90px]",
          isSelected && !isDisabled
            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
            : "border-border hover:border-primary/50 hover:bg-surface-hover",
          isDisabled && !isSelected && "opacity-40 cursor-not-allowed hover:border-border hover:bg-transparent",
        )}
      >
        {/* Primary star indicator */}
        {isPrimary && (
          <div className="absolute top-1 right-1">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
        )}

        {/* Selection checkmark */}
        {isSelected && !isPrimary && (
          <div className="absolute top-1 left-1">
            <div className={cn("h-4 w-4 rounded-full flex items-center justify-center", source.color)}>
              <span className="text-white text-[10px] font-bold">&#10003;</span>
            </div>
          </div>
        )}

        {/* Icon */}
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center",
          isSelected ? source.color : "bg-surface-hover"
        )}>
          <Icon className={cn("h-5 w-5", isSelected ? "text-white" : source.textColor)} />
        </div>

        {/* Label */}
        <span className={cn(
          "text-xs font-medium",
          isSelected ? "text-text" : "text-muted"
        )}>
          {source.label}
        </span>
      </button>

      {/* Make Primary button - shown below card when selected but not primary */}
      {isSelected && !isPrimary && onSetPrimary && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetPrimary(source.id);
          }}
          className="w-full mt-1 py-1 text-[10px] text-center text-primary hover:text-primary-dark hover:bg-primary/10 rounded transition-colors"
        >
          Make primary
        </button>
      )}
    </div>
  );
};

/**
 * Get user-friendly description for a join relationship
 */
const getRelationshipDescription = (fromLabel, toLabel, type) => {
  // INNER = all records must have a match, LEFT = includes records without matches
  if (type === 'INNER') {
    return `Each ${fromLabel.slice(0, -1)} with their ${toLabel}`;
  }
  return `${fromLabel} and any related ${toLabel}`;
};

/**
 * DataRelationshipPreview - User-friendly explanation of how data sources connect
 */
const DataRelationshipPreview = ({ paths, primarySource }) => {
  if (paths.length === 0) return null;

  const primaryLabel = DATA_SOURCE_OPTIONS.find(s => s.id === primarySource)?.label || primarySource;

  return (
    <div className="mt-4 p-3 bg-surface-secondary rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Info className="h-4 w-4 text-muted" />
        <span className="text-xs font-medium text-text">How your data connects</span>
      </div>
      <div className="space-y-2">
        {paths.map((path, index) => {
          const fromSource = DATA_SOURCE_OPTIONS.find(s => s.id === path.from);
          const toSource = DATA_SOURCE_OPTIONS.find(s => s.id === path.to);

          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              <span className={cn("font-medium", fromSource?.textColor)}>
                {fromSource?.label}
              </span>
              <ArrowRight className="h-3 w-3 text-muted" />
              <span className={cn("font-medium", toSource?.textColor)}>
                {toSource?.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted mt-2">
        Your report will show {primaryLabel.toLowerCase()} combined with data from the connected sources.
      </p>
    </div>
  );
};

/**
 * EditDataSourcesModal - Main modal component
 */
const EditDataSourcesModal = ({
  isOpen,
  onClose,
  currentSources = [],
  onApply,
}) => {
  // Local state for editing
  const [selectedSources, setSelectedSources] = useState([]);

  // Initialize from current sources when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentSources.length > 0) {
        setSelectedSources([...currentSources]);
      } else {
        // Default to bookings as primary
        setSelectedSources([{ id: 'bookings', isPrimary: true }]);
      }
    }
  }, [isOpen, currentSources]);

  // Fetch associations from API (optional - for dynamic validation)
  const { data: associationsData } = useQuery({
    queryKey: ['report-associations', selectedSources.find(s => s.isPrimary)?.id],
    queryFn: async () => {
      const primary = selectedSources.find(s => s.isPrimary);
      if (!primary) return null;
      try {
        const response = await apiClient.get('/api/v1/analytics/reports/associations', {
          params: {
            primarySource: primary.id,
            selectedSources: selectedSources.filter(s => !s.isPrimary).map(s => s.id).join(','),
          },
        });
        return response.data?.data;
      } catch {
        return null;
      }
    },
    enabled: isOpen && selectedSources.length > 0,
    staleTime: 60000, // Cache for 1 minute
  });

  // Handle source selection toggle
  const handleSourceClick = useCallback((sourceId) => {
    setSelectedSources(prev => {
      const existing = prev.find(s => s.id === sourceId);

      if (existing) {
        // Deselecting - don't allow removing the last source or the primary
        if (prev.length === 1) return prev;
        if (existing.isPrimary) {
          // If removing primary, make the next one primary
          const remaining = prev.filter(s => s.id !== sourceId);
          if (remaining.length > 0) {
            remaining[0].isPrimary = true;
          }
          return remaining;
        }
        return prev.filter(s => s.id !== sourceId);
      } else {
        // Selecting - check max limit
        if (prev.length >= MAX_DATA_SOURCES) return prev;

        // If this is the first selection, make it primary
        const isPrimary = prev.length === 0;
        return [...prev, { id: sourceId, isPrimary }];
      }
    });
  }, []);

  // Handle setting a source as primary
  const handleSetPrimary = useCallback((sourceId) => {
    setSelectedSources(prev =>
      prev.map(s => ({
        ...s,
        isPrimary: s.id === sourceId,
      }))
    );
  }, []);

  // Handle apply
  const handleApply = useCallback(() => {
    onApply(selectedSources);
    onClose();
  }, [selectedSources, onApply, onClose]);

  // Build join paths for preview
  const joinPaths = buildJoinPaths(selectedSources);

  // Determine which sources are available for selection
  const getSourceState = useCallback((sourceId) => {
    const selected = selectedSources.find(s => s.id === sourceId);
    const canJoin = canJoinSource(sourceId, selectedSources);
    const atLimit = selectedSources.length >= MAX_DATA_SOURCES;

    return {
      isSelected: !!selected,
      isPrimary: selected?.isPrimary || false,
      isDisabled: !selected && (!canJoin || atLimit),
    };
  }, [selectedSources]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-surface-primary rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">Edit Data Sources</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text hover:bg-surface-hover rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Primary source section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-medium text-text">PRIMARY SOURCE</h3>
              <span className="text-xs text-muted">(required)</span>
            </div>
            <p className="text-xs text-muted mb-3">
              The primary source determines the main entity for your report. Other sources will be joined to it.
            </p>

            {/* Data source grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {DATA_SOURCE_OPTIONS.map(source => {
                const state = getSourceState(source.id);
                return (
                  <DataSourceCard
                    key={source.id}
                    source={source}
                    isSelected={state.isSelected}
                    isPrimary={state.isPrimary}
                    isDisabled={state.isDisabled}
                    onClick={() => handleSourceClick(source.id)}
                    onSetPrimary={state.isSelected && !state.isPrimary ? handleSetPrimary : null}
                  />
                );
              })}
            </div>
          </div>

          {/* Additional sources info */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text">
                ADDITIONAL SOURCES ({selectedSources.length - 1} of {MAX_DATA_SOURCES - 1})
              </h3>
            </div>
            <p className="text-xs text-muted">
              Click to add related data sources. Grayed out sources cannot be directly joined to your current selection.
            </p>
          </div>

          {/* Data relationship preview */}
          <DataRelationshipPreview
            paths={joinPaths}
            primarySource={selectedSources.find(s => s.isPrimary)?.id}
          />

          {/* API-based unavailable sources hint */}
          {associationsData?.unavailableSources?.length > 0 && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> {associationsData.unavailableSources.join(', ')} cannot be joined to your current selection.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={selectedSources.length === 0}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              selectedSources.length > 0
                ? "bg-primary text-white hover:bg-primary-dark"
                : "bg-muted/20 text-muted cursor-not-allowed"
            )}
          >
            Apply Sources ({selectedSources.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDataSourcesModal;
