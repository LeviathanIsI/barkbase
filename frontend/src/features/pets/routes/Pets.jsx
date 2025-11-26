import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PawPrint, Plus, ChevronDown, ChevronLeft, ChevronRight,
  Download, Columns, MoreHorizontal, Eye, Edit, Trash2, Check, X,
  SlidersHorizontal, BookmarkPlus, ArrowUpDown, ArrowUp, ArrowDown,
  GripVertical, Syringe, ShieldAlert, Calendar, Star, Dog, Cat,
  AlertCircle, CheckCircle2, Clock, User,
} from 'lucide-react';
import EntityToolbar from '@/components/EntityToolbar';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import { PageLoader, UpdateChip } from '@/components/PageLoader';
import { usePetsQuery, useCreatePetMutation, useDeletePetMutation } from '../api';
import { useExpiringVaccinationsQuery } from '../api-vaccinations';
import { PetFormModal } from '../components';
import { cn } from '@/lib/cn';

// Saved views - persisted in localStorage
const DEFAULT_VIEWS = [
  { id: 'all', name: 'All Pets', filters: {}, isDefault: true },
  { id: 'active', name: 'Active Pets', filters: { status: 'active' } },
  { id: 'inactive', name: 'Inactive Pets', filters: { status: 'inactive' } },
  { id: 'expiring-vaccines', name: 'Expiring Vaccines', filters: { vaccinationStatus: 'expiring' } },
  { id: 'dogs', name: 'Dogs Only', filters: { species: 'dog' } },
  { id: 'cats', name: 'Cats Only', filters: { species: 'cat' } },
];

// Column definitions with better sizing for full-width
const ALL_COLUMNS = [
  { id: 'select', label: '', minWidth: 48, maxWidth: 48, align: 'center', sortable: false, hideable: false },
  { id: 'pet', label: 'Pet', minWidth: 260, flex: 2, align: 'left', sortable: true, sortKey: 'name' },
  { id: 'owner', label: 'Owner', minWidth: 200, flex: 1.5, align: 'left', sortable: true, sortKey: 'ownerName' },
  { id: 'status', label: 'Status', minWidth: 100, maxWidth: 120, align: 'center', sortable: true, sortKey: 'status' },
  { id: 'vaccinations', label: 'Vaccinations', minWidth: 140, maxWidth: 160, align: 'center', sortable: true, sortKey: 'vaccinationStatus' },
  { id: 'species', label: 'Species', minWidth: 100, maxWidth: 120, align: 'center', sortable: true, sortKey: 'species' },
  { id: 'age', label: 'Age', minWidth: 80, maxWidth: 100, align: 'center', sortable: true, sortKey: 'age' },
  { id: 'actions', label: '', minWidth: 100, maxWidth: 100, align: 'right', sortable: false, hideable: false },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const Pets = () => {
  const navigate = useNavigate();
  const [petFormModalOpen, setPetFormModalOpen] = useState(false);

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
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('pets-visible-columns');
    return saved ? JSON.parse(saved) : ALL_COLUMNS.map(c => c.id);
  });
  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem('pets-column-order');
    return saved ? JSON.parse(saved) : ALL_COLUMNS.map(c => c.id);
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Saved views state
  const [savedViews] = useState(() => {
    const saved = localStorage.getItem('pets-saved-views');
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
  const { data: petsResult, isLoading, isFetching, error } = usePetsQuery();
  const pets = petsResult?.pets ?? [];
  const createPetMutation = useCreatePetMutation();
  const deletePetMutation = useDeletePetMutation();
  
  // Show skeleton only on initial load when there's no cached data
  const showSkeleton = isLoading && !petsResult?.pets;
  // Show subtle indicator during background refetch when we have data
  const isUpdating = isFetching && !isLoading && !!petsResult?.pets;
  
  // Fade-in animation state
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (!showSkeleton && petsResult?.pets && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [showSkeleton, petsResult?.pets, hasLoaded]);

  // Get expiring vaccinations data
  const { data: expiringVaccsData } = useExpiringVaccinationsQuery(30);
  const expiringPetIds = useMemo(() => {
    return new Set((expiringVaccsData || []).map(v => v.petId));
  }, [expiringVaccsData]);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('pets-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('pets-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Calculate enhanced pet data with metrics
  const petsWithMetrics = useMemo(() => {
    return pets.map((pet) => {
      const primaryOwner = pet.owners?.[0];
      const ownerName = primaryOwner?.name || primaryOwner?.email || 'No owner';
      const status = pet.status || 'active';
      const hasExpiringVaccinations = expiringPetIds.has(pet.recordId);
      const inFacility = pet.bookings?.some(b =>
        new Date(b.checkIn) <= new Date() && new Date(b.checkOut) >= new Date()
      );

      // Vaccination status: 'current', 'expiring', 'missing'
      let vaccinationStatus = 'current';
      if (hasExpiringVaccinations) vaccinationStatus = 'expiring';
      // Could add logic for 'missing' if no vaccinations recorded

      return {
        ...pet,
        ownerName,
        ownerId: primaryOwner?.id || primaryOwner?.recordId,
        status,
        vaccinationStatus,
        inFacility,
        hasExpiringVaccinations,
      };
    });
  }, [pets, expiringPetIds]);

  // Get active view filters
  const activeViewFilters = useMemo(() => {
    const view = savedViews.find(v => v.id === activeView);
    return view?.filters || {};
  }, [activeView, savedViews]);

  // Filter pets
  const filteredPets = useMemo(() => {
    const filters = { ...activeViewFilters, ...customFilters };

    return petsWithMetrics.filter(pet => {
      const matchesSearch = !searchTerm ||
        pet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.species?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = !filters.status || pet.status === filters.status;
      const matchesSpecies = !filters.species || pet.species?.toLowerCase() === filters.species.toLowerCase();
      const matchesVaccination = !filters.vaccinationStatus ||
        (filters.vaccinationStatus === 'expiring' && pet.hasExpiringVaccinations);

      return matchesSearch && matchesStatus && matchesSpecies && matchesVaccination;
    });
  }, [petsWithMetrics, searchTerm, activeViewFilters, customFilters]);

  // Sort pets
  const sortedPets = useMemo(() => {
    if (!sortConfig.key) return filteredPets;

    return [...filteredPets].sort((a, b) => {
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
  }, [filteredPets, sortConfig]);

  // Paginate pets
  const paginatedPets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPets.slice(start, start + pageSize);
  }, [sortedPets, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedPets.length / pageSize);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeView, customFilters, pageSize]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: pets.length,
    active: petsWithMetrics.filter(p => p.status === 'active').length,
    dogs: petsWithMetrics.filter(p => p.species?.toLowerCase() === 'dog').length,
    cats: petsWithMetrics.filter(p => p.species?.toLowerCase() === 'cat').length,
    expiringVaccinations: expiringVaccsData?.length || 0,
  }), [pets, petsWithMetrics, expiringVaccsData]);

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
    if (selectedRows.size === paginatedPets.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedPets.map(p => p.recordId)));
    }
  }, [paginatedPets, selectedRows.size]);

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

  const handleRowDoubleClick = useCallback((pet) => {
    navigate(`/pets/${pet.recordId}`);
  }, [navigate]);

  const hasActiveFilters = searchTerm || Object.keys(customFilters).length > 0 || activeView !== 'all';

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Unable to load pets data. Please try again.</p>
      </div>
    );
  }

  return (
    <>
      {/* Main content container - stretches to fill available space in app shell */}
      <div className={cn(
        "flex flex-col flex-grow w-full min-h-[calc(100vh-180px)] transition-opacity duration-200",
        hasLoaded ? "opacity-100" : "opacity-0"
      )}>
        {/* Header Section */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">Pets Directory</h1>
            <p className="mt-0.5 text-sm text-[color:var(--bb-color-text-muted)]">
              Manage all registered pets and their records
            </p>
          </div>

          {/* Stats Pills - Right Aligned */}
          <div className="flex flex-wrap items-center gap-2">
            <StatBadge icon={PawPrint} value={stats.total} label="Total" />
            <StatBadge icon={Star} value={stats.active} label="Active" variant="success" />
            <StatBadge icon={Dog} value={stats.dogs} label="Dogs" variant="default" />
            <StatBadge icon={Cat} value={stats.cats} label="Cats" variant="default" />
            <StatBadge icon={ShieldAlert} value={stats.expiringVaccinations} label="Expiring" variant="warning" />
          </div>
        </div>

        {/* Sticky Toolbar */}
        <div
          className="sticky top-0 z-20 -mx-6 lg:-mx-12 px-6 lg:px-12 py-3 border-b shadow-sm"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <EntityToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search pets, owners, breeds..."
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

                {/* Species Quick Filter */}
                <select
                  value={customFilters.species || ''}
                  onChange={(e) => setCustomFilters({ ...customFilters, species: e.target.value || undefined })}
                  className="h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-body)',
                    borderColor: 'var(--bb-color-border-subtle)',
                    color: 'var(--bb-color-text-primary)',
                  }}
                >
                  <option value="">All Species</option>
                  <option value="dog">Dogs</option>
                  <option value="cat">Cats</option>
                  <option value="other">Other</option>
                </select>

                {/* Status Quick Filter */}
                <select
                  value={customFilters.status || ''}
                  onChange={(e) => setCustomFilters({ ...customFilters, status: e.target.value || undefined })}
                  className="h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-body)',
                    borderColor: 'var(--bb-color-border-subtle)',
                    color: 'var(--bb-color-text-primary)',
                  }}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-sm text-[color:var(--bb-color-accent)] hover:underline">
                    <X className="h-3.5 w-3.5" />
                    Clear all
                  </button>
                )}

                {/* Results Count */}
                <span className="text-sm text-[color:var(--bb-color-text-muted)] ml-2">
                  {sortedPets.length} pet{sortedPets.length !== 1 ? 's' : ''}{hasActiveFilters && ' filtered'}
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

                <Button size="sm" onClick={() => setPetFormModalOpen(true)} className="gap-1.5 h-9">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Pet</span>
                </Button>
              </>
            }
          />

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
              {customFilters.vaccinationStatus && (
                <FilterTag
                  label="Expiring Vaccinations"
                  onRemove={() => setCustomFilters({ ...customFilters, vaccinationStatus: undefined })}
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
                <Button variant="outline" size="sm" className="gap-1.5 h-8"><Syringe className="h-3.5 w-3.5" />Vaccination Report</Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8"><Download className="h-3.5 w-3.5" />Export</Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-red-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" />Delete</Button>
              </div>
              <button type="button" onClick={() => setSelectedRows(new Set())} className="ml-auto text-sm text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]">
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Table Section - Uses full available width in content area */}
        <div className="flex-1 flex flex-col mt-4 -mx-6 lg:-mx-12">
          {showSkeleton ? (
            <PageLoader label="Loading pets…" />
          ) : sortedPets.length === 0 ? (
            <div className="px-6 lg:px-12">
              <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} onAddPet={() => setPetFormModalOpen(true)} />
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:flex md:flex-1 overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: '1280px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderBottom: '2px solid var(--bb-color-border-subtle)' }}>
                      {orderedColumns.map((column) => (
                        <th
                          key={column.id}
                          className={cn(
                            'px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] whitespace-nowrap',
                            'first:pl-6 lg:first:pl-12 last:pr-6 lg:last:pr-12',
                            column.sortable && 'cursor-pointer hover:text-[color:var(--bb-color-text-primary)] transition-colors',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right'
                          )}
                          style={{ minWidth: column.minWidth, maxWidth: column.maxWidth }}
                          onClick={() => column.sortable && handleSort(column.sortKey)}
                        >
                          <div className={cn('flex items-center gap-1.5', column.align === 'center' && 'justify-center', column.align === 'right' && 'justify-end')}>
                            {column.id === 'select' ? (
                              <input
                                type="checkbox"
                                checked={selectedRows.size === paginatedPets.length && paginatedPets.length > 0}
                                onChange={handleSelectAll}
                                className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]"
                              />
                            ) : (
                              <>
                                {column.label}
                                {column.sortable && <SortIcon active={sortConfig.key === column.sortKey} direction={sortConfig.direction} />}
                              </>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPets.map((pet, index) => (
                      <PetRow
                        key={pet.recordId}
                        pet={pet}
                        columns={orderedColumns}
                        isSelected={selectedRows.has(pet.recordId)}
                        onSelect={() => handleSelectRow(pet.recordId)}
                        onDoubleClick={() => handleRowDoubleClick(pet)}
                        onView={() => navigate(`/pets/${pet.recordId}`)}
                        onEdit={() => navigate(`/pets/${pet.recordId}`)}
                        onDelete={() => deletePetMutation.mutate(pet.recordId)}
                        isEven={index % 2 === 0}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden px-4 space-y-3">
                {paginatedPets.map((pet) => (
                  <MobilePetCard
                    key={pet.recordId}
                    pet={pet}
                    isSelected={selectedRows.has(pet.recordId)}
                    onSelect={() => handleSelectRow(pet.recordId)}
                    onView={() => navigate(`/pets/${pet.recordId}`)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {sortedPets.length > 0 && !showSkeleton && (
            <div
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 px-6 lg:px-12 border-t"
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
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedPets.length)} of {sortedPets.length}
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

      <PetFormModal
        open={petFormModalOpen}
        onClose={() => setPetFormModalOpen(false)}
        onSubmit={async (data) => {
          try {
            await createPetMutation.mutateAsync(data);
            setPetFormModalOpen(false);
          } catch (err) {
            console.error('Failed to create pet:', err);
          }
        }}
        isLoading={createPetMutation.isPending}
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

// Filter Tag Component
const FilterTag = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]">
    {label}
    <button type="button" onClick={onRemove} className="hover:bg-[color:var(--bb-color-accent)]/20 rounded-full p-0.5">
      <X className="h-3 w-3" />
    </button>
  </span>
);

// Vaccination Badge Component
const VaccinationBadge = ({ status }) => {
  const configs = {
    current: { variant: 'success', icon: CheckCircle2, label: 'Current' },
    expiring: { variant: 'warning', icon: Clock, label: 'Expiring Soon' },
    missing: { variant: 'danger', icon: AlertCircle, label: 'Missing' },
  };

  const config = configs[status] || configs.current;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Pet Row Component
const PetRow = ({ pet, columns, isSelected, onSelect, onDoubleClick, onView, onEdit, onDelete, isEven }) => {
  const [showActions, setShowActions] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsRef = useRef(null);
  const cellPadding = 'px-4 lg:px-6 py-3';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const SpeciesIcon = pet.species?.toLowerCase() === 'cat' ? Cat : Dog;

  const renderCell = (column) => {
    switch (column.id) {
      case 'select':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')} onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={isSelected} onChange={onSelect} className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]" />
          </td>
        );
      case 'pet':
        return (
          <td key={column.id} className={cellPadding}>
            <div className="flex items-center gap-3">
              <PetAvatar pet={pet} size="md" showStatus={false} />
              <div className="min-w-0">
                <p className="font-semibold text-[color:var(--bb-color-text-primary)]">{pet.name}</p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                  {pet.species || 'Dog'} • {pet.breed || 'Unknown breed'}
                </p>
              </div>
            </div>
          </td>
        );
      case 'owner':
        return (
          <td key={column.id} className={cellPadding}>
            {pet.ownerId ? (
              <Link
                to={`/customers/${pet.ownerId}`}
                className="flex items-center gap-2 hover:text-[color:var(--bb-color-accent)] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--bb-color-bg-elevated)', color: 'var(--bb-color-text-muted)' }}>
                  <User className="h-4 w-4" />
                </div>
                <span className="text-[color:var(--bb-color-text-primary)]">{pet.ownerName}</span>
              </Link>
            ) : (
              <span className="text-[color:var(--bb-color-text-muted)]">{pet.ownerName || 'No owner'}</span>
            )}
          </td>
        );
      case 'status':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            <div className="flex items-center justify-center gap-1.5">
              <Badge variant={pet.status === 'active' ? 'success' : 'neutral'}>
                {pet.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
              {pet.inFacility && (
                <Badge variant="info">In Facility</Badge>
              )}
            </div>
          </td>
        );
      case 'vaccinations':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            <VaccinationBadge status={pet.vaccinationStatus} />
          </td>
        );
      case 'species':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            <div className="flex items-center justify-center gap-1.5">
              <SpeciesIcon className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              <span className="text-[color:var(--bb-color-text-primary)] capitalize">{pet.species || 'Dog'}</span>
            </div>
          </td>
        );
      case 'age':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            <span className="text-[color:var(--bb-color-text-primary)]">
              {pet.age ? `${pet.age} yr${pet.age !== 1 ? 's' : ''}` : '—'}
            </span>
          </td>
        );
      case 'actions':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-right')}>
            <div className={cn('flex items-center justify-end gap-1 transition-opacity', showActions ? 'opacity-100' : 'opacity-0')} ref={actionsRef}>
              <button type="button" onClick={(e) => { e.stopPropagation(); onView(); }} className="p-2 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] transition-colors" title="View profile">
                <Eye className="h-4 w-4" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] transition-colors" title="Edit">
                <Edit className="h-4 w-4" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowActionsMenu(!showActionsMenu); }}
                  className="p-2 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] transition-colors"
                  title="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {showActionsMenu && (
                  <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
                    <div className="py-1">
                      <button type="button" onClick={(e) => { e.stopPropagation(); onView(); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-primary)]">
                        <Eye className="h-4 w-4" />View Profile
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-primary)]">
                        <Edit className="h-4 w-4" />Edit
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] text-red-500">
                        <Trash2 className="h-4 w-4" />Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        );
      default:
        return <td key={column.id} className={cellPadding}>—</td>;
    }
  };

  return (
    <tr
      className={cn('cursor-pointer transition-colors', isSelected && 'bg-[color:var(--bb-color-accent-soft)]')}
      style={{ borderBottom: '1px solid var(--bb-color-border-subtle)', backgroundColor: !isSelected && isEven ? 'var(--bb-color-bg-surface)' : !isSelected ? 'var(--bb-color-bg-body)' : undefined }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowActionsMenu(false); }}
      onClick={onView}
      onDoubleClick={onDoubleClick}
    >
      {columns.map(renderCell)}
    </tr>
  );
};

// Mobile Pet Card Component
const MobilePetCard = ({ pet, isSelected, onSelect, onView }) => {
  const [expanded, setExpanded] = useState(false);
  const SpeciesIcon = pet.species?.toLowerCase() === 'cat' ? Cat : Dog;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all',
        isSelected && 'ring-2 ring-[var(--bb-color-accent)]'
      )}
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mt-1 h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]"
          onClick={(e) => e.stopPropagation()}
        />

        <div className="flex-1 min-w-0" onClick={onView}>
          <div className="flex items-center gap-3 mb-2">
            <PetAvatar pet={pet} size="md" showStatus={false} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[color:var(--bb-color-text-primary)] truncate">{pet.name}</p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                {pet.species || 'Dog'} • {pet.breed || 'Unknown breed'}
              </p>
            </div>
            <Badge variant={pet.status === 'active' ? 'success' : 'neutral'} size="sm">
              {pet.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="flex items-center gap-1 text-[color:var(--bb-color-text-muted)]">
              <User className="h-3.5 w-3.5" />
              <span>{pet.ownerName || 'No owner'}</span>
            </div>
            <VaccinationBadge status={pet.vaccinationStatus} />
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[color:var(--bb-color-text-muted)]">Age</span>
                <span className="text-[color:var(--bb-color-text-primary)]">{pet.age ? `${pet.age} years` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[color:var(--bb-color-text-muted)]">Weight</span>
                <span className="text-[color:var(--bb-color-text-primary)]">{pet.weight ? `${pet.weight} lbs` : '—'}</span>
              </div>
              {pet.inFacility && (
                <Badge variant="info" className="w-full justify-center mt-2">Currently In Facility</Badge>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]"
        >
          <ChevronDown className={cn('h-5 w-5 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>
    </div>
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
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Species</label>
        <select value={filters.species || ''} onChange={(e) => onFiltersChange({ ...filters, species: e.target.value || undefined })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}>
          <option value="">Any</option>
          <option value="dog">Dogs</option>
          <option value="cat">Cats</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Vaccination Status</label>
        <select value={filters.vaccinationStatus || ''} onChange={(e) => onFiltersChange({ ...filters, vaccinationStatus: e.target.value || undefined })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}>
          <option value="">Any</option>
          <option value="current">Current</option>
          <option value="expiring">Expiring Soon</option>
        </select>
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
const ColumnsDropdown = ({ columns, visibleColumns, columnOrder, onToggle, onReorder }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorder(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => setDraggedIndex(null);

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
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn('flex items-center gap-2 px-2 py-1.5 text-sm cursor-move hover:bg-[color:var(--bb-color-bg-elevated)] rounded', draggedIndex === index && 'opacity-50')}
          >
            <GripVertical className="h-4 w-4 text-[color:var(--bb-color-text-muted)] opacity-50" />
            <input type="checkbox" checked={visibleColumns.includes(column.id)} onChange={() => onToggle(column.id)} className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]" />
            <span className="text-[color:var(--bb-color-text-primary)]">{column.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Empty State Component - Full Width
const EmptyState = ({ hasFilters, onClearFilters, onAddPet }) => (
  <div className="flex-1 flex flex-col items-center justify-center py-24" style={{ backgroundColor: 'var(--bb-color-bg-body)' }}>
    <div className="flex h-20 w-20 items-center justify-center rounded-full mb-6" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <PawPrint className="h-10 w-10 text-[color:var(--bb-color-text-muted)]" />
    </div>
    <h3 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)] mb-2">{hasFilters ? 'No pets match your filters' : 'No pets yet'}</h3>
    <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-8 max-w-md text-center">{hasFilters ? 'Try adjusting your search or filters to find what you\'re looking for' : 'Get started by adding your first pet to the system'}</p>
    <div className="flex gap-3">
      {hasFilters && <Button variant="outline" size="lg" onClick={onClearFilters}>Clear filters</Button>}
      <Button size="lg" onClick={onAddPet}><Plus className="h-4 w-4 mr-2" />Add Pet</Button>
    </div>
  </div>
);

export default Pets;
