/**
 * Kennels Page
 * Visual facility map view with spatial kennel layout
 */
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import StyledSelect from '@/components/ui/StyledSelect';
import { cn } from '@/lib/cn';
import { useTerminology } from '@/lib/terminology';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building,
  Calendar,
  ChevronRight,
  Clock,
  DoorOpen,
  Flag,
  Home,
  Layers,
  Map,
  PawPrint,
  Plus,
  Search,
  Settings,
  Stethoscope,
  Sun,
  TrendingUp,
  User,
  X
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useDeleteKennel, useKennels, useToggleSpecialHandling } from '../api';
import KennelAssignDrawer from '../components/KennelAssignDrawer';
import KennelForm from '../components/KennelForm';

// Kennel type configurations with size badges
const KENNEL_TYPES = {
  KENNEL: { label: 'Kennel', icon: Home, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', size: 'normal', sizeBadge: 'S', badgeColor: 'bg-blue-500' },
  SUITE: { label: 'Suite', icon: DoorOpen, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', size: 'large', sizeBadge: 'L', badgeColor: 'bg-purple-500' },
  CABIN: { label: 'Cabin', icon: Building, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', size: 'large', sizeBadge: 'L', badgeColor: 'bg-amber-500' },
  DAYCARE: { label: 'Daycare', icon: Sun, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', size: 'xlarge', sizeBadge: 'XL', badgeColor: 'bg-green-500' },
  MEDICAL: { label: 'Medical', icon: Stethoscope, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', size: 'normal', sizeBadge: 'M', badgeColor: 'bg-red-500' },
};

// Size badge mapping based on kennel name prefix
const getSizeBadge = (name) => {
  if (!name) return null;
  const prefix = name.split('-')[0]?.toUpperCase();
  switch (prefix) {
    case 'S': return { badge: 'S', color: 'bg-slate-500', label: 'Small' };
    case 'M': return { badge: 'M', color: 'bg-blue-500', label: 'Medium' };
    case 'L': return { badge: 'L', color: 'bg-purple-500', label: 'Large' };
    case 'XL': return { badge: 'XL', color: 'bg-amber-500', label: 'Extra Large' };
    default: return null;
  }
};

// Stat Card Component - Premium Glass Treatment with Gradient Icons
const StatCard = ({ icon: Icon, label, value, subValue, variant = 'primary' }) => {
  // Gradient icon backgrounds
  const iconGradients = {
    primary: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    success: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    warning: 'bg-gradient-to-br from-amber-500 to-orange-500',
    info: 'bg-gradient-to-br from-violet-500 to-purple-600',
  };

  return (
    <div
      className={cn(
        'relative flex items-center gap-4 rounded-2xl border p-5 transition-all duration-300',
        // Glass effect
        'backdrop-blur-[16px]',
        'bg-[var(--bb-glass-bg)] border-[var(--bb-glass-border)]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.08),_inset_0_0_0_1px_rgba(255,255,255,0.1)]',
        'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),_inset_0_0_0_1px_rgba(255,255,255,0.05)]',
        'hover:shadow-[0_12px_40px_rgba(0,0,0,0.12),_inset_0_0_0_1px_rgba(255,255,255,0.15)]'
      )}
    >
      {/* Premium gradient icon with glow */}
      <div className="relative">
        <div
          className={cn(
            'absolute inset-0 rounded-xl blur-xl opacity-40',
            iconGradients[variant]
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-lg',
            iconGradients[variant]
          )}
        >
          <Icon className="h-6 w-6 text-white" strokeWidth={1.75} />
        </div>
      </div>
      <div className="min-w-0 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
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

// Kennel Unit Box for the facility map - Enhanced with status borders and size badges
const KennelUnit = ({ kennel, onClick, isSelected, onToggleSpecialHandling }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const unitRef = useRef(null);
  const typeConfig = KENNEL_TYPES[kennel.type] || KENNEL_TYPES.KENNEL;
  const sizeBadge = getSizeBadge(kennel.name);

  const handleFlagClick = (e) => {
    e.stopPropagation();
    onToggleSpecialHandling?.(kennel);
  };

  const available = (kennel.capacity || 1) - (kennel.occupied || 0);
  const isFull = available <= 0;
  const isPartial = available > 0 && (kennel.occupied || 0) > 0;
  const hasReservation = kennel.hasReservation || (kennel.bookings && kennel.bookings.length > 0);
  const hasCurrentPets = kennel.currentPets && kennel.currentPets.length > 0;

  // Determine status with enhanced styling
  const getStatusConfig = () => {
    if (!kennel.isActive) return {
      bg: 'bg-gray-400',
      border: 'border-gray-300 dark:border-gray-600',
      glow: '',
      text: 'Inactive',
      cardBg: 'bg-gray-50 dark:bg-gray-800/30',
    };
    if (isFull) return {
      bg: 'bg-red-500',
      border: 'border-red-400 dark:border-red-600',
      glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
      text: 'Full',
      cardBg: 'bg-red-50/50 dark:bg-red-950/20',
    };
    if (isPartial) return {
      bg: 'bg-amber-500',
      border: 'border-amber-400 dark:border-amber-600',
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]',
      text: `${available} spot${available > 1 ? 's' : ''}`,
      cardBg: 'bg-amber-50/50 dark:bg-amber-950/20',
    };
    if (hasReservation) return {
      bg: 'bg-blue-500',
      border: 'border-blue-400 dark:border-blue-600',
      glow: '',
      text: 'Reserved',
      cardBg: 'bg-blue-50/30 dark:bg-blue-950/20',
    };
    return {
      bg: 'bg-emerald-500',
      border: 'border-emerald-400 dark:border-emerald-500',
      glow: '',
      text: 'Available',
      cardBg: 'bg-[color:var(--bb-color-bg-surface)]',
    };
  };

  const status = getStatusConfig();

  // Size based on type
  const getSizeClass = () => {
    switch (typeConfig.size) {
      case 'xlarge': return 'w-[200px] min-h-[140px]';
      case 'large': return 'w-[180px] min-h-[130px]';
      default: return 'w-[120px] min-h-[120px]';
    }
  };

  const handleMouseEnter = () => {
    if (unitRef.current) {
      const rect = unitRef.current.getBoundingClientRect();
      const tooltipWidth = 280;
      const tooltipHeight = 220;
      const margin = 8;

      const spaceBelow = window.innerHeight - rect.bottom;
      const flipToAbove = spaceBelow < tooltipHeight + margin;

      const top = flipToAbove
        ? rect.top - tooltipHeight - margin
        : rect.bottom + margin;

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
          'relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300',
          'hover:shadow-xl hover:-translate-y-1.5 hover:z-10',
          getSizeClass(),
          status.border,
          status.cardBg,
          status.glow,
          isSelected && 'ring-2 ring-offset-2 ring-[color:var(--bb-color-accent)]',
          !kennel.isActive && 'opacity-60'
        )}
      >
        {/* Left status bar - visual indicator */}
        <div className={cn(
          'absolute left-0 top-3 bottom-3 w-1 rounded-r-full',
          status.bg
        )} />

        {/* Size badge - top left */}
        {sizeBadge && (
          <div
            className={cn(
              'absolute top-2 left-3 px-1.5 py-0.5 rounded text-[10px] font-bold text-white',
              sizeBadge.color
            )}
            title={sizeBadge.label}
          >
            {sizeBadge.badge}
          </div>
        )}

        {/* Special handling flag - top right area */}
        <button
          type="button"
          onClick={handleFlagClick}
          className={cn(
            'absolute top-2 right-8 p-0.5 rounded transition-colors z-10',
            'hover:bg-red-100 dark:hover:bg-red-900/30',
            kennel.specialHandling ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'
          )}
          title={kennel.specialHandling ? 'Special handling enabled' : 'Enable special handling'}
        >
          <Flag className="h-3.5 w-3.5" fill={kennel.specialHandling ? 'currentColor' : 'none'} />
        </button>

        {/* Status dot - enhanced with ring */}
        <div className={cn(
          'absolute top-2 right-2 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-800',
          status.bg
        )} />

        {/* Kennel name - more prominent */}
        <span className="text-lg font-bold text-[color:var(--bb-color-text-primary)] mb-1">
          {kennel.name}
        </span>

        {/* Type icon with background */}
        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center mb-2', typeConfig.bg)}>
          <typeConfig.icon className={cn('h-5 w-5', typeConfig.color)} />
        </div>

        {/* Current pet name preview (if occupied) */}
        {hasCurrentPets && (
          <div className="flex items-center gap-1 mb-1 px-2 py-0.5 rounded-full bg-[color:var(--bb-color-bg-elevated)]">
            <PawPrint className="h-3 w-3 text-[color:var(--bb-color-accent)]" />
            <span className="text-xs font-medium text-[color:var(--bb-color-text-primary)] truncate max-w-[80px]">
              {kennel.currentPets[0].name}
            </span>
            {kennel.currentPets.length > 1 && (
              <span className="text-xs text-[color:var(--bb-color-text-muted)]">
                +{kennel.currentPets.length - 1}
              </span>
            )}
          </div>
        )}

        {/* Status badge - enhanced */}
        <span className={cn(
          'text-xs font-semibold px-2.5 py-1 rounded-full',
          isFull ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
          isPartial ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
          !kennel.isActive ? 'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400' :
          hasReservation ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        )}>
          {status.text}
        </span>
      </button>

      {/* Enhanced Tooltip */}
      {showTooltip && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] w-72 rounded-xl shadow-2xl border overflow-hidden"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            backgroundColor: 'var(--bb-color-bg-elevated)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Header with status color */}
          <div className={cn('px-4 py-3 border-b', status.cardBg)} style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[color:var(--bb-color-text-primary)]">{kennel.name}</span>
                {sizeBadge && (
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold text-white', sizeBadge.color)}>
                    {sizeBadge.badge}
                  </span>
                )}
              </div>
              <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', typeConfig.bg, typeConfig.color)}>
                {typeConfig.label}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-[color:var(--bb-color-text-muted)]">
                <Building className="h-4 w-4" />
                <span>{kennel.building || 'No building'}{kennel.floor ? ` • ${kennel.floor}` : ''}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', status.bg)} />
              <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{status.text}</span>
              <span className="text-sm text-[color:var(--bb-color-text-muted)]">
                • {kennel.occupied || 0}/{kennel.capacity || 1} capacity
              </span>
            </div>

            {/* Current guests with enhanced display */}
            {hasCurrentPets && (
              <div className="pt-3 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <PawPrint className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
                  <span className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
                    Current Guest{kennel.currentPets.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {kennel.currentPets.map((pet, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[color:var(--bb-color-bg-surface)]">
                      <div className="h-8 w-8 rounded-full bg-[color:var(--bb-color-accent-soft)] flex items-center justify-center">
                        <PawPrint className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-[color:var(--bb-color-text-primary)]">{pet.name}</div>
                        {pet.ownerName && (
                          <div className="text-xs text-[color:var(--bb-color-text-muted)] flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {pet.ownerName}
                          </div>
                        )}
                      </div>
                      {(pet.checkIn || pet.checkOut) && (
                        <div className="text-xs text-[color:var(--bb-color-text-muted)]">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {pet.checkOut || 'TBD'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {kennel.notes && (
              <div className="pt-3 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                <p className="text-xs text-[color:var(--bb-color-text-muted)] italic">{kennel.notes}</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Building Floor Section - Enhanced with collapsible and better visual hierarchy
const BuildingFloorSection = ({ title, kennels, onKennelClick, selectedKennelId, onToggleSpecialHandling, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const sectionStats = useMemo(() => {
    const total = kennels.length;
    const capacity = kennels.reduce((sum, k) => sum + (k.capacity || 1), 0);
    const occupied = kennels.reduce((sum, k) => sum + (k.occupied || 0), 0);
    const available = capacity - occupied;
    const utilizationPercent = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
    return { total, capacity, occupied, available, utilizationPercent };
  }, [kennels]);

  // Determine section status styling
  const getSectionStyle = () => {
    if (sectionStats.available === 0) return {
      headerBg: 'bg-red-50/50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800/50',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      iconColor: 'text-red-600 dark:text-red-400',
    };
    if (sectionStats.available <= 2) return {
      headerBg: 'bg-amber-50/30 dark:bg-amber-950/10',
      borderColor: 'border-amber-200 dark:border-amber-800/50',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
    };
    return {
      headerBg: '',
      borderColor: 'border-[color:var(--bb-color-border-subtle)]',
      iconBg: 'bg-[color:var(--bb-color-accent-soft)]',
      iconColor: 'text-[color:var(--bb-color-accent)]',
    };
  };

  const style = getSectionStyle();

  return (
    <div
      className={cn('rounded-xl border overflow-hidden transition-all duration-300', style.borderColor)}
      style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}
    >
      {/* Section Header - Clickable to collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-5 text-left transition-colors',
          style.headerBg,
          'hover:bg-[color:var(--bb-color-bg-elevated)]'
        )}
      >
        <div className="flex items-center gap-4">
          {/* Expand/Collapse indicator */}
          <div className={cn(
            'transition-transform duration-300',
            isExpanded ? 'rotate-0' : '-rotate-90'
          )}>
            <ChevronRight className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" style={{ transform: 'rotate(90deg)' }} />
          </div>

          {/* Building icon */}
          <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', style.iconBg)}>
            <Building className={cn('h-6 w-6', style.iconColor)} />
          </div>

          {/* Title and stats */}
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">{title}</h3>
            <div className="flex items-center gap-3 text-sm text-[color:var(--bb-color-text-muted)]">
              <span>{sectionStats.total} units</span>
              <span>•</span>
              <span>{sectionStats.occupied}/{sectionStats.capacity} occupied</span>
              <span>•</span>
              <span>{sectionStats.utilizationPercent}% full</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Utilization mini-bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-2 rounded-full overflow-hidden bg-[color:var(--bb-color-bg-elevated)]">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  sectionStats.available === 0 ? 'bg-red-500' :
                  sectionStats.available <= 2 ? 'bg-amber-500' : 'bg-emerald-500'
                )}
                style={{ width: `${sectionStats.utilizationPercent}%` }}
              />
            </div>
          </div>

          {/* Availability badge */}
          <div className={cn(
            'px-3 py-1.5 rounded-full text-sm font-semibold',
            sectionStats.available === 0
              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              : sectionStats.available <= 2
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          )}>
            {sectionStats.available === 0 ? 'Full' : `${sectionStats.available} available`}
          </div>
        </div>
      </button>

      {/* Collapsible content */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="p-5 pt-0">
            {/* Kennel Units Grid */}
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
        </div>
      </div>
    </div>
  );
};

// Capacity Overview Sidebar Card - Premium Glass Treatment with SVG circular gauge
const CapacityOverview = ({ stats }) => {
  const utilizationPercent = stats.totalCapacity > 0
    ? Math.round((stats.occupied / stats.totalCapacity) * 100)
    : 0;

  const getStatus = () => {
    if (utilizationPercent >= 90) return { label: 'Full', color: 'text-red-600', bg: 'bg-red-500', stroke: '#ef4444' };
    if (utilizationPercent >= 70) return { label: 'Busy', color: 'text-amber-600', bg: 'bg-amber-500', stroke: '#f59e0b' };
    return { label: 'Normal', color: 'text-emerald-600', bg: 'bg-emerald-500', stroke: '#10b981' };
  };

  const status = getStatus();
  const available = stats.totalCapacity - stats.occupied;

  // SVG circular gauge parameters
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (utilizationPercent / 100) * circumference;

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 transition-all duration-200',
        'backdrop-blur-[16px]',
        'bg-[var(--bb-glass-bg)] border-[var(--bb-glass-border)]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.08),_inset_0_0_0_1px_rgba(255,255,255,0.1)]',
        'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),_inset_0_0_0_1px_rgba(255,255,255,0.05)]'
      )}
    >
      <div className="flex items-center gap-2.5 mb-4">
        {/* Premium gradient icon with glow */}
        <div className="relative">
          <div className="absolute inset-0 rounded-xl blur-xl opacity-40 bg-gradient-to-br from-emerald-500 to-teal-500" aria-hidden="true" />
          <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <Activity className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Capacity Overview</h3>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Real-time utilization</p>
        </div>
      </div>

      {/* Circular Gauge */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--bb-color-bg-elevated)"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={status.stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">{utilizationPercent}%</span>
            <span className={cn('text-xs font-medium', status.color)}>{status.label}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.occupied}</p>
          <p className="text-xs font-medium text-red-600/70 dark:text-red-400/70">Occupied</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{available}</p>
          <p className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">Available</p>
        </div>
      </div>
    </div>
  );
};

// By Building Sidebar Card - Premium Glass Treatment with progress bars
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
      className={cn(
        'rounded-2xl border p-5 transition-all duration-200',
        'backdrop-blur-[16px]',
        'bg-[var(--bb-glass-bg)] border-[var(--bb-glass-border)]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.08),_inset_0_0_0_1px_rgba(255,255,255,0.1)]',
        'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),_inset_0_0_0_1px_rgba(255,255,255,0.05)]'
      )}
    >
      <div className="flex items-center gap-2.5 mb-4">
        {/* Premium gradient icon with glow */}
        <div className="relative">
          <div className="absolute inset-0 rounded-xl blur-xl opacity-40 bg-gradient-to-br from-violet-500 to-purple-600" aria-hidden="true" />
          <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Building className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">By Location</h3>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Click to jump to section</p>
        </div>
      </div>

      <div className="space-y-2">
        {buildingStats.map(([key, data]) => {
          const available = data.capacity - data.occupied;
          const utilizationPercent = data.capacity > 0 ? Math.round((data.occupied / data.capacity) * 100) : 0;
          const isFull = available === 0;
          const isAlmostFull = available > 0 && available <= 2;

          return (
            <button
              key={key}
              onClick={() => onJumpToSection(key)}
              className={cn(
                'w-full flex flex-col gap-2 p-3 rounded-xl transition-all duration-200',
                'hover:shadow-md hover:-translate-y-0.5 hover:bg-[color:var(--bb-color-accent-soft)]',
                'border border-transparent hover:border-[color:var(--bb-color-accent)]/30',
                isFull && 'bg-red-50/50 dark:bg-red-950/10',
                isAlmostFull && 'bg-amber-50/30 dark:bg-amber-950/10',
                !isFull && !isAlmostFull && 'bg-[color:var(--bb-color-bg-elevated)]'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">{data.building}</p>
                  <p className="text-xs text-[color:var(--bb-color-text-muted)]">{data.floor} • {data.total} units</p>
                </div>
                <div className="text-right">
                  <div className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold',
                    isFull ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                    isAlmostFull ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  )}>
                    {isFull ? 'Full' : `${available} avail`}
                  </div>
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[color:var(--bb-color-bg-surface)]">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      isFull ? 'bg-red-500' : isAlmostFull ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    style={{ width: `${utilizationPercent}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-[color:var(--bb-color-text-muted)] w-8">
                  {utilizationPercent}%
                </span>
              </div>
            </button>
          );
        })}
        {buildingStats.length === 0 && (
          <div className="text-center py-4">
            <Building className="h-8 w-8 mx-auto mb-2 text-[color:var(--bb-color-text-muted)]" />
            <p className="text-xs text-[color:var(--bb-color-text-muted)]">No buildings configured</p>
          </div>
        )}
      </div>
    </div>
  );
};

// By Type Sidebar Card - Premium Glass Treatment
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
      className={cn(
        'rounded-2xl border p-4 transition-all duration-200',
        'backdrop-blur-[16px]',
        'bg-[var(--bb-glass-bg)] border-[var(--bb-glass-border)]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.08),_inset_0_0_0_1px_rgba(255,255,255,0.1)]',
        'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),_inset_0_0_0_1px_rgba(255,255,255,0.05)]'
      )}
    >
      <div className="flex items-center gap-2.5 mb-4">
        {/* Premium gradient icon */}
        <div className="relative">
          <div className="absolute inset-0 rounded-lg blur-lg opacity-40 bg-gradient-to-br from-blue-500 to-indigo-500" aria-hidden="true" />
          <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
            <Layers className="h-4 w-4 text-white" strokeWidth={1.75} />
          </div>
        </div>
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

// Quick Actions Sidebar Card - Premium Glass Treatment
const QuickActions = ({ onAddKennel, navigate }) => {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 transition-all duration-200',
        'backdrop-blur-[16px]',
        'bg-[var(--bb-glass-bg)] border-[var(--bb-glass-border)]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.08),_inset_0_0_0_1px_rgba(255,255,255,0.1)]',
        'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),_inset_0_0_0_1px_rgba(255,255,255,0.05)]',
        // Subtle accent glow for primary action area
        'ring-1 ring-violet-400/20 shadow-[0_0_30px_rgba(139,92,246,0.1)]'
      )}
    >
      <div className="flex items-center gap-2.5 mb-4">
        {/* Premium gradient icon */}
        <div className="relative">
          <div className="absolute inset-0 rounded-lg blur-lg opacity-50 bg-gradient-to-br from-amber-500 to-orange-500" aria-hidden="true" />
          <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <TrendingUp className="h-4 w-4 text-white" strokeWidth={1.75} />
          </div>
        </div>
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

// Legend Component - Premium Glass with collapsible mode
const MapLegend = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const legendItems = [
    { color: 'bg-emerald-500', label: 'Available', desc: 'Ready for new bookings' },
    { color: 'bg-blue-500', label: 'Reserved', desc: 'Has future booking' },
    { color: 'bg-amber-500', label: 'Partial', desc: 'Some capacity remaining' },
    { color: 'bg-red-500', label: 'Full', desc: 'At maximum capacity' },
    { color: 'bg-gray-400', label: 'Inactive', desc: 'Not in service' },
  ];

  return (
    <div
      className={cn(
        'rounded-2xl border overflow-hidden transition-all duration-200',
        'backdrop-blur-[16px]',
        'bg-[var(--bb-glass-bg)] border-[var(--bb-glass-border)]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.08),_inset_0_0_0_1px_rgba(255,255,255,0.1)]',
        'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),_inset_0_0_0_1px_rgba(255,255,255,0.05)]'
      )}
    >
      {/* Header - clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/20 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* Premium gradient icon */}
          <div className="relative">
            <div className="absolute inset-0 rounded-lg blur-lg opacity-40 bg-gradient-to-br from-slate-500 to-slate-600" aria-hidden="true" />
            <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg">
              <Map className="h-4 w-4 text-white" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Legend</h3>
            <p className="text-xs text-[color:var(--bb-color-text-muted)]">Status indicators</p>
          </div>
        </div>
        <ChevronRight
          className={cn(
            'h-4 w-4 text-[color:var(--bb-color-text-muted)] transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
        />
      </button>

      {/* Compact view - always visible */}
      {!isExpanded && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {legendItems.map(item => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[color:var(--bb-color-bg-elevated)]"
              title={item.desc}
            >
              <span className={cn('w-2.5 h-2.5 rounded-full', item.color)} />
              <span className="text-xs font-medium text-[color:var(--bb-color-text-primary)]">{item.label}</span>
            </div>
          ))}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[color:var(--bb-color-bg-elevated)]"
            title="Requires extra care"
          >
            <Flag className="w-2.5 h-2.5 text-red-500" fill="currentColor" />
            <span className="text-xs font-medium text-[color:var(--bb-color-text-primary)]">Special</span>
          </div>
        </div>
      )}

      {/* Expanded view */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-2">
            {legendItems.map(item => (
              <div
                key={item.label}
                className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
              >
                <span className={cn('w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-gray-800', item.color)} />
                <div>
                  <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{item.label}</span>
                  <p className="text-xs text-[color:var(--bb-color-text-muted)]">{item.desc}</p>
                </div>
              </div>
            ))}
            <div
              className="flex items-center gap-3 p-2.5 rounded-lg"
              style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
            >
              <Flag className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" />
              <div>
                <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">Special Handling</span>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">Requires extra care</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
            <h1 className="text-[var(--bb-heading-page-size)] font-[var(--bb-heading-page-weight)] leading-[var(--bb-heading-page-leading)] tracking-[var(--bb-heading-page-tracking)] text-[color:var(--bb-color-text-primary)]">Kennel Management</h1>
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
          <h1 className="text-[var(--bb-heading-page-size)] font-[var(--bb-heading-page-weight)] leading-[var(--bb-heading-page-leading)] tracking-[var(--bb-heading-page-tracking)] text-[color:var(--bb-color-text-primary)]">Facility Map</h1>
          <p className="text-[var(--bb-body-size)] leading-[var(--bb-body-leading)] text-[color:var(--bb-color-text-muted)] mt-1">Visual layout of kennel accommodations</p>
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
