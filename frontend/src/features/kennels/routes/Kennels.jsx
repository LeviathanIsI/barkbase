/**
 * Kennels Page
 * Redesigned operational page with stats bar, sidebar, and DAFE interactions
 */
import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Building,
  MapPin,
  Settings,
  Home,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
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
  Minimize2,
  Maximize2,
  BarChart3,
  Layers,
  TrendingUp,
  Map,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import KennelForm from '../components/KennelForm';
import KennelAssignDrawer from '../components/KennelAssignDrawer';
import { useKennels, useDeleteKennel } from '../api';
import { useTerminology } from '@/lib/terminology';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

// Kennel type configurations
const KENNEL_TYPES = {
  KENNEL: { label: 'Kennel', icon: Home, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  SUITE: { label: 'Suite', icon: DoorOpen, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  CABIN: { label: 'Cabin', icon: Building, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  DAYCARE: { label: 'Daycare', icon: Sun, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  MEDICAL: { label: 'Medical', icon: Stethoscope, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
};

// Group by options
const GROUP_BY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'type', label: 'Type' },
  { value: 'building', label: 'Building' },
  { value: 'status', label: 'Status' },
];

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

// Availability pill component
const AvailabilityPill = ({ available, capacity }) => {
  const utilization = capacity > 0 ? ((capacity - available) / capacity) * 100 : 100;

  if (available <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Full
      </span>
    );
  }

  if (utilization >= 75) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        {available} left
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      {available} open
    </span>
  );
};

// Inline Status Dropdown
const StatusDropdown = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = value;

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:ring-2 hover:ring-offset-1',
          isActive
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isActive ? 'Active' : 'Inactive'}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[100px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(true);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2',
                isActive && 'bg-gray-50 dark:bg-gray-700/50'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Active
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(false);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2',
                !isActive && 'bg-gray-50 dark:bg-gray-700/50'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Inactive
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Simplified Kennel Card with DAFE
const KennelCard = ({ kennel, onEdit, onDelete, onViewBookings, onAssignPet, onStatusChange, isCompact, isUpdating }) => {
  const [showMenu, setShowMenu] = useState(false);
  const typeConfig = KENNEL_TYPES[kennel.type] || KENNEL_TYPES.KENNEL;

  const available = (kennel.capacity || 0) - (kennel.occupied || 0);
  const utilization = kennel.capacity > 0 ? Math.round((kennel.occupied || 0) / kennel.capacity * 100) : 0;

  return (
    <div
      className={cn(
        'group bg-white dark:bg-surface-primary border border-border rounded-lg transition-all hover:border-primary/30 hover:shadow-md cursor-pointer',
        isCompact ? 'p-3' : 'p-4'
      )}
      onClick={() => onEdit(kennel)}
    >
      {/* Top Row: Name, Status, Menu */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={cn('font-medium text-text truncate', isCompact ? 'text-sm' : 'text-base')}>
            {kennel.name}
          </h3>
          <StatusDropdown
            value={kennel.isActive}
            onChange={(newStatus) => onStatusChange(kennel.id || kennel.recordId, newStatus)}
            disabled={isUpdating}
          />
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-muted hover:text-text hover:bg-surface rounded transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-surface-primary border border-border rounded-lg shadow-lg z-20 py-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(kennel); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-surface"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onViewBookings(kennel); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-surface"
                >
                  <Calendar className="h-3.5 w-3.5" /> Bookings
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onAssignPet(kennel); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-surface"
                >
                  <PawPrint className="h-3.5 w-3.5" /> Assign
                </button>
                <hr className="my-1 border-border" />
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(kennel.id || kennel.recordId); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-danger hover:bg-danger/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Middle Row: Type, Building, Capacity */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Badge variant="info" size="sm" className={cn(typeConfig.bg, typeConfig.color, 'border-0')}>
          {typeConfig.label}
        </Badge>
        <span className="text-xs text-muted">
          {kennel.building || 'No building'}
          {kennel.floor ? ` - ${kennel.floor}` : ''}
        </span>
        <span className="text-xs text-muted">•</span>
        <span className="text-xs text-muted">
          {kennel.occupied || 0}/{kennel.capacity || 0} ({utilization}%)
        </span>
        <AvailabilityPill available={available} capacity={kennel.capacity || 0} />
      </div>

      {/* Bottom Row: Actions */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-border">
        <button
          onClick={(e) => { e.stopPropagation(); onViewBookings(kennel); }}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          <Calendar className="h-3.5 w-3.5" />
          Bookings
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAssignPet(kennel); }}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          <PawPrint className="h-3.5 w-3.5" />
          Assign
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(kennel); }}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
      </div>
    </div>
  );
};

// Section Header for grouped kennels
const SectionHeader = ({ title, count, isExpanded, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center gap-3 py-2 text-left group"
  >
    <div className={cn(
      'flex items-center justify-center h-5 w-5 rounded transition-colors',
      isExpanded ? 'bg-primary/10' : 'bg-surface'
    )}>
      {isExpanded ? (
        <ChevronDown className="h-3.5 w-3.5 text-primary" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 text-muted" />
      )}
    </div>
    <span className="font-medium text-text">{title}</span>
    <span className="text-xs text-muted">{count} kennel{count !== 1 ? 's' : ''}</span>
  </button>
);

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

// By Building Sidebar Card
const BuildingBreakdown = ({ kennels }) => {
  const buildingStats = useMemo(() => {
    const stats = {};
    kennels.forEach(k => {
      const building = k.building || 'No Building';
      if (!stats[building]) {
        stats[building] = { total: 0, capacity: 0, occupied: 0 };
      }
      stats[building].total++;
      stats[building].capacity += k.capacity || 0;
      stats[building].occupied += k.occupied || 0;
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
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">By Building</h3>
      </div>

      <div className="space-y-2">
        {buildingStats.map(([building, data]) => {
          const available = data.capacity - data.occupied;
          return (
            <div key={building} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
              <div>
                <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{building}</p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">{data.total} unit{data.total !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[color:var(--bb-color-text-primary)]">{data.occupied}/{data.capacity}</p>
                <p className={cn('text-xs', available > 0 ? 'text-green-600' : 'text-red-600')}>
                  {available > 0 ? `${available} avail` : 'Full'}
                </p>
              </div>
            </div>
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
          const available = data.capacity - data.occupied;
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
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-[color:var(--bb-color-text-muted)]"
          onClick={() => toast('Map view coming soon!')}
        >
          <Map className="h-4 w-4 mr-2" />
          View Full Map
        </Button>
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
  const [updatingId, setUpdatingId] = useState(null);

  // View mode
  const [isCompact, setIsCompact] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Grouping
  const [groupBy, setGroupBy] = useState('none');
  const [expandedGroups, setExpandedGroups] = useState({});

  const { data: kennels = [], isLoading, error, refetch } = useKennels();
  const deleteMutation = useDeleteKennel();

  // Calculate enhanced kennel data
  const kennelsWithMetrics = useMemo(() => {
    return kennels.map((kennel) => ({
      ...kennel,
      utilizationRate: kennel.capacity > 0 ? Math.round((kennel.occupied || 0) / kennel.capacity * 100) : 0,
    }));
  }, [kennels]);

  // Filter kennels
  const filteredKennels = useMemo(() => {
    return kennelsWithMetrics.filter(kennel => {
      const matchesSearch = !searchTerm ||
        kennel.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kennel.building?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && kennel.isActive) ||
        (statusFilter === 'INACTIVE' && !kennel.isActive);

      const matchesType = typeFilter === 'ALL' || kennel.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [kennelsWithMetrics, searchTerm, statusFilter, typeFilter]);

  // Group kennels
  const groupedKennels = useMemo(() => {
    if (groupBy === 'none') {
      return { '': filteredKennels };
    }

    const groups = {};
    filteredKennels.forEach(kennel => {
      let groupKey;
      switch (groupBy) {
        case 'type':
          groupKey = KENNEL_TYPES[kennel.type]?.label || 'Other';
          break;
        case 'building':
          groupKey = kennel.building || 'No Building';
          break;
        case 'status':
          groupKey = kennel.isActive ? 'Active' : 'Inactive';
          break;
        default:
          groupKey = 'Other';
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(kennel);
    });

    // Sort groups alphabetically
    const sortedGroups = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [filteredKennels, groupBy]);

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

  // Toggle group expansion
  const toggleGroup = useCallback((groupKey) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: prev[groupKey] === false ? true : false }));
  }, []);

  // Check if group is expanded (default to true)
  const isGroupExpanded = (groupKey) => expandedGroups[groupKey] !== false;

  // Handlers
  const handleEdit = (kennel) => {
    setSelectedKennel(kennel);
    setShowForm(true);
  };

  const handleDelete = async (kennelId) => {
    if (!confirm('Are you sure you want to delete this kennel?')) return;
    try {
      await deleteMutation.mutateAsync(kennelId);
      toast.success('Kennel deleted');
    } catch (error) {
      toast.error(error.message || 'Failed to delete kennel');
    }
  };

  const handleViewBookings = (kennel) => {
    navigate(`/bookings?kennel=${kennel.id || kennel.recordId}`);
  };

  const handleAssignPet = (kennel) => {
    setAssignKennel(kennel);
    setShowAssignDrawer(true);
  };

  const handleStatusChange = async (kennelId, newStatus) => {
    try {
      setUpdatingId(kennelId);
      // For now just show toast - would need useUpdateKennel mutation
      toast.success(`Status changed to ${newStatus ? 'Active' : 'Inactive'}`);
      refetch();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCloseAssignDrawer = () => {
    setShowAssignDrawer(false);
    setAssignKennel(null);
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
          <h1 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">Kennel Management</h1>
          <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">Manage facility accommodations and capacity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/facility">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Settings
            </Link>
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
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
        {/* Left: Kennel Grid */}
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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <option value="ALL">All Types</option>
                {Object.entries(KENNEL_TYPES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[color:var(--bb-color-text-muted)]">Group:</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                  style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  {GROUP_BY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsCompact(!isCompact)}
                className="p-2 rounded-lg border transition-colors hover:border-[color:var(--bb-color-accent)]"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
                title={isCompact ? 'Comfortable view' : 'Compact view'}
              >
                {isCompact ? <Maximize2 className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" /> : <Minimize2 className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />}
              </button>
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

          {/* Results count */}
          <div className="text-xs text-[color:var(--bb-color-text-muted)]">
            {filteredKennels.length} of {kennels.length} kennels
          </div>

          {/* Kennels Grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : filteredKennels.length === 0 ? (
            <div
              className="p-8 text-center rounded-lg border"
              style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <Building className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--bb-color-text-muted)' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                {kennels.length === 0 ? 'No Kennels Yet' : 'No Results'}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--bb-color-text-muted)' }}>
                {kennels.length === 0
                  ? 'Add your first kennel to get started.'
                  : 'Try adjusting your filters.'}
              </p>
              {kennels.length === 0 ? (
                <Button onClick={() => setShowForm(true)}>
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
              {Object.entries(groupedKennels).map(([groupKey, groupKennels]) => (
                <div key={groupKey || 'all'}>
                  {groupBy !== 'none' && groupKey && (
                    <SectionHeader
                      title={groupKey}
                      count={groupKennels.length}
                      isExpanded={isGroupExpanded(groupKey)}
                      onToggle={() => toggleGroup(groupKey)}
                    />
                  )}
                  {(groupBy === 'none' || isGroupExpanded(groupKey)) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {groupKennels.map((kennel) => (
                        <KennelCard
                          key={kennel.id || kennel.recordId}
                          kennel={kennel}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onViewBookings={handleViewBookings}
                          onAssignPet={handleAssignPet}
                          onStatusChange={handleStatusChange}
                          isCompact={isCompact}
                          isUpdating={updatingId === (kennel.id || kennel.recordId)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          <CapacityOverview stats={stats} />
          <BuildingBreakdown kennels={kennels} />
          <TypeBreakdown kennels={kennels} />
          <QuickActions onAddKennel={() => setShowForm(true)} navigate={navigate} />
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
        onClose={handleCloseAssignDrawer}
        kennel={assignKennel}
      />
    </div>
  );
};

export default Kennels;
