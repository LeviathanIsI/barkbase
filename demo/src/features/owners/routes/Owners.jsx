import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, Phone, DollarSign, Plus, Mail, ChevronDown,
  ChevronLeft, ChevronRight, Download, Columns, MoreHorizontal,
  MessageSquare, Eye, Check, X, Star, SlidersHorizontal,
  BookmarkPlus, PawPrint, ArrowUpDown, ArrowUp, ArrowDown, GripVertical,
  Calendar, Loader2, ShieldCheck, ShieldOff, Crown, Ban, Clock, Send,
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { formatDistanceToNow, format } from 'date-fns';
import EntityToolbar from '@/components/EntityToolbar';
import StyledSelect from '@/components/ui/StyledSelect';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { ScrollableTableContainer } from '@/components/ui/ScrollableTableContainer';
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

  // Modal states for bulk actions
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);

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
      const allColumnIds = ALL_COLUMNS.map(c => c.id);
      const newColumns = allColumnIds.filter(id => !parsed.includes(id));
      if (newColumns.length > 0) {
        const actionsIndex = parsed.indexOf('actions');
        if (actionsIndex !== -1) {
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
    await updateStatusMutation.mutateAsync({ ownerIds: [ownerId], status: isActive ? 'ACTIVE' : 'INACTIVE' });
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
      const totalBookings = parseInt(owner.bookings_count ?? owner.totalBookings ?? owner.visitCount ?? 0, 10) || 0;
      const lifetimeValue = parseInt(owner.lifetime_value ?? owner.lifetimeValue ?? owner.totalSpent ?? 0, 10) || 0;
      const pendingBalance = parseInt(owner.pending_balance ?? owner.pendingBalance ?? 0, 10) || 0;
      const lastBooking = owner.last_visit || owner.lastBooking || null;
      const pets = owner.pets || (owner.petNames ? owner.petNames.map((name) => ({ name })) : []);
      const nameFromParts = `${owner.firstName || owner.first_name || ''} ${owner.lastName || owner.last_name || ''}`.trim();
      const fullName = nameFromParts || owner.name || owner.fullName || owner.email || 'Owner';
      const ownerIsActive = owner.isActive ?? owner.is_active;
      const isActive = ownerIsActive !== undefined ? ownerIsActive : owner.status === 'active' || totalBookings > 0;
      const status = isActive ? 'ACTIVE' : 'INACTIVE';
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

  // Get selected owner data for modals
  const selectedOwnerData = useMemo(() => {
    return ownersWithMetrics.filter(o => selectedRows.has(o.id || o.recordId));
  }, [ownersWithMetrics, selectedRows]);

  // Export owners to CSV
  const handleExportCSV = useCallback((ownersToExport) => {
    if (!ownersToExport || ownersToExport.length === 0) {
      toast.error('No owners to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Status', 'Pets', 'Bookings', 'Last Visit', 'Lifetime Value'];

    const rows = ownersToExport.map(owner => {
      const lastVisit = owner.lastBooking
        ? format(new Date(owner.lastBooking), 'yyyy-MM-dd')
        : 'Never';
      const lifetimeValue = (owner.lifetimeValue / 100).toFixed(2);

      return [
        owner.fullName || '',
        owner.email || '',
        owner.phone || '',
        owner.status || 'INACTIVE',
        owner.petCount || owner.pets?.length || 0,
        owner.totalBookings || 0,
        lastVisit,
        `$${lifetimeValue}`,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => {
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `owners_export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${ownersToExport.length} owner${ownersToExport.length !== 1 ? 's' : ''}`);
  }, []);

  const handleExportAll = useCallback(() => {
    handleExportCSV(sortedOwners);
  }, [sortedOwners, handleExportCSV]);

  const handleExportSelected = useCallback(() => {
    handleExportCSV(selectedOwnerData);
  }, [selectedOwnerData, handleExportCSV]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Unable to load owner data. Please try again.</p>
      </div>
    );
  }

  if (showSkeleton) {
    return (
      <div className="flex flex-col flex-grow w-full min-h-[calc(100vh-180px)] items-center justify-center">
        <LoadingState label="Loading owners..." variant="mascot" />
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "flex flex-col w-full h-[calc(100vh-120px)] overflow-hidden transition-opacity duration-200",
        hasLoaded ? "opacity-100" : "opacity-0"
      )}>
        {/* Header Section */}
        <div className="flex-shrink-0 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <div>
            <Breadcrumbs items={['Clients', 'Owners']} />
            <h1 className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">Pet Owners</h1>
            <p className="mt-0.5 text-sm text-[color:var(--bb-color-text-muted)]">
              Manage your client relationships
            </p>
          </div>

          {/* Stats Pills */}
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

        {/* Toolbar */}
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
                  <Button variant="link" size="sm" onClick={clearFilters} leftIcon={<X className="h-3.5 w-3.5" />}>
                    Clear all
                  </Button>
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

                <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleExportAll}>
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
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setEmailModalOpen(true)}><Mail className="h-3.5 w-3.5" />Email</Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setSmsModalOpen(true)}><MessageSquare className="h-3.5 w-3.5" />SMS</Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleExportSelected}><Download className="h-3.5 w-3.5" />Export</Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRows(new Set())} className="ml-auto">
                Clear selection
              </Button>
            </div>
          )}
        </div>

        {/* Table Section */}
        <div className="flex-1 flex flex-col mt-4 min-h-0">
          {sortedOwners.length === 0 ? (
            <div className="py-8">
              <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} onAddOwner={() => setFormModalOpen(true)} />
            </div>
          ) : (
            <ScrollableTableContainer className="border rounded-t-lg" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
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
                              aria-label="Select all owners"
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
            </ScrollableTableContainer>
          )}

          {/* Pagination */}
          {sortedOwners.length > 0 && (
            <div
              className="flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 px-4 border-t"
              style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-surface)' }}
            >
              <div className="flex items-center gap-2 text-sm text-[color:var(--bb-color-text-muted)]">
                <span>Rows per page:</span>
                <div className="w-20">
                  <StyledSelect
                    options={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: String(size) }))}
                    value={pageSize}
                    onChange={(opt) => setPageSize(opt?.value || 25)}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-[color:var(--bb-color-text-muted)]">
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedOwners.length)} of {sortedOwners.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 h-8" aria-label="First page">
                    <ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-2" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 h-8" aria-label="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-medium text-[color:var(--bb-color-text-primary)]">{currentPage}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 h-8" aria-label="Next page">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 h-8" aria-label="Last page">
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

      <ComposeEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        recipients={selectedOwnerData}
      />

      <ComposeSmsModal
        open={smsModalOpen}
        onClose={() => setSmsModalOpen(false)}
        recipients={selectedOwnerData}
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
      <span>{label}</span>
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
            <input type="checkbox" checked={isSelected} onChange={onSelect} aria-label="Select owner" className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]" />
          </td>
        );
      case 'owner':
        return (
          <td key={column.id} className={cellPadding}>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 gap-3"
              onClick={(e) => { e.stopPropagation(); onView(); }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold bg-slate-600 dark:bg-slate-500 text-white">
                {owner.fullName?.[0]?.toUpperCase() || 'O'}
              </div>
              <div className="min-w-0 text-left">
                <p className="font-semibold text-[color:var(--bb-color-text-primary)]">{owner.fullName}</p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">{owner.email || 'No email'}</p>
              </div>
            </Button>
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
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            {owner.totalBookings > 0 ? (
              <div className="inline-flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2" style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-bg-surface)', color: 'var(--bb-color-text-muted)' }}>
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">{owner.totalBookings}</span>
              </div>
            ) : (
              <span className="text-[color:var(--bb-color-text-muted)]">—</span>
            )}
          </td>
        );
      case 'lastVisit':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            {owner.lastBooking ? (
              <span className="text-[color:var(--bb-color-text-primary)]" title={new Date(owner.lastBooking).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}>
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
            <span className={cn("font-semibold", owner.lifetimeValue > 0 ? "text-[color:var(--bb-color-text-primary)]" : "text-[color:var(--bb-color-text-muted)]")}>
              {formatCurrency(owner.lifetimeValue)}
            </span>
          </td>
        );
      case 'pendingBalance':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-right')}>
            <span className={cn("font-semibold", owner.pendingBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-[color:var(--bb-color-text-muted)]")}>
              {formatCurrency(owner.pendingBalance)}
            </span>
          </td>
        );
      case 'actions':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-right')}>
            <div className={cn('flex items-center justify-end gap-1 transition-opacity', showActions ? 'opacity-100' : 'opacity-0')}>
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); onView(); }} title="View profile"><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()} title="Send message"><MessageSquare className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()} title="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
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
      <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="h-4 w-4" /></Button>
    </div>
    <div className="space-y-4">
      <div>
        <StyledSelect
          label="Status"
          options={[
            { value: '', label: 'Any' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
          ]}
          value={filters.status || ''}
          onChange={(opt) => onFiltersChange({ ...filters, status: opt?.value || undefined })}
          isClearable={false}
          isSearchable={false}
        />
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
        <Button key={view.id} variant="ghost" size="sm" onClick={() => onSelectView(view.id)} className={cn('w-full justify-start gap-2', activeView === view.id && 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]')}>
          {activeView === view.id && <Check className="h-4 w-4" />}
          <span className={activeView !== view.id ? 'ml-6' : ''}>{view.name}</span>
        </Button>
      ))}
    </div>
  </div>
);

// Columns Dropdown Component with Drag & Reorder
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

  const orderedColumns = columnOrder.map(id => columns.find(c => c.id === id)).filter(Boolean);

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
              draggedId === column.id ? 'opacity-50 bg-[color:var(--bb-color-accent-soft)] ring-2 ring-[color:var(--bb-color-accent)]' : 'hover:bg-[color:var(--bb-color-bg-elevated)]'
            )}
          >
            <GripVertical className="h-4 w-4 text-[color:var(--bb-color-text-muted)] opacity-50" />
            <input type="checkbox" checked={visibleColumns.includes(column.id)} onChange={() => onToggle(column.id)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]" />
            <span className="text-[color:var(--bb-color-text-primary)]">{column.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Empty State Component
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

// Status Badge Dropdown Component
const STATUS_OPTIONS = [
  { value: true, label: 'Active', icon: ShieldCheck, variant: 'neutral', color: 'text-slate-500 dark:text-slate-400' },
  { value: false, label: 'Inactive', icon: ShieldOff, variant: 'warning', color: 'text-amber-600 dark:text-amber-500' },
];

const StatusBadgeDropdown = ({ owner, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef(null);

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
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} disabled={isUpdating} className="p-0 h-auto">
        <Badge variant={currentStatus.variant} className="cursor-pointer gap-1">
          {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <StatusIcon className="h-3 w-3" />}
          {currentStatus.label}
          <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
        </Badge>
      </Button>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-36 rounded-lg border shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-150" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
          {STATUS_OPTIONS.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = option.value === owner.isActive;
            return (
              <Button key={option.label} variant="ghost" size="sm" onClick={() => handleStatusSelect(option)} className={cn('w-full justify-start gap-2', isSelected && 'bg-[var(--bb-color-accent-soft)]')}>
                <OptionIcon className={cn('h-4 w-4', option.color)} />
                <span>{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 ml-auto text-[color:var(--bb-color-accent)]" />}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Compose Email Modal Component (Demo version)
const ComposeEmailModal = ({ open, onClose, recipients }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject('');
      setBody('');
    }
  }, [open]);

  const validRecipients = useMemo(() => recipients.filter(r => r.email), [recipients]);
  const missingEmailCount = recipients.length - validRecipients.length;

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please enter a subject and message');
      return;
    }
    if (validRecipients.length === 0) {
      toast.error('No recipients have email addresses');
      return;
    }

    setIsSending(true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success(`Email sent to ${validRecipients.length} recipient${validRecipients.length !== 1 ? 's' : ''} (Demo)`);
    setIsSending(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Compose Email" description={`Send an email to ${recipients.length} selected owner${recipients.length !== 1 ? 's' : ''}`} size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
          <Button onClick={handleSend} disabled={isSending || validRecipients.length === 0}>
            {isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Send className="h-4 w-4 mr-2" />Send Email</>}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-[color:var(--bb-color-text-primary)]">To</label>
          <div className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-muted)' }}>
            {validRecipients.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {validRecipients.slice(0, 5).map((r, i) => (<Badge key={i} variant="neutral" className="text-xs">{r.email}</Badge>))}
                {validRecipients.length > 5 && (<Badge variant="neutral" className="text-xs">+{validRecipients.length - 5} more</Badge>)}
              </div>
            ) : (<span className="text-[color:var(--bb-color-text-muted)]">No valid email addresses</span>)}
          </div>
          {missingEmailCount > 0 && (<p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{missingEmailCount} selected owner{missingEmailCount !== 1 ? 's' : ''} {missingEmailCount !== 1 ? 'have' : 'has'} no email address</p>)}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-[color:var(--bb-color-text-primary)]">Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter email subject..." className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-[color:var(--bb-color-text-primary)]">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message here..." rows={8} className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }} />
        </div>
        <p className="text-xs text-[color:var(--bb-color-text-muted)]">Emails will be sent individually to each recipient. They will not see other recipients' addresses.</p>
      </div>
    </Modal>
  );
};

// Compose SMS Modal Component (Demo version)
const ComposeSmsModal = ({ open, onClose, recipients }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage('');
    }
  }, [open]);

  const validRecipients = useMemo(() => recipients.filter(r => r.phone), [recipients]);
  const missingPhoneCount = recipients.length - validRecipients.length;
  const characterCount = message.length;
  const segmentCount = Math.ceil(characterCount / 160) || 1;

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (validRecipients.length === 0) {
      toast.error('No recipients have phone numbers');
      return;
    }

    setIsSending(true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success(`SMS sent to ${validRecipients.length} recipient${validRecipients.length !== 1 ? 's' : ''} (Demo)`);
    setIsSending(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Compose SMS" description={`Send a text message to ${recipients.length} selected owner${recipients.length !== 1 ? 's' : ''}`} size="default"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
          <Button onClick={handleSend} disabled={isSending || validRecipients.length === 0}>
            {isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Send className="h-4 w-4 mr-2" />Send SMS</>}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-[color:var(--bb-color-text-primary)]">Recipients</label>
          <div className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-muted)' }}>
            {validRecipients.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {validRecipients.slice(0, 5).map((r, i) => (<Badge key={i} variant="neutral" className="text-xs"><Phone className="h-3 w-3 mr-1" />{r.phone}</Badge>))}
                {validRecipients.length > 5 && (<Badge variant="neutral" className="text-xs">+{validRecipients.length - 5} more</Badge>)}
              </div>
            ) : (<span className="text-[color:var(--bb-color-text-muted)]">No valid phone numbers</span>)}
          </div>
          {missingPhoneCount > 0 && (<p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{missingPhoneCount} selected owner{missingPhoneCount !== 1 ? 's' : ''} {missingPhoneCount !== 1 ? 'have' : 'has'} no phone number</p>)}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-[color:var(--bb-color-text-primary)]">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message here..." rows={4} className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }} />
          <div className="flex items-center justify-between mt-1">
            <span className={cn('text-xs', characterCount > 160 ? 'text-amber-600 dark:text-amber-400' : 'text-[color:var(--bb-color-text-muted)]')}>{characterCount} characters{segmentCount > 1 && ` (${segmentCount} SMS segments)`}</span>
            {characterCount > 160 && (<span className="text-xs text-amber-600 dark:text-amber-400">Messages over 160 chars may cost more</span>)}
          </div>
        </div>
        <p className="text-xs text-[color:var(--bb-color-text-muted)]">SMS messages will be sent individually to each recipient. Standard SMS rates apply based on your Twilio plan.</p>
      </div>
    </Modal>
  );
};

export default Owners;
