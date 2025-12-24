/**
 * Demo Vaccinations Page
 * Displays vaccination records with filtering, search, and actions.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, RefreshCw, Search, Trash2, ChevronDown, ChevronLeft, ChevronRight,
  Download, SlidersHorizontal, BookmarkPlus, Check, X, Mail,
  Calendar, Syringe, AlertTriangle, CheckCircle2, Clock, AlertCircle,
  LayoutList, LayoutGrid, Dog, Cat, Archive,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollableTableContainer } from '@/components/ui/ScrollableTableContainer';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import StyledSelect from '@/components/ui/StyledSelect';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import {
  useExpiringVaccinationsQuery,
  useRenewVaccinationMutation,
  useDeleteVaccinationMutation,
} from '../api';

// Saved views
const DEFAULT_VIEWS = [
  { id: 'all', name: 'All Vaccinations', filters: {} },
  { id: 'expiring-7', name: 'Expiring in 7 Days', filters: { maxDays: 7 } },
  { id: 'expiring-30', name: 'Expiring in 30 Days', filters: { maxDays: 30 } },
  { id: 'overdue', name: 'Overdue', filters: { status: 'overdue' } },
  { id: 'rabies', name: 'Rabies', filters: { vaccineType: 'Rabies' } },
  { id: 'dapp', name: 'DAPP/DHPP', filters: { vaccineType: 'DAPP' } },
  { id: 'bordetella', name: 'Bordetella', filters: { vaccineType: 'Bordetella' } },
  { id: 'fvrcp', name: 'FVRCP', filters: { vaccineType: 'FVRCP' } },
];

// Common vaccine types for filtering
const VACCINE_TYPES = [
  'Rabies',
  'DAPP',
  'Bordetella',
  'Leptospirosis',
  'FVRCP',
  'FeLV',
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const Vaccinations = () => {
  // View and filter state
  const [activeView, setActiveView] = useState('all');
  const [customFilters, setCustomFilters] = useState({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Display state
  const [viewMode, setViewMode] = useState('compact');

  // Table state
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'daysRemaining', direction: 'asc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vaccinationToDelete, setVaccinationToDelete] = useState(null);

  // Renew dialog state
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [vaccinationToRenew, setVaccinationToRenew] = useState(null);

  // Status filter state
  const [statusFilter, setStatusFilter] = useState('active');

  // Refs for click outside
  const filterRef = useRef(null);
  const viewsRef = useRef(null);

  const [savedViews] = useState(DEFAULT_VIEWS);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterPanel(false);
      if (viewsRef.current && !viewsRef.current.contains(e.target)) setShowViewsDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch vaccinations
  const { data: allRecords = [], isLoading, refetch, isFetching } = useExpiringVaccinationsQuery(365, 'all');

  // Mutations
  const renewMutation = useRenewVaccinationMutation();
  const deleteMutation = useDeleteVaccinationMutation();

  // Get active view filters
  const activeViewFilters = useMemo(() => {
    const view = savedViews.find((v) => v.id === activeView);
    return view?.filters || {};
  }, [activeView, savedViews]);

  // Filter records
  const filteredRecords = useMemo(() => {
    const filters = { ...activeViewFilters, ...customFilters };

    return allRecords.filter((record) => {
      // Record status filter
      let matchesRecordStatus = true;
      if (statusFilter === 'active') {
        matchesRecordStatus = record.recordStatus !== 'archived';
      } else if (statusFilter === 'archived') {
        matchesRecordStatus = record.recordStatus === 'archived';
      }

      // Search filter
      const matchesSearch =
        !searchTerm ||
        record.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (filters.status) {
        matchesStatus = record.status === filters.status;
      }

      // Max days filter
      let matchesMaxDays = true;
      if (filters.maxDays !== undefined && record.daysRemaining !== null) {
        matchesMaxDays = record.daysRemaining >= 0 && record.daysRemaining <= filters.maxDays;
      }

      // Vaccine type filter
      let matchesVaccineType = true;
      if (filters.vaccineType) {
        matchesVaccineType = record.type?.toLowerCase().includes(filters.vaccineType.toLowerCase());
      }
      if (filters.vaccineTypes?.length > 0) {
        matchesVaccineType = filters.vaccineTypes.some((vt) =>
          record.type?.toLowerCase().includes(vt.toLowerCase())
        );
      }

      // Species filter
      let matchesSpecies = true;
      if (filters.species) {
        matchesSpecies = record.petSpecies?.toLowerCase() === filters.species.toLowerCase();
      }

      return matchesRecordStatus && matchesSearch && matchesStatus && matchesMaxDays && matchesVaccineType && matchesSpecies;
    });
  }, [allRecords, searchTerm, activeViewFilters, customFilters, statusFilter]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (!sortConfig.key) return filteredRecords;

    return [...filteredRecords].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1;

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortConfig]);

  // Paginate records
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedRecords.length / pageSize);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeView, customFilters, pageSize]);

  // Calculate stats
  const stats = useMemo(
    () => ({
      total: allRecords.length,
      overdue: allRecords.filter((r) => r.status === 'overdue').length,
      critical: allRecords.filter((r) => r.status === 'critical').length,
      expiring: allRecords.filter((r) => r.status === 'expiring').length,
      current: allRecords.filter((r) => r.status === 'current').length,
    }),
    [allRecords]
  );

  // Handlers
  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === paginatedRecords.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedRecords.map((r) => r.id)));
    }
  }, [paginatedRecords, selectedRows.size]);

  const handleSelectRow = useCallback((id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setCustomFilters({});
    setActiveView('all');
  }, []);

  const handleDeleteClick = (vaccination) => {
    setVaccinationToDelete(vaccination);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vaccinationToDelete) return;
    deleteMutation.mutate(vaccinationToDelete.id);
    setDeleteDialogOpen(false);
    setVaccinationToDelete(null);
  };

  const handleRenewClick = (vaccination) => {
    setVaccinationToRenew(vaccination);
    setRenewDialogOpen(true);
  };

  const handleConfirmRenew = async () => {
    if (!vaccinationToRenew) return;
    const newExpiryDate = new Date();
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
    renewMutation.mutate({
      vaccinationId: vaccinationToRenew.id,
      newExpiryDate: newExpiryDate.toISOString().split('T')[0],
    });
    setRenewDialogOpen(false);
    setVaccinationToRenew(null);
  };

  const handleBulkEmail = () => {
    toast.success(`Email reminders would be sent to ${selectedRows.size} owner(s)`);
    setSelectedRows(new Set());
  };

  const handleExportAll = () => {
    const csv = generateCSV(sortedRecords);
    downloadCSV(csv, 'all-vaccination-records.csv');
    toast.success(`Exported ${sortedRecords.length} record(s)`);
  };

  const hasActiveFilters = searchTerm || Object.keys(customFilters).length > 0 || activeView !== 'all';

  return (
    <div className="flex flex-col w-full h-[calc(100vh-120px)] overflow-hidden">
      {/* Header Section */}
      <div className="flex-shrink-0 pb-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <PageHeader
          breadcrumbs={[{ label: 'Clients' }, { label: 'Vaccinations' }]}
          title="Vaccinations"
        />
        <p className="mt-1 text-sm text-[color:var(--bb-color-text-muted)]">
          Monitor and manage vaccination status across all pets
        </p>

        {/* Stats Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <StatBadge icon={Shield} value={stats.total} label="Total" />
          <StatBadge icon={AlertCircle} value={stats.overdue} label="Overdue" variant="danger" />
          <StatBadge icon={AlertTriangle} value={stats.critical} label="Critical (7d)" variant="warning" />
          <StatBadge icon={Clock} value={stats.expiring} label="Expiring (30d)" variant="amber" />
          <StatBadge icon={CheckCircle2} value={stats.current} label="Current" variant="success" />
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Filters + Views */}
          <div className="flex flex-wrap items-center gap-2">
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
                <span>{savedViews.find((v) => v.id === activeView)?.name || 'Views'}</span>
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
              <Button variant="link" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5 mr-1" />
                Clear all
              </Button>
            )}

            {/* Results Count */}
            <span className="text-sm text-[color:var(--bb-color-text-muted)] ml-2">
              {isFetching ? 'Refreshing...' : `Showing ${sortedRecords.length} of ${allRecords.length} vaccinations`}
            </span>
          </div>

          {/* Right: Search + Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--bb-color-text-muted)]" />
              <input
                type="text"
                placeholder="Search by pet, owner, vaccine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 rounded-lg border pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
                style={{
                  backgroundColor: 'var(--bb-color-bg-body)',
                  borderColor: 'var(--bb-color-border-subtle)',
                  color: 'var(--bb-color-text-primary)',
                }}
              />
            </div>

            {/* Status Filter Toggle */}
            <div
              className="flex items-center rounded-lg border overflow-hidden"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <Button
                variant={statusFilter === 'active' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className={cn('rounded-none px-3 h-9', statusFilter !== 'active' && 'bg-[color:var(--bb-color-bg-body)]')}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Active
              </Button>
              <Button
                variant={statusFilter === 'archived' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('archived')}
                className={cn('rounded-none px-3 h-9', statusFilter !== 'archived' && 'bg-[color:var(--bb-color-bg-body)]')}
              >
                <Archive className="h-4 w-4 mr-1.5" />
                Archived
              </Button>
              <Button
                variant={statusFilter === 'all' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={cn('rounded-none px-3 h-9', statusFilter !== 'all' && 'bg-[color:var(--bb-color-bg-body)]')}
              >
                All
              </Button>
            </div>

            {/* View Toggle */}
            <div
              className="flex items-center rounded-lg border overflow-hidden"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <Button
                variant={viewMode === 'compact' ? 'primary' : 'ghost'}
                size="icon-sm"
                onClick={() => setViewMode('compact')}
                className={cn('rounded-none', viewMode !== 'compact' && 'bg-[color:var(--bb-color-bg-body)]')}
                title="Compact view"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'expanded' ? 'primary' : 'ghost'}
                size="icon-sm"
                onClick={() => setViewMode('expanded')}
                className={cn('rounded-none', viewMode !== 'expanded' && 'bg-[color:var(--bb-color-bg-body)]')}
                title="Expanded view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-1.5 h-9">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export All</span>
            </Button>

            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 h-9">
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

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
              <Button variant="outline" size="sm" onClick={handleBulkEmail} className="gap-1.5 h-8">
                <Mail className="h-3.5 w-3.5" />
                Email Owners
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedRows(new Set())} className="ml-auto">
              Clear selection
            </Button>
          </div>
        )}
      </div>

      {/* Sort Controls */}
      <div className="flex-shrink-0 flex items-center justify-between py-3 px-0">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedRows.size === paginatedRecords.length && paginatedRecords.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]"
            />
            <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
              {selectedRows.size > 0 ? `${selectedRows.size} selected` : 'Select all'}
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[color:var(--bb-color-text-muted)]">Sort by:</span>
            <div className="min-w-[180px]">
              <StyledSelect
                options={[
                  { value: 'daysRemaining-asc', label: 'Soonest Expiry First' },
                  { value: 'daysRemaining-desc', label: 'Latest Expiry First' },
                  { value: 'petName-asc', label: 'Pet Name A-Z' },
                  { value: 'petName-desc', label: 'Pet Name Z-A' },
                  { value: 'ownerName-asc', label: 'Owner Name A-Z' },
                  { value: 'type-asc', label: 'Vaccine Type A-Z' },
                ]}
                value={`${sortConfig.key}-${sortConfig.direction}`}
                onChange={(opt) => {
                  if (opt?.value) {
                    const [key, direction] = opt.value.split('-');
                    setSortConfig({ key, direction });
                  }
                }}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>
        </div>

        <span className="text-sm text-[color:var(--bb-color-text-muted)]">
          Page {currentPage} of {totalPages || 1}
        </span>
      </div>

      {/* List Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <ListSkeleton viewMode={viewMode} />
        ) : allRecords.length === 0 ? (
          <EmptyState type="no-data" />
        ) : sortedRecords.length === 0 ? (
          <EmptyState type="no-results" onClearFilters={clearFilters} />
        ) : (
          <ScrollableTableContainer className={cn('space-y-2', viewMode === 'compact' && 'space-y-1')}>
            {paginatedRecords.map((record, index) => (
              <VaccinationRow
                key={record.id ?? `vacc-${index}`}
                record={record}
                viewMode={viewMode}
                isSelected={selectedRows.has(record.id)}
                onSelect={() => handleSelectRow(record.id)}
                onDelete={() => handleDeleteClick(record)}
                onRenew={() => handleRenewClick(record)}
              />
            ))}
          </ScrollableTableContainer>
        )}

        {/* Pagination */}
        {sortedRecords.length > 0 && !isLoading && (
          <div
            className="flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 border-t"
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
                {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sortedRecords.length)} of{' '}
                {sortedRecords.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 h-8"
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
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4 -ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Vaccination"
        message={`Are you sure you want to delete the ${vaccinationToDelete?.type} vaccination for ${vaccinationToDelete?.petName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Renew Dialog */}
      <ConfirmDialog
        isOpen={renewDialogOpen}
        onClose={() => setRenewDialogOpen(false)}
        onConfirm={handleConfirmRenew}
        title="Renew Vaccination"
        message={`Renew ${vaccinationToRenew?.type} vaccination for ${vaccinationToRenew?.petName}? This will set the expiry date to one year from today.`}
        confirmText="Renew"
        cancelText="Cancel"
        variant="primary"
        isLoading={renewMutation.isPending}
      />
    </div>
  );
};

// Stat Badge Component
const StatBadge = ({ icon: Icon, value, label, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    success: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    amber: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    danger: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', variants[variant])}>
      <Icon className="h-3 w-3" />
      <span className="font-semibold">{value}</span>
      <span>{label}</span>
    </div>
  );
};

// Vaccination Row Component
const VaccinationRow = ({ record, viewMode, isSelected, onSelect, onDelete, onRenew }) => {
  const SpeciesIcon = record.petSpecies?.toLowerCase() === 'cat' ? Cat : Dog;

  const getStatusConfig = () => {
    switch (record.status) {
      case 'overdue':
        return { variant: 'danger', label: 'Overdue', color: 'text-red-600 dark:text-red-400' };
      case 'critical':
        return { variant: 'warning', label: 'Expires in 7 days', color: 'text-amber-600 dark:text-amber-400' };
      case 'expiring':
        return { variant: 'warning', label: 'Expiring Soon', color: 'text-orange-600 dark:text-orange-400' };
      default:
        return { variant: 'success', label: 'Current', color: 'text-emerald-600 dark:text-emerald-400' };
    }
  };

  const statusConfig = getStatusConfig();
  const isCompact = viewMode === 'compact';

  return (
    <div
      className={cn(
        'group rounded-lg border transition-all',
        isCompact ? 'p-2' : 'p-4',
        isSelected && 'ring-2 ring-[var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)]',
        'hover:bg-slate-800/50 hover:border-[color:var(--bb-color-accent)]/50'
      )}
      style={{
        backgroundColor: isSelected ? undefined : 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
    >
      <div className={cn('flex items-center gap-3', isCompact ? 'gap-3' : 'gap-4')}>
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)] shrink-0"
        />

        {/* Icon */}
        <div
          className={cn(
            'shrink-0 rounded-full flex items-center justify-center',
            isCompact ? 'w-8 h-8' : 'w-10 h-10',
            record.status === 'overdue'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              : record.status === 'critical'
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
              : record.status === 'expiring'
              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
          )}
        >
          <Syringe className={cn(isCompact ? 'h-4 w-4' : 'h-5 w-5')} />
        </div>

        {/* Pet Info + Expiry */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/pets/${record.petId}`}
              className="font-semibold text-[color:var(--bb-color-text-primary)] hover:text-[color:var(--bb-color-accent)]"
            >
              {record.petName || 'Unknown Pet'}
            </Link>
            <Badge variant="accent" size="sm">
              {record.type || 'Vaccine'}
            </Badge>
            <span className={cn('text-sm', statusConfig.color)}>
              {record.status === 'overdue' ? 'Expired: ' : 'Expires: '}
              {record.expiresAt
                ? new Date(record.expiresAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A'}
              {record.daysRemaining !== null && (
                <span className="ml-1 opacity-75">
                  ({record.daysRemaining < 0 ? `${Math.abs(record.daysRemaining)}d overdue` : `${record.daysRemaining}d left`})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2 shrink-0">
          {record.recordStatus !== 'archived' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRenew}
              className="gap-1 text-[color:var(--bb-color-accent)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Renew
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} className="gap-1 text-red-500 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

// Filter Panel Component
const FilterPanel = ({ filters, onFiltersChange, onClose }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
    onFiltersChange({});
  };

  const toggleVaccineType = (type) => {
    const current = localFilters.vaccineTypes || [];
    if (current.includes(type)) {
      setLocalFilters({ ...localFilters, vaccineTypes: current.filter((t) => t !== type) });
    } else {
      setLocalFilters({ ...localFilters, vaccineTypes: [...current, type] });
    }
  };

  return (
    <div
      className="absolute left-0 top-full mt-2 w-80 rounded-xl border p-4 shadow-lg z-30"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Filters</h3>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-4">
        {/* Vaccine Types */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-2">Vaccine Type</label>
          <div className="flex flex-wrap gap-1.5">
            {VACCINE_TYPES.map((type) => (
              <Button
                key={type}
                variant={(localFilters.vaccineTypes || []).includes(type) ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => toggleVaccineType(type)}
                className={cn('rounded-full', !(localFilters.vaccineTypes || []).includes(type) && 'bg-[color:var(--bb-color-bg-elevated)]')}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Species */}
        <div>
          <StyledSelect
            label="Species"
            options={[
              { value: '', label: 'All Species' },
              { value: 'dog', label: 'Dogs' },
              { value: 'cat', label: 'Cats' },
            ]}
            value={localFilters.species || ''}
            onChange={(opt) => setLocalFilters({ ...localFilters, species: opt?.value || undefined })}
            isClearable={false}
            isSearchable={false}
          />
        </div>

        {/* Status */}
        <div>
          <StyledSelect
            label="Status"
            options={[
              { value: '', label: 'All Status' },
              { value: 'current', label: 'Current' },
              { value: 'expiring', label: 'Expiring in 30 days' },
              { value: 'critical', label: 'Critical (7 days)' },
              { value: 'overdue', label: 'Overdue' },
            ]}
            value={localFilters.status || ''}
            onChange={(opt) => setLocalFilters({ ...localFilters, status: opt?.value || undefined })}
            isClearable={false}
            isSearchable={false}
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={handleReset}>
          Reset
        </Button>
        <Button size="sm" className="flex-1" onClick={handleApply}>
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

// Views Dropdown Component
const ViewsDropdown = ({ views, activeView, onSelectView }) => (
  <div
    className="absolute left-0 top-full mt-2 w-56 rounded-xl border shadow-lg z-30"
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

// List Skeleton Component
const ListSkeleton = ({ viewMode }) => {
  const isCompact = viewMode === 'compact';
  return (
    <div className={cn('space-y-2', isCompact && 'space-y-1')}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={cn('rounded-lg border flex items-center gap-4', isCompact ? 'p-2' : 'p-4')}
          style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className={cn('rounded-full', isCompact ? 'h-8 w-8' : 'h-10 w-10')} />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            {!isCompact && <Skeleton className="h-3 w-28" />}
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
};

// Empty State Component
const EmptyState = ({ type, onClearFilters }) => (
  <div
    className="flex-1 flex flex-col items-center justify-center py-16 rounded-xl border"
    style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
  >
    <div
      className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
      style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
    >
      <Shield className="h-8 w-8 text-[color:var(--bb-color-text-muted)]" />
    </div>
    {type === 'no-data' ? (
      <>
        <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
          No vaccination records yet
        </h3>
        <p className="text-sm text-[color:var(--bb-color-text-muted)] text-center max-w-md">
          Add vaccinations from individual pet profiles. This page shows all vaccination records across your facility.
        </p>
      </>
    ) : (
      <>
        <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
          No vaccinations match these filters
        </h3>
        <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4 text-center max-w-md">
          Try adjusting your search or filters to find what you're looking for.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </>
    )}
  </div>
);

// CSV Generation Helpers
const generateCSV = (records) => {
  const headers = ['Pet Name', 'Species', 'Breed', 'Vaccine Type', 'Expiry Date', 'Days Remaining', 'Status', 'Owner Name', 'Owner Email', 'Owner Phone'];
  const rows = records.map((r) => [
    r.petName || '',
    r.petSpecies || '',
    r.petBreed || '',
    r.type || '',
    r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '',
    r.daysRemaining ?? '',
    r.status || '',
    r.ownerName || '',
    r.ownerEmail || '',
    r.ownerPhone || '',
  ]);
  return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
};

const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export default Vaccinations;
