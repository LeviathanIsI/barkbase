/**
 * Kennels Page
 * Visual facility map view with spatial kennel layout
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Building,
  Settings,
  Home,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Eye,
  Edit,
  Trash2,
  X,
  Activity,
  PawPrint,
  DoorOpen,
  Stethoscope,
  Sun,
  BarChart3,
  Layers,
  TrendingUp,
  Map,
  User,
  Clock,
  Flag,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
import StyledSelect from '@/components/ui/StyledSelect';
import KennelForm from '../components/KennelForm';
import KennelAssignDrawer from '../components/KennelAssignDrawer';
import { useKennels, useDeleteKennel, useToggleSpecialHandling } from '../api';
import { useTerminology } from '@/lib/terminology';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

// Kennel type configurations
const KENNEL_TYPES = {
  KENNEL: { label: 'Kennel', icon: Home, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', size: 'normal' },
  SUITE: { label: 'Suite', icon: DoorOpen, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', size: 'large' },
  CABIN: { label: 'Cabin', icon: Building, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', size: 'large' },
  DAYCARE: { label: 'Daycare', icon: Sun, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', size: 'xlarge' },
  MEDICAL: { label: 'Medical', icon: Stethoscope, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', size: 'normal' },
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subValue, variant = 'primary' }) => {
  const variantStyles = {
    primary: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/50',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      icon: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      icon: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
    },
    info: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
      icon: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800/50',
    },
  };

  const styles = variantStyles[variant] || variantStyles.primary;

  return (
    <div className={cn('relative flex items-center gap-3 rounded-xl border p-4', styles.bg, styles.border)}>
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', styles.iconBg)}>
        <Icon className={cn('h-5 w-5', styles.icon)} />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
          {label}
        </p>
        <p className="text-2xl font-bold text-[color:var(--bb-color-text-primary)] leading-tight">{value}</p>
        {subValue && (
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">{subValue}</p>
        )}
      </div>
    </div>
  );
};

// Kennel Unit Box for the facility map
const KennelUnit = ({ kennel, onClick, isSelected, onToggleSpecialHandling }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const unitRef = useRef(null);
  const typeConfig = KENNEL_TYPES[kennel.type] || KENNEL_TYPES.KENNEL;

  const handleFlagClick = (e) => {
    e.stopPropagation();
    onToggleSpecialHandling?.(kennel);
  };

  const available = (kennel.capacity || 1) - (kennel.occupied || 0);
  const isFull = available <= 0;
  const isPartial = available > 0 && (kennel.occupied || 0) > 0;
  // Check for future reservations (hasReservation flag or non-empty reservations array from backend)
  const hasReservation = kennel.hasReservation || (kennel.reservations && kennel.reservations.length > 0);

  // Determine status color
  const getStatusColor = () => {
    if (!kennel.isActive) return { bg: 'bg-gray-400', ring: 'ring-gray-400', glow: 'shadow-gray-400/30', text: 'Inactive' };
    if (isFull) return { bg: 'bg-red-500', ring: 'ring-red-500', glow: 'shadow-red-500/30', text: 'Full' };
    if (isPartial) return { bg: 'bg-amber-500', ring: 'ring-amber-500', glow: 'shadow-amber-500/30', text: `${available} open` };
    // Show "Reserved" if kennel has a future booking reservation but is currently empty
    if (hasReservation) return { bg: 'bg-blue-500', ring: 'ring-blue-500', glow: 'shadow-blue-500/30', text: 'Reserved' };
    return { bg: 'bg-emerald-500', ring: 'ring-emerald-500', glow: 'shadow-emerald-500/30', text: 'Open' };
  };

  const status = getStatusColor();

  // Size based on type - bigger boxes for touch-friendly tablet use
  // Suites are premium units and should be visually larger (2x width)
  const getSizeClass = () => {
    switch (typeConfig.size) {
      case 'xlarge': return 'w-[200px] min-h-[130px]'; // Daycare - extra wide
      case 'large': return 'w-[180px] min-h-[120px]';  // Suites/Cabins - premium 2x width
      default: return 'w-[110px] min-h-[110px]';       // Standard kennels - touch-friendly
    }
  };

  const handleMouseEnter = () => {
    if (unitRef.current) {
      const rect = unitRef.current.getBoundingClientRect();
      const tooltipWidth = 256; // w-64 = 16rem = 256px
      const tooltipHeight = 200; // Approximate tooltip height
      const margin = 8;

      // Position tooltip below the element by default
      // Flip to above if too close to bottom of screen
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipToAbove = spaceBelow < tooltipHeight + margin;

      const top = flipToAbove
        ? rect.top - tooltipHeight - margin  // Position above
        : rect.bottom + margin;              // Position below

      // Horizontally center the tooltip relative to the element
      // Clamp to keep within viewport
      let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));

      setTooltipPosition({ top, left });
      setShowTooltip(true);
    }
  };

  return (
    <div
      ref={unitRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={() => onClick(kennel)}
        className={cn(
          'relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200',
          'hover:shadow-xl hover:-translate-y-1 hover:z-10',
          getSizeClass(),
          isSelected
            ? 'ring-2 ring-offset-2 ring-[color:var(--bb-color-accent)] border-[color:var(--bb-color-accent)]'
            : 'border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-accent)]',
          kennel.isActive
            ? `bg-[color:var(--bb-color-bg-surface)] hover:${status.glow}`
            : 'bg-gray-100 dark:bg-gray-800/50 opacity-60'
        )}
      >
        {/* Special handling flag - top left */}
        <button
          type="button"
          onClick={handleFlagClick}
          className={cn(
            'absolute top-2 left-2 p-0.5 rounded transition-colors',
            'hover:bg-red-100 dark:hover:bg-red-900/30',
            kennel.specialHandling ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'
          )}
          title={kennel.specialHandling ? 'Special handling enabled' : 'Enable special handling'}
        >
          <Flag className="h-3.5 w-3.5" fill={kennel.specialHandling ? 'currentColor' : 'none'} />
        </button>

        {/* Status indicator dot - positioned in corner with breathing room */}
        <div className={cn('absolute top-2 right-2 w-2.5 h-2.5 rounded-full', status.bg)} />

        {/* Kennel name */}
        <span className="text-base font-bold text-[color:var(--bb-color-text-primary)] mb-1.5">
          {kennel.name}
        </span>

        {/* Type icon - slightly larger */}
        <typeConfig.icon className={cn('h-5 w-5 mb-1.5', typeConfig.color)} />

        {/* Capacity */}
        <span className="text-sm font-medium text-[color:var(--bb-color-text-muted)]">
          {kennel.occupied || 0}/{kennel.capacity || 1}
        </span>

        {/* Status text */}
        <span className={cn(
          'text-xs font-semibold mt-1.5 px-2 py-1 rounded-full',
          isFull ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
          isPartial ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
          !kennel.isActive ? 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400' :
          hasReservation ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        )}>
          {status.text}
        </span>
      </button>

      {/* Tooltip with pet/booking details - rendered via portal */}
      {showTooltip && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] w-64 p-4 rounded-xl shadow-2xl border"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            backgroundColor: 'var(--bb-color-bg-elevated)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-base text-[color:var(--bb-color-text-primary)]">{kennel.name}</span>
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', typeConfig.bg, typeConfig.color)}>
              {typeConfig.label}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-[color:var(--bb-color-text-muted)]">
              <Building className="h-3.5 w-3.5" />
              <span>{kennel.building || 'No building'}{kennel.floor ? ` - ${kennel.floor}` : ''}</span>
            </div>

            <div className="flex items-center gap-2 text-[color:var(--bb-color-text-muted)]">
              <Activity className="h-3.5 w-3.5" />
              <span>Capacity: {kennel.occupied || 0}/{kennel.capacity || 1}</span>
            </div>

            {/* Current guests with full details */}
            {kennel.currentPets && kennel.currentPets.length > 0 && (
              <div className="pt-2.5 mt-2 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <PawPrint className="h-3.5 w-3.5 text-[color:var(--bb-color-accent)]" />
                  <span className="font-medium text-[color:var(--bb-color-text-primary)]">Current Guests</span>
                </div>
                {kennel.currentPets.map((pet, i) => (
                  <div key={i} className="ml-5 mb-2 last:mb-0">
                    <div className="font-medium text-[color:var(--bb-color-text-primary)]">{pet.name}</div>
                    {pet.ownerName && (
                      <div className="flex items-center gap-1.5 text-xs text-[color:var(--bb-color-text-muted)]">
                        <User className="h-3 w-3" />
                        {pet.ownerName}
                      </div>
                    )}
                    {(pet.checkIn || pet.checkOut) && (
                      <div className="flex items-center gap-1.5 text-xs text-[color:var(--bb-color-text-muted)]">
                        <Clock className="h-3 w-3" />
                        {pet.checkIn && pet.checkOut ? `${pet.checkIn} - ${pet.checkOut}` : pet.checkIn || pet.checkOut}
                      </div>
                    )}
                    {pet.serviceType && (
                      <div className="flex items-center gap-1.5 text-xs text-[color:var(--bb-color-text-muted)]">
                        <Calendar className="h-3 w-3" />
                        {pet.serviceType}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {kennel.notes && (
              <div className="pt-2 border-t text-[color:var(--bb-color-text-muted)] italic text-xs" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                {kennel.notes}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Building Floor Section
const BuildingFloorSection = ({ title, kennels, onKennelClick, selectedKennelId, onToggleSpecialHandling }) => {
  const sectionStats = useMemo(() => {
    const total = kennels.length;
    const capacity = kennels.reduce((sum, k) => sum + (k.capacity || 1), 0);
    const occupied = kennels.reduce((sum, k) => sum + (k.occupied || 0), 0);
    const available = capacity - occupied;
    return { total, capacity, occupied, available };
  }, [kennels]);

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[color:var(--bb-color-accent-soft)] flex items-center justify-center">
            <Building className="h-5 w-5 text-[color:var(--bb-color-accent)]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[color:var(--bb-color-text-primary)]">{title}</h3>
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">
              {sectionStats.total} units • {sectionStats.occupied}/{sectionStats.capacity} occupied
            </p>
          </div>
        </div>
        <div className={cn(
          'px-3 py-1.5 rounded-full text-sm font-medium',
          sectionStats.available === 0
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : sectionStats.available <= 2
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        )}>
          {sectionStats.available} available
        </div>
      </div>

      {/* Kennel Units Grid - more gap for breathing room */}
      <div className="flex flex-wrap gap-4">
        {kennels.map((kennel) => (
          <KennelUnit
            key={kennel.id || kennel.recordId}
            kennel={kennel}
            onClick={onKennelClick}
            isSelected={selectedKennelId === (kennel.id || kennel.recordId)}
            onToggleSpecialHandling={onToggleSpecialHandling}
          />
        ))}
      </div>
    </div>
  );
};

// Capacity Overview Sidebar Card
const CapacityOverview = ({ stats }) => {
  const utilizationPercent = stats.totalCapacity > 0
    ? Math.round((stats.occupied / stats.totalCapacity) * 100)
    : 0;

  const getStatus = () => {
    if (utilizationPercent >= 90) return { label: 'Full', color: 'text-red-600', bg: 'bg-red-500' };
    if (utilizationPercent >= 70) return { label: 'Busy', color: 'text-amber-600', bg: 'bg-amber-500' };
    return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-500' };
  };

  const status = getStatus();

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Capacity Overview</h3>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[color:var(--bb-color-text-muted)]">Utilization</span>
          <span className="font-semibold text-[color:var(--bb-color-text-primary)]">{utilizationPercent}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
          <div
            className={cn('h-full rounded-full transition-all', status.bg)}
            style={{ width: `${utilizationPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
          <p className="text-lg font-bold text-[color:var(--bb-color-text-primary)]">{stats.occupied}</p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Occupied</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
          <p className="text-lg font-bold text-[color:var(--bb-color-text-primary)]">{stats.totalCapacity - stats.occupied}</p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Available</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-sm">
        <span className={cn('w-2 h-2 rounded-full', status.bg)} />
        <span className={status.color}>{status.label}</span>
      </div>
    </div>
  );
};

// By Building Sidebar Card with jump links
const BuildingBreakdown = ({ kennels, onJumpToSection }) => {
  const buildingStats = useMemo(() => {
    const stats = {};
    kennels.forEach(k => {
      const building = k.building || 'No Building';
      const floor = k.floor || 'Main';
      const key = `${building} - ${floor}`;
      if (!stats[key]) {
        stats[key] = { building, floor, total: 0, capacity: 0, occupied: 0 };
      }
      stats[key].total++;
      stats[key].capacity += k.capacity || 0;
      stats[key].occupied += k.occupied || 0;
    });
    return Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]));
  }, [kennels]);

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Building className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">By Location</h3>
      </div>

      <div className="space-y-2">
        {buildingStats.map(([key, data]) => {
          const available = data.capacity - data.occupied;
          return (
            <button
              key={key}
              onClick={() => onJumpToSection(key)}
              className="w-full flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-[color:var(--bb-color-accent-soft)]"
              style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
            >
              <div className="text-left">
                <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{data.building}</p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">{data.floor} • {data.total} units</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[color:var(--bb-color-text-primary)]">{data.occupied}/{data.capacity}</p>
                <p className={cn('text-xs', available > 0 ? 'text-green-600' : 'text-red-600')}>
                  {available > 0 ? `${available} avail` : 'Full'}
                </p>
              </div>
            </button>
          );
        })}
        {buildingStats.length === 0 && (
          <p className="text-xs text-[color:var(--bb-color-text-muted)] text-center py-2">No buildings configured</p>
        )}
      </div>
    </div>
  );
};

// By Type Sidebar Card
const TypeBreakdown = ({ kennels }) => {
  const typeStats = useMemo(() => {
    const stats = {};
    Object.keys(KENNEL_TYPES).forEach(type => {
      stats[type] = { total: 0, capacity: 0, occupied: 0 };
    });
    kennels.forEach(k => {
      const type = k.type || 'KENNEL';
      if (stats[type]) {
        stats[type].total++;
        stats[type].capacity += k.capacity || 0;
        stats[type].occupied += k.occupied || 0;
      }
    });
    return Object.entries(stats).filter(([_, data]) => data.total > 0);
  }, [kennels]);

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">By Type</h3>
      </div>

      <div className="space-y-2">
        {typeStats.map(([type, data]) => {
          const config = KENNEL_TYPES[type];
          return (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('w-3 h-3 rounded-full', config.bg)} />
                <span className="text-sm text-[color:var(--bb-color-text-primary)]">{config.label}</span>
              </div>
              <span className="text-sm font-bold text-[color:var(--bb-color-text-primary)]">
                {data.occupied}/{data.capacity}
              </span>
            </div>
          );
        })}
        {typeStats.length === 0 && (
          <p className="text-xs text-[color:var(--bb-color-text-muted)] text-center py-2">No kennels yet</p>
        )}
      </div>
    </div>
  );
};

// Quick Actions Sidebar Card
const QuickActions = ({ onAddKennel, navigate }) => {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Quick Actions</h3>
      </div>

      <div className="space-y-2">
        <Button onClick={onAddKennel} className="w-full justify-start" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Kennel
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => navigate('/settings/facility')}
        >
          <Building className="h-4 w-4 mr-2" />
          Manage Buildings
        </Button>
      </div>
    </div>
  );
};

// Legend Component - Sidebar Card version
const MapLegend = () => (
  <div
    className="rounded-xl border p-4"
    style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
  >
    <div className="flex items-center gap-2 mb-3">
      <Map className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
      <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Legend</h3>
    </div>

    <div className="space-y-2">
      <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <span className="w-4 h-4 rounded-full bg-emerald-500 flex-shrink-0" />
        <div>
          <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">Available</span>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Ready for new bookings</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <span className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0" />
        <div>
          <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">Reserved</span>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Has future booking</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <span className="w-4 h-4 rounded-full bg-amber-500 flex-shrink-0" />
        <div>
          <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">Partial</span>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Some capacity remaining</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <span className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0" />
        <div>
          <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">Full</span>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">At maximum capacity</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <span className="w-4 h-4 rounded-full bg-gray-400 flex-shrink-0" />
        <div>
          <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">Inactive</span>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Not in service</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <Flag className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" />
        <div>
          <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">Special Handling</span>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Requires extra care</p>
        </div>
      </div>
    </div>
  </div>
);

const Kennels = () => {
  const navigate = useNavigate();
  const terminology = useTerminology();
  const [showForm, setShowForm] = useState(false);
  const [selectedKennel, setSelectedKennel] = useState(null);
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [assignKennel, setAssignKennel] = useState(null);
  const sectionRefs = useRef({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const { data: kennels = [], isLoading, error } = useKennels();
  const deleteMutation = useDeleteKennel();
  const toggleSpecialHandlingMutation = useToggleSpecialHandling();

  // Filter kennels
  const filteredKennels = useMemo(() => {
    return kennels.filter(kennel => {
      const matchesSearch = !searchTerm ||
        kennel.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kennel.building?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && kennel.isActive) ||
        (statusFilter === 'INACTIVE' && !kennel.isActive);

      const matchesType = typeFilter === 'ALL' || kennel.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [kennels, searchTerm, statusFilter, typeFilter]);

  // Group kennels by Building + Floor
  const groupedByLocation = useMemo(() => {
    const groups = {};
    filteredKennels.forEach(kennel => {
      const building = kennel.building || 'No Building';
      const floor = kennel.floor || 'Main';
      const key = `${building} - ${floor}`;
      if (!groups[key]) {
        groups[key] = { building, floor, kennels: [] };
      }
      groups[key].kennels.push(kennel);
    });

    // Sort kennels within each group by name
    Object.values(groups).forEach(group => {
      group.kennels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });

    // Sort groups by building then floor
    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => ({ key, ...data }));
  }, [filteredKennels]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: kennels.length,
    active: kennels.filter(k => k.isActive).length,
    totalCapacity: kennels.reduce((sum, k) => sum + (k.capacity || 0), 0),
    occupied: kennels.reduce((sum, k) => sum + (k.occupied || 0), 0),
    buildings: [...new Set(kennels.map(k => k.building).filter(Boolean))].length || 0,
  }), [kennels]);

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
  };

  // Handlers
  const handleKennelClick = (kennel) => {
    setSelectedKennel(kennel);
    setShowForm(true);
  };

  const handleToggleSpecialHandling = (kennel) => {
    const newValue = !kennel.specialHandling;
    toggleSpecialHandlingMutation.mutate(
      { kennelId: kennel.id || kennel.recordId, specialHandling: newValue },
      {
        onSuccess: () => {
          toast.success(
            newValue
              ? `Special handling enabled for ${kennel.name}`
              : `Special handling disabled for ${kennel.name}`
          );
        },
      }
    );
  };

  const handleJumpToSection = (sectionKey) => {
    const element = sectionRefs.current[sectionKey];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedKennel(null);
  };

  const handleSuccess = () => {
    handleCloseForm();
    toast.success(selectedKennel ? 'Kennel updated' : 'Kennel created');
  };

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <nav className="mb-1">
              <ol className="flex items-center gap-1 text-xs text-muted">
                <li><span>Operations</span></li>
                <li><ChevronRight className="h-3 w-3" /></li>
                <li className="text-text font-medium">Kennels</li>
              </ol>
            </nav>
            <h1 className="text-lg font-semibold text-text">Kennel Management</h1>
          </div>
        </div>
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h3 className="font-semibold text-text mb-1">Error Loading Kennels</h3>
          <p className="text-sm text-muted">Unable to load kennel data. Please try again.</p>
        </Card>
      </div>
    );
  }

  const utilizationPercent = stats.totalCapacity > 0
    ? Math.round((stats.occupied / stats.totalCapacity) * 100)
    : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] gap-4">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between shrink-0">
        <div>
          <nav className="mb-2">
            <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
              <li><span>Operations</span></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-[color:var(--bb-color-text-primary)] font-medium">Kennels</li>
            </ol>
          </nav>
          <h1 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">Facility Map</h1>
          <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">Visual layout of kennel accommodations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/facility">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Settings
            </Link>
          </Button>
          <Button size="sm" onClick={() => { setSelectedKennel(null); setShowForm(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Kennel
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={Home}
              label="Total Kennels"
              value={stats.total}
              variant="primary"
            />
            <StatCard
              icon={Activity}
              label="Active"
              value={stats.active}
              subValue={`of ${stats.total}`}
              variant="success"
            />
            <StatCard
              icon={Building}
              label="Buildings"
              value={stats.buildings}
              variant="info"
            />
            <StatCard
              icon={BarChart3}
              label="Capacity"
              value={`${stats.occupied}/${stats.totalCapacity}`}
              subValue={`${utilizationPercent}% utilized`}
              variant={utilizationPercent >= 90 ? 'warning' : 'success'}
            />
          </>
        )}
      </div>

      {/* Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] flex-1 min-h-0">
        {/* Left: Facility Map */}
        <div className="space-y-4 overflow-y-auto min-h-0">
          {/* Filter Bar */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search kennels..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                  style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
                />
              </div>

              <div className="min-w-[130px]">
                <StyledSelect
                  options={[
                    { value: 'ALL', label: 'All Status' },
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                  ]}
                  value={statusFilter}
                  onChange={(opt) => setStatusFilter(opt?.value || 'ALL')}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>

              <div className="min-w-[130px]">
                <StyledSelect
                  options={[
                    { value: 'ALL', label: 'All Types' },
                    ...Object.entries(KENNEL_TYPES).map(([key, config]) => ({ value: key, label: config.label }))
                  ]}
                  value={typeFilter}
                  onChange={(opt) => setTypeFilter(opt?.value || 'ALL')}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
            </div>

            {/* Active Filter Tags */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap mt-3 pt-3" style={{ borderTop: '1px solid var(--bb-color-border-subtle)' }}>
                <span className="text-xs text-[color:var(--bb-color-text-muted)]">Active:</span>
                {statusFilter !== 'ALL' && (
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)] rounded-full"
                  >
                    {statusFilter} <X className="h-3 w-3" />
                  </button>
                )}
                {typeFilter !== 'ALL' && (
                  <button
                    onClick={() => setTypeFilter('ALL')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)] rounded-full"
                  >
                    {KENNEL_TYPES[typeFilter]?.label} <X className="h-3 w-3" />
                  </button>
                )}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                    style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
                  >
                    "{searchTerm}" <X className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs text-[color:var(--bb-color-accent)] hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Facility Map */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : filteredKennels.length === 0 ? (
            <div
              className="p-8 text-center rounded-lg border"
              style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <Map className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--bb-color-text-muted)' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                {kennels.length === 0 ? 'No Kennels Yet' : 'No Results'}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--bb-color-text-muted)' }}>
                {kennels.length === 0
                  ? 'Add your first kennel to see the facility map.'
                  : 'Try adjusting your filters.'}
              </p>
              {kennels.length === 0 ? (
                <Button onClick={() => { setSelectedKennel(null); setShowForm(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Kennel
                </Button>
              ) : (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByLocation.map((group) => (
                <div
                  key={group.key}
                  ref={(el) => { sectionRefs.current[group.key] = el; }}
                >
                  <BuildingFloorSection
                    title={group.key}
                    kennels={group.kennels}
                    onKennelClick={handleKennelClick}
                    selectedKennelId={selectedKennel?.id || selectedKennel?.recordId}
                    onToggleSpecialHandling={handleToggleSpecialHandling}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          <MapLegend />
          <CapacityOverview stats={stats} />
          <BuildingBreakdown kennels={kennels} onJumpToSection={handleJumpToSection} />
          <TypeBreakdown kennels={kennels} />
          <QuickActions onAddKennel={() => { setSelectedKennel(null); setShowForm(true); }} navigate={navigate} />
        </div>
      </div>

      {/* Kennel Form Modal */}
      {showForm && (
        <KennelForm
          kennel={selectedKennel}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
          terminology={terminology}
        />
      )}

      {/* Kennel Assignment Drawer */}
      <KennelAssignDrawer
        isOpen={showAssignDrawer}
        onClose={() => { setShowAssignDrawer(false); setAssignKennel(null); }}
        kennel={assignKennel}
      />
    </div>
  );
};

export default Kennels;
