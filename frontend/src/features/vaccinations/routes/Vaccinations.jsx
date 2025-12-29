import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, RefreshCw, Search, Trash2, ChevronDown, ChevronLeft, ChevronRight,
  Download, SlidersHorizontal, BookmarkPlus, Check, X, Mail, FileCheck,
  Calendar, Syringe, AlertTriangle, CheckCircle2, Clock, AlertCircle,
  MoreHorizontal, Dog, Cat, User, Send, Loader2,
  Archive, Columns, GripVertical, ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollableTableContainer } from '@/components/ui/ScrollableTableContainer';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useExpiringVaccinationsQuery } from '@/features/pets/api-vaccinations';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout';
import StyledSelect from '@/components/ui/StyledSelect';
import { RenewVaccinationModal } from '@/features/pets/components';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { useTimezoneUtils } from '@/lib/timezone';

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

// Column definitions
const ALL_COLUMNS = [
  { id: 'select', label: '', minWidth: 48, maxWidth: 48, align: 'center', sortable: false, hideable: false },
  { id: 'pet', label: 'Pet', minWidth: 150, flex: 1, align: 'left', sortable: true, sortKey: 'petName' },
  { id: 'owner', label: 'Owner', minWidth: 150, flex: 1, align: 'left', sortable: true, sortKey: 'ownerName' },
  { id: 'vaccine', label: 'Vaccine', minWidth: 120, align: 'left', sortable: true, sortKey: 'type' },
  { id: 'expiry', label: 'Expiry Date', minWidth: 140, align: 'left', sortable: true, sortKey: 'expiresAt' },
  { id: 'status', label: 'Status', minWidth: 120, align: 'left', sortable: true, sortKey: 'daysRemaining' },
  { id: 'actions', label: '', minWidth: 200, align: 'right', sortable: false, hideable: false },
];

const Vaccinations = () => {
  const queryClient = useQueryClient();
  const tz = useTimezoneUtils();
  const { openSlideout } = useSlideout();

  // View and filter state
  const [activeView, setActiveView] = useState('all');
  const [customFilters, setCustomFilters] = useState({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  // Renewal modal state
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [vaccinationToRenew, setVaccinationToRenew] = useState(null);
  const [isRenewing, setIsRenewing] = useState(false);

  // Status filter state (active/archived/all)
  const [statusFilter, setStatusFilter] = useState('active');

  // Reviewed records state (persisted in localStorage)
  const [reviewedRecords, setReviewedRecords] = useState(() => {
    const saved = localStorage.getItem('vaccinations-reviewed-records');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Refs for click outside
  const filterRef = useRef(null);
  const viewsRef = useRef(null);
  const columnsRef = useRef(null);

  // Column visibility state
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('vaccinations-visible-columns');
    if (saved) {
      const parsed = JSON.parse(saved);
      const allColumnIds = ALL_COLUMNS.map(c => c.id);
      const newColumns = allColumnIds.filter(id => !parsed.includes(id));
      return [...parsed, ...newColumns];
    }
    return ALL_COLUMNS.map(c => c.id);
  });
  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem('vaccinations-column-order');
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
      if (columnsRef.current && !columnsRef.current.contains(e.target)) setShowColumnsDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save column preferences to localStorage
  useEffect(() => {
    localStorage.setItem('vaccinations-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('vaccinations-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Column helpers
  const toggleColumn = (columnId) => {
    setVisibleColumns(prev =>
      prev.includes(columnId) ? prev.filter(id => id !== columnId) : [...prev, columnId]
    );
  };

  const moveColumn = (fromIndex, toIndex) => {
    setColumnOrder(prev => {
      const newOrder = [...prev];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      return newOrder;
    });
  };

  // Get ordered and visible columns (always include non-hideable columns like select/actions)
  const orderedColumns = useMemo(() => {
    return columnOrder
      .map(id => ALL_COLUMNS.find(c => c.id === id))
      .filter(col => col && (col.hideable === false || visibleColumns.includes(col.id)));
  }, [columnOrder, visibleColumns]);

  // Fetch ALL vaccinations (statusFilter='all' gets all records including archived/expired)
  const { data, isLoading, refetch, isFetching } = useExpiringVaccinationsQuery(365, 'all');

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
      // Record status filter (active/archived/all) - from the toolbar toggle
      let matchesRecordStatus = true;
      if (statusFilter === 'active') {
        matchesRecordStatus = record.recordStatus !== 'archived' && record.isArchived !== true;
      } else if (statusFilter === 'archived') {
        matchesRecordStatus = record.recordStatus === 'archived' || record.isArchived === true;
      }
      // 'all' shows everything

      // Search filter
      const matchesSearch = !searchTerm ||
        record.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter (from saved views - overdue, expiring, etc.)
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

      return matchesRecordStatus && matchesSearch && matchesStatus && matchesMaxDays && matchesVaccineType && matchesSpecies && matchesDateRange;
    });
  }, [allRecords, searchTerm, activeViewFilters, customFilters, statusFilter]);

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
      setSelectedRows(new Set(paginatedRecords.map(r => r.recordId ?? r.id)));
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

  const handleSort = useCallback((sortKey) => {
    setSortConfig(prev => ({
      key: sortKey,
      direction: prev.key === sortKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
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
    setEmailModalOpen(true);
  };

  // Get selected records data for email modal
  const selectedRecordsData = useMemo(() => {
    return sortedRecords.filter(r => selectedRows.has(r.recordId ?? r.id));
  }, [sortedRecords, selectedRows]);

  const handleBulkExport = () => {
    const selectedRecords = sortedRecords.filter(r => selectedRows.has(r.recordId ?? r.id));
    const csv = generateCSV(selectedRecords, tz.formatShortDate);
    downloadCSV(csv, 'vaccination-records.csv');
    toast.success(`Exported ${selectedRows.size} record(s)`);
  };

  const handleExportAll = () => {
    const csv = generateCSV(sortedRecords, tz.formatShortDate);
    downloadCSV(csv, 'all-vaccination-records.csv');
    toast.success(`Exported ${sortedRecords.length} record(s)`);
  };

  const handleMarkReviewed = () => {
    const newReviewed = new Set(reviewedRecords);
    selectedRows.forEach(id => newReviewed.add(id));
    setReviewedRecords(newReviewed);
    // Persist to localStorage
    localStorage.setItem('vaccinations-reviewed-records', JSON.stringify([...newReviewed]));
    toast.success(`Marked ${selectedRows.size} record(s) as reviewed`);
    setSelectedRows(new Set());
  };

  // Clear reviewed status for a single record
  const handleClearReviewed = useCallback((recordId) => {
    const newReviewed = new Set(reviewedRecords);
    newReviewed.delete(recordId);
    setReviewedRecords(newReviewed);
    localStorage.setItem('vaccinations-reviewed-records', JSON.stringify([...newReviewed]));
  }, [reviewedRecords]);

  // Open vaccination edit drawer
  const handleEditVaccination = useCallback((record) => {
    openSlideout(SLIDEOUT_TYPES.VACCINATION_EDIT, {
      vaccinations: [record],
      initialIndex: 0,
      petId: record.petId,
      petName: record.petName,
      title: `Update ${record.type || 'Vaccination'}`,
    });
  }, [openSlideout]);

  // Handle vaccination renewal
  const handleRenewClick = useCallback((record) => {
    setVaccinationToRenew(record);
    setRenewModalOpen(true);
  }, []);

  const handleRenewSubmit = async (data) => {
    if (!vaccinationToRenew) return;

    setIsRenewing(true);
    try {
      const response = await apiClient.post(
        canonicalEndpoints.pets.vaccinationRenew(
          String(vaccinationToRenew.petId),
          String(vaccinationToRenew.recordId ?? vaccinationToRenew.id)
        ),
        {
          administeredAt: data.administeredAt,
          expiresAt: data.expiresAt,
          provider: data.provider || null,
          lotNumber: data.lotNumber || null,
          notes: data.notes || null,
        }
      );

      toast.success(`${vaccinationToRenew.type} renewed successfully`);
      setRenewModalOpen(false);
      setVaccinationToRenew(null);

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['vaccinations', 'expiring'] });
      refetch();
    } catch (error) {
      console.error('Failed to renew vaccination:', error);
      toast.error(error.response?.data?.message || 'Failed to renew vaccination');
    } finally {
      setIsRenewing(false);
    }
  };

  const handleRenewCancel = () => {
    setRenewModalOpen(false);
    setVaccinationToRenew(null);
  };

  const hasActiveFilters = searchTerm || Object.keys(customFilters).length > 0 || activeView !== 'all';

  return (
    <div className="flex flex-col w-full h-[calc(100vh-120px)] overflow-hidden">
      {/* Header Section - fixed, doesn't shrink */}
      <div className="flex-shrink-0 pb-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <PageHeader
          breadcrumbs={[
            { label: 'Clients' },
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

      {/* Toolbar - fixed, doesn't shrink */}
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
                <span>{savedViews.find(v => v.id === activeView)?.name || 'Views'}</span>
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

            {/* Status Filter Toggle (Active/Archived/All) */}
            <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <Button
                variant={statusFilter === 'active' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className={cn(
                  'rounded-none px-3 h-9',
                  statusFilter !== 'active' && 'bg-[color:var(--bb-color-bg-body)]'
                )}
                title="Show active vaccinations only"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Active
              </Button>
              <Button
                variant={statusFilter === 'archived' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('archived')}
                className={cn(
                  'rounded-none px-3 h-9',
                  statusFilter !== 'archived' && 'bg-[color:var(--bb-color-bg-body)]'
                )}
                title="Show archived vaccinations only"
              >
                <Archive className="h-4 w-4 mr-1.5" />
                Archived
              </Button>
              <Button
                variant={statusFilter === 'all' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'rounded-none px-3 h-9',
                  statusFilter !== 'all' && 'bg-[color:var(--bb-color-bg-body)]'
                )}
                title="Show all vaccinations"
              >
                All
              </Button>
            </div>

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
            <Button variant="ghost" size="sm" onClick={() => setSelectedRows(new Set())} className="ml-auto">
              Clear selection
            </Button>
          </div>
        )}
      </div>

      {/* Sort Controls Header - fixed, doesn't shrink */}
      <div className="flex-shrink-0 flex items-center justify-between py-3 px-0">
        <div className="flex items-center gap-4">
          {/* Sort By */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[color:var(--bb-color-text-muted)]">Sort by:</span>
            <div className="min-w-[180px]">
              <StyledSelect
                options={[
                  { value: 'daysRemaining-asc', label: 'Soonest Expiry First' },
                  { value: 'daysRemaining-desc', label: 'Latest Expiry First' },
                  { value: 'petName-asc', label: 'Pet Name A–Z' },
                  { value: 'petName-desc', label: 'Pet Name Z–A' },
                  { value: 'ownerName-asc', label: 'Owner Name A–Z' },
                  { value: 'ownerName-desc', label: 'Owner Name Z–A' },
                  { value: 'type-asc', label: 'Vaccine Type A–Z' },
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

        {/* Pagination info */}
        <span className="text-sm text-[color:var(--bb-color-text-muted)]">
          Page {currentPage} of {totalPages || 1}
        </span>
      </div>

      {/* Table Section - scrollable */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <ListSkeleton />
        ) : allRecords.length === 0 ? (
          <EmptyState type="no-data" />
        ) : sortedRecords.length === 0 ? (
          <EmptyState type="no-results" onClearFilters={clearFilters} />
        ) : (
          <ScrollableTableContainer className="border rounded-t-lg" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <table className="w-full text-sm min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr style={{ backgroundColor: 'var(--bb-color-bg-elevated)', boxShadow: '0 1px 0 var(--bb-color-border-subtle)' }}>
                  {orderedColumns.map((column) => {
                    const thPadding = 'px-4 py-3';
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
                            checked={selectedRows.size === paginatedRecords.length && paginatedRecords.length > 0}
                            onChange={handleSelectAll}
                            aria-label="Select all vaccinations"
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
                {paginatedRecords.map((record, index) => (
                  <VaccinationTableRow
                    key={record.recordId ?? record.id ?? `vacc-${index}`}
                    record={record}
                    columns={orderedColumns}
                    isSelected={selectedRows.has(record.recordId ?? record.id)}
                    isReviewed={reviewedRecords.has(record.recordId ?? record.id)}
                    onSelect={() => handleSelectRow(record.recordId ?? record.id)}
                    onDelete={() => handleDeleteClick(record)}
                    onEdit={() => handleEditVaccination(record)}
                    onRenew={() => handleRenewClick(record)}
                    isEven={index % 2 === 0}
                  />
                ))}
              </tbody>
            </table>
          </ScrollableTableContainer>
        )}

        {/* Pagination - fixed at bottom */}
        {sortedRecords.length > 0 && !isLoading && (
          <div
            className="flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 px-4 border-t"
            style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-surface)' }}
          >
            <div className="flex items-center gap-2 text-sm text-[color:var(--bb-color-text-muted)]">
              <span>Rows per page:</span>
              <div className="w-24">
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

      {/* Email Owners Preview Modal */}
      <EmailOwnersModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        records={selectedRecordsData}
      />

      {/* Renew Vaccination Modal */}
      <RenewVaccinationModal
        open={renewModalOpen}
        onClose={handleRenewCancel}
        onSubmit={handleRenewSubmit}
        vaccination={vaccinationToRenew}
        petName={vaccinationToRenew?.petName}
        isLoading={isRenewing}
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

// Filter Tag Component
const FilterTag = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]">
    {label}
    <Button variant="ghost" size="icon-xs" onClick={onRemove} className="hover:bg-[color:var(--bb-color-accent)]/20 rounded-full">
      <X className="h-3 w-3" />
    </Button>
  </span>
);

// Vaccination Row Component
const VaccinationRow = ({ record, viewMode, isSelected, isReviewed, onSelect, onDelete, onEdit, onRenew, onClearReviewed }) => {
  const tz = useTimezoneUtils();
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

  // Handle row click (edit vaccination)
  const handleRowClick = (e) => {
    // Don't trigger if clicking on checkbox or menu
    if (e.target.closest('input[type="checkbox"]') || e.target.closest('[data-menu]')) {
      return;
    }
    onEdit?.();
  };

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        'group rounded-lg border transition-all cursor-pointer',
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
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)] shrink-0"
        />

        {/* Left: Pet Info + Expiry */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[color:var(--bb-color-text-primary)]">
              {record.petName || 'Unknown Pet'}
            </span>
            <Badge variant="accent" size="sm">{record.type || 'Vaccine'}</Badge>
            {isReviewed && (
              <Badge variant="success" size="sm" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Reviewed
              </Badge>
            )}
            {!record.isAppropriate && (
              <Badge variant="danger" size="sm" title="This vaccine is not typically given to this species">
                ⚠️ Species Mismatch
              </Badge>
            )}
            <span className={cn('text-sm', statusConfig.color)}>
              {record.status === 'overdue' ? 'Expired: ' : 'Expires: '}
              {record.expiresAt ? tz.formatDate(record.expiresAt, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
              {record.daysRemaining !== null && (
                <span className="ml-1 opacity-75">
                  ({record.daysRemaining < 0 ? `${Math.abs(record.daysRemaining)}d overdue` : `${record.daysRemaining}d left`})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Right: Action Pills */}
        <div className="flex items-center gap-2 shrink-0" data-menu>
          {record.recordStatus !== 'archived' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onRenew?.(); }}
              className="gap-1 text-[color:var(--bb-color-accent)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Renew
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="gap-1"
          >
            <Syringe className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="gap-1 text-red-500 hover:text-red-600"
          >
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
      setLocalFilters({ ...localFilters, vaccineTypes: current.filter(t => t !== type) });
    } else {
      setLocalFilters({ ...localFilters, vaccineTypes: [...current, type] });
    }
  };

  return (
    <div className="absolute left-0 top-full mt-2 w-80 rounded-xl border p-4 shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Filters</h3>
        <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="h-4 w-4" /></Button>
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
                className={cn(
                  'rounded-full',
                  !(localFilters.vaccineTypes || []).includes(type) && 'bg-[color:var(--bb-color-bg-elevated)]'
                )}
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
        <Button key={view.id} variant="ghost" size="sm" onClick={() => onSelectView(view.id)} className={cn('w-full justify-start gap-2', activeView === view.id && 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]')}>
          {activeView === view.id && <Check className="h-4 w-4" />}
          <span className={activeView !== view.id ? 'ml-6' : ''}>{view.name}</span>
        </Button>
      ))}
    </div>
  </div>
);

// List Skeleton Component
const ListSkeleton = () => {
  return (
    <div className="space-y-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border flex items-center gap-4 p-2"
          style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="rounded-full h-8 w-8" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
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

// Email Owners Modal Component
const EmailOwnersModal = ({ open, onClose, records }) => {
  const [subject, setSubject] = useState('Vaccination Reminder');
  const [isSending, setIsSending] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSubject('Vaccination Reminder');
    }
  }, [open]);

  // Get unique owners from records
  const uniqueOwners = useMemo(() => {
    const ownerMap = new Map();
    records.forEach(r => {
      if (r.ownerEmail && !ownerMap.has(r.ownerEmail)) {
        ownerMap.set(r.ownerEmail, {
          email: r.ownerEmail,
          name: r.ownerName,
          phone: r.ownerPhone,
          pets: [],
        });
      }
      if (r.ownerEmail) {
        ownerMap.get(r.ownerEmail).pets.push({
          petName: r.petName,
          vaccineType: r.type,
          expiresAt: r.expiresAt,
          daysRemaining: r.daysRemaining,
          status: r.status,
        });
      }
    });
    return Array.from(ownerMap.values());
  }, [records]);

  const ownersWithoutEmail = records.filter(r => !r.ownerEmail).length;

  const handleSend = async () => {
    if (uniqueOwners.length === 0) {
      toast.error('No owners with email addresses selected');
      return;
    }

    setIsSending(true);
    try {
      await apiClient.post('/api/v1/communications/email/vaccination-reminder', {
        ownerEmails: uniqueOwners.map(o => o.email),
        subject,
        records: records.map(r => ({
          petName: r.petName,
          vaccineType: r.type,
          expiresAt: r.expiresAt,
          ownerEmail: r.ownerEmail,
        })),
      });
      toast.success(`Vaccination reminders sent to ${uniqueOwners.length} owner${uniqueOwners.length !== 1 ? 's' : ''}`);
      onClose();
    } catch (err) {
      console.error('Failed to send emails:', err);
      const errorMessage = err.response?.data?.message || 'Failed to send emails';
      if (err.response?.status === 404 || errorMessage.includes('not found') || errorMessage.includes('not implemented')) {
        toast.error('Email reminders feature coming soon');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Email Vaccination Reminders"
      description={`Send reminders to ${uniqueOwners.length} owner${uniqueOwners.length !== 1 ? 's' : ''} about expiring vaccinations`}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || uniqueOwners.length === 0}>
            {isSending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Send Reminders</>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Subject */}
        <div>
          <label className="block text-sm font-medium mb-1 text-[color:var(--bb-color-text-primary)]">
            Email Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Vaccination Reminder"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
          />
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[color:var(--bb-color-text-primary)]">
            Recipients Preview
          </label>
          <div
            className="rounded-lg border max-h-64 overflow-y-auto"
            style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            {uniqueOwners.length === 0 ? (
              <div className="p-4 text-center text-[color:var(--bb-color-text-muted)]">
                No owners with email addresses in selection
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                {uniqueOwners.map((owner, idx) => (
                  <div key={idx} className="p-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                      <span className="font-medium text-sm text-[color:var(--bb-color-text-primary)]">{owner.name}</span>
                      <span className="text-sm text-[color:var(--bb-color-text-muted)]">{owner.email}</span>
                    </div>
                    <div className="mt-1.5 pl-6 space-y-1">
                      {owner.pets.map((pet, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2 text-xs">
                          <span className="text-[color:var(--bb-color-text-primary)]">{pet.petName}</span>
                          <Badge variant="accent" size="sm">{pet.vaccineType}</Badge>
                          <span className={cn(
                            pet.status === 'overdue' ? 'text-red-500' :
                            pet.status === 'critical' ? 'text-amber-500' :
                            pet.status === 'expiring' ? 'text-orange-500' :
                            'text-emerald-500'
                          )}>
                            {pet.daysRemaining !== null ? (
                              pet.daysRemaining < 0 ? `${Math.abs(pet.daysRemaining)}d overdue` : `${pet.daysRemaining}d left`
                            ) : 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Warnings */}
        {ownersWithoutEmail > 0 && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <p className="text-xs">
              {ownersWithoutEmail} selected record{ownersWithoutEmail !== 1 ? 's' : ''} {ownersWithoutEmail !== 1 ? 'have' : 'has'} no owner email address
            </p>
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-[color:var(--bb-color-text-muted)]">
          Each owner will receive a personalized email listing their pet(s) with expiring vaccinations.
        </p>
      </div>
    </Modal>
  );
};

// CSV Generation Helpers
const generateCSV = (records, tzFormatDate = null) => {
  const headers = ['Pet Name', 'Species', 'Breed', 'Vaccine Type', 'Expiry Date', 'Days Remaining', 'Status', 'Owner Name', 'Owner Email', 'Owner Phone'];
  const rows = records.map(r => [
    r.petName || '',
    r.petSpecies || '',
    r.petBreed || '',
    r.type || '',
    r.expiresAt ? (tzFormatDate ? tzFormatDate(r.expiresAt) : new Date(r.expiresAt).toLocaleDateString()) : '',
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

// Sort Icon Component
const SortIcon = ({ active, direction }) => {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
};

// Table Row Component
const VaccinationTableRow = ({ record, columns, isSelected, isReviewed, onSelect, onDelete, onEdit, onRenew, isEven }) => {
  const tz = useTimezoneUtils();
  const getStatusConfig = () => {
    switch (record.status) {
      case 'overdue':
        return { variant: 'danger', label: 'Overdue', color: 'text-red-600 dark:text-red-400' };
      case 'critical':
        return { variant: 'warning', label: 'Critical', color: 'text-amber-600 dark:text-amber-400' };
      case 'expiring':
        return { variant: 'warning', label: 'Expiring', color: 'text-orange-600 dark:text-orange-400' };
      default:
        return { variant: 'success', label: 'Current', color: 'text-emerald-600 dark:text-emerald-400' };
    }
  };

  const statusConfig = getStatusConfig();
  const tdPadding = 'px-4 py-3';

  const renderCell = (column) => {
    switch (column.id) {
      case 'select':
        return (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]"
          />
        );
      case 'pet':
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium text-[color:var(--bb-color-text-primary)]">
              {record.petName || 'Unknown'}
            </span>
            {isReviewed && (
              <Badge variant="success" size="sm" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Reviewed
              </Badge>
            )}
          </div>
        );
      case 'owner':
        return (
          <span className="text-[color:var(--bb-color-text-secondary)]">
            {record.ownerName || 'Unknown'}
          </span>
        );
      case 'vaccine':
        return <Badge variant="accent" size="sm">{record.type || 'Unknown'}</Badge>;
      case 'expiry':
        return (
          <span className="text-[color:var(--bb-color-text-secondary)]">
            {record.expiresAt ? tz.formatDate(record.expiresAt, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
          </span>
        );
      case 'status':
        return (
          <span className={cn('text-sm font-medium', statusConfig.color)}>
            {statusConfig.label}
            {record.daysRemaining !== null && (
              <span className="ml-1 opacity-75 text-xs">
                ({record.daysRemaining < 0 ? `${Math.abs(record.daysRemaining)}d overdue` : `${record.daysRemaining}d`})
              </span>
            )}
          </span>
        );
      case 'actions':
        return (
          <div className="flex items-center justify-end gap-1">
            {record.recordStatus !== 'archived' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onRenew?.(); }}
                className="gap-1 text-[color:var(--bb-color-accent)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Renew
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="gap-1"
            >
              <Syringe className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="gap-1 text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <tr
      onClick={onEdit}
      className={cn(
        'cursor-pointer transition-colors',
        isSelected && 'bg-[color:var(--bb-color-accent-soft)]',
        !isSelected && isEven && 'bg-[color:var(--bb-color-bg-surface)]',
        !isSelected && !isEven && 'bg-[color:var(--bb-color-bg-body)]',
        'hover:bg-[color:var(--bb-color-bg-elevated)]'
      )}
    >
      {columns.map((column) => {
        const alignClass = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left';
        return (
          <td
            key={column.id}
            className={cn(tdPadding, alignClass, 'whitespace-nowrap')}
            style={{ minWidth: column.minWidth, maxWidth: column.maxWidth }}
          >
            {renderCell(column)}
          </td>
        );
      })}
    </tr>
  );
};

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
            <span className="flex-1 text-[color:var(--bb-color-text-primary)]">{column.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Vaccinations;
