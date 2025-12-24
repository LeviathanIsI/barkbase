/**
 * Owners List Page - Demo Version
 * Uses mock data instead of real API calls.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Phone, DollarSign, Plus, Mail, ChevronDown,
  ChevronLeft, ChevronRight, Download, Columns, MoreHorizontal,
  MessageSquare, Eye, Check, X, Star, SlidersHorizontal,
  BookmarkPlus, PawPrint, ArrowUpDown, ArrowUp, ArrowDown, GripVertical,
  Calendar, Loader2, ShieldCheck, ShieldOff,
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { formatDistanceToNow, format } from 'date-fns';
import EntityToolbar from '@/components/EntityToolbar';
import StyledSelect from '@/components/ui/StyledSelect';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { ScrollableTableContainer } from '@/components/ui/ScrollableTableContainer';
import LoadingState from '@/components/ui/LoadingState';
import { useOwnersQuery, useCreateOwnerMutation } from '../api';
import OwnerFormModal from '../components/OwnerFormModal';
import PetHoverCard from '../components/PetHoverCard';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

// Saved views
const DEFAULT_VIEWS = [
  { id: 'all', name: 'All Owners', filters: {}, isDefault: true },
  { id: 'active', name: 'Active Clients', filters: { status: 'ACTIVE' } },
  { id: 'inactive', name: 'Inactive Owners', filters: { status: 'INACTIVE' } },
];

// Column definitions
const ALL_COLUMNS = [
  { id: 'select', label: '', minWidth: 48, maxWidth: 48, align: 'center', sortable: false, hideable: false },
  { id: 'owner', label: 'Owner', minWidth: 240, flex: 2, align: 'left', sortable: true, sortKey: 'name' },
  { id: 'contact', label: 'Contact', minWidth: 180, flex: 1, align: 'left', sortable: false },
  { id: 'pets', label: 'Pets', minWidth: 140, maxWidth: 200, align: 'left', sortable: true, sortKey: 'petCount' },
  { id: 'status', label: 'Status', minWidth: 100, maxWidth: 120, align: 'center', sortable: true, sortKey: 'status' },
  { id: 'visitCount', label: 'Visits', minWidth: 100, maxWidth: 120, align: 'center', sortable: true, sortKey: 'visitCount' },
  { id: 'totalSpent', label: 'Total Spent', minWidth: 130, maxWidth: 150, align: 'right', sortable: true, sortKey: 'totalSpent' },
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
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS.map((c) => c.id));
  const [columnOrder, setColumnOrder] = useState(ALL_COLUMNS.map((c) => c.id));

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Saved views state
  const [savedViews] = useState(DEFAULT_VIEWS);

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

  // Data fetching from mock API
  const { data: ownersResult, isLoading, isFetching } = useOwnersQuery({ search: searchTerm });
  const createOwnerMutation = useCreateOwnerMutation();
  const owners = useMemo(() => ownersResult?.data ?? [], [ownersResult]);

  const showSkeleton = isLoading && !ownersResult;
  const isUpdating = isFetching && !isLoading && !!ownersResult;

  // Fade-in animation state
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (!showSkeleton && ownersResult && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [showSkeleton, ownersResult, hasLoaded]);

  // Get active view filters
  const activeViewFilters = useMemo(() => {
    const view = savedViews.find((v) => v.id === activeView);
    return view?.filters || {};
  }, [activeView, savedViews]);

  // Filter owners
  const filteredOwners = useMemo(() => {
    const filters = { ...activeViewFilters, ...customFilters };

    return owners.filter((owner) => {
      const matchesSearch =
        !searchTerm ||
        owner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.phone?.includes(searchTerm);

      const matchesStatus = !filters.status || owner.status === filters.status;

      return matchesSearch && matchesStatus;
    });
  }, [owners, searchTerm, activeViewFilters, customFilters]);

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
  const stats = useMemo(
    () => ({
      total: owners.length,
      active: owners.filter((o) => o.status === 'active').length,
      totalRevenue: owners.reduce((sum, o) => sum + (o.totalSpent || 0), 0),
    }),
    [owners]
  );

  // Get ordered and visible columns
  const orderedColumns = useMemo(() => {
    return columnOrder
      .map((id) => ALL_COLUMNS.find((c) => c.id === id))
      .filter((c) => c && visibleColumns.includes(c.id));
  }, [columnOrder, visibleColumns]);

  // Handlers
  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === paginatedOwners.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedOwners.map((o) => o.id || o.recordId)));
    }
  }, [paginatedOwners, selectedRows.size]);

  const handleSelectRow = useCallback((id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleColumn = useCallback((columnId) => {
    setVisibleColumns((prev) => {
      if (prev.includes(columnId)) {
        return prev.filter((id) => id !== columnId);
      }
      return [...prev, columnId];
    });
  }, []);

  const moveColumn = useCallback((fromIndex, toIndex) => {
    setColumnOrder((prev) => {
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

  // Export to CSV (demo - just shows toast)
  const handleExportAll = useCallback(() => {
    toast.success(`Exported ${sortedOwners.length} owners to CSV`);
  }, [sortedOwners.length]);

  if (showSkeleton) {
    return (
      <div className="flex flex-col flex-grow w-full min-h-[calc(100vh-180px)] items-center justify-center">
        <LoadingState label="Loading owners..." variant="mascot" />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'flex flex-col w-full h-[calc(100vh-120px)] overflow-hidden transition-opacity duration-200',
          hasLoaded ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Header Section */}
        <div
          className="flex-shrink-0 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
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
            <StatBadge icon={DollarSign} value={formatCurrency(stats.totalRevenue)} label="Revenue" variant="warning" />
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
            searchPlaceholder="Search owners, email, phone..."
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
                  </Button>
                  {showFilterPanel && (
                    <FilterPanel
                      filters={customFilters}
                      onFiltersChange={setCustomFilters}
                      onClose={() => setShowFilterPanel(false)}
                    />
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
                    <span className="max-w-[100px] truncate">
                      {savedViews.find((v) => v.id === activeView)?.name || 'Views'}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', showViewsDropdown && 'rotate-180')} />
                  </Button>
                  {showViewsDropdown && (
                    <ViewsDropdown
                      views={savedViews}
                      activeView={activeView}
                      onSelectView={(id) => {
                        setActiveView(id);
                        setShowViewsDropdown(false);
                      }}
                    />
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
                  {sortedOwners.length} owner{sortedOwners.length !== 1 ? 's' : ''}
                  {hasActiveFilters && ' filtered'}
                </span>
              </>
            }
            rightContent={
              <>
                {/* Column Controls */}
                <div className="relative" ref={columnsRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                    className="gap-1.5 h-9"
                  >
                    <Columns className="h-4 w-4" />
                    <span className="hidden sm:inline">Columns</span>
                  </Button>
                  {showColumnsDropdown && (
                    <ColumnsDropdown
                      columns={ALL_COLUMNS.filter((c) => c.hideable !== false)}
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
            <div
              className="mt-3 flex items-center gap-3 rounded-lg border p-2"
              style={{ backgroundColor: 'var(--bb-color-accent-soft)', borderColor: 'var(--bb-color-accent)' }}
            >
              <span className="text-sm font-medium text-[color:var(--bb-color-accent)]">
                {selectedRows.size} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => toast('Email feature coming soon!', { icon: '📧' })}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => toast('SMS feature coming soon!', { icon: '💬' })}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  SMS
                </Button>
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
              <EmptyState
                hasFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                onAddOwner={() => setFormModalOpen(true)}
              />
            </div>
          ) : (
            <ScrollableTableContainer
              className="border rounded-t-lg"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <table className="w-full text-sm min-w-[800px]">
                <thead className="sticky top-0 z-10">
                  <tr
                    style={{
                      backgroundColor: 'var(--bb-color-bg-elevated)',
                      boxShadow: '0 1px 0 var(--bb-color-border-subtle)',
                    }}
                  >
                    {orderedColumns.map((column) => {
                      const thPadding = 'px-4 lg:px-6 py-3';
                      const alignClass =
                        column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left';
                      return (
                        <th
                          key={column.id}
                          className={cn(
                            thPadding,
                            alignClass,
                            'text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] whitespace-nowrap',
                            column.sortable && 'cursor-pointer hover:text-[color:var(--bb-color-text-primary)] transition-colors'
                          )}
                          style={{
                            minWidth: column.minWidth,
                            maxWidth: column.maxWidth,
                            backgroundColor: 'var(--bb-color-bg-elevated)',
                          }}
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
                              {column.sortable && (
                                <SortIcon active={sortConfig.key === column.sortKey} direction={sortConfig.direction} />
                              )}
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
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedOwners.length)} of{' '}
                  {sortedOwners.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 h-8"
                    aria-label="First page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronLeft className="h-4 w-4 -ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2 h-8"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                    {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 h-8"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 h-8"
                    aria-label="Last page"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4 -ml-2" />
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
const OwnerRow = ({ owner, columns, isSelected, onSelect, onView, isEven }) => {
  const [showActions, setShowActions] = useState(false);
  const cellPadding = 'px-4 lg:px-6 py-3';

  const renderCell = (column) => {
    switch (column.id) {
      case 'select':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')} onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              aria-label="Select owner"
              className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]"
            />
          </td>
        );
      case 'owner':
        return (
          <td key={column.id} className={cellPadding}>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 gap-3"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold bg-slate-600 dark:bg-slate-500 text-white">
                {owner.name?.[0]?.toUpperCase() || owner.firstName?.[0]?.toUpperCase() || 'O'}
              </div>
              <div className="min-w-0 text-left">
                <p className="font-semibold text-[color:var(--bb-color-text-primary)]">{owner.name}</p>
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
              <span className="text-[color:var(--bb-color-text-muted)]">-</span>
            )}
          </td>
        );
      case 'pets':
        const displayPetCount = owner.petCount ?? owner.pets?.length ?? 0;
        return (
          <td key={column.id} className={cellPadding}>
            <PetHoverCard ownerId={owner.id} petCount={displayPetCount}>
              {displayPetCount > 0 ? (
                <div className="flex items-center gap-2 cursor-pointer">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2"
                    style={{
                      backgroundColor: 'var(--bb-color-bg-elevated)',
                      borderColor: 'var(--bb-color-bg-surface)',
                      color: 'var(--bb-color-text-muted)',
                    }}
                  >
                    <PawPrint className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-[color:var(--bb-color-text-primary)]">{displayPetCount}</span>
                </div>
              ) : (
                <span className="text-[color:var(--bb-color-text-muted)]">-</span>
              )}
            </PetHoverCard>
          </td>
        );
      case 'status':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            <Badge variant={owner.status === 'active' ? 'success' : 'neutral'} className="gap-1">
              {owner.status === 'active' ? (
                <ShieldCheck className="h-3 w-3" />
              ) : (
                <ShieldOff className="h-3 w-3" />
              )}
              {owner.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </td>
        );
      case 'visitCount':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            <div className="inline-flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[color:var(--bb-color-text-muted)]" />
              <span className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
                {owner.visitCount || 0}
              </span>
            </div>
          </td>
        );
      case 'totalSpent':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-right')}>
            <span
              className={cn(
                'font-semibold',
                owner.totalSpent > 0 ? 'text-[color:var(--bb-color-text-primary)]' : 'text-[color:var(--bb-color-text-muted)]'
              )}
            >
              {formatCurrency(owner.totalSpent || 0)}
            </span>
          </td>
        );
      case 'actions':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-right')}>
            <div className={cn('flex items-center justify-end gap-1 transition-opacity', showActions ? 'opacity-100' : 'opacity-0')}>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
                title="View profile"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()} title="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </td>
        );
      default:
        return (
          <td key={column.id} className={cellPadding}>
            -
          </td>
        );
    }
  };

  return (
    <tr
      className={cn('transition-colors', isSelected && 'bg-[color:var(--bb-color-accent-soft)]')}
      style={{
        borderBottom: '1px solid var(--bb-color-border-subtle)',
        backgroundColor: !isSelected && isEven ? 'var(--bb-color-bg-surface)' : !isSelected ? 'var(--bb-color-bg-body)' : undefined,
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {columns.map(renderCell)}
    </tr>
  );
};

// Filter Panel Component
const FilterPanel = ({ filters, onFiltersChange, onClose }) => (
  <div
    className="absolute left-0 top-full mt-2 w-72 rounded-xl border p-4 shadow-lg z-30"
    style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Filters</h3>
      <Button variant="ghost" size="icon-sm" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
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

// Views Dropdown Component
const ViewsDropdown = ({ views, activeView, onSelectView }) => (
  <div
    className="absolute left-0 top-full mt-2 w-52 rounded-xl border shadow-lg z-30"
    style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
  >
    <div className="py-1">
      {views.map((view) => (
        <Button
          key={view.id}
          variant="ghost"
          size="sm"
          onClick={() => onSelectView(view.id)}
          className={cn(
            'w-full justify-start gap-2',
            activeView === view.id && 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]'
          )}
        >
          {activeView === view.id && <Check className="h-4 w-4" />}
          <span className={activeView !== view.id ? 'ml-6' : ''}>{view.name}</span>
        </Button>
      ))}
    </div>
  </div>
);

// Columns Dropdown Component
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

  const orderedColumns = columnOrder.map((id) => columns.find((c) => c.id === id)).filter(Boolean);

  return (
    <div
      className="absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-lg z-30"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="p-2">
        <p className="px-2 py-1 text-xs font-semibold uppercase text-[color:var(--bb-color-text-muted)]">
          Toggle & Reorder
        </p>
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

// Empty State Component
const EmptyState = ({ hasFilters, onClearFilters, onAddOwner }) => (
  <div
    className="flex-1 flex flex-col items-center justify-center py-24"
    style={{ backgroundColor: 'var(--bb-color-bg-body)' }}
  >
    <div
      className="flex h-20 w-20 items-center justify-center rounded-full mb-6"
      style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
    >
      <Users className="h-10 w-10 text-[color:var(--bb-color-text-muted)]" />
    </div>
    <h3 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
      {hasFilters ? 'No owners match your filters' : 'No owners yet'}
    </h3>
    <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-8 max-w-md text-center">
      {hasFilters
        ? "Try adjusting your search or filters to find what you're looking for"
        : 'Get started by adding your first pet owner to the system'}
    </p>
    <div className="flex gap-3">
      {hasFilters && (
        <Button variant="outline" size="lg" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
      <Button size="lg" onClick={onAddOwner}>
        <Plus className="h-4 w-4 mr-2" />
        Add Owner
      </Button>
    </div>
  </div>
);

export default Owners;
