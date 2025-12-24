/**
 * Pets Directory - Demo Version
 * Simplified pets list with mock data.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PawPrint, Plus, ChevronDown, ChevronLeft, ChevronRight,
  Download, Eye, Edit, Trash2, X, SlidersHorizontal,
  ArrowUpDown, ArrowUp, ArrowDown, Syringe, Dog, Cat,
  AlertCircle, CheckCircle2, Clock, User, Loader2, ShieldCheck, ShieldOff,
  Check, MoreHorizontal, FileQuestion,
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import toast from 'react-hot-toast';
import EntityToolbar from '@/components/EntityToolbar';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import PetAvatar from '@/components/ui/PetAvatar';
import { ScrollableTableContainer } from '@/components/ui/ScrollableTableContainer';
import StyledSelect from '@/components/ui/StyledSelect';
import LoadingState from '@/components/ui/LoadingState';
import { usePetsQuery, useCreatePetMutation, useDeletePetMutation, useUpdatePetStatusMutation, usePetVaccinationsQuery } from '../api';
import PetFormModal from '../components/PetFormModal';
import { cn } from '@/lib/cn';
import { formatAgeFromBirthdate, getBirthdateFromPet } from '../utils/pet-date-utils';
import { format } from 'date-fns';
import vaccinationsData from '@/data/vaccinations.json';

// Saved views
const DEFAULT_VIEWS = [
  { id: 'all', name: 'All Pets', filters: {}, isDefault: true },
  { id: 'active', name: 'Active Pets', filters: { status: 'active' } },
  { id: 'inactive', name: 'Inactive Pets', filters: { status: 'inactive' } },
  { id: 'dogs', name: 'Dogs Only', filters: { species: 'dog' } },
  { id: 'cats', name: 'Cats Only', filters: { species: 'cat' } },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const Pets = () => {
  const navigate = useNavigate();
  const [petFormModalOpen, setPetFormModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState(null);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [petToDelete, setPetToDelete] = useState(null);

  // Search, filter, and view state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('all');
  const [customFilters, setCustomFilters] = useState({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);

  // Table state
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Refs for click outside
  const filterRef = useRef(null);
  const viewsRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterPanel(false);
      if (viewsRef.current && !viewsRef.current.contains(e.target)) setShowViewsDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Data fetching
  const { data: petsResult, isLoading, error } = usePetsQuery();
  const pets = petsResult?.data ?? [];
  const createPetMutation = useCreatePetMutation();
  const deletePetMutation = useDeletePetMutation();
  const updateStatusMutation = useUpdatePetStatusMutation();

  // Calculate vaccination status per pet
  const petVaccinationStatus = useMemo(() => {
    const statusMap = new Map();
    const now = new Date();

    vaccinationsData.forEach((v) => {
      const petId = v.petId;
      if (!petId) return;

      const expirationDate = new Date(v.expirationDate);
      const daysRemaining = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));

      let vaccStatus = 'current';
      if (daysRemaining < 0) vaccStatus = 'expired';
      else if (daysRemaining <= 7) vaccStatus = 'critical';
      else if (daysRemaining <= 30) vaccStatus = 'expiring';

      // Keep worst status per pet
      const currentStatus = statusMap.get(petId) || 'current';
      const priority = { expired: 0, critical: 1, expiring: 2, current: 3 };
      if (priority[vaccStatus] < priority[currentStatus]) {
        statusMap.set(petId, vaccStatus);
      }
    });

    return statusMap;
  }, []);

  // Calculate enhanced pet data with metrics
  const petsWithMetrics = useMemo(() => {
    return pets.map((pet) => {
      const status = pet.status || 'active';
      const vaccinationStatus = petVaccinationStatus.get(pet.id) || 'none';
      const hasExpiringVaccinations = !['current', 'none'].includes(vaccinationStatus);
      const birthdate = getBirthdateFromPet(pet);

      return {
        ...pet,
        status,
        vaccinationStatus,
        hasExpiringVaccinations,
        birthdate,
      };
    });
  }, [pets, petVaccinationStatus]);

  // Get active view filters
  const activeViewFilters = useMemo(() => {
    const view = DEFAULT_VIEWS.find((v) => v.id === activeView);
    return view?.filters || {};
  }, [activeView]);

  // Filter pets
  const filteredPets = useMemo(() => {
    const filters = { ...activeViewFilters, ...customFilters };

    return petsWithMetrics.filter((pet) => {
      const matchesSearch =
        !searchTerm ||
        pet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.species?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = !filters.status || pet.status === filters.status;
      const matchesSpecies = !filters.species || pet.species?.toLowerCase() === filters.species.toLowerCase();

      return matchesSearch && matchesStatus && matchesSpecies;
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
  const stats = useMemo(
    () => ({
      total: pets.length,
      active: petsWithMetrics.filter((p) => p.status === 'active').length,
      dogs: petsWithMetrics.filter((p) => p.species?.toLowerCase() === 'dog').length,
      cats: petsWithMetrics.filter((p) => p.species?.toLowerCase() === 'cat').length,
    }),
    [pets, petsWithMetrics]
  );

  // Handlers
  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === paginatedPets.length && paginatedPets.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedPets.map((p) => p.id)));
    }
  }, [paginatedPets, selectedRows.size]);

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

  const hasActiveFilters = searchTerm || Object.keys(customFilters).length > 0 || activeView !== 'all';

  // Status change handler
  const handleStatusChange = async (petId, newStatus) => {
    await updateStatusMutation.mutateAsync({ petId, status: newStatus });
  };

  // Export pets to CSV
  const handleExportCSV = useCallback(() => {
    if (sortedPets.length === 0) {
      toast.error('No pets to export');
      return;
    }

    const headers = ['Name', 'Species', 'Breed', 'Age', 'Status', 'Owner'];
    const rows = sortedPets.map((pet) => {
      const ageDisplay = formatAgeFromBirthdate(pet.birthdate) || '—';
      return [pet.name || '', pet.species || 'Dog', pet.breed || '', ageDisplay, pet.status || 'active', pet.ownerName || 'No owner'];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pets_export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${sortedPets.length} pet${sortedPets.length !== 1 ? 's' : ''}`);
  }, [sortedPets]);

  // Delete handler
  const handleDelete = async () => {
    if (!petToDelete) return;
    try {
      await deletePetMutation.mutateAsync({ petId: petToDelete.id });
      setDeleteModalOpen(false);
      setPetToDelete(null);
    } catch (err) {
      console.error('Failed to delete pet:', err);
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Unable to load pets data. Please try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col flex-grow w-full min-h-[calc(100vh-180px)] items-center justify-center">
        <LoadingState label="Loading pets…" variant="mascot" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col w-full h-[calc(100vh-120px)] overflow-hidden">
        {/* Header Section */}
        <div
          className="flex-shrink-0 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <div>
            <Breadcrumbs items={['Clients', 'Pets']} />
            <h1 className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">Pets Directory</h1>
            <p className="mt-0.5 text-sm text-[color:var(--bb-color-text-muted)]">
              Manage all registered pets and their records
            </p>
          </div>

          {/* Stats Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <StatBadge icon={PawPrint} value={stats.total} label="Total" />
            <StatBadge icon={CheckCircle2} value={stats.active} label="Active" variant="success" />
            <StatBadge icon={Dog} value={stats.dogs} label="Dogs" variant="default" />
            <StatBadge icon={Cat} value={stats.cats} label="Cats" variant="default" />
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
                  </Button>
                  {showFilterPanel && (
                    <FilterPanel filters={customFilters} onFiltersChange={setCustomFilters} onClose={() => setShowFilterPanel(false)} />
                  )}
                </div>

                {/* Saved Views */}
                <div className="relative" ref={viewsRef}>
                  <Button variant="outline" size="sm" onClick={() => setShowViewsDropdown(!showViewsDropdown)} className="gap-1.5 h-9">
                    <span className="max-w-[100px] truncate">{DEFAULT_VIEWS.find((v) => v.id === activeView)?.name || 'Views'}</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', showViewsDropdown && 'rotate-180')} />
                  </Button>
                  {showViewsDropdown && (
                    <ViewsDropdown
                      views={DEFAULT_VIEWS}
                      activeView={activeView}
                      onSelectView={(id) => {
                        setActiveView(id);
                        setShowViewsDropdown(false);
                      }}
                    />
                  )}
                </div>

                {/* Species Quick Filter */}
                <div className="min-w-[130px]">
                  <StyledSelect
                    options={[
                      { value: '', label: 'All Species' },
                      { value: 'dog', label: 'Dogs' },
                      { value: 'cat', label: 'Cats' },
                      { value: 'other', label: 'Other' },
                    ]}
                    value={customFilters.species || ''}
                    onChange={(opt) => setCustomFilters({ ...customFilters, species: opt?.value || undefined })}
                    isClearable={false}
                    isSearchable
                  />
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button variant="link" size="sm" onClick={clearFilters} leftIcon={<X className="h-3.5 w-3.5" />}>
                    Clear all
                  </Button>
                )}

                {/* Results Count */}
                <span className="text-sm text-[color:var(--bb-color-text-muted)] ml-2">
                  {sortedPets.length} pet{sortedPets.length !== 1 ? 's' : ''}
                  {hasActiveFilters && ' filtered'}
                </span>
              </>
            }
            rightContent={
              <>
                <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleExportCSV}>
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
              {activeView !== 'all' && <FilterTag label={DEFAULT_VIEWS.find((v) => v.id === activeView)?.name || 'View'} onRemove={() => setActiveView('all')} />}
              {customFilters.status && <FilterTag label={`Status: ${customFilters.status}`} onRemove={() => setCustomFilters({ ...customFilters, status: undefined })} />}
              {customFilters.species && <FilterTag label={`Species: ${customFilters.species}`} onRemove={() => setCustomFilters({ ...customFilters, species: undefined })} />}
              {searchTerm && <FilterTag label={`Search: "${searchTerm}"`} onRemove={() => setSearchTerm('')} />}
            </div>
          )}
        </div>

        {/* Table Section */}
        <div className="flex-1 flex flex-col mt-4 min-h-0">
          {sortedPets.length === 0 ? (
            <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} onAddPet={() => setPetFormModalOpen(true)} />
          ) : (
            <>
              {/* Desktop Table */}
              <ScrollableTableContainer className="hidden md:block border rounded-t-lg" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr style={{ backgroundColor: 'var(--bb-color-bg-elevated)', boxShadow: '0 1px 0 var(--bb-color-border-subtle)' }}>
                      <th className="px-4 py-3 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRows.size === paginatedPets.length && paginatedPets.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]"
                        />
                      </th>
                      <SortableHeader label="Pet" sortKey="name" sortConfig={sortConfig} onSort={handleSort} minWidth={260} />
                      <SortableHeader label="Owner" sortKey="ownerName" sortConfig={sortConfig} onSort={handleSort} minWidth={180} />
                      <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={handleSort} minWidth={100} align="center" />
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-[color:var(--bb-color-text-muted)]">Vaccinations</th>
                      <SortableHeader label="Species" sortKey="species" sortConfig={sortConfig} onSort={handleSort} minWidth={100} align="center" />
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-[color:var(--bb-color-text-muted)]">Age</th>
                      <th className="px-4 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPets.map((pet, index) => (
                      <PetRow
                        key={pet.id}
                        pet={pet}
                        isSelected={selectedRows.has(pet.id)}
                        onSelect={() => handleSelectRow(pet.id)}
                        onView={() => navigate(`/pets/${pet.id}`)}
                        onEdit={() => {
                          setEditingPet(pet);
                          setPetFormModalOpen(true);
                        }}
                        onDelete={() => {
                          setPetToDelete(pet);
                          setDeleteModalOpen(true);
                        }}
                        onStatusChange={handleStatusChange}
                        isEven={index % 2 === 0}
                      />
                    ))}
                  </tbody>
                </table>
              </ScrollableTableContainer>

              {/* Mobile Cards */}
              <div className="md:hidden px-4 space-y-3">
                {paginatedPets.map((pet) => (
                  <MobilePetCard key={pet.id} pet={pet} isSelected={selectedRows.has(pet.id)} onSelect={() => handleSelectRow(pet.id)} onView={() => navigate(`/pets/${pet.id}`)} />
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {sortedPets.length > 0 && (
            <div
              className="flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 px-4 border-t"
              style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-surface)' }}
            >
              <div className="flex items-center gap-2 text-sm text-[color:var(--bb-color-text-muted)]">
                <span>Rows per page:</span>
                <div className="min-w-[80px]">
                  <StyledSelect
                    options={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: String(size) }))}
                    value={pageSize}
                    onChange={(opt) => setPageSize(Number(opt?.value) || 25)}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-[color:var(--bb-color-text-muted)]">
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedPets.length)} of {sortedPets.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 h-8">
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronLeft className="h-4 w-4 -ml-2" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 h-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-medium text-[color:var(--bb-color-text-primary)]">{currentPage}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 h-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 h-8">
                    <ChevronRight className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4 -ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pet Form Modal */}
      <PetFormModal
        open={petFormModalOpen}
        onClose={() => {
          setPetFormModalOpen(false);
          setEditingPet(null);
        }}
        pet={editingPet}
        onSubmit={async (data) => {
          try {
            if (editingPet) {
              // Edit mode - show success toast
              toast.success('Pet updated successfully');
            } else {
              await createPetMutation.mutateAsync(data);
            }
            setPetFormModalOpen(false);
            setEditingPet(null);
          } catch (err) {
            console.error('Failed to save pet:', err);
          }
        }}
        isLoading={createPetMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPetToDelete(null);
        }}
        title="Delete Pet"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setPetToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-[color:var(--bb-color-text-primary)]">
          Are you sure you want to delete <strong>{petToDelete?.name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
};

// Stat Badge Component
const StatBadge = ({ icon: Icon, value, label, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    success: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', variants[variant])}>
      <Icon className="h-3 w-3" />
      <span className="font-semibold">{value}</span>
      <span>{label}</span>
    </div>
  );
};

// Sortable Header Component
const SortableHeader = ({ label, sortKey, sortConfig, onSort, minWidth = 100, align = 'left' }) => {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  const isActive = sortConfig.key === sortKey;

  return (
    <th
      className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] cursor-pointer hover:text-[color:var(--bb-color-text-primary)] transition-colors', alignClass)}
      style={{ minWidth }}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        {isActive ? sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </th>
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

// Vaccination Badge Component
const VaccinationBadge = ({ status }) => {
  const configs = {
    current: { variant: 'success', icon: CheckCircle2, label: 'Current' },
    expiring: { variant: 'warning', icon: Clock, label: 'Expiring Soon' },
    critical: { variant: 'danger', icon: AlertCircle, label: 'Critical' },
    expired: { variant: 'danger', icon: AlertCircle, label: 'Expired' },
    none: { variant: 'neutral', icon: FileQuestion, label: 'Not on file' },
  };

  const config = configs[status] || configs.none;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Status Badge Dropdown Component
const StatusBadgeDropdown = ({ pet, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusChange = async (newStatus) => {
    setIsLoading(true);
    try {
      await onStatusChange(pet.id, newStatus);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const isActive = pet.status === 'active';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-0 h-auto" disabled={isLoading}>
        <Badge variant={isActive ? 'success' : 'neutral'} className="cursor-pointer">
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : isActive ? <ShieldCheck className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
          {isActive ? 'Active' : 'Inactive'}
          <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
        </Badge>
      </Button>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-36 rounded-lg border shadow-lg py-1" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
          <Button variant="ghost" size="sm" onClick={() => handleStatusChange('active')} className={cn('w-full justify-start gap-2', isActive && 'bg-emerald-50 dark:bg-emerald-900/20')}>
            <ShieldCheck className="h-4 w-4" />
            Active
            {isActive && <Check className="h-4 w-4 ml-auto" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleStatusChange('inactive')} className={cn('w-full justify-start gap-2', !isActive && 'bg-gray-100 dark:bg-gray-800')}>
            <ShieldOff className="h-4 w-4" />
            Inactive
            {!isActive && <Check className="h-4 w-4 ml-auto" />}
          </Button>
        </div>
      )}
    </div>
  );
};

// Pet Row Component
const PetRow = ({ pet, isSelected, onSelect, onView, onEdit, onDelete, onStatusChange, isEven }) => {
  const [showActions, setShowActions] = useState(false);
  const SpeciesIcon = pet.species?.toLowerCase() === 'cat' ? Cat : Dog;
  const ageDisplay = formatAgeFromBirthdate(pet.birthdate);

  return (
    <tr
      className={cn('transition-colors', isSelected && 'bg-[color:var(--bb-color-accent-soft)]')}
      style={{ borderBottom: '1px solid var(--bb-color-border-subtle)', backgroundColor: !isSelected && isEven ? 'var(--bb-color-bg-surface)' : !isSelected ? 'var(--bb-color-bg-body)' : undefined }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={isSelected} onChange={onSelect} className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]" />
      </td>

      <td className="px-4 py-3">
        <Button variant="ghost" size="sm" className="group h-auto p-0 rounded-xl px-3 py-2 -mx-3 -my-2" onClick={onView}>
          <div className="flex items-center gap-3 text-left">
            <div className="transition-transform duration-150 group-hover:scale-105">
              <PetAvatar pet={pet} size="md" showStatus={false} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[color:var(--bb-color-text-primary)] group-hover:text-[var(--bb-color-accent)]">{pet.name}</p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                {pet.species || 'Dog'} • {pet.breed || 'Unknown breed'}
              </p>
            </div>
          </div>
        </Button>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
            <User className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          </div>
          <span className="text-[color:var(--bb-color-text-primary)]">{pet.ownerName || 'No owner'}</span>
        </div>
      </td>

      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
        <StatusBadgeDropdown pet={pet} onStatusChange={onStatusChange} />
      </td>

      <td className="px-4 py-3 text-center">
        <VaccinationBadge status={pet.vaccinationStatus} />
      </td>

      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center gap-1.5">
          <SpeciesIcon className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          <span className="text-[color:var(--bb-color-text-primary)] capitalize">{pet.species || 'Dog'}</span>
        </span>
      </td>

      <td className="px-4 py-3 text-center">
        {ageDisplay ? <span className="text-[color:var(--bb-color-text-primary)]">{ageDisplay}</span> : <span className="text-[color:var(--bb-color-text-muted)]">—</span>}
      </td>

      <td className="px-4 py-3 text-right">
        <span className={cn('inline-flex items-center gap-1 transition-opacity', showActions ? 'opacity-100' : 'opacity-0')}>
          <Button variant="ghost" size="icon-sm" onClick={onView} title="View profile">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onEdit} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} title="Delete" className="text-red-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </span>
      </td>
    </tr>
  );
};

// Mobile Pet Card Component
const MobilePetCard = ({ pet, isSelected, onSelect, onView }) => {
  const [expanded, setExpanded] = useState(false);
  const SpeciesIcon = pet.species?.toLowerCase() === 'cat' ? Cat : Dog;

  return (
    <div
      className={cn('rounded-xl border p-4 transition-all', isSelected && 'ring-2 ring-[var(--bb-color-accent)]')}
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={isSelected} onChange={onSelect} className="mt-1 h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]" onClick={(e) => e.stopPropagation()} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" className="group h-auto p-0 rounded-lg px-2 py-1 -mx-2 -my-1" onClick={onView}>
              <div className="flex items-center gap-3 text-left">
                <div className="transition-transform duration-150 group-hover:scale-105">
                  <PetAvatar pet={pet} size="md" showStatus={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[color:var(--bb-color-text-primary)] truncate group-hover:text-[var(--bb-color-accent)]">{pet.name}</p>
                  <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                    {pet.species || 'Dog'} • {pet.breed || 'Unknown breed'}
                  </p>
                </div>
              </div>
            </Button>
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
                <span className="text-[color:var(--bb-color-text-primary)]">{formatAgeFromBirthdate(pet.birthdate) || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[color:var(--bb-color-text-muted)]">Weight</span>
                <span className="text-[color:var(--bb-color-text-primary)]">{pet.weight ? `${pet.weight} lbs` : '—'}</span>
              </div>
            </div>
          )}
        </div>

        <Button variant="ghost" size="icon-sm" onClick={() => setExpanded(!expanded)} className="text-[color:var(--bb-color-text-muted)]">
          <ChevronDown className={cn('h-5 w-5 transition-transform', expanded && 'rotate-180')} />
        </Button>
      </div>
    </div>
  );
};

// Filter Panel Component
const FilterPanel = ({ filters, onFiltersChange, onClose }) => (
  <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border p-4 shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Filters</h3>
      <Button variant="ghost" size="icon-sm" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
    <div className="space-y-4">
      <StyledSelect
        label="Status"
        options={[
          { value: '', label: 'Any' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ]}
        value={filters.status || ''}
        onChange={(opt) => onFiltersChange({ ...filters, status: opt?.value || undefined })}
        isClearable={false}
        isSearchable
      />
      <StyledSelect
        label="Species"
        options={[
          { value: '', label: 'Any' },
          { value: 'dog', label: 'Dogs' },
          { value: 'cat', label: 'Cats' },
          { value: 'other', label: 'Other' },
        ]}
        value={filters.species || ''}
        onChange={(opt) => onFiltersChange({ ...filters, species: opt?.value || undefined })}
        isClearable={false}
        isSearchable
      />
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
  <div className="absolute left-0 top-full mt-2 w-52 rounded-xl border shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
    <div className="py-1">
      {views.map((view) => (
        <Button
          key={view.id}
          variant="ghost"
          size="sm"
          onClick={() => onSelectView(view.id)}
          className={cn('w-full justify-start gap-2', activeView === view.id && 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]')}
        >
          {activeView === view.id && <Check className="h-4 w-4" />}
          <span className={activeView !== view.id ? 'ml-6' : ''}>{view.name}</span>
        </Button>
      ))}
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({ hasFilters, onClearFilters, onAddPet }) => (
  <div className="flex-1 flex flex-col items-center justify-center py-24" style={{ backgroundColor: 'var(--bb-color-bg-body)' }}>
    <div className="flex h-20 w-20 items-center justify-center rounded-full mb-6" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <PawPrint className="h-10 w-10 text-[color:var(--bb-color-text-muted)]" />
    </div>
    <h3 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)] mb-2">{hasFilters ? 'No pets match your filters' : 'No pets yet'}</h3>
    <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-8 max-w-md text-center">
      {hasFilters ? "Try adjusting your search or filters to find what you're looking for" : 'Get started by adding your first pet to the system'}
    </p>
    <div className="flex gap-3">
      {hasFilters && (
        <Button variant="outline" size="lg" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
      <Button size="lg" onClick={onAddPet}>
        <Plus className="h-4 w-4 mr-2" />
        Add Pet
      </Button>
    </div>
  </div>
);

export default Pets;
