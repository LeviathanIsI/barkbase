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
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import KennelForm from '../components/KennelForm';
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

// Compact Stat Pill
const StatPill = ({ icon: Icon, label, value, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm whitespace-nowrap transition-all',
      isActive
        ? 'bg-primary text-white border-primary'
        : 'bg-white dark:bg-surface-primary border-border hover:border-primary/50'
    )}
  >
    <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-muted')} />
    <span className={cn('font-medium', isActive ? 'text-white' : 'text-text')}>{value}</span>
    <span className={cn('text-xs', isActive ? 'text-white/80' : 'text-muted')}>{label}</span>
  </button>
);

// Simplified Kennel Card
const KennelCard = ({ kennel, onEdit, onDelete, onViewBookings, onAssignRun, isCompact }) => {
  const [showMenu, setShowMenu] = useState(false);
  const typeConfig = KENNEL_TYPES[kennel.type] || KENNEL_TYPES.KENNEL;

  const available = (kennel.capacity || 0) - (kennel.occupied || 0);
  const utilization = kennel.capacity > 0 ? Math.round((kennel.occupied || 0) / kennel.capacity * 100) : 0;

  return (
    <div className={cn(
      'group bg-white dark:bg-surface-primary border border-border rounded-lg transition-all hover:border-primary/30 hover:shadow-sm',
      isCompact ? 'p-3' : 'p-4'
    )}>
      {/* Top Row: Name, Status, Menu */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={cn('font-medium text-text truncate', isCompact ? 'text-sm' : 'text-base')}>
            {kennel.name}
          </h3>
          <Badge variant={kennel.isActive ? 'success' : 'neutral'} size="sm" className="flex-shrink-0">
            {kennel.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-muted hover:text-text hover:bg-surface rounded transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-surface-primary border border-border rounded-lg shadow-lg z-20 py-1">
                <button
                  onClick={() => { onEdit(kennel); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-surface"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => { onViewBookings(kennel); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-surface"
                >
                  <Calendar className="h-3.5 w-3.5" /> Bookings
                </button>
                <button
                  onClick={() => { onAssignRun(kennel); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-surface"
                >
                  <PawPrint className="h-3.5 w-3.5" /> Assign
                </button>
                <hr className="my-1 border-border" />
                <button
                  onClick={() => { onDelete(kennel.id || kennel.recordId); setShowMenu(false); }}
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
          onClick={() => onViewBookings(kennel)}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          <Calendar className="h-3.5 w-3.5" />
          Bookings
        </button>
        <button
          onClick={() => onAssignRun(kennel)}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          <PawPrint className="h-3.5 w-3.5" />
          Assign
        </button>
        <button
          onClick={() => onEdit(kennel)}
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

const Kennels = () => {
  const navigate = useNavigate();
  const terminology = useTerminology();
  const [showForm, setShowForm] = useState(false);
  const [selectedKennel, setSelectedKennel] = useState(null);
  
  // View mode
  const [isCompact, setIsCompact] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  // Grouping
  const [groupBy, setGroupBy] = useState('none');
  const [expandedGroups, setExpandedGroups] = useState({});

  const { data: kennels = [], isLoading, error } = useKennels();
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

  const handleAssignRun = (kennel) => {
    navigate(`/runs?preselect=${kennel.id || kennel.recordId}`);
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
                <li><Link to="/settings" className="hover:text-primary">Administration</Link></li>
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

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-muted">
              <li><Link to="/settings" className="hover:text-primary">Administration</Link></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-text font-medium">Kennels</li>
            </ol>
          </nav>
          <h1 className="text-lg font-semibold text-text">Kennel Management</h1>
          <p className="text-xs text-muted mt-0.5">Manage facility accommodations and capacity</p>
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

      {/* Stats Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-lg flex-shrink-0" />
          ))
        ) : (
          <>
            <StatPill
              icon={Building}
              label="total"
              value={stats.total}
              onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); }}
              isActive={statusFilter === 'ALL' && typeFilter === 'ALL'}
            />
            <StatPill
              icon={Home}
              label="active"
              value={stats.active}
              onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
              isActive={statusFilter === 'ACTIVE'}
            />
            <StatPill
              icon={MapPin}
              label="buildings"
              value={stats.buildings}
              onClick={() => setGroupBy(groupBy === 'building' ? 'none' : 'building')}
              isActive={groupBy === 'building'}
            />
            <StatPill
              icon={Activity}
              label={`${stats.occupied}/${stats.totalCapacity}`}
              value="Capacity"
              onClick={() => {}}
            />
          </>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search kennels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-surface-primary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 text-sm bg-white dark:bg-surface-primary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 text-sm bg-white dark:bg-surface-primary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="ALL">All Types</option>
          {Object.entries(KENNEL_TYPES).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-muted mr-1">Group:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-2.5 py-1.5 text-sm bg-white dark:bg-surface-primary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {GROUP_BY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={() => setIsCompact(!isCompact)}
            className={cn(
              'p-1.5 rounded-lg border transition-colors',
              'bg-white dark:bg-surface-primary border-border hover:border-primary/50'
            )}
            title={isCompact ? 'Comfortable view' : 'Compact view'}
          >
            {isCompact ? <Maximize2 className="h-3.5 w-3.5 text-muted" /> : <Minimize2 className="h-3.5 w-3.5 text-muted" />}
          </button>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="text-xs text-muted">
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
        <Card className="p-8 text-center">
          <Building className="h-8 w-8 text-muted mx-auto mb-2" />
          <h3 className="font-medium text-text mb-1">
            {kennels.length === 0 ? 'No Kennels Yet' : 'No Results'}
          </h3>
          <p className="text-xs text-muted mb-3">
            {kennels.length === 0
              ? 'Add your first kennel to get started.'
              : 'Try adjusting your filters.'}
          </p>
          {kennels.length === 0 ? (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Kennel
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-8">
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
                      onAssignRun={handleAssignRun}
                      isCompact={isCompact}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Kennel Form Modal */}
      {showForm && (
        <KennelForm
          kennel={selectedKennel}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
          terminology={terminology}
        />
      )}
    </div>
  );
};

export default Kennels;

