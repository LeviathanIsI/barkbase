import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import {
  PawPrint, Plus, ChevronDown, ChevronLeft, ChevronRight,
  Download, Columns, MoreHorizontal, Eye, Edit, Trash2, Check, X,
  SlidersHorizontal, BookmarkPlus, ArrowUpDown, ArrowUp, ArrowDown,
  GripVertical, Syringe, ShieldAlert, Calendar, Star, Dog, Cat,
  AlertCircle, CheckCircle2, Clock, User, Loader2, ShieldCheck, ShieldOff,
  Crown, Ban, ExternalLink, Mail, Phone, AlertTriangle, FileText, FileQuestion,
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
// Replaced with LoadingState (mascot) for page-level loading
import LoadingState from '@/components/ui/LoadingState';
import { UpdateChip } from '@/components/PageLoader';
import InlineEditableCell from '@/components/table/InlineEditableCell';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePetsQuery, useCreatePetMutation, useDeletePetMutation, useUpdatePetStatusMutation, usePetVaccinationsQuery } from '../api';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useExpiringVaccinationsQuery } from '../api-vaccinations';
import { useOwnersQuery, useOwnerQuery } from '@/features/owners/api';
import { PetFormModal } from '../components';
import SlideOutDrawer from '@/components/ui/SlideOutDrawer';
import { cn } from '@/lib/cn';
import { getBirthdateFromAge, getAgeFromBirthdate, formatAgeFromBirthdate, getBirthdateFromPet, getFormattedAgeFromPet } from '../utils/pet-date-utils';
import { formatDistanceToNow, format } from 'date-fns';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout';

// Saved views - persisted in localStorage
const DEFAULT_VIEWS = [
  { id: 'all', name: 'All Pets', filters: {}, isDefault: true },
  { id: 'active', name: 'Active Pets', filters: { status: 'active' } },
  { id: 'inactive', name: 'Inactive Pets', filters: { status: 'inactive' } },
  { id: 'expiring-vaccines', name: 'Expiring Vaccines', filters: { vaccinationStatus: 'expiring' } },
  { id: 'dogs', name: 'Dogs Only', filters: { species: 'dog' } },
  { id: 'cats', name: 'Cats Only', filters: { species: 'cat' } },
];

// Status options for inline editing
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Species options for inline editing
const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'other', label: 'Other' },
];

// Column definitions with editable metadata
// Note: Only fields supported by PUT /api/v1/pets/:id can be inline-edited:
// name, species, breed, birthdate, photoUrl, medicalNotes, dietaryNotes, 
// behaviorFlags, status, weight, allergies, lastVetVisit, nextAppointment, documents
const ALL_COLUMNS = [
  { id: 'select', label: '', minWidth: 48, maxWidth: 48, align: 'center', sortable: false, hideable: false, editable: false },
  { id: 'pet', label: 'Pet', minWidth: 260, flex: 2, align: 'left', sortable: true, sortKey: 'name', primary: true, editable: false },
  { 
    id: 'owner', 
    label: 'Owner', 
    minWidth: 200, 
    flex: 1.5, 
    align: 'left', 
    sortable: true, 
    sortKey: 'ownerName',
    // Owner assignment requires POST /api/v1/pets/owners - disabled for now
    editable: false,
    editorType: 'relationship',
    editorOptions: { lookupType: 'owner', placeholder: 'No owner' },
    accessor: (row) => row.ownerId,
  },
  { 
    id: 'status', 
    label: 'Status', 
    minWidth: 100, 
    maxWidth: 120, 
    align: 'center', 
    sortable: true, 
    sortKey: 'status',
    editable: true,
    editorType: 'status',
    editorOptions: { options: STATUS_OPTIONS },
    accessor: (row) => row.status || 'active',
  },
  { id: 'vaccinations', label: 'Vaccinations', minWidth: 140, maxWidth: 160, align: 'center', sortable: true, sortKey: 'vaccinationStatus', editable: false },
  { 
    id: 'species', 
    label: 'Species', 
    minWidth: 100, 
    maxWidth: 120, 
    align: 'center', 
    sortable: true, 
    sortKey: 'species',
    editable: true,
    editorType: 'enum',
    editorOptions: { options: SPECIES_OPTIONS },
    accessor: (row) => row.species?.toLowerCase() || 'dog',
  },
  { 
    id: 'age', 
    label: 'Age', 
    minWidth: 80, 
    maxWidth: 100, 
    align: 'center', 
    sortable: true, 
    sortKey: 'age',
    editable: true,
    editorType: 'number',
    // Age is derived from birthdate - compute it on access
    accessor: (row) => getAgeFromBirthdate(row.birthdate),
  },
  { id: 'actions', label: '', minWidth: 100, maxWidth: 100, align: 'right', sortable: false, hideable: false, editable: false },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const Pets = () => {
  const navigate = useNavigate();
  const [petFormModalOpen, setPetFormModalOpen] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
  const queryClient = useQueryClient();
  const { data: petsResult, isLoading, isFetching, error } = usePetsQuery();
  const pets = petsResult?.pets ?? [];
  const createPetMutation = useCreatePetMutation();
  const deletePetMutation = useDeletePetMutation();
  const updateStatusMutation = useUpdatePetStatusMutation();

  // Status change handler for clickable status badge
  const handleStatusChange = useCallback(async (petId, newStatus) => {
    await updateStatusMutation.mutateAsync({ petId, status: newStatus });
  }, [updateStatusMutation]);

  // Owners for relationship lookup
  const { data: ownersResult, isLoading: ownersLoading } = useOwnersQuery();
  const owners = ownersResult?.items ?? ownersResult ?? [];
  
  /**
   * Transform frontend field/value to backend API field/value.
   * Handles the age -> birthdate conversion since age is derived from birthdate.
   */
  const transformFieldForApi = (field, value) => {
    // Age is derived from birthdate - convert age (years) to birthdate
    if (field === 'age') {
      // Handle null/empty value - clear the birthdate
      if (value === null || value === undefined || value === '') {
        return { 
          apiField: 'birthdate', 
          apiValue: null, 
          cacheUpdates: { age: null, birthdate: null } 
        };
      }

      // Validate and convert age to birthdate using shared utility
      const numericAge = Number(value);
      if (Number.isNaN(numericAge) || numericAge < 0) {
        throw new Error('Invalid age value');
      }

      const birthdateIso = getBirthdateFromAge(numericAge);
      return { 
        apiField: 'birthdate', 
        apiValue: birthdateIso,
        // Also store the age for optimistic cache update
        cacheUpdates: { age: numericAge, birthdate: birthdateIso }
      };
    }
    // Default: field name matches API
    return { apiField: field, apiValue: value, cacheUpdates: { [field]: value } };
  };

  // Inline update mutation for editable cells
  const inlineUpdateMutation = useMutation({
    mutationFn: async ({ petId, field, value }) => {
      const { apiField, apiValue } = transformFieldForApi(field, value);
      const response = await apiClient.put(canonicalEndpoints.pets.detail(petId), { [apiField]: apiValue });
      return response.data;
    },
    onMutate: async ({ petId, field, value }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['pets'] });
      
      // Snapshot previous value
      const previousPets = queryClient.getQueryData(['pets']);
      
      // Get the cache updates for this field
      const { cacheUpdates } = transformFieldForApi(field, value);
      
      // Optimistically update the cache with all related fields
      queryClient.setQueryData(['pets'], (old) => {
        if (!old?.pets) return old;
        return {
          ...old,
          pets: old.pets.map((pet) =>
            pet.recordId === petId ? { ...pet, ...cacheUpdates } : pet
          ),
        };
      });
      
      return { previousPets };
    },
    onError: (err, variables, context) => {
      // Roll back on error
      if (context?.previousPets) {
        queryClient.setQueryData(['pets'], context.previousPets);
      }
      // Show error notification to user
      toast.error(err?.message || `Failed to update ${variables.field}`);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
  });
  
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

  // Get expiring vaccinations data - use 365 days to catch all statuses like Vaccinations page
  const { data: expiringVaccsData } = useExpiringVaccinationsQuery(365);

  // Calculate vaccination status per pet (matching Vaccinations page logic)
  const petVaccinationStatus = useMemo(() => {
    const statusMap = new Map();
    const vaccinations = expiringVaccsData || [];

    vaccinations.forEach(v => {
      const petId = v.petId;
      if (!petId) return;

      const now = new Date();
      const expiresAt = v.expiresAt ? new Date(v.expiresAt) : null;
      const daysRemaining = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;

      let vaccStatus = 'current';
      if (daysRemaining !== null) {
        if (daysRemaining < 0) vaccStatus = 'expired';
        else if (daysRemaining <= 7) vaccStatus = 'critical';
        else if (daysRemaining <= 30) vaccStatus = 'expiring';
      }

      // Keep worst status per pet: expired > critical > expiring > current
      const currentStatus = statusMap.get(petId) || 'current';
      const priority = { expired: 0, critical: 1, expiring: 2, current: 3 };
      if (priority[vaccStatus] < priority[currentStatus]) {
        statusMap.set(petId, vaccStatus);
      }
    });

    return statusMap;
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
      // API returns flat owner fields: owner_id, owner_first_name, owner_last_name, owner_email
      // Also check legacy nested owners array for backwards compatibility
      const primaryOwner = pet.owners?.[0];
      let ownerName = 'No owner';
      let ownerId = null;

      if (pet.ownerFirstName || pet.ownerLastName) {
        // New flat field format from API (camelCase after apiClient transform)
        ownerName = `${pet.ownerFirstName || ''} ${pet.ownerLastName || ''}`.trim() || pet.ownerEmail || 'No owner';
        ownerId = pet.ownerId;
      } else if (primaryOwner) {
        // Legacy nested format
        ownerName = primaryOwner?.name || primaryOwner?.email || 'No owner';
        ownerId = primaryOwner?.id || primaryOwner?.recordId;
      }

      const status = pet.status || 'active';
      const inFacility = pet.bookings?.some(b =>
        new Date(b.checkIn) <= new Date() && new Date(b.checkOut) >= new Date()
      );

      // Vaccination status from calculated map (matches Vaccinations page logic)
      // Status priority: expired > critical > expiring > current > none (no records)
      const vaccinationStatus = petVaccinationStatus.get(pet.recordId) || petVaccinationStatus.get(pet.id) || 'none';
      const hasExpiringVaccinations = !['current', 'none'].includes(vaccinationStatus);

      // Derive age from birthdate - check multiple property names
      const birthdate = getBirthdateFromPet(pet);
      const age = getAgeFromBirthdate(birthdate);

      return {
        ...pet,
        ownerName,
        ownerId,
        status,
        vaccinationStatus,
        inFacility,
        hasExpiringVaccinations,
        age,
        birthdate, // Normalized birthdate for display
      };
    });
  }, [pets, petVaccinationStatus]);

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
    if (selectedRows.size === paginatedPets.length && paginatedPets.length > 0) {
      setSelectedRows(new Set());
    } else {
      // Use id || recordId to match how individual rows are selected
      setSelectedRows(new Set(paginatedPets.map(p => p.id || p.recordId)));
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

  // Inline field update handler
  const handleInlineUpdateField = useCallback(async (petId, fieldName, value) => {
    return inlineUpdateMutation.mutateAsync({ petId, field: fieldName, value });
  }, [inlineUpdateMutation]);

  const hasActiveFilters = searchTerm || Object.keys(customFilters).length > 0 || activeView !== 'all';

  // Get selected pet data for bulk actions
  const selectedPetData = useMemo(() => {
    return petsWithMetrics.filter(p => selectedRows.has(p.id || p.recordId));
  }, [petsWithMetrics, selectedRows]);

  // Export pets to CSV
  const handleExportCSV = useCallback((petsToExport) => {
    if (!petsToExport || petsToExport.length === 0) {
      toast.error('No pets to export');
      return;
    }

    // CSV headers
    const headers = ['Name', 'Species', 'Breed', 'Age', 'Status', 'Owner', 'Vaccination Status', 'Weight'];

    // Convert pet data to CSV rows
    const rows = petsToExport.map(pet => {
      const ageDisplay = formatAgeFromBirthdate(pet.birthdate) || '—';
      return [
        pet.name || '',
        pet.species || 'Dog',
        pet.breed || '',
        ageDisplay,
        pet.status || 'active',
        pet.ownerName || 'No owner',
        pet.vaccinationStatus || 'current',
        pet.weight ? `${pet.weight} lbs` : '',
      ];
    });

    // Build CSV content
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

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pets_export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${petsToExport.length} pet${petsToExport.length !== 1 ? 's' : ''}`);
  }, []);

  // Export all/filtered pets (header button)
  const handleExportAll = useCallback(() => {
    handleExportCSV(sortedPets);
  }, [sortedPets, handleExportCSV]);

  // Export selected pets (bulk action)
  const handleExportSelected = useCallback(() => {
    handleExportCSV(selectedPetData);
  }, [selectedPetData, handleExportCSV]);

  // Generate vaccination report for selected pets
  const handleVaccinationReport = useCallback(() => {
    if (selectedPetData.length === 0) {
      toast.error('No pets selected');
      return;
    }

    // Get vaccinations for selected pets
    const petVaccinations = (expiringVaccsData || []).filter(v =>
      selectedPetData.some(p => v.petId === p.id || v.petId === p.recordId)
    );

    // CSV headers
    const headers = ['Pet Name', 'Owner', 'Vaccine', 'Status', 'Expires', 'Days Until Expiry'];

    // Build rows
    const rows = [];
    selectedPetData.forEach(pet => {
      const petVaccs = petVaccinations.filter(v => v.petId === pet.id || v.petId === pet.recordId);
      if (petVaccs.length === 0) {
        rows.push([pet.name, pet.ownerName || 'No owner', 'No vaccination records', '', '', '']);
      } else {
        petVaccs.forEach(v => {
          const expiresAt = v.expiresAt ? new Date(v.expiresAt) : null;
          const daysRemaining = expiresAt ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)) : null;
          const status = daysRemaining !== null
            ? (daysRemaining < 0 ? 'Expired' : daysRemaining <= 7 ? 'Critical' : daysRemaining <= 30 ? 'Expiring' : 'Current')
            : 'Unknown';
          rows.push([
            pet.name,
            pet.ownerName || 'No owner',
            v.type || v.name || v.vaccineName || 'Unknown',
            status,
            expiresAt ? format(expiresAt, 'yyyy-MM-dd') : 'N/A',
            daysRemaining !== null ? daysRemaining.toString() : 'N/A',
          ]);
        });
      }
    });

    // Build CSV content
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

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vaccination_report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Vaccination report generated for ${selectedPetData.length} pet${selectedPetData.length !== 1 ? 's' : ''}`);
  }, [selectedPetData, expiringVaccsData]);

  // Bulk delete selected pets
  const handleBulkDelete = useCallback(async () => {
    if (selectedPetData.length === 0) return;

    setIsDeleting(true);
    try {
      // Delete pets one by one
      const deletePromises = selectedPetData.map(pet =>
        deletePetMutation.mutateAsync(pet.id || pet.recordId)
      );
      await Promise.all(deletePromises);

      toast.success(`Deleted ${selectedPetData.length} pet${selectedPetData.length !== 1 ? 's' : ''}`);
      setSelectedRows(new Set());
      setDeleteModalOpen(false);
      setDeleteConfirmValue('');
    } catch (err) {
      console.error('Failed to delete pets:', err);
      toast.error('Failed to delete some pets. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedPetData, deletePetMutation]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Unable to load pets data. Please try again.</p>
      </div>
    );
  }

  // Show full-page loading state on initial load
  if (showSkeleton) {
    return (
      <div className="flex flex-col flex-grow w-full min-h-[calc(100vh-180px)] items-center justify-center">
        <LoadingState label="Loading pets…" variant="mascot" />
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
            <Breadcrumbs items={['Clients', 'Pets']} />
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

                {/* Status Quick Filter */}
                <div className="min-w-[130px]">
                  <StyledSelect
                    options={[
                      { value: '', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                    value={customFilters.status || ''}
                    onChange={(opt) => setCustomFilters({ ...customFilters, status: opt?.value || undefined })}
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

                <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleExportAll}>
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
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleVaccinationReport}><Syringe className="h-3.5 w-3.5" />Vaccination Report</Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleExportSelected}><Download className="h-3.5 w-3.5" />Export</Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-red-500 hover:text-red-600" onClick={() => setDeleteModalOpen(true)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRows(new Set())} className="ml-auto">
                Clear selection
              </Button>
            </div>
          )}
        </div>

        {/* Table Section - Inner scroll with sticky header */}
        <div className="flex-1 flex flex-col mt-4 min-h-0">
          {sortedPets.length === 0 ? (
            <div className="py-8">
              <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} onAddPet={() => setPetFormModalOpen(true)} />
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <ScrollableTableContainer className="hidden md:block border rounded-t-lg" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
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
                                checked={selectedRows.size === paginatedPets.length && paginatedPets.length > 0}
                                onChange={handleSelectAll}
                                aria-label="Select all pets"
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
                    {paginatedPets.map((pet, index) => (
                      <PetRow
                        key={pet.id || pet.recordId}
                        pet={pet}
                        columns={orderedColumns}
                        isSelected={selectedRows.has(pet.id || pet.recordId)}
                        onSelect={() => handleSelectRow(pet.id || pet.recordId)}
                        onView={() => navigate(`/pets/${pet.id || pet.recordId}`)}
                        onEdit={() => navigate(`/pets/${pet.id || pet.recordId}`)}
                        onDelete={() => deletePetMutation.mutate(pet.id || pet.recordId)}
                        isEven={index % 2 === 0}
                        onUpdateField={handleInlineUpdateField}
                        onStatusChange={handleStatusChange}
                        owners={owners}
                        ownersLoading={ownersLoading}
                        expiringVaccinations={expiringVaccsData}
                        navigate={navigate}
                        onOwnerClick={setSelectedOwnerId}
                      />
                    ))}
                  </tbody>
                </table>
              </ScrollableTableContainer>

              {/* Mobile Cards View */}
              <div className="md:hidden px-4 space-y-3">
                {paginatedPets.map((pet) => (
                  <MobilePetCard
                    key={pet.id || pet.recordId}
                    pet={pet}
                    isSelected={selectedRows.has(pet.id || pet.recordId)}
                    onSelect={() => handleSelectRow(pet.id || pet.recordId)}
                    onView={() => navigate(`/pets/${pet.id || pet.recordId}`)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Pagination - fixed at bottom */}
          {sortedPets.length > 0 && (
            <div
              className="flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 px-4 border-t"
              style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-surface)' }}
            >
              <div className="flex items-center gap-2 text-sm text-[color:var(--bb-color-text-muted)]">
                <span>Rows per page:</span>
                <div className="min-w-[100px]">
                  <StyledSelect
                    options={PAGE_SIZE_OPTIONS.map(size => ({ value: size, label: String(size) }))}
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

      <PetFormModal
        open={petFormModalOpen}
        onClose={() => setPetFormModalOpen(false)}
        onSubmit={async (data) => {
          try {
            await createPetMutation.mutateAsync(data);
            setPetFormModalOpen(false);
            toast.success('Pet created successfully');
          } catch (err) {
            console.error('Failed to create pet:', err);
            // Extract error message from API response
            const errorMessage = err?.response?.data?.message || err?.message || 'Failed to create pet';
            toast.error(errorMessage);
          }
        }}
        isLoading={createPetMutation.isPending}
      />

      {/* Owner Preview Slideout - DEFA pattern: stay on /pets */}
      <SlideOutDrawer
        isOpen={!!selectedOwnerId}
        onClose={() => setSelectedOwnerId(null)}
        title="Owner Details"
        size="md"
      >
        {selectedOwnerId && (
          <OwnerPreviewContent
            ownerId={selectedOwnerId}
            onClose={() => setSelectedOwnerId(null)}
            onViewFullProfile={() => {
              setSelectedOwnerId(null);
              navigate(`/customers/${selectedOwnerId}`);
            }}
          />
        )}
      </SlideOutDrawer>

      {/* Delete Confirmation Modal - enterprise number confirmation */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteConfirmValue('');
        }}
        title={`Delete ${selectedRows.size} pet${selectedRows.size !== 1 ? 's' : ''}`}
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteConfirmValue('');
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting || deleteConfirmValue !== String(selectedRows.size)}
            >
              {isDeleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" />Delete</>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 dark:text-red-200">
                You're about to permanently delete {selectedRows.size} record{selectedRows.size !== 1 ? 's' : ''}.
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[color:var(--bb-color-text-primary)]">
              Type "<strong>{selectedRows.size}</strong>" to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmValue}
              onChange={(e) => {
                // Only allow digits that match the expected number
                const val = e.target.value;
                const expectedStr = String(selectedRows.size);
                // Allow if it's a prefix of the expected number or exactly matches
                if (val === '' || (expectedStr.startsWith(val) && val.length <= expectedStr.length)) {
                  setDeleteConfirmValue(val);
                }
              }}
              placeholder={String(selectedRows.size)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--bb-color-bg-body)',
                borderColor: 'var(--bb-color-border-subtle)',
                color: 'var(--bb-color-text-primary)',
              }}
              autoFocus
            />
          </div>
        </div>
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

// Filter Tag Component
const FilterTag = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]">
    {label}
    <Button variant="ghost" size="icon-xs" onClick={onRemove} className="hover:bg-[color:var(--bb-color-accent)]/20 rounded-full">
      <X className="h-3 w-3" />
    </Button>
  </span>
);

// Vaccination Badge Component (simple, non-hoverable)
const VaccinationBadge = ({ status }) => {
  const configs = {
    current: { variant: 'success', icon: CheckCircle2, label: 'Current' },
    expiring: { variant: 'warning', icon: Clock, label: 'Expiring Soon' },
    critical: { variant: 'danger', icon: AlertCircle, label: 'Critical' },
    expired: { variant: 'danger', icon: AlertCircle, label: 'Expired' },
    missing: { variant: 'danger', icon: AlertCircle, label: 'Missing' },
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

// Status Badge Dropdown Component - Clickable status change (like Owners)
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
      await onStatusChange(pet.recordId || pet.id, newStatus);
      toast.success(`Pet marked as ${newStatus === 'active' ? 'Active' : 'Inactive'}`);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const isActive = pet.status === 'active';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-0 h-auto"
        disabled={isLoading}
      >
        <Badge
          variant={isActive ? 'success' : 'neutral'}
          className="transition-all group-hover:ring-2 group-hover:ring-[var(--bb-color-accent)] group-hover:ring-offset-1"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isActive ? (
            <ShieldCheck className="h-3 w-3" />
          ) : (
            <ShieldOff className="h-3 w-3" />
          )}
          {isActive ? 'Active' : 'Inactive'}
          <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
        </Badge>
      </Button>

      {isOpen && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-36 rounded-lg border shadow-lg py-1"
          style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusChange('active')}
            className={cn(
              'w-full justify-start gap-2',
              isActive && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Active
            {isActive && <Check className="h-4 w-4 ml-auto" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusChange('inactive')}
            className={cn(
              'w-full justify-start gap-2',
              !isActive && 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            )}
          >
            <ShieldOff className="h-4 w-4" />
            Inactive
            {!isActive && <Check className="h-4 w-4 ml-auto" />}
          </Button>
        </div>
      )}
    </div>
  );
};

// Vaccination Hover Card Component - Shows details for non-current vaccinations
// Uses createPortal with flip positioning to render above table stacking context
// Click on a vaccination row to open the edit slideout
const VaccinationHoverCard = ({ pet, expiringVaccinations, navigate, children }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom' });
  const openTimeoutRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const { openSlideout } = useSlideout();

  // Filter vaccinations for this pet
  const petVaccinations = useMemo(() => {
    return (expiringVaccinations || []).filter(v => v.petId === pet.recordId || v.petId === pet.id);
  }, [expiringVaccinations, pet.recordId, pet.id]);

  // Estimate popup height based on number of vaccinations
  // Header (~40px) + each vacc item (~52px) + footer (~44px) + borders/padding
  const estimatedPopupHeight = 40 + (petVaccinations.length * 52) + 44 + 16;

  const openPopover = useCallback(() => {
    // Clear any pending close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    // Calculate position with flip detection
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const gap = 8;

      // Flip to top if not enough space below but enough above
      const shouldFlipToTop = spaceBelow < estimatedPopupHeight + gap && spaceAbove > estimatedPopupHeight + gap;

      if (shouldFlipToTop) {
        // Position above the trigger
        setPosition({
          top: rect.top + window.scrollY - gap,
          left: rect.left + rect.width / 2 + window.scrollX,
          placement: 'top',
        });
      } else {
        // Position below the trigger (default)
        setPosition({
          top: rect.bottom + window.scrollY + gap,
          left: rect.left + rect.width / 2 + window.scrollX,
          placement: 'bottom',
        });
      }
    }
    setIsHovering(true);
  }, [estimatedPopupHeight]);

  const closePopover = useCallback(() => {
    // Delay close to allow mouse to move from trigger to popup
    closeTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 150);
  }, []);

  const handleTriggerEnter = () => {
    // Clear any pending close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    // Delay open for initial hover
    openTimeoutRef.current = setTimeout(openPopover, 300);
  };

  const handleTriggerLeave = () => {
    // Clear pending open
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    closePopover();
  };

  const handlePopoverEnter = () => {
    // Cancel any pending close when entering popover
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handlePopoverLeave = () => {
    closePopover();
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Only show hover card for non-current vaccinations
  if (pet.vaccinationStatus === 'current' || petVaccinations.length === 0) {
    return children;
  }

  const popoverContent = isHovering && createPortal(
    <div
      ref={popoverRef}
      className="fixed w-72 rounded-lg border shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        top: position.placement === 'top' ? 'auto' : position.top,
        bottom: position.placement === 'top' ? `calc(100vh - ${position.top}px)` : 'auto',
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
      onMouseEnter={handlePopoverEnter}
      onMouseLeave={handlePopoverLeave}
    >
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <p className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
          Vaccination Alerts ({petVaccinations.length})
        </p>
      </div>

      {/* Show all vaccinations - only scroll if more than 6 items */}
      {/* Click a vaccination to open edit slideout */}
      <div className={cn('py-1', petVaccinations.length > 6 && 'max-h-80 overflow-y-auto')}>
        {petVaccinations.map((vacc, idx) => {
          const isExpired = vacc.status === 'expired' || new Date(vacc.expiresAt) < new Date();
          const expiresDate = vacc.expiresAt ? new Date(vacc.expiresAt) : null;

          return (
            <Button
              variant="ghost"
              size="sm"
              key={vacc.id || vacc.recordId || idx}
              onClick={(e) => {
                e.stopPropagation();
                setIsHovering(false);
                openSlideout(SLIDEOUT_TYPES.VACCINATION_EDIT, {
                  vaccinations: petVaccinations,
                  initialIndex: idx,
                  petId: pet.recordId || pet.id,
                  petName: pet.name,
                  title: `Update Vaccinations (${petVaccinations.length})`,
                });
              }}
              className="w-full h-auto py-2 justify-start text-left flex-col items-start"
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)] truncate">
                  {vacc.type || vacc.name || vacc.vaccineName || 'Vaccination'}
                </span>
                <Badge variant={isExpired ? 'danger' : 'warning'} size="sm" className="shrink-0">
                  {isExpired ? 'Expired' : 'Expiring'}
                </Badge>
              </div>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-0.5">
                {isExpired ? 'Expired ' : 'Expires '}
                {expiresDate
                  ? formatDistanceToNow(expiresDate, { addSuffix: true })
                  : 'date unknown'}
              </p>
            </Button>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <Button
          variant="link"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsHovering(false);
            navigate(`/pets/${pet.recordId || pet.id}`);
          }}
          className="w-full justify-center"
          leftIcon={<Syringe className="h-3.5 w-3.5" />}
          rightIcon={<ExternalLink className="h-3 w-3" />}
        >
          Update Vaccinations
        </Button>
      </div>
    </div>,
    document.body
  );

  return (
    <div
      className="inline-block"
      onMouseEnter={handleTriggerEnter}
      onMouseLeave={handleTriggerLeave}
      ref={triggerRef}
    >
      <div className="cursor-pointer">
        {children}
      </div>
      {popoverContent}
    </div>
  );
};

// Pet Row Component
const PetRow = ({
  pet,
  columns,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  isEven,
  onUpdateField,
  onStatusChange,
  owners = [],
  ownersLoading = false,
  expiringVaccinations = [],
  navigate,
  onOwnerClick,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsRef = useRef(null);
  const cellPadding = 'px-4 lg:px-6 py-3';
  
  // Prepare owner options for relationship editor
  const ownerOptions = useMemo(() => 
    owners.map(owner => ({
      value: owner.recordId,
      label: owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Unknown',
    })),
    [owners]
  );

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
            <input type="checkbox" checked={isSelected} onChange={onSelect} aria-label="Select pet" className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]" />
          </td>
        );
      case 'pet':
        return (
          <td key={column.id} className={cellPadding}>
            <Button
              variant="ghost"
              size="sm"
              className="group h-auto p-0 rounded-xl px-3 py-2 -mx-3 -my-2 hover:ring-1 hover:ring-[var(--bb-color-border-subtle)]"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="transition-transform duration-150 group-hover:scale-105">
                  <PetAvatar pet={pet} size="md" showStatus={false} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[color:var(--bb-color-text-primary)] group-hover:text-[var(--bb-color-accent)] transition-colors duration-150">{pet.name}</p>
                  <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                    {pet.species || 'Dog'} • {pet.breed || 'Unknown breed'}
                  </p>
                </div>
              </div>
            </Button>
          </td>
        );
      case 'owner':
        return (
          <td key={column.id} className={cellPadding}>
            <InlineEditableCell
              row={pet}
              column={column}
              value={pet.ownerId}
              displayValue={pet.ownerName}
              onCommit={(newOwnerId) => onUpdateField(pet.recordId, 'ownerId', newOwnerId)}
              lookupOptions={ownerOptions}
              lookupLoading={ownersLoading}
            >
              {pet.ownerId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOwnerClick?.(pet.ownerId);
                  }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--bb-color-bg-elevated)', color: 'var(--bb-color-text-muted)' }}>
                    <User className="h-4 w-4" />
                  </div>
                  <span className="text-[color:var(--bb-color-text-primary)]">{pet.ownerName}</span>
                </Button>
              ) : (
                <span className="text-[color:var(--bb-color-text-muted)]">{pet.ownerName || 'No owner'}</span>
              )}
            </InlineEditableCell>
          </td>
        );
      case 'status':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')} onClick={(e) => e.stopPropagation()}>
            <span className="inline-flex items-center gap-1.5">
              <StatusBadgeDropdown pet={pet} onStatusChange={onStatusChange} />
              {pet.inFacility && (
                <Badge variant="info">In Facility</Badge>
              )}
            </span>
          </td>
        );
      case 'vaccinations':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            <VaccinationHoverCard pet={pet} expiringVaccinations={expiringVaccinations} navigate={navigate}>
              <VaccinationBadge status={pet.vaccinationStatus} />
            </VaccinationHoverCard>
          </td>
        );
      case 'species':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            <InlineEditableCell
              row={pet}
              column={column}
              value={pet.species?.toLowerCase() || 'dog'}
              onCommit={(newSpecies) => onUpdateField(pet.recordId, 'species', newSpecies)}
            >
              <span className="inline-flex items-center gap-1.5">
                <SpeciesIcon className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                <span className="text-[color:var(--bb-color-text-primary)] capitalize">{pet.species || 'Dog'}</span>
              </span>
            </InlineEditableCell>
          </td>
        );
      case 'age':
        // Use formatAgeFromBirthdate for better display (e.g., "8 months" for < 1 year)
        const ageDisplay = formatAgeFromBirthdate(pet.birthdate);
        return (
          <td key={column.id} className={cn(cellPadding, 'text-center')}>
            <InlineEditableCell
              row={pet}
              column={column}
              value={pet.age}
              onCommit={(newAge) => onUpdateField(pet.recordId, 'age', newAge)}
            >
              {ageDisplay ? (
                <span className="text-[color:var(--bb-color-text-primary)]">{ageDisplay}</span>
              ) : (
                <span className="text-[color:var(--bb-color-text-muted)]">—</span>
              )}
            </InlineEditableCell>
          </td>
        );
      case 'actions':
        return (
          <td key={column.id} className={cn(cellPadding, 'text-right')}>
            <span className={cn('inline-flex items-center gap-1 transition-opacity', showActions ? 'opacity-100' : 'opacity-0')} ref={actionsRef}>
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); onView(); }} title="View profile">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit">
                <Edit className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => { e.stopPropagation(); setShowActionsMenu(!showActionsMenu); }}
                  title="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {showActionsMenu && (
                  <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
                    <div className="py-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onView(); setShowActionsMenu(false); }} className="w-full justify-start gap-2">
                        <Eye className="h-4 w-4" />View Profile
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); setShowActionsMenu(false); }} className="w-full justify-start gap-2">
                        <Edit className="h-4 w-4" />Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); setShowActionsMenu(false); }} className="w-full justify-start gap-2 text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </span>
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
      onMouseLeave={() => { setShowActions(false); setShowActionsMenu(false); }}
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
          aria-label="Select pet"
          className="mt-1 h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]"
          onClick={(e) => e.stopPropagation()}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="group h-auto p-0 rounded-lg px-2 py-1 -mx-2 -my-1"
              onClick={onView}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="transition-transform duration-150 group-hover:scale-105">
                  <PetAvatar pet={pet} size="md" showStatus={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[color:var(--bb-color-text-primary)] truncate group-hover:text-[var(--bb-color-accent)] transition-colors duration-150">{pet.name}</p>
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

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setExpanded(!expanded)}
          className="text-[color:var(--bb-color-text-muted)]"
        >
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
      <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="h-4 w-4" /></Button>
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
      <StyledSelect
        label="Vaccination Status"
        options={[
          { value: '', label: 'Any' },
          { value: 'current', label: 'Current' },
          { value: 'expiring', label: 'Expiring Soon' },
          { value: 'critical', label: 'Critical' },
          { value: 'expired', label: 'Expired' },
          { value: 'none', label: 'Not on file' },
        ]}
        value={filters.vaccinationStatus || ''}
        onChange={(opt) => onFiltersChange({ ...filters, vaccinationStatus: opt?.value || undefined })}
        isClearable={false}
        isSearchable
      />
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

// Owner Preview Content Component - DEFA slideout for owner details
const OwnerPreviewContent = ({ ownerId, onClose, onViewFullProfile }) => {
  const { data: ownerData, isLoading, error } = useOwnerQuery(ownerId);
  const owner = ownerData?.owner || ownerData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--bb-color-accent)]" />
      </div>
    );
  }

  if (error || !owner) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto mb-3 text-[color:var(--bb-color-text-muted)]" />
        <p className="text-[color:var(--bb-color-text-muted)]">Unable to load owner details</p>
      </div>
    );
  }

  const ownerName = owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Unknown';
  const pets = owner.pets || [];

  return (
    <div className="space-y-6">
      {/* Owner Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xl font-bold">
          {ownerName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">{ownerName}</h3>
          {owner.email && (
            <p className="text-sm text-[color:var(--bb-color-text-muted)] truncate">{owner.email}</p>
          )}
          <Badge variant={owner.status === 'active' ? 'success' : 'neutral'} className="mt-1">
            {owner.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Contact Information</h4>
        <div className="space-y-2">
          {owner.email && (
            <a
              href={`mailto:${owner.email}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] hover:border-[color:var(--bb-color-accent)] transition-colors"
            >
              <Mail className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              <span className="text-sm text-[color:var(--bb-color-text-primary)]">{owner.email}</span>
            </a>
          )}
          {owner.phone && (
            <a
              href={`tel:${owner.phone}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] hover:border-[color:var(--bb-color-accent)] transition-colors"
            >
              <Phone className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              <span className="text-sm text-[color:var(--bb-color-text-primary)]">{owner.phone}</span>
            </a>
          )}
          {!owner.email && !owner.phone && (
            <p className="text-sm text-[color:var(--bb-color-text-muted)] italic">No contact information</p>
          )}
        </div>
      </div>

      {/* Pets List */}
      {pets.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
            Pets ({pets.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pets.map((pet) => (
              <div
                key={pet.id || pet.recordId}
                className="flex items-center gap-3 p-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                  {pet.species?.toLowerCase() === 'cat' ? (
                    <Cat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Dog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] truncate">
                    {pet.name}
                  </p>
                  <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                    {pet.species || 'Dog'} {pet.breed && `• ${pet.breed}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="pt-4 border-t border-[color:var(--bb-color-border-subtle)] space-y-2">
        <Button
          className="w-full gap-2"
          onClick={onViewFullProfile}
        >
          <ExternalLink className="h-4 w-4" />
          View Full Profile
        </Button>
        <div className="flex gap-2">
          {owner.email && (
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => window.location.href = `mailto:${owner.email}`}
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          )}
          {owner.phone && (
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => window.location.href = `tel:${owner.phone}`}
            >
              <Phone className="h-4 w-4" />
              Call
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pets;
