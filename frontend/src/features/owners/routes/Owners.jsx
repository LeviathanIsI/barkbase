import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Phone, DollarSign, Plus, Search, Filter, Mail, ChevronDown,
  ChevronLeft, ChevronRight, Download, Columns, MoreHorizontal, Edit,
  MessageSquare, Eye, Trash2, Check, X, Star, SlidersHorizontal,
  BookmarkPlus, PawPrint, Calendar, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOwnersQuery, useCreateOwnerMutation } from '../api';
import OwnerFormModal from '../components/OwnerFormModal';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';

// Saved views - persisted in localStorage
const DEFAULT_VIEWS = [
  { id: 'all', name: 'All Owners', filters: {}, isDefault: true },
  { id: 'active', name: 'Active Clients', filters: { status: 'ACTIVE' } },
  { id: 'inactive', name: 'Inactive Owners', filters: { status: 'INACTIVE' } },
  { id: 'high-value', name: 'High Value', filters: { minLifetimeValue: 100000 } },
];

// Column definitions
const ALL_COLUMNS = [
  { id: 'select', label: '', width: '48px', sortable: false, hideable: false },
  { id: 'owner', label: 'Owner', width: 'minmax(200px, 1fr)', sortable: true, sortKey: 'fullName' },
  { id: 'contact', label: 'Contact', width: '180px', sortable: false },
  { id: 'pets', label: 'Pets', width: '160px', sortable: true, sortKey: 'petCount' },
  { id: 'status', label: 'Status', width: '100px', sortable: true, sortKey: 'status' },
  { id: 'bookings', label: 'Bookings', width: '120px', sortable: true, sortKey: 'totalBookings' },
  { id: 'lastVisit', label: 'Last Visit', width: '120px', sortable: true, sortKey: 'lastBooking' },
  { id: 'lifetimeValue', label: 'Lifetime Value', width: '140px', sortable: true, sortKey: 'lifetimeValue' },
  { id: 'actions', label: '', width: '80px', sortable: false, hideable: false },
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
    return saved ? JSON.parse(saved) : ALL_COLUMNS.map(c => c.id);
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Saved views state
  const [savedViews, setSavedViews] = useState(() => {
    const saved = localStorage.getItem('owners-saved-views');
    return saved ? JSON.parse(saved) : DEFAULT_VIEWS;
  });

  // Data fetching
  const { data: ownersData, isLoading, error } = useOwnersQuery();
  const createOwnerMutation = useCreateOwnerMutation();
  const owners = useMemo(() => Array.isArray(ownersData) ? ownersData : (ownersData?.data ?? []), [ownersData]);

  // Save visible columns to localStorage
  useEffect(() => {
    localStorage.setItem('owners-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Calculate enhanced owner data with metrics
  const ownersWithMetrics = useMemo(() => {
    return owners.map((owner) => {
      const totalBookings = owner.totalBookings ?? 0;
      const lifetimeValue = owner.lifetimeValue ?? 0;
      const lastBooking = owner.lastBooking || null;
      const pets = owner.pets || (owner.petNames ? owner.petNames.map((name) => ({ name })) : []);
      const nameFromParts = `${owner.firstName || ''} ${owner.lastName || ''}`.trim();
      const fullName = nameFromParts || owner.name || owner.fullName || owner.email || 'Owner';
      const status = totalBookings > 0 ? 'ACTIVE' : 'INACTIVE';
      const petCount = pets.length;

      return { ...owner, fullName, totalBookings, lifetimeValue, lastBooking, pets, status, petCount };
    });
  }, [owners]);

  // Get active view filters
  const activeViewFilters = useMemo(() => {
    const view = savedViews.find(v => v.id === activeView);
    return view?.filters || {};
  }, [activeView, savedViews]);

  // Filter owners based on search, view, and custom filters
  const filteredOwners = useMemo(() => {
    const filters = { ...activeViewFilters, ...customFilters };
    
    return ownersWithMetrics.filter(owner => {
      // Search filter
      const matchesSearch = !searchTerm ||
        owner.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.phone?.includes(searchTerm) ||
        owner.pets?.some(pet => pet.name?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus = !filters.status || owner.status === filters.status;

      // Lifetime value filter
      const matchesMinValue = !filters.minLifetimeValue || owner.lifetimeValue >= filters.minLifetimeValue;

      // Pet count filter
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

      // Handle null/undefined
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // String comparison
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
  }), [owners, ownersWithMetrics]);

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
      setSelectedRows(new Set(paginatedOwners.map(o => o.recordId)));
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

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">Pet Owners</h1>
            <p className="mt-0.5 text-sm text-[color:var(--bb-color-text-muted)]">
              Manage your client relationships
            </p>
          </div>

          {/* Compact Stats */}
          <div className="flex flex-wrap items-center gap-2">
            <StatBadge icon={Users} value={stats.total} label="Total" />
            <StatBadge icon={Star} value={stats.active} label="Active" variant="success" />
            <StatBadge icon={DollarSign} value={stats.highValue} label="High Value" variant="purple" />
            <StatBadge icon={DollarSign} value={formatCurrency(stats.totalRevenue)} label="Revenue" variant="warning" />
          </div>
        </div>

        {/* Sticky Toolbar */}
        <div
          className="sticky top-0 z-20 -mx-6 px-6 py-3 mb-4 border-y"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Filters + Saved Views */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filters Button */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={cn('gap-1.5', showFilterPanel && 'ring-2 ring-[var(--bb-color-accent)]')}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {Object.keys(customFilters).length > 0 && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--bb-color-accent)] text-xs text-white">
                      {Object.keys(customFilters).length}
                    </span>
                  )}
                </Button>

                {/* Filter Panel */}
                {showFilterPanel && (
                  <FilterPanel
                    filters={customFilters}
                    onFiltersChange={setCustomFilters}
                    onClose={() => setShowFilterPanel(false)}
                  />
                )}
              </div>

              {/* Saved Views Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowViewsDropdown(!showViewsDropdown)}
                  className="gap-1.5"
                >
                  <BookmarkPlus className="h-4 w-4" />
                  {savedViews.find(v => v.id === activeView)?.name || 'Views'}
                  <ChevronDown className={cn('h-4 w-4 transition-transform', showViewsDropdown && 'rotate-180')} />
                </Button>

                {showViewsDropdown && (
                  <ViewsDropdown
                    views={savedViews}
                    activeView={activeView}
                    onSelectView={(id) => { setActiveView(id); setShowViewsDropdown(false); }}
                    onClose={() => setShowViewsDropdown(false)}
                  />
                )}
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-[color:var(--bb-color-accent)] hover:underline"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all
                </button>
              )}
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--bb-color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search owners, pets, email, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-body)',
                    borderColor: 'var(--bb-color-border-subtle)',
                    color: 'var(--bb-color-text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Column Controls */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                  className="gap-1.5"
                >
                  <Columns className="h-4 w-4" />
                  <span className="hidden sm:inline">Columns</span>
                </Button>

                {showColumnsDropdown && (
                  <ColumnsDropdown
                    columns={ALL_COLUMNS.filter(c => c.hideable !== false)}
                    visibleColumns={visibleColumns}
                    onToggle={toggleColumn}
                    onClose={() => setShowColumnsDropdown(false)}
                  />
                )}
              </div>

              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>

              <Button size="sm" onClick={() => setFormModalOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Owner
              </Button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedRows.size > 0 && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border p-2" style={{ backgroundColor: 'var(--bb-color-accent-soft)', borderColor: 'var(--bb-color-accent)' }}>
              <span className="text-sm font-medium text-[color:var(--bb-color-accent)]">
                {selectedRows.size} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  SMS
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRows(new Set())}
                className="ml-auto text-sm text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-3 text-sm text-[color:var(--bb-color-text-muted)]">
          Showing {paginatedOwners.length} of {sortedOwners.length} owners
          {hasActiveFilters && ' (filtered)'}
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : sortedOwners.length === 0 ? (
          <EmptyState
            hasFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            onAddOwner={() => setFormModalOpen(true)}
          />
        ) : (
          <div
            className="flex-1 overflow-auto rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                  {ALL_COLUMNS.filter(c => visibleColumns.includes(c.id)).map((column) => (
                    <th
                      key={column.id}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]',
                        column.sortable && 'cursor-pointer hover:text-[color:var(--bb-color-text-primary)]'
                      )}
                      style={{ width: column.width }}
                      onClick={() => column.sortable && handleSort(column.sortKey)}
                    >
                      <div className="flex items-center gap-1">
                        {column.id === 'select' ? (
                          <input
                            type="checkbox"
                            checked={selectedRows.size === paginatedOwners.length && paginatedOwners.length > 0}
                            onChange={handleSelectAll}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        ) : (
                          <>
                            {column.label}
                            {column.sortable && (
                              <SortIcon
                                active={sortConfig.key === column.sortKey}
                                direction={sortConfig.direction}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedOwners.map((owner, index) => (
                  <OwnerRow
                    key={owner.recordId}
                    owner={owner}
                    isSelected={selectedRows.has(owner.recordId)}
                    onSelect={() => handleSelectRow(owner.recordId)}
                    onClick={() => navigate(`/customers/${owner.recordId}`)}
                    visibleColumns={visibleColumns}
                    isEven={index % 2 === 0}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {sortedOwners.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-[color:var(--bb-color-text-muted)]">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded border px-2 py-1 text-sm"
                style={{
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  borderColor: 'var(--bb-color-border-subtle)',
                  color: 'var(--bb-color-text-primary)',
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[color:var(--bb-color-text-muted)]">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
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
const OwnerRow = ({ owner, isSelected, onSelect, onClick, visibleColumns, isEven }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <tr
      className={cn(
        'cursor-pointer transition-colors',
        'hover:bg-[color:var(--bb-color-bg-elevated)]',
        isSelected && 'bg-[color:var(--bb-color-accent-soft)]'
      )}
      style={{
        borderBottom: '1px solid var(--bb-color-border-subtle)',
        backgroundColor: isEven && !isSelected ? 'transparent' : undefined,
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {visibleColumns.includes('select') && (
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="h-4 w-4 rounded border-gray-300"
          />
        </td>
      )}

      {visibleColumns.includes('owner') && (
        <td className="px-4 py-3" onClick={onClick}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
              style={{ backgroundColor: 'var(--bb-color-accent)', color: 'var(--bb-color-text-on-accent)' }}
            >
              {owner.fullName?.[0]?.toUpperCase() || 'O'}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-[color:var(--bb-color-text-primary)] truncate">{owner.fullName}</p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">{owner.email || 'No email'}</p>
            </div>
          </div>
        </td>
      )}

      {visibleColumns.includes('contact') && (
        <td className="px-4 py-3" onClick={onClick}>
          {owner.phone ? (
            <div className="flex items-center gap-1.5 text-[color:var(--bb-color-text-muted)]">
              <Phone className="h-3.5 w-3.5" />
              <span>{owner.phone}</span>
            </div>
          ) : (
            <span className="text-[color:var(--bb-color-text-muted)]">—</span>
          )}
        </td>
      )}

      {visibleColumns.includes('pets') && (
        <td className="px-4 py-3" onClick={onClick}>
          <div className="flex items-center gap-1">
            {owner.pets?.length > 0 ? (
              <>
                <div className="flex -space-x-1">
                  {owner.pets.slice(0, 3).map((pet, i) => (
                    <div
                      key={i}
                      className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[0.6rem] font-medium"
                      style={{
                        backgroundColor: 'var(--bb-color-bg-elevated)',
                        borderColor: 'var(--bb-color-bg-surface)',
                        color: 'var(--bb-color-text-muted)',
                      }}
                      title={pet.name}
                    >
                      {pet.name?.[0]?.toUpperCase() || <PawPrint className="h-3 w-3" />}
                    </div>
                  ))}
                </div>
                {owner.pets.length > 3 && (
                  <span className="ml-1 text-xs text-[color:var(--bb-color-text-muted)]">+{owner.pets.length - 3}</span>
                )}
              </>
            ) : (
              <span className="text-[color:var(--bb-color-text-muted)]">—</span>
            )}
          </div>
        </td>
      )}

      {visibleColumns.includes('status') && (
        <td className="px-4 py-3" onClick={onClick}>
          <Badge variant={owner.status === 'ACTIVE' ? 'success' : 'neutral'}>
            {owner.status === 'ACTIVE' ? 'Active' : 'Inactive'}
          </Badge>
        </td>
      )}

      {visibleColumns.includes('bookings') && (
        <td className="px-4 py-3" onClick={onClick}>
          <span className="font-medium text-[color:var(--bb-color-text-primary)]">{owner.totalBookings}</span>
        </td>
      )}

      {visibleColumns.includes('lastVisit') && (
        <td className="px-4 py-3" onClick={onClick}>
          {owner.lastBooking ? (
            <span className="text-[color:var(--bb-color-text-muted)]">
              {new Date(owner.lastBooking).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
            </span>
          ) : (
            <span className="text-[color:var(--bb-color-text-muted)]">Never</span>
          )}
        </td>
      )}

      {visibleColumns.includes('lifetimeValue') && (
        <td className="px-4 py-3" onClick={onClick}>
          <span className="font-medium text-[color:var(--bb-color-text-primary)]">{formatCurrency(owner.lifetimeValue)}</span>
        </td>
      )}

      {visibleColumns.includes('actions') && (
        <td className="px-4 py-3">
          <div className={cn('flex items-center gap-1 transition-opacity', showActions ? 'opacity-100' : 'opacity-0')}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="p-1.5 rounded hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]"
              title="View profile"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]"
              title="Send message"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]"
              title="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
};

// Filter Panel Component
const FilterPanel = ({ filters, onFiltersChange, onClose }) => {
  return (
    <div
      className="absolute left-0 top-full mt-2 w-72 rounded-xl border p-4 shadow-lg z-30"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Filters</h3>
        <button type="button" onClick={onClose} className="text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
          >
            <option value="">Any</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Min Pet Count</label>
          <input
            type="number"
            min="0"
            value={filters.minPetCount || ''}
            onChange={(e) => onFiltersChange({ ...filters, minPetCount: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Min Lifetime Value</label>
          <input
            type="number"
            min="0"
            value={filters.minLifetimeValue ? filters.minLifetimeValue / 100 : ''}
            onChange={(e) => onFiltersChange({ ...filters, minLifetimeValue: e.target.value ? Number(e.target.value) * 100 : undefined })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
            placeholder="$0"
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onFiltersChange({})}>
          Reset
        </Button>
        <Button size="sm" className="flex-1" onClick={onClose}>
          Apply
        </Button>
      </div>
    </div>
  );
};

// Views Dropdown Component
const ViewsDropdown = ({ views, activeView, onSelectView, onClose }) => {
  return (
    <div
      className="absolute left-0 top-full mt-2 w-52 rounded-xl border shadow-lg z-30"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="py-1">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => onSelectView(view.id)}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
              'hover:bg-[color:var(--bb-color-bg-elevated)]',
              activeView === view.id && 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]'
            )}
          >
            {activeView === view.id && <Check className="h-4 w-4" />}
            <span className={activeView !== view.id ? 'ml-6' : ''}>{view.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Columns Dropdown Component
const ColumnsDropdown = ({ columns, visibleColumns, onToggle, onClose }) => {
  return (
    <div
      className="absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-lg z-30"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="p-2">
        <p className="px-2 py-1 text-xs font-semibold uppercase text-[color:var(--bb-color-text-muted)]">Toggle Columns</p>
        {columns.map((column) => (
          <label
            key={column.id}
            className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-[color:var(--bb-color-bg-elevated)] rounded"
          >
            <input
              type="checkbox"
              checked={visibleColumns.includes(column.id)}
              onChange={() => onToggle(column.id)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-[color:var(--bb-color-text-primary)]">{column.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

// Table Skeleton Component
const TableSkeleton = () => (
  <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
    <div className="p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({ hasFilters, onClearFilters, onAddOwner }) => (
  <div
    className="flex flex-col items-center justify-center rounded-xl border py-16"
    style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
  >
    <Users className="h-12 w-12 text-[color:var(--bb-color-text-muted)] opacity-40 mb-4" />
    <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-1">
      {hasFilters ? 'No owners match your filters' : 'No owners yet'}
    </h3>
    <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4">
      {hasFilters ? 'Try adjusting your search or filters' : 'Get started by adding your first pet owner'}
    </p>
    <div className="flex gap-2">
      {hasFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
      <Button onClick={onAddOwner}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Owner
      </Button>
    </div>
  </div>
);

export default Owners;
