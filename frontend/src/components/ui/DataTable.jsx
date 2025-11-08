import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  MoreHorizontal,
  List,
  Grid3x3,
  Download,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from './Button';
import FilterDropdown from './FilterDropdown';

const DataTable = ({
  columns = [],
  data = [],
  title = '',
  recordCount = 0,
  onRowClick,
  headerActions,
  views = [],
  activeView = null,
  onViewChange,
  searchPlaceholder = 'Search...',
  pageSize = 25,
  enableSelection = false,
  onExport,
  filterGroups = [],
  activeFilters = {},
  onFilterChange,
  onFilterClear,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);
  const [visibleColumns, setVisibleColumns] = useState(() =>
    columns.reduce((acc, col, idx) => ({ ...acc, [idx]: true }), {})
  );
  const [showColumnEditor, setShowColumnEditor] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [tempVisibleColumns, setTempVisibleColumns] = useState(visibleColumns);
  const [filterSearch, setFilterSearch] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState([]);
  const [editingFilter, setEditingFilter] = useState(null);

  const pageSizeDropdownRef = useRef(null);
  const moreFiltersRef = useRef(null);

  // Handle outside clicks for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pageSizeDropdownRef.current && !pageSizeDropdownRef.current.contains(event.target)) {
        setShowPageSizeDropdown(false);
      }
      if (moreFiltersRef.current && !moreFiltersRef.current.contains(event.target)) {
        setShowMoreFilters(false);
      }
    };

    if (showPageSizeDropdown || showMoreFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPageSizeDropdown, showMoreFilters]);

  // Advanced filter application logic
  const applyAdvancedFiltersToData = (dataToFilter) => {
    let result = dataToFilter;

    advancedFilters.forEach(filter => {
      result = result.filter(row => {
        const value = row[filter.accessor];
        const filterValue = filter.value;

        switch (filter.propertyType) {
          case 'text':
            const strValue = String(value || '').toLowerCase();
            const strFilter = String(filterValue).toLowerCase();

            if (filter.operator === 'contains') return strValue.includes(strFilter);
            if (filter.operator === 'notContains') return !strValue.includes(strFilter);
            if (filter.operator === 'equals') return strValue === strFilter;
            if (filter.operator === 'notEquals') return strValue !== strFilter;
            break;

          case 'number':
            const numValue = Number(value);
            const numFilter = Number(filterValue);

            if (filter.operator === 'equals') return numValue === numFilter;
            if (filter.operator === 'notEquals') return numValue !== numFilter;
            if (filter.operator === 'greaterThan') return numValue > numFilter;
            if (filter.operator === 'lessThan') return numValue < numFilter;
            break;

          case 'date':
            const dateValue = new Date(value);
            const dateFilter = new Date(filterValue);

            if (filter.operator === 'after') return dateValue > dateFilter;
            if (filter.operator === 'before') return dateValue < dateFilter;
            if (filter.operator === 'between') {
              const dateFilter2 = new Date(filter.value2);
              return dateValue >= dateFilter && dateValue <= dateFilter2;
            }
            break;
        }

        return true;
      });
    });

    return result;
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery) {
      result = result.filter((row) => {
        return columns.some((col) => {
          const value = col.accessor ? row[col.accessor] : '';
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        });
      });
    }

    // Apply advanced filters
    result = applyAdvancedFiltersToData(result);

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = sortColumn.accessor ? a[sortColumn.accessor] : '';
        const bVal = sortColumn.accessor ? b[sortColumn.accessor] : '';

        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        }
        return aVal < bVal ? 1 : -1;
      });
    }

    return result;
  }, [data, searchQuery, sortColumn, sortDirection, columns, advancedFilters]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const handleSort = (column) => {
    if (!column.sortable) return;

    if (sortColumn?.accessor === column.accessor) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map((row) => row.recordId)));
    }
  };

  const handleSelectRow = (recordId) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRows(newSelected);
  };

  const getPaginationRange = () => {
    const range = [];
    const maxVisible = 11;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      if (currentPage <= 6) {
        for (let i = 1; i <= 9; i++) range.push(i);
        range.push('...');
        range.push(totalPages);
      } else if (currentPage >= totalPages - 5) {
        range.push(1);
        range.push('...');
        for (let i = totalPages - 8; i <= totalPages; i++) range.push(i);
      } else {
        range.push(1);
        range.push('...');
        for (let i = currentPage - 3; i <= currentPage + 3; i++) range.push(i);
        range.push('...');
        range.push(totalPages);
      }
    }

    return range;
  };


  const handleExportCSV = () => {
    if (onExport) {
      onExport();
      return;
    }

    // Default CSV export
    const visibleCols = columns.filter((_, idx) => visibleColumns[idx]);
    const headers = visibleCols.map((col) => col.header).join(',');
    const rows = filteredData.map((row) =>
      visibleCols.map((col) => {
        const value = col.accessor ? row[col.accessor] : '';
        const stringValue = String(value ?? '').replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleColumnVisibility = (colIdx) => {
    setTempVisibleColumns((prev) => ({
      ...prev,
      [colIdx]: !prev[colIdx],
    }));
  };

  const applyColumnChanges = () => {
    setVisibleColumns(tempVisibleColumns);
    setShowColumnEditor(false);
  };

  const cancelColumnChanges = () => {
    setTempVisibleColumns(visibleColumns);
    setShowColumnEditor(false);
    setColumnSearch('');
  };

  const removeAllColumns = () => {
    const allHidden = columns.reduce((acc, col, idx) => ({ ...acc, [idx]: false }), {});
    setTempVisibleColumns(allHidden);
  };

  const selectedColumnsCount = Object.values(tempVisibleColumns).filter(Boolean).length;

  const filteredColumns = useMemo(() => {
    if (!columnSearch) return columns;
    return columns.filter((col) =>
      col.header.toLowerCase().includes(columnSearch.toLowerCase())
    );
  }, [columns, columnSearch]);

  const handleBulkDelete = () => {
    if (selectedRows.size === 0) return;
    alert(`Bulk delete ${selectedRows.size} items (not implemented)`);
  };

  const handleBulkExport = () => {
    if (selectedRows.size === 0) return;
    alert(`Bulk export ${selectedRows.size} items (not implemented)`);
  };

  // Advanced filter properties
  const advancedFilterProperties = [
    { recordId: 'email', label: 'Email contains', type: 'text', accessor: 'email' },
    { recordId: 'phone', label: 'Phone contains', type: 'text', accessor: 'phone' },
    { recordId: 'createdAt', label: 'Create date', type: 'date', accessor: 'createdAt' },
    { recordId: 'totalBookings', label: 'Number of bookings', type: 'number', accessor: 'totalBookings' },
    { recordId: 'lifetimeValue', label: 'Total spent', type: 'number', accessor: 'lifetimeValue' },
    { recordId: 'lastBooking', label: 'Last booking date', type: 'date', accessor: 'lastBooking' },
  ];

  const getOperatorsForType = (type) => {
    switch (type) {
      case 'text':
        return [
          { value: 'contains', label: 'contains' },
          { value: 'notContains', label: 'does not contain' },
          { value: 'equals', label: 'is equal to' },
          { value: 'notEquals', label: 'is not equal to' },
        ];
      case 'number':
        return [
          { value: 'equals', label: 'is equal to' },
          { value: 'notEquals', label: 'is not equal to' },
          { value: 'greaterThan', label: 'is greater than' },
          { value: 'lessThan', label: 'is less than' },
        ];
      case 'date':
        return [
          { value: 'after', label: 'is after' },
          { value: 'before', label: 'is before' },
          { value: 'between', label: 'is between' },
        ];
      default:
        return [];
    }
  };

  const handleAddFilter = (property) => {
    const operators = getOperatorsForType(property.type);
    const newFilter = { recordId: Date.now(),
      property: property.recordId,
      propertyLabel: property.label,
      propertyType: property.type,
      accessor: property.accessor,
      operator: operators[0].value,
      value: '',
      value2: '', // For 'between' operator
    };
    setEditingFilter(newFilter);
  };

  const handleSaveFilter = () => {
    if (!editingFilter || !editingFilter.value) return;

    setAdvancedFilters([...advancedFilters, editingFilter]);
    setEditingFilter(null);
    setFilterSearch('');
  };

  const handleRemoveAdvancedFilter = (filterId) => {
    setAdvancedFilters(advancedFilters.filter(f => f.recordId !== filterId));
  };

  const handleClearAllFilters = () => {
    setAdvancedFilters([]);
    // Also clear quick filters
    filterGroups.forEach(group => {
      onFilterClear?.(group.recordId);
    });
  };

  return (
    <div className={cn('flex flex-col gap-0', className)}>
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">{title}</h1>
          {recordCount > 0 && (
            <p className="text-sm text-muted">
              {recordCount.toLocaleString()} record{recordCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
        </div>
      </div>

      {/* Views/Tabs Bar */}
      {views.length > 0 && (
        <div className="flex items-center justify-between border-b border-border bg-background px-6 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {views.map((view) => (
              <button
                key={view.recordId}
                onClick={() => onViewChange?.(view.recordId)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  activeView === view.recordId
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:bg-surface hover:text-text'
                )}
              >
                {view.label}
                {view.canClose && activeView === view.recordId && (
                  <X className="h-3 w-3" />
                )}
              </button>
            ))}
            <button className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-text">
              <Plus className="h-3 w-3" />
              Add view
            </button>
          </div>
          <button className="text-sm font-medium text-primary hover:underline">
            All Views
          </button>
        </div>
      )}

      {/* Filters & Actions Bar */}
      <div className="flex items-center gap-2 border-b border-border bg-background px-6 py-3">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
          <button
            className={cn(
              'rounded p-1.5 transition-colors',
              'bg-white dark:bg-surface-primary text-primary shadow-sm'
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            className={cn(
              'rounded p-1.5 transition-colors',
              'text-muted hover:text-text'
            )}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Dropdowns */}
        {filterGroups.map((group) => (
          <FilterDropdown
            key={group.recordId}
            label={group.label}
            options={group.options || []}
            value={activeFilters[group.id]}
            onChange={(value) => onFilterChange?.(group.recordId, value)}
            onClear={() => onFilterClear?.(group.recordId)}
          />
        ))}

        {/* More Filters */}
        <div ref={moreFiltersRef} className="relative">
          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface/80"
          >
            <Plus className="h-3 w-3" />
            More
          </button>

          {showMoreFilters && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-white dark:bg-surface-primary shadow-lg">
              <div className="p-4">
                <h3 className="mb-3 text-sm font-semibold text-text">Additional Filters</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowMoreFilters(false);
                      // Add functionality here
                    }}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
                  >
                    <span>Owner Type</span>
                    <Plus className="h-4 w-4 text-gray-400 dark:text-text-tertiary" />
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreFilters(false);
                      // Add functionality here
                    }}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
                  >
                    <span>Pet Count</span>
                    <Plus className="h-4 w-4 text-gray-400 dark:text-text-tertiary" />
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreFilters(false);
                      // Add functionality here
                    }}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
                  >
                    <span>Location</span>
                    <Plus className="h-4 w-4 text-gray-400 dark:text-text-tertiary" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        <button
          onClick={() => setShowAdvancedFilters(true)}
          className={cn(
            'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
            advancedFilters.length > 0
              ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
              : 'border-border bg-surface hover:bg-surface/80'
          )}
        >
          <Filter className="h-3 w-3" />
          Advanced filters
        </button>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-surface py-1.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Export */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface/80"
        >
          Export
        </button>

        {/* Edit Columns */}
        <button
          onClick={() => {
            setTempVisibleColumns(visibleColumns);
            setShowColumnEditor(true);
          }}
          className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface/80"
        >
          <Settings2 className="h-4 w-4" />
          Edit columns
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center justify-between border-b border-border bg-blue-50 dark:bg-surface-primary px-6 py-3">
          <span className="text-sm font-medium text-text">
            {selectedRows.size} {selectedRows.size === 1 ? 'item' : 'items'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkExport}
              className="rounded-md border border-border bg-white dark:bg-surface-primary px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
            >
              Export Selected
            </button>
            <button
              onClick={handleBulkDelete}
              className="rounded-md border border-red-200 dark:border-red-900/30 bg-white dark:bg-surface-primary px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:bg-red-950/20"
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedRows(new Set())}
              className="rounded-md border border-border bg-white dark:bg-surface-primary px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-surface-primary">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              {enableSelection && (
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 dark:border-surface-border text-primary focus:ring-2 focus:ring-primary/20"
                  />
                </th>
              )}
              {columns.map((column, idx) => {
                if (!visibleColumns[idx]) return null;
                return (
                  <th
                    key={idx}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-text-secondary',
                      column.sortable && 'cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary'
                    )}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{column.header}</span>
                      {column.sortable && sortColumn?.accessor === column.accessor && (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-surface-border bg-white dark:bg-surface-primary">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={Object.values(visibleColumns).filter(Boolean).length + (enableSelection ? 1 : 0)}
                  className="px-6 py-12 text-center text-sm text-muted"
                >
                  No records found
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={row.recordId}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {enableSelection && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.recordId)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(row.recordId);
                        }}
                        className="h-4 w-4 rounded border-gray-300 dark:border-surface-border text-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </td>
                  )}
                  {columns.map((column, idx) => {
                    if (!visibleColumns[idx]) return null;
                    return (
                      <td key={idx} className="px-4 py-4 text-sm">
                        {column.cell ? column.cell(row) : row[column.accessor]}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-1 border-t border-border bg-white dark:bg-surface-primary px-6 py-4">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={cn(
            'px-3 py-1 text-sm font-medium text-primary hover:underline disabled:text-gray-400 dark:text-text-tertiary disabled:no-underline disabled:cursor-not-allowed'
          )}
        >
          Prev
        </button>

        {getPaginationRange().map((page, idx) => (
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 dark:text-text-tertiary">...</span>
          ) : (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={cn(
                'min-w-[2rem] rounded px-2 py-1 text-sm font-medium transition-colors',
                currentPage === page
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-text-primary hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary'
              )}
            >
              {page}
            </button>
          )
        ))}

        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={cn(
            'px-3 py-1 text-sm font-medium text-primary hover:underline disabled:text-gray-400 dark:text-text-tertiary disabled:no-underline disabled:cursor-not-allowed'
          )}
        >
          Next
        </button>

        <div ref={pageSizeDropdownRef} className="relative ml-4">
          <button
            onClick={() => setShowPageSizeDropdown(!showPageSizeDropdown)}
            className="flex items-center gap-2 rounded-md border border-border bg-white dark:bg-surface-primary px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
          >
            <span>{itemsPerPage} per page</span>
            <ChevronDown className={cn('h-3 w-3 text-gray-500 dark:text-text-secondary transition-transform', showPageSizeDropdown && 'rotate-180')} />
          </button>

          {showPageSizeDropdown && (
            <div className="absolute bottom-full left-0 mb-1 w-full rounded-md border border-border bg-white dark:bg-surface-primary shadow-lg">
              <div className="py-1">
                {[25, 50, 100].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setItemsPerPage(size);
                      setCurrentPage(1);
                      setShowPageSizeDropdown(false);
                    }}
                    className={cn(
                      'flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary',
                      itemsPerPage === size && 'bg-primary/5 text-primary font-medium'
                    )}
                  >
                    {size} per page
                    {itemsPerPage === size && <Check className="ml-auto h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column Editor Modal */}
      {showColumnEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex h-[600px] w-full max-w-5xl rounded-lg bg-white dark:bg-surface-primary shadow-2xl">
            {/* Header */}
            <div className="flex w-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-surface-border bg-primary px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Choose which columns you see</h2>
                <button
                  onClick={cancelColumnChanges}
                  className="text-white hover:text-gray-200 dark:hover:text-text-tertiary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Side - All Columns */}
                <div className="flex w-2/3 flex-col border-r border-gray-200 dark:border-surface-border">
                  {/* Search */}
                  <div className="border-b border-gray-200 dark:border-surface-border p-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-text-tertiary" />
                      <input
                        type="text"
                        placeholder="Search columns..."
                        value={columnSearch}
                        onChange={(e) => setColumnSearch(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-surface-border py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Column List */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-text-secondary">
                      COLUMNS
                    </div>
                    <div className="space-y-1">
                      {filteredColumns.map((col, idx) => {
                        const originalIdx = columns.findIndex(c => c.header === col.header);
                        return (
                          <label
                            key={originalIdx}
                            className="flex items-center gap-3 rounded px-2 py-2 hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={tempVisibleColumns[originalIdx]}
                              onChange={() => toggleColumnVisibility(originalIdx)}
                              className="h-4 w-4 rounded border-gray-300 dark:border-surface-border text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-gray-700 dark:text-text-primary">{col.header}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Side - Selected Columns */}
                <div className="flex w-1/3 flex-col bg-gray-50 dark:bg-surface-secondary">
                  <div className="border-b border-gray-200 dark:border-surface-border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-text-primary">
                        SELECTED COLUMNS ({selectedColumnsCount})
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-text-secondary">Frozen columns: 0</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-1">
                      {columns.map((col, idx) => {
                        if (!tempVisibleColumns[idx]) return null;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 dark:text-text-tertiary">&#8942;&#8942;</span>
                              <span className="text-gray-700 dark:text-text-primary">{col.header}</span>
                            </div>
                            <button
                              onClick={() => toggleColumnVisibility(idx)}
                              className="text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-secondary"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-surface-border px-6 py-4">
                <button
                  onClick={removeAllColumns}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Remove All Columns
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={cancelColumnChanges}
                    className="rounded-md border border-gray-300 dark:border-surface-border px-4 py-2 text-sm font-medium text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyColumnChanges}
                    className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters Modal - Full Version */}
      {showAdvancedFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex h-[600px] w-full max-w-4xl rounded-lg bg-white dark:bg-surface-primary shadow-2xl">
            <div className="flex w-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-surface-border bg-primary px-6 py-4">
                <h2 className="text-lg font-semibold text-white">All Filters</h2>
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="text-white hover:text-gray-200 dark:hover:text-text-tertiary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Side - Current Filters */}
                <div className="flex w-1/2 flex-col border-r border-gray-200 dark:border-surface-border p-6">
                  {/* Quick Filters */}
                  <div className="mb-6">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-text-primary">Quick filters</h3>
                      <button className="text-xs text-primary hover:underline">Hide</button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-text-secondary mb-3">
                      These filters were set within the current table.
                    </p>

                    {/* Show active filters */}
                    {Object.keys(activeFilters).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(activeFilters).map(([key, value]) => {
                          const group = filterGroups.find(g => g.recordId === key);
                          const option = group?.options?.find(o => o.value === value);
                          return (
                            <div key={key} className="flex items-center justify-between rounded bg-blue-50 dark:bg-surface-primary px-3 py-2">
                              <div>
                                <span className="text-sm font-medium text-gray-900 dark:text-text-primary">{group?.label}: </span>
                                <span className="text-sm text-gray-700 dark:text-text-primary">{option?.label || value}</span>
                              </div>
                              <button
                                onClick={() => onFilterClear?.(key)}
                                className="text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-secondary"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-text-secondary italic">No quick filters applied</p>
                    )}
                  </div>

                  {/* Advanced Filters */}
                  <div className="flex-1 border-t border-gray-200 dark:border-surface-border pt-6">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-text-primary">Advanced Filters</h3>
                    {advancedFilters.length > 0 ? (
                      <div className="space-y-2">
                        {advancedFilters.map((filter) => {
                          const operators = getOperatorsForType(filter.propertyType);
                          const operatorLabel = operators.find(o => o.value === filter.operator)?.label || filter.operator;
                          return (
                            <div key={filter.recordId} className="rounded bg-gray-100 dark:bg-surface-secondary px-3 py-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 text-sm">
                                  <span className="font-medium text-gray-900 dark:text-text-primary">{filter.propertyLabel}</span>
                                  <span className="text-gray-600 dark:text-text-secondary"> {operatorLabel} </span>
                                  <span className="font-medium text-gray-900 dark:text-text-primary">{filter.value}</span>
                                  {filter.operator === 'between' && filter.value2 && (
                                    <span className="text-gray-600 dark:text-text-secondary"> and <span className="font-medium text-gray-900 dark:text-text-primary">{filter.value2}</span></span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRemoveAdvancedFilter(filter.recordId)}
                                  className="ml-2 text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-secondary"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-text-secondary mb-4">
                        This view doesn't have any advanced filters. Select a filter to begin.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side - Add Filter or Edit Filter */}
                <div className="flex w-1/2 flex-col">
                  {editingFilter ? (
                    <>
                      {/* Filter Builder */}
                      <div className="border-b border-gray-200 dark:border-surface-border p-6">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-text-primary">Configure filter</h3>
                          <button
                            onClick={() => setEditingFilter(null)}
                            className="text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-secondary"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-text-primary">
                              Property
                            </label>
                            <input
                              type="text"
                              value={editingFilter.propertyLabel}
                              disabled
                              className="w-full rounded-md border border-gray-300 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary px-3 py-2 text-sm"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-text-primary">
                              Operator
                            </label>
                            <select
                              value={editingFilter.operator}
                              onChange={(e) => setEditingFilter({...editingFilter, operator: e.target.value})}
                              className="w-full rounded-md border border-gray-300 dark:border-surface-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {getOperatorsForType(editingFilter.propertyType).map(op => (
                                <option key={op.value} value={op.value}>{op.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-text-primary">
                              Value
                            </label>
                            {editingFilter.propertyType === 'date' ? (
                              <input
                                type="date"
                                value={editingFilter.value}
                                onChange={(e) => setEditingFilter({...editingFilter, value: e.target.value})}
                                className="w-full rounded-md border border-gray-300 dark:border-surface-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : editingFilter.propertyType === 'number' ? (
                              <input
                                type="number"
                                value={editingFilter.value}
                                onChange={(e) => setEditingFilter({...editingFilter, value: e.target.value})}
                                placeholder="Enter number..."
                                className="w-full rounded-md border border-gray-300 dark:border-surface-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : (
                              <input
                                type="text"
                                value={editingFilter.value}
                                onChange={(e) => setEditingFilter({...editingFilter, value: e.target.value})}
                                placeholder="Enter value..."
                                className="w-full rounded-md border border-gray-300 dark:border-surface-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            )}
                          </div>

                          {editingFilter.operator === 'between' && (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-text-primary">
                                End Value
                              </label>
                              <input
                                type="date"
                                value={editingFilter.value2}
                                onChange={(e) => setEditingFilter({...editingFilter, value2: e.target.value})}
                                className="w-full rounded-md border border-gray-300 dark:border-surface-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 p-6">
                        <button
                          onClick={() => setEditingFilter(null)}
                          className="rounded-md border border-gray-300 dark:border-surface-border px-4 py-2 text-sm font-medium text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveFilter}
                          disabled={!editingFilter.value}
                          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add filter
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Filter Property List */}
                      <div className="border-b border-gray-200 dark:border-surface-border p-6">
                        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-text-primary">Add filter</h3>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-text-tertiary" />
                          <input
                            type="text"
                            placeholder="Search in contact properties"
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            className="w-full rounded-md border border-gray-300 dark:border-surface-border py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      {/* Filter Options */}
                      <div className="flex-1 overflow-y-auto p-6">
                        <div className="mb-4">
                          <h4 className="mb-2 text-xs font-semibold text-gray-500 dark:text-text-secondary uppercase">Contact activity</h4>
                          <div className="space-y-1">
                            {advancedFilterProperties
                              .filter(prop => !filterSearch || prop.label.toLowerCase().includes(filterSearch.toLowerCase()))
                              .map((property) => (
                                <button
                                  key={property.recordId}
                                  className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
                                  onClick={() => handleAddFilter(property)}
                                >
                                  <span className="text-sm text-gray-700 dark:text-text-primary">{property.label}</span>
                                  <Plus className="h-4 w-4 text-gray-400 dark:text-text-tertiary" />
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-surface-border px-6 py-4">
                <button
                  onClick={handleClearAllFilters}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                  disabled={advancedFilters.length === 0 && Object.keys(activeFilters).length === 0}
                >
                  Clear all filters
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAdvancedFilters(false);
                      setEditingFilter(null);
                      setFilterSearch('');
                    }}
                    className="rounded-md border border-gray-300 dark:border-surface-border px-4 py-2 text-sm font-medium text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowAdvancedFilters(false);
                      setEditingFilter(null);
                      setFilterSearch('');
                    }}
                    className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
