import { useState, useMemo, useCallback } from 'react';

/**
 * Hook for managing pets table selection and sorting state.
 * Extracted from Pets.jsx to reduce component complexity.
 */
export function usePetsTableState() {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const toggleRow = useCallback((id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids) => {
    setSelectedRows(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const toggleSort = useCallback((column) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  return {
    selectedRows,
    setSelectedRows,
    sortColumn,
    sortDirection,
    toggleRow,
    selectAll,
    clearSelection,
    toggleSort,
  };
}

/**
 * Hook for managing pets filter state.
 * Handles search, view selection, and filter values.
 */
export function usePetsFilterState() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('all');
  const [filters, setFilters] = useState({
    species: null,
    breed: null,
    status: null,
    vaccinationStatus: null,
  });

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      species: null,
      breed: null,
      status: null,
      vaccinationStatus: null,
    });
    setSearchTerm('');
    setActiveView('all');
  }, []);

  const hasActiveFilters = useMemo(() => {
    return searchTerm || activeView !== 'all' || Object.values(filters).some(Boolean);
  }, [searchTerm, activeView, filters]);

  return {
    searchTerm,
    setSearchTerm,
    activeView,
    setActiveView,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
  };
}

/**
 * Hook for managing pets modal state.
 * Handles create/edit/delete modal visibility and selected pet tracking.
 */
export function usePetsModalState() {
  const [petFormModalOpen, setPetFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [bulkActionModal, setBulkActionModal] = useState(null);

  const openCreateModal = useCallback(() => {
    setSelectedPet(null);
    setPetFormModalOpen(true);
  }, []);

  const openEditModal = useCallback((pet) => {
    setSelectedPet(pet);
    setPetFormModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((pet) => {
    setSelectedPet(pet);
    setDeleteModalOpen(true);
  }, []);

  const closeModals = useCallback(() => {
    setPetFormModalOpen(false);
    setDeleteModalOpen(false);
    setBulkActionModal(null);
    setSelectedPet(null);
  }, []);

  return {
    petFormModalOpen,
    setPetFormModalOpen,
    deleteModalOpen,
    setDeleteModalOpen,
    selectedPet,
    setSelectedPet,
    bulkActionModal,
    setBulkActionModal,
    openCreateModal,
    openEditModal,
    openDeleteModal,
    closeModals,
  };
}

/**
 * Hook for managing pets pagination state.
 */
export function usePetsPaginationState(defaultPageSize = 25) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToPage = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    resetPagination,
    goToPage,
    nextPage,
    prevPage,
  };
}

/**
 * Hook for managing column visibility and ordering.
 */
export function usePetsColumnsState(allColumns, storageKey = 'pets') {
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(`${storageKey}-visible-columns`);
    return saved ? JSON.parse(saved) : allColumns.map((c) => c.id);
  });

  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem(`${storageKey}-column-order`);
    return saved ? JSON.parse(saved) : allColumns.map((c) => c.id);
  });

  const toggleColumn = useCallback((columnId) => {
    setVisibleColumns((prev) => {
      const next = prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId];
      localStorage.setItem(`${storageKey}-visible-columns`, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const moveColumn = useCallback((fromIndex, toIndex) => {
    setColumnOrder((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      localStorage.setItem(`${storageKey}-column-order`, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const resetColumns = useCallback(() => {
    const defaultVisible = allColumns.map((c) => c.id);
    const defaultOrder = allColumns.map((c) => c.id);
    setVisibleColumns(defaultVisible);
    setColumnOrder(defaultOrder);
    localStorage.removeItem(`${storageKey}-visible-columns`);
    localStorage.removeItem(`${storageKey}-column-order`);
  }, [allColumns, storageKey]);

  return {
    visibleColumns,
    setVisibleColumns,
    columnOrder,
    setColumnOrder,
    toggleColumn,
    moveColumn,
    resetColumns,
  };
}
