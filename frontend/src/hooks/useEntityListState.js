import { useState, useMemo, useCallback } from 'react';

/**
 * Generic hook for managing entity list table state.
 * Can be used by Pets, Owners, Bookings, Invoices, etc.
 */
export function useTableState() {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

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

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  return {
    selectedRows,
    setSelectedRows,
    sortConfig,
    setSortConfig,
    toggleRow,
    selectAll,
    clearSelection,
    handleSort,
  };
}

/**
 * Generic hook for managing filter state.
 */
export function useFilterState(defaultFilters = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('all');
  const [filters, setFilters] = useState(defaultFilters);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSearchTerm('');
    setActiveView('all');
  }, [defaultFilters]);

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
 * Generic hook for managing modal state.
 */
export function useModalState() {
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [bulkActionModal, setBulkActionModal] = useState(null);

  const openCreateModal = useCallback(() => {
    setSelectedItem(null);
    setFormModalOpen(true);
  }, []);

  const openEditModal = useCallback((item) => {
    setSelectedItem(item);
    setFormModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((item) => {
    setSelectedItem(item);
    setDeleteModalOpen(true);
  }, []);

  const closeModals = useCallback(() => {
    setFormModalOpen(false);
    setDeleteModalOpen(false);
    setBulkActionModal(null);
    setSelectedItem(null);
  }, []);

  return {
    formModalOpen,
    setFormModalOpen,
    deleteModalOpen,
    setDeleteModalOpen,
    selectedItem,
    setSelectedItem,
    bulkActionModal,
    setBulkActionModal,
    openCreateModal,
    openEditModal,
    openDeleteModal,
    closeModals,
  };
}

/**
 * Generic hook for managing pagination state.
 */
export function usePaginationState(defaultPageSize = 25) {
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

  const paginateData = useCallback((data) => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [currentPage, pageSize]);

  const totalPages = useCallback((totalItems) => {
    return Math.ceil(totalItems / pageSize);
  }, [pageSize]);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    resetPagination,
    goToPage,
    nextPage,
    prevPage,
    paginateData,
    totalPages,
  };
}

/**
 * Generic hook for managing column visibility and ordering.
 */
export function useColumnsState(allColumns, storageKey) {
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(`${storageKey}-visible-columns`);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Add any new columns that aren't in saved preferences
      const allColumnIds = allColumns.map((c) => c.id);
      const newColumns = allColumnIds.filter((id) => !parsed.includes(id));
      return [...parsed, ...newColumns];
    }
    return allColumns.map((c) => c.id);
  });

  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem(`${storageKey}-column-order`);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Add any new columns before 'actions'
      const allColumnIds = allColumns.map((c) => c.id);
      const newColumns = allColumnIds.filter((id) => !parsed.includes(id));
      if (newColumns.length > 0) {
        const actionsIndex = parsed.indexOf('actions');
        if (actionsIndex !== -1) {
          return [...parsed.slice(0, actionsIndex), ...newColumns, ...parsed.slice(actionsIndex)];
        }
        return [...parsed, ...newColumns];
      }
      return parsed;
    }
    return allColumns.map((c) => c.id);
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

  // Compute ordered visible columns
  const orderedColumns = useMemo(() => {
    return columnOrder
      .filter((id) => visibleColumns.includes(id))
      .map((id) => allColumns.find((col) => col.id === id))
      .filter(Boolean);
  }, [columnOrder, visibleColumns, allColumns]);

  return {
    visibleColumns,
    setVisibleColumns,
    columnOrder,
    setColumnOrder,
    toggleColumn,
    moveColumn,
    resetColumns,
    orderedColumns,
  };
}

/**
 * Combined hook that provides all entity list state management.
 * Use this for simpler integration in entity list components.
 */
export function useEntityListState(config = {}) {
  const {
    defaultFilters = {},
    defaultPageSize = 25,
    defaultSortKey = 'name',
    allColumns = [],
    storageKey = 'entity',
  } = config;

  const tableState = useTableState();
  const filterState = useFilterState(defaultFilters);
  const modalState = useModalState();
  const paginationState = usePaginationState(defaultPageSize);
  const columnsState = useColumnsState(allColumns, storageKey);

  // Override default sort key
  useState(() => {
    tableState.setSortConfig({ key: defaultSortKey, direction: 'asc' });
  });

  return {
    ...tableState,
    ...filterState,
    ...modalState,
    ...paginationState,
    ...columnsState,
  };
}
