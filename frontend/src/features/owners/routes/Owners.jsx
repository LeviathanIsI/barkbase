import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, Phone, DollarSign, Plus, Mail, ChevronDown,
  ChevronLeft, ChevronRight, Download, Columns, MoreHorizontal,
  MessageSquare, Eye, Check, X, Star, SlidersHorizontal,
  BookmarkPlus, PawPrint, ArrowUpDown, ArrowUp, ArrowDown, GripVertical,
  Calendar, Loader2, ShieldCheck, ShieldOff, Crown, Ban, Clock,
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { formatDistanceToNow } from 'date-fns';
import EntityToolbar from '@/components/EntityToolbar';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
// Replaced with LoadingState (mascot) for page-level loading
import LoadingState from '@/components/ui/LoadingState';
import { UpdateChip } from '@/components/PageLoader';
import { useOwnersQuery, useCreateOwnerMutation, useUpdateOwnerStatusMutation } from '../api';
import OwnerFormModal from '../components/OwnerFormModal';
import PetHoverCard from '../components/PetHoverCard';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

// Saved views - persisted in localStorage
const DEFAULT_VIEWS = [
  { id: 'all', name: 'All Owners', filters: {}, isDefault: true },
  { id: 'active', name: 'Active Clients', filters: { status: 'ACTIVE' } },
  { id: 'inactive', name: 'Inactive Owners', filters: { status: 'INACTIVE' } },
  { id: 'high-value', name: 'High Value', filters: { minLifetimeValue: 100000 } },
];

// Column definitions with better sizing for full-width
const ALL_COLUMNS = [
  { id: 'select', label: '', minWidth: 48, maxWidth: 48, align: 'center', sortable: false, hideable: false },
  { id: 'owner', label: 'Owner', minWidth: 240, flex: 2, align: 'left', sortable: true, sortKey: 'fullName' },
  { id: 'contact', label: 'Contact', minWidth: 180, flex: 1, align: 'left', sortable: false },
  { id: 'pets', label: 'Pets', minWidth: 140, maxWidth: 200, align: 'left', sortable: true, sortKey: 'petCount' },
  { id: 'status', label: 'Status', minWidth: 100, maxWidth: 120, align: 'center', sortable: true, sortKey: 'status' },
  { id: 'bookings', label: 'Bookings', minWidth: 100, maxWidth: 120, align: 'center', sortable: true, sortKey: 'totalBookings' },
  { id: 'lastVisit', label: 'Last Visit', minWidth: 120, maxWidth: 140, align: 'center', sortable: true, sortKey: 'lastBooking' },
  { id: 'lifetimeValue', label: 'Lifetime Value', minWidth: 130, maxWidth: 150, align: 'right', sortable: true, sortKey: 'lifetimeValue' },
  { id: 'pendingBalance', label: 'Pending', minWidth: 110, maxWidth: 130, align: 'right', sortable: true, sortKey: 'pendingBalance' },
  { id: 'actions', label: '', minWidth: 100, maxWidth: 100, align: 'right', sortable: false, hideable: false },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const Owners = () => {
  const navigate = useNavigate();
  const [formModalOpen, setFormModalOpen] = useState(false);
  
  // Search, filter, and view state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('all');
  const [customFilters, setCustomFilters] = useState({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  
  // Table state
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'fullName', direction: 'asc' });
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('owners-visible-columns');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Add any new columns that aren't in saved preferences
      const allColumnIds = ALL_COLUMNS.map(c => c.id);
      const newColumns = allColumnIds.filter(id => !parsed.includes(id));
      return [...parsed, ...newColumns];
    }
    return ALL_COLUMNS.map(c => c.id);
  });
  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem('owners-column-order');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Add any new columns that aren't in saved order (insert before 'actions')
      const allColumnIds = ALL_COLUMNS.map(c => c.id);
      const newColumns = allColumnIds.filter(id => !parsed.includes(id));
      if (newColumns.length > 0) {
        const actionsIndex = parsed.indexOf('actions');
        if (actionsIndex !== -1) {
          // Insert new columns before actions
          return [...parsed.slice(0, actionsIndex), ...newColumns, ...parsed.slice(actionsIndex)];
        }
        return [...parsed, ...newColumns];
      }
      return parsed;
    }
    return ALL_COLUMNS.map(c => c.id);
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Saved views state
  const [savedViews] = useState(() => {
    const saved = localStorage.getItem('owners-saved-views');
    return saved ? JSON.parse(saved) : DEFAULT_VIEWS;
  });

  // Refs for click outside
  const filterRef = useRef(null);
  const viewsRef = useRef(null);
  const columnsRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterPanel(false);
      if (viewsRef.current && !viewsRef.current.contains(e.target)) setShowViewsDropdown(false);
      if (columnsRef.current && !columnsRef.current.contains(e.target)) setShowColumnsDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Data fetching
  const { data: ownersData, isLoading, isFetching, error } = useOwnersQuery();
  const createOwnerMutation = useCreateOwnerMutation();
  const updateStatusMutation = useUpdateOwnerStatusMutation();
  const owners = useMemo(() => Array.isArray(ownersData) ? ownersData : (ownersData?.data ?? []), [ownersData]);

  // Status change handler
  const handleStatusChange = useCallback(async (ownerId, isActive) => {
    await updateStatusMutation.mutateAsync({ ownerId, is_active: isActive });
  }, [updateStatusMutation]);
  
  // Show skeleton only on initial load when there's no cached data
  const showSkeleton = isLoading && !ownersData;
  // Show subtle indicator during background refetch when we have data
  const isUpdating = isFetching && !isLoading && !!ownersData;
  
  // Fade-in animation state
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (!showSkeleton && ownersData && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [showSkeleton, ownersData, hasLoaded]);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('owners-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('owners-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Calculate enhanced owner data with metrics
  const ownersWithMetrics = useMemo(() => {
    return owners.map((owner) => {
      // Use bookings_count from API (new field) or fallback
      const totalBookings = parseInt(owner.bookings_count ?? owner.totalBookings ?? 0, 10) || 0;
      // Use lifetime_value from API (in cents) or fallback - ensure numeric
      const lifetimeValue = parseInt(owner.lifetime_value ?? owner.lifetimeValue ?? 0, 10) || 0;
      // Use pending_balance from API (in cents) - unpaid invoices - ensure numeric
      const pendingBalance = parseInt(owner.pending_balance ?? owner.pendingBalance ?? 0, 10) || 0;
      // Use last_visit from API (new field) or fallback
      const lastBooking = owner.last_visit || owner.lastBooking || null;
      const pets = owner.pets || (owner.petNames ? owner.petNames.map((name) => ({ name })) : []);
      const nameFromParts = `${owner.firstName || owner.first_name || ''} ${owner.lastName || owner.last_name || ''}`.trim();
      const fullName = nameFromParts || owner.name || owner.fullName || owner.email || 'Owner';
      // Status based on is_active field from API, fallback to booking count
      const isActive = owner.is_active !== undefined ? owner.is_active : totalBookings > 0;
      const status = isActive ? 'ACTIVE' : 'INACTIVE';
      // Use pet_count from API if available, otherwise fall back to pets array length
      const petCount = owner.pet_count ?? owner.petCount ?? pets.length;

      return { ...owner, fullName, totalBookings, lifetimeValue, pendingBalance, lastBooking, pets, status, isActive, petCount };
    });
  }, [owners]);

  // Get active view filters
  const activeViewFilters = useMemo(() => {
    const view = savedViews.find(v => v.id === activeView);
    return view?.filters || {};
  }, [activeView, savedViews]);

  // Filter owners
  const filteredOwners = useMemo(() => {
    const filters = { ...activeViewFilters, ...customFilters };
    
    return ownersWithMetrics.filter(owner => {
      const matchesSearch = !searchTerm ||
        owner.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.phone?.includes(searchTerm) ||
        owner.pets?.some(pet => pet.name?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = !filters.status || owner.status === filters.status;
      const matchesMinValue = !filters.minLifetimeValue || owner.lifetimeValue >= filters.minLifetimeValue;
      const matchesPetCount = !filters.minPetCount || owner.petCount >= filters.minPetCount;

      return matchesSearch && matchesStatus && matchesMinValue && matchesPetCount;
    });
  }, [ownersWithMetrics, searchTerm, activeViewFilters, customFilters]);

  // Sort owners
  const sortedOwners = useMemo(() => {
    if (!sortConfig.key) return filteredOwners;

    return [...filteredOwners].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOwners, sortConfig]);

  // Paginate owners
  const paginatedOwners = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOwners.slice(start, start + pageSize);
  }, [sortedOwners, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedOwners.length / pageSize);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeView, customFilters, pageSize]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: owners.length,
    active: ownersWithMetrics.filter(o => o.status === 'ACTIVE').length,
    highValue: ownersWithMetrics.filter(o => o.lifetimeValue >= 100000).length,
    totalRevenue: ownersWithMetrics.reduce((sum, o) => sum + o.lifetimeValue, 0),
    totalPending: ownersWithMetrics.reduce((sum, o) => sum + o.pendingBalance, 0),
  }), [owners, ownersWithMetrics]);

  // Get ordered and visible columns
  const orderedColumns = useMemo(() => {
    return columnOrder
      .map(id => ALL_COLUMNS.find(c => c.id === id))
      .filter(c => c && visibleColumns.includes(c.id));
  }, [columnOrder, visibleColumns]);

  // Handlers
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === paginatedOwners.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedOwners.map(o => o.id || o.recordId)));
    }
  }, [paginatedOwners, selectedRows.size]);

  const handleSelectRow = useCallback((id) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleColumn = useCallback((columnId) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      }
      return [...prev, columnId];
    });
  }, []);

  const moveColumn = useCallback((fromIndex, toIndex) => {
    setColumnOrder(prev => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setCustomFilters({});
    setActiveView('all');
  }, []);

  const hasActiveFilters = searchTerm || Object.keys(customFilters).length > 0 || activeView !== 'all';

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Unable to load owner data. Please try again.</p>
      </div>
    );
  }

  // Show full-page loading state on initial load
  if (showSkeleton) {
    return (
      <div className="flex flex-col flex-grow w-full min-h-[calc(100vh-180px)] items-center justify-center">
        <LoadingState label="Loading owners…" variant="mascot" />
      </div>
    );
  }

  return (
    <>
      {/* Main content container - fixed height, no page scroll */}
      <div className={cn(
        "flex flex-col w-full h-[calc(100vh-120px)] overflow-hidden transition-opacity duration-200",
        hasLoaded ? "opacity-100" : "opacity-0"
      )}>
        {/* Header Section - fixed, doesn't shrink */}
        <div className="flex-shrink-0 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <div>
            <Breadcrumbs items={['Clients', 'Owners']} />
            <h1 className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">Pet Owners</h1>
            <p className="mt-0.5 text-sm text-[color:var(--bb-color-text-muted)]">
              Manage your client relationships
            </p>
          </div>

          {/* Stats Pills - Right Aligned */}
          <div className="flex flex-wrap items-center gap-2">
            <StatBadge icon={Users} value={stats.total} label="Total" />
            <StatBadge icon={Star} value={stats.active} label="Active" variant="success" />
            <StatBadge icon={DollarSign} value={stats.highValue} label="High Value" variant="purple" />
            <StatBadge icon={DollarSign} value={formatCurrency(stats.totalRevenue)} label="Revenue" variant="warning" />
            {stats.totalPending > 0 && (
              <StatBadge icon={Clock} value={formatCurrency(stats.totalPending)} label="Pending" variant="amber" />
            )}
          </div>
        </div>

        {/* Toolbar - fixed, doesn't shrink */}
        <div
          className="flex-shrink-0 px-4 py-3 border-b shadow-sm rounded-lg"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <EntityToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search owners, pets, email, phone..."
            leftContent={
              <>
                {/* Filters Button */}
                <div className="relative" ref={filterRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className={cn('gap-1.5 h-9', showFilterPanel && 'ring-2 ring-[var(--bb-color-accent)]')}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {Object.keys(customFilters).length > 0 && (
                      <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--bb-color-accent)] text-xs text-white">
                        {Object.keys(customFilters).length}
                      </span>
                    )}
                  </Button>
                  {showFilterPanel && (
                    <FilterPanel filters={customFilters} onFiltersChange={setCustomFilters} onClose={() => setShowFilterPanel(false)} />
                  )}
                </div>

                {/* Saved Views */}
                <div className="relative" ref={viewsRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowViewsDropdown(!showViewsDropdown)}
                    className="gap-1.5 h-9"
                  >
                    <BookmarkPlus className="h-4 w-4" />
                    <span className="max-w-[100px] truncate">{savedViews.find(v => v.id === activeView)?.name || 'Views'}</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', showViewsDropdown && 'rotate-180')} />
                  </Button>
                  {showViewsDropdown && (
                    <ViewsDropdown views={savedViews} activeView={activeView} onSelectView={(id) => { setActiveView(id); setShowViewsDropdown(false); }} />
                  )}
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-sm text-[color:var(--bb-color-accent)] hover:underline">
                    <X className="h-3.5 w-3.5" />
                    Clear all
                  </button>
                )}

                {/* Results Count */}
                <span className="text-sm text-[color:var(--bb-color-text-muted)] ml-2">
                  {sortedOwners.length} owner{sortedOwners.length !== 1 ? 's' : ''}{hasActiveFilters && ' filtered'}
                  {isUpdating && <UpdateChip className="ml-2" />}
                </span>
              </>
            }
            rightContent={
              <>
                {/* Column Controls */}
                <div className="relative" ref={columnsRef}>
                  <Button variant="outline" size="sm" onClick={() => setShowColumnsDropdown(!showColumnsDropdown)} className="gap-1.5 h-9">
                    <Columns className="h-4 w-4" />
                    <span className="hidden sm:inline">Columns</span>
                  </Button>
                  {showColumnsDropdown && (
                    <ColumnsDropdown
                      columns={ALL_COLUMNS.filter(c => c.hideable !== false)}
                      visibleColumns={visibleColumns}
                      columnOrder={columnOrder}
                      onToggle={toggleColumn}
                      onReorder={moveColumn}
                    />
                  )}
                </div>

                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>

                <Button size="sm" onClick={() => setFormModalOpen(true)} className="gap-1.5 h-9">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Owner</span>
                </Button>
              </>
            }
          />

          {/* Bulk Actions Bar */}
          {selectedRows.size > 0 && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border p-2" style={{ backgroundColor: 'var(--bb-color-accent-soft)', borderColor: 'var(--bb-color-accent)' }}>
              <span className="text-sm font-medium text-[color:var(--bb-color-accent)]">{selectedRows.size} selected</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 h-8"><Mail className="h-3.5 w-3.5" />Email</Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8"><MessageSquare className="h-3.5 w-3.5" />SMS</Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8"><Download className="h-3.5 w-3.5" />Export</Button>
              </div>
              <button type="button" onClick={() => setSelectedRows(new Set())} className="ml-auto text-sm text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]">
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Table Section - Inner scroll with sticky header */}
        <div className="flex-1 flex flex-col mt-4 min-h-0">
          {sortedOwners.length === 0 ? (
            <div className="py-8">
              <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} onAddOwner={() => setFormModalOpen(true)} />
            </div>
          ) : (
            <div
              className="flex-1 overflow-auto border rounded-t-lg min-h-0"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <table className="w-full text-sm min-w-[1024px]">
                <thead className="sticky top-0 z-10">
                  <tr style={{ backgroundColor: 'var(--bb-color-bg-elevated)', boxShadow: '0 1px 0 var(--bb-color-border-subtle)' }}>
                    {orderedColumns.map((column) => {
                      const thPadding = 'px-4 lg:px-6 py-3';
                      const alignClass = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left';
                      return (
                        <th
                          key={column.id}
                          className={cn(
                            thPadding,
                            alignClass,
                            'text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] whitespace-nowrap',
                            column.sortable && 'cursor-pointer hover:text-[color:var(--bb-color-text-primary)] transition-colors'
                          )}
                          style={{ minWidth: column.minWidth, maxWidth: column.maxWidth, backgroundColor: 'var(--bb-color-bg-elevated)' }}
                          onClick={() => column.sortable && handleSort(column.sortKey)}
                        >
                          {column.id === 'select' ? (
                            <input
                              type="checkbox"
                              checked={selectedRows.size === paginatedOwners.length && paginatedOwners.length > 0}
                              onChange={handleSelectAll}
                              className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]"
                            />
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              {column.label}
                              {column.sortable && <SortIcon active={sortConfig.key === column.sortKey} direction={sortConfig.direction} />}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {paginatedOwners.map((owner, index) => (
                    <OwnerRow
                      key={owner.id || owner.recordId}
                      owner={owner}
                      columns={orderedColumns}
                      isSelected={selectedRows.has(owner.id || owner.recordId)}
                      onSelect={() => handleSelectRow(owner.id || owner.recordId)}
                      onView={() => navigate(`/customers/${owner.id || owner.recordId}`)}
                      onStatusChange={handleStatusChange}
                      isEven={index % 2 === 0}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination - fixed at bottom */}
          {sortedOwners.length > 0 && (
            <div
              className="flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 px-4 border-t"
              style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-surface)' }}
            >
              <div className="flex items-center gap-2 text-sm text-[color:var(--bb-color-text-muted)]">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded border px-2 py-1.5 text-sm"
                  style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (<option key={size} value={size}>{size}</option>))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-[color:var(--bb-color-text-muted)]">
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedOwners.length)} of {sortedOwners.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 h-8">
                    <ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-2" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 h-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-medium text-[color:var(--bb-color-text-primary)]">{currentPage}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 h-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 h-8">
                    <ChevronRight className="h-4 w-4" /><ChevronRight className="h-4 w-4 -ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <OwnerFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={async (data) => {
          try {
            await createOwnerMutation.mutateAsync(data);
            setFormModalOpen(false);
          } catch (err) {
            console.error('Failed to create owner:', err);
          }
        }}
        isLoading={createOwnerMutation.isPending}
      />
    </>
  );
};

// Stat Badge Component
const StatBadge = ({ icon: Icon, value, label, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    success: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    amber: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', variants[variant])}>
      <Icon className="h-3 w-3" />
      <span className="font-semibold">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
};

// Sort Icon Component
const SortIcon = ({ active, direction }) => {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
};

// Owner Row Component
const OwnerRow = ({ owner, columns, isSelected, onSelect, onView, isEven, onStatusChange }) => {
  const [showActions, setShowActions] = useState(false);
  const cellPadding = 'px-4 lg:px-6 py-3';
  const navigate = useNavigate();

  const renderCell = (column) => {
    switch (column.id) {
      case 'select':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')} onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={isSelected} onChange={onSelect} className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]" />
          </td>
        );
      case 'owner':
        return (
          <td key={column.id} className={cellPadding}>
            <button
              type="button"
              className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold bg-slate-600 dark:bg-slate-500 text-white">
                {owner.fullName?.[0]?.toUpperCase() || 'O'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[color:var(--bb-color-text-primary)]">{owner.fullName}</p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">{owner.email || 'No email'}</p>
              </div>
            </button>
          </td>
        );
      case 'contact':
        return (
          <td key={column.id} className={cellPadding}>
            {owner.phone ? (
              <div className="flex items-center gap-1.5 text-[color:var(--bb-color-text-primary)]">
                <Phone className="h-3.5 w-3.5 text-[color:var(--bb-color-text-muted)]" />
                <span>{owner.phone}</span>
              </div>
            ) : (
              <span className="text-[color:var(--bb-color-text-muted)]">—</span>
            )}
          </td>
        );
      case 'pets':
        // Use petCount (from API pet_count) when pets array not available
        const displayPetCount = owner.petCount ?? owner.pets?.length ?? 0;
        const ownerId = owner.id || owner.recordId;
        return (
          <td key={column.id} className={cellPadding}>
            <PetHoverCard ownerId={ownerId} petCount={displayPetCount}>
              {owner.pets?.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {owner.pets.slice(0, 3).map((pet, i) => (
                      <div key={i} className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[0.65rem] font-semibold" style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-bg-surface)', color: 'var(--bb-color-text-muted)' }} title={pet.name}>
                        {pet.name?.[0]?.toUpperCase() || <PawPrint className="h-3 w-3" />}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-[color:var(--bb-color-text-primary)]">{owner.pets.length}</span>
                  {owner.pets.length > 3 && <span className="text-xs text-[color:var(--bb-color-text-muted)]">(+{owner.pets.length - 3})</span>}
                </div>
              ) : displayPetCount > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2" style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-bg-surface)', color: 'var(--bb-color-text-muted)' }}>
                    <PawPrint className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-[color:var(--bb-color-text-primary)]">{displayPetCount}</span>
                </div>
              ) : (
                <span className="text-[color:var(--bb-color-text-muted)]">—</span>
              )}
            </PetHoverCard>
          </td>
        );
      case 'status':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')} onClick={(e) => e.stopPropagation()}>
            <StatusBadgeDropdown owner={owner} onStatusChange={onStatusChange} />
          </td>
        );
      case 'bookings':
        const ownerIdForBookings = owner.id || owner.recordId;
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            <BookingsHoverCard ownerId={ownerIdForBookings} bookingsCount={owner.totalBookings} navigate={navigate}>
              {owner.totalBookings > 0 ? (
                <div className="inline-flex items-center gap-2 cursor-pointer group">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors group-hover:border-[var(--bb-color-accent)] group-hover:bg-[var(--bb-color-accent-soft)]"
                    style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-bg-surface)', color: 'var(--bb-color-text-muted)' }}
                  >
                    <Calendar className="h-3.5 w-3.5 group-hover:text-[var(--bb-color-accent)]" />
                  </div>
                  <span className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] group-hover:text-[var(--bb-color-accent)] transition-colors">
                    {owner.totalBookings}
                  </span>
                </div>
              ) : (
                <span className="text-[color:var(--bb-color-text-muted)]">—</span>
              )}
            </BookingsHoverCard>
          </td>
        );
      case 'lastVisit':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            {owner.lastBooking ? (
              <span
                className="text-[color:var(--bb-color-text-primary)]"
                title={new Date(owner.lastBooking).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              >
                {formatDistanceToNow(new Date(owner.lastBooking), { addSuffix: true })}
              </span>
            ) : (
              <span className="text-[color:var(--bb-color-text-muted)]">Never</span>
            )}
          </td>
        );
      case 'lifetimeValue':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-right')}>
            <span className={cn(
              "font-semibold",
              owner.lifetimeValue > 0 ? "text-[color:var(--bb-color-text-primary)]" : "text-[color:var(--bb-color-text-muted)]"
            )}>
              {formatCurrency(owner.lifetimeValue)}
            </span>
          </td>
        );
      case 'pendingBalance':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-right')}>
            <span className={cn(
              "font-semibold",
              owner.pendingBalance > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-[color:var(--bb-color-text-muted)]"
            )}>
              {formatCurrency(owner.pendingBalance)}
            </span>
          </td>
        );
      case 'actions':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-right')}>
            <div className={cn('flex items-center justify-end gap-1 transition-opacity', showActions ? 'opacity-100' : 'opacity-0')}>
              <button type="button" onClick={(e) => { e.stopPropagation(); onView(); }} className="p-2 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] transition-colors" title="View profile">
                <Eye className="h-4 w-4" />
              </button>
              <button type="button" onClick={(e) => e.stopPropagation()} className="p-2 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] transition-colors" title="Send message">
                <MessageSquare className="h-4 w-4" />
              </button>
              <button type="button" onClick={(e) => e.stopPropagation()} className="p-2 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] transition-colors" title="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </td>
        );
      default:
        return <td key={column.id} className={cellPadding}>—</td>;
    }
  };

  return (
    <tr
      className={cn('transition-colors', isSelected && 'bg-[color:var(--bb-color-accent-soft)]')}
      style={{ borderBottom: '1px solid var(--bb-color-border-subtle)', backgroundColor: !isSelected && isEven ? 'var(--bb-color-bg-surface)' : !isSelected ? 'var(--bb-color-bg-body)' : undefined }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {columns.map(renderCell)}
    </tr>
  );
};

// Filter Panel Component
const FilterPanel = ({ filters, onFiltersChange, onClose }) => (
  <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border p-4 shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Filters</h3>
      <button type="button" onClick={onClose} className="text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]"><X className="h-4 w-4" /></button>
    </div>
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Status</label>
        <select value={filters.status || ''} onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}>
          <option value="">Any</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Min Pet Count</label>
        <input type="number" min="0" value={filters.minPetCount || ''} onChange={(e) => onFiltersChange({ ...filters, minPetCount: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }} placeholder="0" />
      </div>
      <div>
        <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Min Lifetime Value ($)</label>
        <input type="number" min="0" value={filters.minLifetimeValue ? filters.minLifetimeValue / 100 : ''} onChange={(e) => onFiltersChange({ ...filters, minLifetimeValue: e.target.value ? Number(e.target.value) * 100 : undefined })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }} placeholder="0" />
      </div>
    </div>
    <div className="mt-4 flex gap-2">
      <Button variant="outline" size="sm" className="flex-1" onClick={() => onFiltersChange({})}>Reset</Button>
      <Button size="sm" className="flex-1" onClick={onClose}>Apply</Button>
    </div>
  </div>
);

// Views Dropdown Component
const ViewsDropdown = ({ views, activeView, onSelectView }) => (
  <div className="absolute left-0 top-full mt-2 w-52 rounded-xl border shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
    <div className="py-1">
      {views.map((view) => (
        <button key={view.id} type="button" onClick={() => onSelectView(view.id)} className={cn('flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]', activeView === view.id && 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]')}>
          {activeView === view.id && <Check className="h-4 w-4" />}
          <span className={activeView !== view.id ? 'ml-6' : ''}>{view.name}</span>
        </button>
      ))}
    </div>
  </div>
);

// Columns Dropdown Component with Drag & Reorder
// Columns Dropdown Component with Drag & Reorder (live reorder during drag)
const ColumnsDropdown = ({ columns, visibleColumns, columnOrder, onToggle, onReorder }) => {
  const [draggedId, setDraggedId] = useState(null);

  const handleDragStart = (e, column) => {
    setDraggedId(column.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedId === null) return;
    
    const draggedIndex = columnOrder.indexOf(draggedId);
    if (draggedIndex !== -1 && draggedIndex !== index) {
      onReorder(draggedIndex, index);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const orderedColumns = columnOrder
    .map(id => columns.find(c => c.id === id))
    .filter(Boolean);

  return (
    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
      <div className="p-2">
        <p className="px-2 py-1 text-xs font-semibold uppercase text-[color:var(--bb-color-text-muted)]">Toggle & Reorder</p>
        {orderedColumns.map((column, index) => (
          <div
            key={column.id}
            draggable
            onDragStart={(e) => handleDragStart(e, column)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 text-sm cursor-move rounded transition-all duration-150',
              draggedId === column.id 
                ? 'opacity-50 bg-[color:var(--bb-color-accent-soft)] ring-2 ring-[color:var(--bb-color-accent)]' 
                : 'hover:bg-[color:var(--bb-color-bg-elevated)]'
            )}
          >
            <GripVertical className="h-4 w-4 text-[color:var(--bb-color-text-muted)] opacity-50" />
            <input 
              type="checkbox" 
              checked={visibleColumns.includes(column.id)} 
              onChange={() => onToggle(column.id)} 
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]" 
            />
            <span className="text-[color:var(--bb-color-text-primary)]">{column.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Empty State Component - Full Width
const EmptyState = ({ hasFilters, onClearFilters, onAddOwner }) => (
  <div className="flex-1 flex flex-col items-center justify-center py-24" style={{ backgroundColor: 'var(--bb-color-bg-body)' }}>
    <div className="flex h-20 w-20 items-center justify-center rounded-full mb-6" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <Users className="h-10 w-10 text-[color:var(--bb-color-text-muted)]" />
    </div>
    <h3 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)] mb-2">{hasFilters ? 'No owners match your filters' : 'No owners yet'}</h3>
    <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-8 max-w-md text-center">{hasFilters ? 'Try adjusting your search or filters to find what you\'re looking for' : 'Get started by adding your first pet owner to the system'}</p>
    <div className="flex gap-3">
      {hasFilters && <Button variant="outline" size="lg" onClick={onClearFilters}>Clear filters</Button>}
      <Button size="lg" onClick={onAddOwner}><Plus className="h-4 w-4 mr-2" />Add Owner</Button>
    </div>
  </div>
);

// Status Badge Dropdown Component - Clickable to change status
// Active is subtle/muted, only non-active states draw attention
const STATUS_OPTIONS = [
  { value: true, label: 'Active', icon: ShieldCheck, variant: 'neutral', color: 'text-slate-500 dark:text-slate-400' },
  { value: false, label: 'Inactive', icon: ShieldOff, variant: 'warning', color: 'text-amber-600 dark:text-amber-500' },
];

const StatusBadgeDropdown = ({ owner, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentStatus = STATUS_OPTIONS.find(s => s.value === owner.isActive) || STATUS_OPTIONS[1];
  const StatusIcon = currentStatus.icon;

  const handleStatusSelect = async (newStatus) => {
    if (newStatus.value === owner.isActive) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusChange(owner.id || owner.recordId, newStatus.value);
      toast.success(`Status changed to ${newStatus.label}`);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="inline-flex items-center gap-1 transition-all hover:opacity-80"
      >
        <Badge variant={currentStatus.variant} className="cursor-pointer gap-1">
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <StatusIcon className="h-3 w-3" />
          )}
          {currentStatus.label}
          <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
        </Badge>
      </button>

      {isOpen && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-36 rounded-lg border shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          {STATUS_OPTIONS.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = option.value === owner.isActive;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => handleStatusSelect(option)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bb-color-bg-elevated)]',
                  isSelected && 'bg-[var(--bb-color-accent-soft)]'
                )}
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                <OptionIcon className={cn('h-4 w-4', option.color)} />
                <span>{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 ml-auto text-[color:var(--bb-color-accent)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Bookings Hover Card Component - Shows recent bookings on hover
const BookingsHoverCard = ({ ownerId, bookingsCount, navigate, children }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [bookings, setBookings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const cardRef = useRef(null);

  // Fetch bookings on hover using apiClient for auth
  useEffect(() => {
    if (isHovering && bookingsCount > 0 && !bookings) {
      setIsLoading(true);
      const fetchBookings = async () => {
        try {
          // Dynamic import apiClient to avoid circular deps
          const { default: apiClient } = await import('@/lib/apiClient');
          const response = await apiClient.get('/api/v1/operations/bookings', {
            params: { owner_id: ownerId, limit: 5 }
          });
          // API returns { data: bookings[], bookings: bookings[] }
          const bookingsData = response?.data?.data || response?.data?.bookings || response?.data || [];
          setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        } catch (error) {
          console.error('Failed to fetch bookings:', error);
          setBookings([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchBookings();
    }
  }, [isHovering, bookingsCount, bookings, ownerId]);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovering(false);
  };

  if (bookingsCount === 0) {
    return children;
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={cardRef}
    >
      {children}

      {isHovering && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 rounded-lg border shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <p className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
              Recent Bookings ({bookingsCount})
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[color:var(--bb-color-text-muted)]" />
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="py-1">
                {bookings.slice(0, 5).map((booking, idx) => {
                  // Get pet name from pets array or fallbacks
                  const petName = booking.pets?.[0]?.name || booking.pet?.name || booking.petName || 'Pet';
                  // Get date from startDate (API returns check_in as startDate)
                  const checkInDate = booking.startDate || booking.checkIn || booking.check_in;
                  // Get service name
                  const serviceName = booking.serviceName || booking.service?.name || 'Boarding';

                  return (
                    <div
                      key={booking.id || booking.recordId || idx}
                      className="px-3 py-2 hover:bg-[var(--bb-color-bg-elevated)] transition-colors cursor-pointer"
                      onClick={() => navigate(`/bookings/${booking.id || booking.recordId}`)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                          {petName}
                        </span>
                        <Badge variant={booking.status === 'CHECKED_IN' ? 'success' : booking.status === 'CONFIRMED' ? 'info' : 'neutral'} size="sm">
                          {booking.status || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[color:var(--bb-color-text-muted)]">
                        <span>{serviceName}</span>
                        <span>•</span>
                        <span>
                          {checkInDate ? new Date(checkInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-[color:var(--bb-color-text-muted)]">
                No booking details available
              </div>
            )}
          </div>

          <div
            className="px-3 py-2 border-t"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <button
              type="button"
              onClick={() => navigate(`/customers/${ownerId}?tab=bookings`)}
              className="w-full text-sm font-medium text-[color:var(--bb-color-accent)] hover:underline"
            >
              View all bookings →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Owners;
