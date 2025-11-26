import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, RefreshCw, Search, Trash2, ChevronDown, ChevronLeft, ChevronRight,
  Download, SlidersHorizontal, BookmarkPlus, Check, X, Mail, FileCheck,
  Calendar, Syringe, AlertTriangle, CheckCircle2, Clock, AlertCircle,
  LayoutList, LayoutGrid, MoreHorizontal, ExternalLink, Dog, Cat, User,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useExpiringVaccinationsQuery } from '@/features/pets/api-vaccinations';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';

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
  'DHPP',
  'Bordetella',
  'Leptospirosis',
  'Influenza',
  'FVRCP',
  'FeLV',
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const Vaccinations = () => {
  const queryClient = useQueryClient();

  // View and filter state
  const [activeView, setActiveView] = useState('all');
  const [customFilters, setCustomFilters] = useState({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Display state
  const [viewMode, setViewMode] = useState('compact'); // 'compact' | 'expanded'

  // Table state
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'daysRemaining', direction: 'asc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vaccinationToDelete, setVaccinationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refs for click outside
  const filterRef = useRef(null);
  const viewsRef = useRef(null);

  // Saved views state
  const [savedViews] = useState(() => {
    const saved = localStorage.getItem('vaccinations-saved-views');
    return saved ? JSON.parse(saved) : DEFAULT_VIEWS;
  });

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterPanel(false);
      if (viewsRef.current && !viewsRef.current.contains(e.target)) setShowViewsDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all vaccinations (use large number to get all)
  const { data, isLoading, refetch, isFetching } = useExpiringVaccinationsQuery(36500);

  // Helper to detect if a vaccine is appropriate for the pet's species
  const isVaccineAppropriate = useCallback((vaccine, species) => {
    const dogOnlyVaccines = ['DAPP', 'DHPP', 'Bordetella', 'Leptospirosis', 'Influenza'];
    const catOnlyVaccines = ['FVRCP', 'FeLV'];

    const normalizedType = vaccine?.toLowerCase();
    const normalizedSpecies = species?.toLowerCase();

    if (normalizedSpecies === 'dog') {
      return !catOnlyVaccines.some(v => v.toLowerCase() === normalizedType);
    } else if (normalizedSpecies === 'cat') {
      return !dogOnlyVaccines.some(v => v.toLowerCase() === normalizedType);
    }
    return true;
  }, []);

  // Process records with computed fields
  const allRecords = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    return list.map(v => {
      const now = new Date();
      const expiresAt = v.expiresAt ? new Date(v.expiresAt) : null;
      const daysRemaining = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;

      let status = 'current';
      if (daysRemaining !== null) {
        if (daysRemaining < 0) status = 'overdue';
        else if (daysRemaining <= 7) status = 'critical';
        else if (daysRemaining <= 30) status = 'expiring';
      }

      const ownerName = `${v.ownerFirstName || ''} ${v.ownerLastName || ''}`.trim() || 'Unknown';
      const isAppropriate = isVaccineAppropriate(v.type, v.petSpecies);

      return {
        ...v,
        daysRemaining,
        status,
        ownerName,
        isAppropriate,
      };
    });
  }, [data, isVaccineAppropriate]);

  // Get active view filters
  const activeViewFilters = useMemo(() => {
    const view = savedViews.find(v => v.id === activeView);
    return view?.filters || {};
  }, [activeView, savedViews]);

  // Filter records
  const filteredRecords = useMemo(() => {
    const filters = { ...activeViewFilters, ...customFilters };

    return allRecords.filter(record => {
      // Search filter
      const matchesSearch = !searchTerm ||
        record.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (filters.status) {
        matchesStatus = record.status === filters.status;
      }

      // Max days filter (for expiring views)
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
        matchesVaccineType = filters.vaccineTypes.some(vt =>
          record.type?.toLowerCase().includes(vt.toLowerCase())
        );
      }

      // Species filter
      let matchesSpecies = true;
      if (filters.species) {
        matchesSpecies = record.petSpecies?.toLowerCase() === filters.species.toLowerCase();
      }

      // Date range filter
      let matchesDateRange = true;
      if (filters.expiryDateStart || filters.expiryDateEnd) {
        const expiryDate = record.expiresAt ? new Date(record.expiresAt) : null;
        if (expiryDate) {
          if (filters.expiryDateStart && expiryDate < new Date(filters.expiryDateStart)) {
            matchesDateRange = false;
          }
          if (filters.expiryDateEnd && expiryDate > new Date(filters.expiryDateEnd)) {
            matchesDateRange = false;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesMaxDays && matchesVaccineType && matchesSpecies && matchesDateRange;
    });
  }, [allRecords, searchTerm, activeViewFilters, customFilters]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (!sortConfig.key) return filteredRecords;

    return [...filteredRecords].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle null values
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
  const stats = useMemo(() => ({
    total: allRecords.length,
    overdue: allRecords.filter(r => r.status === 'overdue').length,
    critical: allRecords.filter(r => r.status === 'critical').length,
    expiring: allRecords.filter(r => r.status === 'expiring').length,
    current: allRecords.filter(r => r.status === 'current').length,
  }), [allRecords]);

  // Handlers
  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === paginatedRecords.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedRecords.map(r => r.recordId)));
    }
  }, [paginatedRecords, selectedRows.size]);

  const handleSelectRow = useCallback((id) => {
    setSelectedRows(prev => {
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

    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/v1/pets/${vaccinationToDelete.petId}/vaccinations/${vaccinationToDelete.recordId}`);
      toast.success('Vaccination deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['vaccinations', 'expiring'] });
      refetch();
      setDeleteDialogOpen(false);
      setVaccinationToDelete(null);
    } catch (error) {
      console.error('Failed to delete vaccination:', error);
      toast.error(error?.message || 'Failed to delete vaccination');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setVaccinationToDelete(null);
  };

  const handleBulkEmail = () => {
    toast.success(`Preparing to email ${selectedRows.size} owner(s)...`);
    // Future: implement actual email functionality
  };

  const handleBulkExport = () => {
    const selectedRecords = sortedRecords.filter(r => selectedRows.has(r.recordId));
    const csv = generateCSV(selectedRecords);
    downloadCSV(csv, 'vaccination-records.csv');
    toast.success(`Exported ${selectedRows.size} record(s)`);
  };

  const handleExportAll = () => {
    const csv = generateCSV(sortedRecords);
    downloadCSV(csv, 'all-vaccination-records.csv');
    toast.success(`Exported ${sortedRecords.length} record(s)`);
  };

  const handleMarkReviewed = () => {
    toast.success(`Marked ${selectedRows.size} record(s) as reviewed`);
    setSelectedRows(new Set());
    // Future: implement actual mark reviewed functionality
  };

  const hasActiveFilters = searchTerm || Object.keys(customFilters).length > 0 || activeView !== 'all';

  return (
    <div className="flex flex-col flex-grow w-full min-h-[calc(100vh-180px)]">
      {/* Header Section */}
      <div className="pb-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <PageHeader
          breadcrumbs={[
            { label: 'Directory', href: '/pets' },
            { label: 'Vaccinations' }
          ]}
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

      {/* Sticky Toolbar */}
      <div
        className="sticky top-0 z-20 px-4 py-3 border-b shadow-sm rounded-lg"
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
                <span className="max-w-[120px] truncate">{savedViews.find(v => v.id === activeView)?.name || 'Views'}</span>
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
              {isFetching ? 'Refreshing...' : `Showing ${sortedRecords.length} of ${allRecords.length} vaccinations`}
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

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

            {/* View Toggle */}
            <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'compact'
                    ? 'bg-[color:var(--bb-color-accent)] text-white'
                    : 'bg-[color:var(--bb-color-bg-body)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]'
                )}
                title="Compact view"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('expanded')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'expanded'
                    ? 'bg-[color:var(--bb-color-accent)] text-white'
                    : 'bg-[color:var(--bb-color-bg-body)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]'
                )}
                title="Expanded view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-1.5 h-9">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 h-9">
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeView !== 'all' && (
              <FilterTag
                label={savedViews.find(v => v.id === activeView)?.name || 'View'}
                onRemove={() => setActiveView('all')}
              />
            )}
            {customFilters.status && (
              <FilterTag
                label={`Status: ${customFilters.status}`}
                onRemove={() => setCustomFilters({ ...customFilters, status: undefined })}
              />
            )}
            {customFilters.species && (
              <FilterTag
                label={`Species: ${customFilters.species}`}
                onRemove={() => setCustomFilters({ ...customFilters, species: undefined })}
              />
            )}
            {customFilters.vaccineTypes?.length > 0 && (
              <FilterTag
                label={`Vaccines: ${customFilters.vaccineTypes.join(', ')}`}
                onRemove={() => setCustomFilters({ ...customFilters, vaccineTypes: undefined })}
              />
            )}
            {searchTerm && (
              <FilterTag
                label={`Search: "${searchTerm}"`}
                onRemove={() => setSearchTerm('')}
              />
            )}
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedRows.size > 0 && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border p-2" style={{ backgroundColor: 'var(--bb-color-accent-soft)', borderColor: 'var(--bb-color-accent)' }}>
            <span className="text-sm font-medium text-[color:var(--bb-color-accent)]">{selectedRows.size} selected</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkEmail} className="gap-1.5 h-8">
                <Mail className="h-3.5 w-3.5" />Email Owners
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkExport} className="gap-1.5 h-8">
                <Download className="h-3.5 w-3.5" />Export Selected
              </Button>
              <Button variant="outline" size="sm" onClick={handleMarkReviewed} className="gap-1.5 h-8">
                <FileCheck className="h-3.5 w-3.5" />Mark Reviewed
              </Button>
            </div>
            <button type="button" onClick={() => setSelectedRows(new Set())} className="ml-auto text-sm text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]">
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center justify-between py-3 px-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[color:var(--bb-color-text-muted)]">Sort by:</span>
          <select
            value={`${sortConfig.key}-${sortConfig.direction}`}
            onChange={(e) => {
              const [key, direction] = e.target.value.split('-');
              setSortConfig({ key, direction });
            }}
            className="h-8 rounded-lg border px-2 text-sm"
            style={{
              backgroundColor: 'var(--bb-color-bg-body)',
              borderColor: 'var(--bb-color-border-subtle)',
              color: 'var(--bb-color-text-primary)',
            }}
          >
            <option value="daysRemaining-asc">Soonest Expiry First</option>
            <option value="daysRemaining-desc">Latest Expiry First</option>
            <option value="petName-asc">Pet Name A–Z</option>
            <option value="petName-desc">Pet Name Z–A</option>
            <option value="ownerName-asc">Owner Name A–Z</option>
            <option value="ownerName-desc">Owner Name Z–A</option>
            <option value="type-asc">Vaccine Type A–Z</option>
          </select>
        </div>

        {/* Select All */}
        <label className="flex items-center gap-2 text-sm text-[color:var(--bb-color-text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={selectedRows.size === paginatedRecords.length && paginatedRecords.length > 0}
            onChange={handleSelectAll}
            className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]"
          />
          Select all on page
        </label>
      </div>

      {/* List Section */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <ListSkeleton viewMode={viewMode} />
        ) : allRecords.length === 0 ? (
          <EmptyState type="no-data" />
        ) : sortedRecords.length === 0 ? (
          <EmptyState type="no-results" onClearFilters={clearFilters} />
        ) : (
          <div className={cn('space-y-2', viewMode === 'compact' && 'space-y-1')}>
            {paginatedRecords.map((record) => (
              <VaccinationRow
                key={record.recordId}
                record={record}
                viewMode={viewMode}
                isSelected={selectedRows.has(record.recordId)}
                onSelect={() => handleSelectRow(record.recordId)}
                onDelete={() => handleDeleteClick(record)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {sortedRecords.length > 0 && !isLoading && (
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 mt-4 border-t"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
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
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedRecords.length)} of {sortedRecords.length}
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

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Vaccination"
        message={`Are you sure you want to delete the ${vaccinationToDelete?.type} vaccination for ${vaccinationToDelete?.petName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
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
      <span className="opacity-70">{label}</span>
    </div>
  );
};

// Filter Tag Component
const FilterTag = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]">
    {label}
    <button type="button" onClick={onRemove} className="hover:bg-[color:var(--bb-color-accent)]/20 rounded-full p-0.5">
      <X className="h-3 w-3" />
    </button>
  </span>
);

// Vaccination Row Component
const VaccinationRow = ({ record, viewMode, isSelected, onSelect, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        'hover:border-[color:var(--bb-color-accent)]/50'
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
        <div className={cn(
          'shrink-0 rounded-full flex items-center justify-center',
          isCompact ? 'w-8 h-8' : 'w-10 h-10',
          record.status === 'overdue' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
          record.status === 'critical' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
          record.status === 'expiring' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
          'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
        )}>
          <Syringe className={cn(isCompact ? 'h-4 w-4' : 'h-5 w-5')} />
        </div>

        {/* Left: Pet Info */}
        <div className={cn('min-w-0', isCompact ? 'flex-1' : 'flex-[2]')}>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/pets/${record.petId}`}
              className="font-semibold text-[color:var(--bb-color-text-primary)] hover:text-[color:var(--bb-color-accent)] hover:underline"
            >
              {record.petName || 'Unknown Pet'}
            </Link>
            <Badge variant="accent" size="sm">{record.type || 'Vaccine'}</Badge>
            {!record.isAppropriate && (
              <Badge variant="danger" size="sm" title="This vaccine is not typically given to this species">
                ⚠️ Species Mismatch
              </Badge>
            )}
          </div>
          {!isCompact && (
            <div className="flex items-center gap-1.5 text-sm text-[color:var(--bb-color-text-muted)] mt-0.5">
              <SpeciesIcon className="h-3.5 w-3.5" />
              <span>{record.petSpecies || 'Unknown'}</span>
              {record.petBreed && (
                <>
                  <span>•</span>
                  <span>{record.petBreed}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Middle: Expiry + Owner */}
        <div className={cn('min-w-0', isCompact ? 'flex-1' : 'flex-[2]')}>
          <div className={cn('font-medium', statusConfig.color)}>
            {record.status === 'overdue' ? 'Expired: ' : 'Expires: '}
            {record.expiresAt ? new Date(record.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            {record.daysRemaining !== null && (
              <span className="ml-1 text-sm font-normal opacity-75">
                ({record.daysRemaining < 0 ? `${Math.abs(record.daysRemaining)}d overdue` : `${record.daysRemaining}d left`})
              </span>
            )}
          </div>
          {!isCompact && (
            <div className="flex items-center gap-1.5 text-sm text-[color:var(--bb-color-text-muted)] mt-0.5 truncate">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{record.ownerName}</span>
              {record.ownerEmail && (
                <>
                  <span>•</span>
                  <span className="truncate">{record.ownerEmail}</span>
                </>
              )}
              {record.ownerPhone && (
                <>
                  <span>•</span>
                  <span className="truncate">{record.ownerPhone}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/pets/${record.petId}`}
            className="text-xs text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-accent)] hover:underline whitespace-nowrap hidden sm:inline-flex items-center gap-1"
          >
            <span>Manage from</span>
            <span className="font-medium">pet record</span>
            <ExternalLink className="h-3 w-3" />
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
                <div className="py-1">
                  <Link
                    to={`/pets/${record.petId}`}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-primary)]"
                  >
                    <ExternalLink className="h-4 w-4" />View Pet
                  </Link>
                  <button
                    type="button"
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />Delete
                  </button>
                </div>
              </div>
            )}
          </div>
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
      setLocalFilters({ ...localFilters, vaccineTypes: current.filter(t => t !== type) });
    } else {
      setLocalFilters({ ...localFilters, vaccineTypes: [...current, type] });
    }
  };

  return (
    <div className="absolute left-0 top-full mt-2 w-80 rounded-xl border p-4 shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Filters</h3>
        <button type="button" onClick={onClose} className="text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4">
        {/* Vaccine Types */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-2">Vaccine Type</label>
          <div className="flex flex-wrap gap-1.5">
            {VACCINE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleVaccineType(type)}
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium transition-colors',
                  (localFilters.vaccineTypes || []).includes(type)
                    ? 'bg-[color:var(--bb-color-accent)] text-white'
                    : 'bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)] hover:bg-[color:var(--bb-color-bg-body)]'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Species */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Species</label>
          <select
            value={localFilters.species || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, species: e.target.value || undefined })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
          >
            <option value="">All Species</option>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Status</label>
          <select
            value={localFilters.status || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value || undefined })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
          >
            <option value="">All Status</option>
            <option value="current">Current</option>
            <option value="expiring">Expiring in 30 days</option>
            <option value="critical">Critical (7 days)</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Expiry From</label>
            <input
              type="date"
              value={localFilters.expiryDateStart || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, expiryDateStart: e.target.value || undefined })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Expiry To</label>
            <input
              type="date"
              value={localFilters.expiryDateEnd || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, expiryDateEnd: e.target.value || undefined })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={handleReset}>Reset</Button>
        <Button size="sm" className="flex-1" onClick={handleApply}>Apply Filters</Button>
      </div>
    </div>
  );
};

// Views Dropdown Component
const ViewsDropdown = ({ views, activeView, onSelectView }) => (
  <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
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
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            {!isCompact && <Skeleton className="h-3 w-48" />}
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
};

// Empty State Component
const EmptyState = ({ type, onClearFilters }) => (
  <div className="flex-1 flex flex-col items-center justify-center py-16 rounded-xl border" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
    <div className="flex h-16 w-16 items-center justify-center rounded-full mb-4" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <Shield className="h-8 w-8 text-[color:var(--bb-color-text-muted)]" />
    </div>
    {type === 'no-data' ? (
      <>
        <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">No vaccination records yet</h3>
        <p className="text-sm text-[color:var(--bb-color-text-muted)] text-center max-w-md">
          Add vaccinations from individual pet profiles. This page shows all vaccination records across your facility.
        </p>
      </>
    ) : (
      <>
        <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">No vaccinations match these filters</h3>
        <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4 text-center max-w-md">
          Try adjusting your search or filters to find what you're looking for.
        </p>
        <Button variant="outline" onClick={onClearFilters}>Clear Filters</Button>
      </>
    )}
  </div>
);

// CSV Generation Helpers
const generateCSV = (records) => {
  const headers = ['Pet Name', 'Species', 'Breed', 'Vaccine Type', 'Expiry Date', 'Days Remaining', 'Status', 'Owner Name', 'Owner Email', 'Owner Phone'];
  const rows = records.map(r => [
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
  return [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
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
