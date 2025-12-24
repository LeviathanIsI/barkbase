/**
 * DataTable - Phase 8 Enterprise Table System
 * Full-featured data table with token-based styling for consistent theming.
 */

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
import StyledSelect from './StyledSelect';

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
      <div
        className="flex items-center justify-between border-b px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-4,1rem)]"
        style={{
          borderColor: 'var(--bb-color-border-subtle)',
          backgroundColor: 'var(--bb-color-bg-surface)',
        }}
      >
        <div>
          <h1
            className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {title}
          </h1>
          {recordCount > 0 && (
            <p
              className="text-[var(--bb-font-size-sm,0.875rem)]"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              {recordCount.toLocaleString()} record{recordCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
          {headerActions}
        </div>
      </div>

      {/* Views/Tabs Bar */}
      {views.length > 0 && (
        <div
          className="flex items-center justify-between border-b px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-2,0.5rem)]"
          style={{
            borderColor: 'var(--bb-color-border-subtle)',
            backgroundColor: 'var(--bb-color-bg-surface)',
          }}
        >
          <div className="flex items-center gap-[var(--bb-space-2,0.5rem)] overflow-x-auto">
            {views.map((view) => (
              <Button
                key={view.recordId}
                variant={activeView === view.recordId ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onViewChange?.(view.recordId)}
                className="whitespace-nowrap"
              >
                {view.label}
                {view.canClose && activeView === view.recordId && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="h-3 w-3" />}
            >
              Add view
            </Button>
          </div>
          <Button
            variant="link"
            size="sm"
          >
            All Views
          </Button>
        </div>
      )}

      {/* Filters & Actions Bar */}
      <div
        className="flex items-center gap-[var(--bb-space-2,0.5rem)] border-b px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-3,0.75rem)]"
        style={{
          borderColor: 'var(--bb-color-border-subtle)',
          backgroundColor: 'var(--bb-color-bg-surface)',
        }}
      >
        {/* View Mode Toggle */}
        <div
          className="flex items-center gap-0.5 rounded-md border p-0.5"
          style={{
            borderColor: 'var(--bb-color-border-subtle)',
            backgroundColor: 'var(--bb-color-bg-elevated)',
          }}
        >
          <Button variant="primary" size="icon-sm">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm">
            <Grid3x3 className="h-4 w-4" />
          </Button>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            leftIcon={<Plus className="h-3 w-3" />}
          >
            More
          </Button>

          {showMoreFilters && (
            <div
              className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border shadow-lg"
              style={{
                borderColor: 'var(--bb-color-border-subtle)',
                backgroundColor: 'var(--bb-color-bg-surface)',
              }}
            >
              <div className="p-[var(--bb-space-4,1rem)]">
                <h3
                  className="mb-[var(--bb-space-3,0.75rem)] text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)]"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  Additional Filters
                </h3>
                <div className="space-y-[var(--bb-space-2,0.5rem)]">
                  {['Owner Type', 'Pet Count', 'Location'].map((filterName) => (
                    <Button
                      key={filterName}
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMoreFilters(false)}
                      className="w-full justify-between"
                      rightIcon={<Plus className="h-4 w-4" />}
                    >
                      {filterName}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        <Button
          variant={advancedFilters.length > 0 ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setShowAdvancedFilters(true)}
          leftIcon={<Filter className="h-3 w-3" />}
        >
          Advanced filters
        </Button>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-64">
          <Search
            className="absolute left-[var(--bb-space-3,0.75rem)] top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--bb-color-text-muted)' }}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border py-[var(--bb-space-1\\.5,0.375rem)] pl-9 pr-[var(--bb-space-3,0.75rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2"
            style={{
              borderColor: 'var(--bb-color-border-subtle)',
              backgroundColor: 'var(--bb-color-bg-elevated)',
              color: 'var(--bb-color-text-primary)',
            }}
          />
        </div>

        {/* Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
        >
          Export
        </Button>

        {/* Edit Columns */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTempVisibleColumns(visibleColumns);
            setShowColumnEditor(true);
          }}
          leftIcon={<Settings2 className="h-4 w-4" />}
        >
          Edit columns
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRows.size > 0 && (
        <div
          className="flex items-center justify-between border-b px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-3,0.75rem)]"
          style={{
            borderColor: 'var(--bb-color-border-subtle)',
            backgroundColor: 'var(--bb-color-accent-soft)',
          }}
        >
          <span
            className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {selectedRows.size} {selectedRows.size === 1 ? 'item' : 'items'} selected
          </span>
          <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
            >
              Export Selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRows(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}>
        <table className="w-full">
          <thead
            className="border-b"
            style={{
              borderColor: 'var(--bb-color-border-subtle)',
              backgroundColor: 'var(--bb-color-bg-elevated)',
            }}
          >
            <tr>
              {enableSelection && (
                <th className="w-12 px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-3,0.75rem)]">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    className="h-4 w-4 rounded"
                    style={{
                      borderColor: 'var(--bb-color-border-subtle)',
                      accentColor: 'var(--bb-color-accent)',
                    }}
                  />
                </th>
              )}
              {columns.map((column, idx) => {
                if (!visibleColumns[idx]) return null;
                return (
                  <th
                    key={idx}
                    className={cn(
                      'px-[var(--bb-space-4,1rem)] py-[var(--bb-space-3,0.75rem)] text-left text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wider',
                      column.sortable && 'cursor-pointer select-none'
                    )}
                    style={{ color: 'var(--bb-color-text-muted)' }}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-[var(--bb-space-1,0.25rem)]">
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
          <tbody
            className="divide-y"
            style={{
              divideColor: 'var(--bb-color-border-subtle)',
              backgroundColor: 'var(--bb-color-bg-surface)',
            }}
          >
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={Object.values(visibleColumns).filter(Boolean).length + (enableSelection ? 1 : 0)}
                  className="px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-12,3rem)] text-center text-[var(--bb-font-size-sm,0.875rem)]"
                  style={{ color: 'var(--bb-color-text-muted)' }}
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
                    'transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  style={{
                    backgroundColor: 'var(--bb-color-bg-surface)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bb-color-sidebar-item-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bb-color-bg-surface)';
                  }}
                >
                  {enableSelection && (
                    <td className="px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-4,1rem)]">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.recordId)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(row.recordId);
                        }}
                        aria-label="Select row"
                        className="h-4 w-4 rounded"
                        style={{
                          borderColor: 'var(--bb-color-border-subtle)',
                          accentColor: 'var(--bb-color-accent)',
                        }}
                      />
                    </td>
                  )}
                  {columns.map((column, idx) => {
                    if (!visibleColumns[idx]) return null;
                    return (
                      <td
                        key={idx}
                        className="px-[var(--bb-space-4,1rem)] py-[var(--bb-space-4,1rem)] text-[var(--bb-font-size-sm,0.875rem)]"
                        style={{ color: 'var(--bb-color-text-primary)' }}
                      >
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
      <div
        className="flex items-center justify-center gap-[var(--bb-space-1,0.25rem)] border-t px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-4,1rem)]"
        style={{
          borderColor: 'var(--bb-color-border-subtle)',
          backgroundColor: 'var(--bb-color-bg-surface)',
        }}
      >
        <Button
          variant="link"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Prev
        </Button>

        {getPaginationRange().map((page, idx) => (
          page === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-[var(--bb-space-2,0.5rem)]"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="min-w-[2rem]"
            >
              {page}
            </Button>
          )
        ))}

        <Button
          variant="link"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>

        <div ref={pageSizeDropdownRef} className="relative ml-[var(--bb-space-4,1rem)]">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPageSizeDropdown(!showPageSizeDropdown)}
            rightIcon={
              <ChevronDown
                className={cn('h-3 w-3 transition-transform', showPageSizeDropdown && 'rotate-180')}
              />
            }
          >
            {itemsPerPage} per page
          </Button>

          {showPageSizeDropdown && (
            <div
              className="absolute bottom-full left-0 mb-1 w-full rounded-md border shadow-lg"
              style={{
                borderColor: 'var(--bb-color-border-subtle)',
                backgroundColor: 'var(--bb-color-bg-surface)',
              }}
            >
              <div className="py-[var(--bb-space-1,0.25rem)]">
                {[25, 50, 100].map((size) => (
                  <Button
                    key={size}
                    variant={itemsPerPage === size ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setItemsPerPage(size);
                      setCurrentPage(1);
                      setShowPageSizeDropdown(false);
                    }}
                    className="w-full justify-between"
                    rightIcon={itemsPerPage === size ? <Check className="h-4 w-4" /> : undefined}
                  >
                    {size} per page
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column Editor Modal */}
      {showColumnEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'var(--bb-color-overlay-scrim)' }}
        >
          <div
            className="flex h-[600px] w-full max-w-5xl rounded-lg shadow-2xl"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}
          >
            {/* Header */}
            <div className="flex w-full flex-col">
              <div
                className="flex items-center justify-between border-b px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-4,1rem)]"
                style={{
                  borderColor: 'var(--bb-color-border-subtle)',
                  backgroundColor: 'var(--bb-color-accent)',
                }}
              >
                <h2
                  className="text-[var(--bb-font-size-lg,1.125rem)] font-[var(--bb-font-weight-semibold,600)]"
                  style={{ color: 'var(--bb-color-text-on-accent)' }}
                >
                  Choose which columns you see
                </h2>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={cancelColumnChanges}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Side - All Columns */}
                <div
                  className="flex w-2/3 flex-col border-r"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  {/* Search */}
                  <div
                    className="border-b p-[var(--bb-space-4,1rem)]"
                    style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                  >
                    <div className="relative">
                      <Search
                        className="absolute left-[var(--bb-space-3,0.75rem)] top-1/2 h-4 w-4 -translate-y-1/2"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      />
                      <input
                        type="text"
                        placeholder="Search columns..."
                        value={columnSearch}
                        onChange={(e) => setColumnSearch(e.target.value)}
                        className="w-full rounded-md border py-[var(--bb-space-2,0.5rem)] pl-10 pr-[var(--bb-space-3,0.75rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2"
                        style={{
                          borderColor: 'var(--bb-color-border-subtle)',
                          backgroundColor: 'var(--bb-color-bg-elevated)',
                          color: 'var(--bb-color-text-primary)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Column List */}
                  <div className="flex-1 overflow-y-auto p-[var(--bb-space-4,1rem)]">
                    <div
                      className="mb-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-semibold,600)] uppercase"
                      style={{ color: 'var(--bb-color-text-muted)' }}
                    >
                      COLUMNS
                    </div>
                    <div className="space-y-[var(--bb-space-1,0.25rem)]">
                      {filteredColumns.map((col, idx) => {
                        const originalIdx = columns.findIndex(c => c.header === col.header);
                        return (
                          <label
                            key={originalIdx}
                            className="flex items-center gap-[var(--bb-space-3,0.75rem)] rounded px-[var(--bb-space-2,0.5rem)] py-[var(--bb-space-2,0.5rem)] cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={tempVisibleColumns[originalIdx]}
                              onChange={() => toggleColumnVisibility(originalIdx)}
                              className="h-4 w-4 rounded"
                              style={{
                                borderColor: 'var(--bb-color-border-subtle)',
                                accentColor: 'var(--bb-color-accent)',
                              }}
                            />
                            <span
                              className="text-[var(--bb-font-size-sm,0.875rem)]"
                              style={{ color: 'var(--bb-color-text-primary)' }}
                            >
                              {col.header}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Side - Selected Columns */}
                <div
                  className="flex w-1/3 flex-col"
                  style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
                >
                  <div
                    className="border-b p-[var(--bb-space-4,1rem)]"
                    style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                  >
                    <div className="flex items-center justify-between">
                      <h3
                        className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)]"
                        style={{ color: 'var(--bb-color-text-primary)' }}
                      >
                        SELECTED COLUMNS ({selectedColumnsCount})
                      </h3>
                      <span
                        className="text-[var(--bb-font-size-xs,0.75rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        Frozen columns: 0
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-[var(--bb-space-4,1rem)]">
                    <div className="space-y-[var(--bb-space-1,0.25rem)]">
                      {columns.map((col, idx) => {
                        if (!tempVisibleColumns[idx]) return null;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)]"
                            style={{
                              borderColor: 'var(--bb-color-border-subtle)',
                              backgroundColor: 'var(--bb-color-bg-surface)',
                            }}
                          >
                            <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
                              <span style={{ color: 'var(--bb-color-text-muted)' }}>&#8942;&#8942;</span>
                              <span style={{ color: 'var(--bb-color-text-primary)' }}>{col.header}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => toggleColumnVisibility(idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between border-t px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-4,1rem)]"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <Button
                  variant="link"
                  size="sm"
                  onClick={removeAllColumns}
                  className="text-red-500 hover:text-red-600"
                >
                  Remove All Columns
                </Button>
                <div className="flex gap-[var(--bb-space-2,0.5rem)]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelColumnChanges}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={applyColumnChanges}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'var(--bb-color-overlay-scrim)' }}
        >
          <div
            className="flex h-[600px] w-full max-w-4xl rounded-lg shadow-2xl"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}
          >
            <div className="flex w-full flex-col">
              {/* Header */}
              <div
                className="flex items-center justify-between border-b px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-4,1rem)]"
                style={{
                  borderColor: 'var(--bb-color-border-subtle)',
                  backgroundColor: 'var(--bb-color-accent)',
                }}
              >
                <h2
                  className="text-[var(--bb-font-size-lg,1.125rem)] font-[var(--bb-font-weight-semibold,600)]"
                  style={{ color: 'var(--bb-color-text-on-accent)' }}
                >
                  All Filters
                </h2>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowAdvancedFilters(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Side - Current Filters */}
                <div
                  className="flex w-1/2 flex-col border-r p-[var(--bb-space-6,1.5rem)]"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  {/* Quick Filters */}
                  <div className="mb-[var(--bb-space-6,1.5rem)]">
                    <div className="mb-[var(--bb-space-3,0.75rem)] flex items-center justify-between">
                      <h3
                        className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)]"
                        style={{ color: 'var(--bb-color-text-primary)' }}
                      >
                        Quick filters
                      </h3>
                      <Button variant="link" size="xs">
                        Hide
                      </Button>
                    </div>
                    <p
                      className="text-[var(--bb-font-size-xs,0.75rem)] mb-[var(--bb-space-3,0.75rem)]"
                      style={{ color: 'var(--bb-color-text-muted)' }}
                    >
                      These filters were set within the current table.
                    </p>

                    {/* Show active filters */}
                    {Object.keys(activeFilters).length > 0 ? (
                      <div className="space-y-[var(--bb-space-2,0.5rem)]">
                        {Object.entries(activeFilters).map(([key, value]) => {
                          const group = filterGroups.find(g => g.recordId === key);
                          const option = group?.options?.find(o => o.value === value);
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between rounded px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)]"
                              style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
                            >
                              <div>
                                <span
                                  className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                                  style={{ color: 'var(--bb-color-text-primary)' }}
                                >
                                  {group?.label}:{' '}
                                </span>
                                <span
                                  className="text-[var(--bb-font-size-sm,0.875rem)]"
                                  style={{ color: 'var(--bb-color-text-primary)' }}
                                >
                                  {option?.label || value}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => onFilterClear?.(key)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p
                        className="text-[var(--bb-font-size-sm,0.875rem)] italic"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        No quick filters applied
                      </p>
                    )}
                  </div>

                  {/* Advanced Filters */}
                  <div
                    className="flex-1 border-t pt-[var(--bb-space-6,1.5rem)]"
                    style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                  >
                    <h3
                      className="mb-[var(--bb-space-3,0.75rem)] text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)]"
                      style={{ color: 'var(--bb-color-text-primary)' }}
                    >
                      Advanced Filters
                    </h3>
                    {advancedFilters.length > 0 ? (
                      <div className="space-y-[var(--bb-space-2,0.5rem)]">
                        {advancedFilters.map((filter) => {
                          const operators = getOperatorsForType(filter.propertyType);
                          const operatorLabel = operators.find(o => o.value === filter.operator)?.label || filter.operator;
                          return (
                            <div
                              key={filter.recordId}
                              className="rounded px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)]"
                              style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 text-[var(--bb-font-size-sm,0.875rem)]">
                                  <span
                                    className="font-[var(--bb-font-weight-medium,500)]"
                                    style={{ color: 'var(--bb-color-text-primary)' }}
                                  >
                                    {filter.propertyLabel}
                                  </span>
                                  <span style={{ color: 'var(--bb-color-text-muted)' }}> {operatorLabel} </span>
                                  <span
                                    className="font-[var(--bb-font-weight-medium,500)]"
                                    style={{ color: 'var(--bb-color-text-primary)' }}
                                  >
                                    {filter.value}
                                  </span>
                                  {filter.operator === 'between' && filter.value2 && (
                                    <span style={{ color: 'var(--bb-color-text-muted)' }}>
                                      {' '}and{' '}
                                      <span
                                        className="font-[var(--bb-font-weight-medium,500)]"
                                        style={{ color: 'var(--bb-color-text-primary)' }}
                                      >
                                        {filter.value2}
                                      </span>
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleRemoveAdvancedFilter(filter.recordId)}
                                  className="ml-[var(--bb-space-2,0.5rem)]"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p
                        className="text-[var(--bb-font-size-xs,0.75rem)] mb-[var(--bb-space-4,1rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
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
                      <div
                        className="border-b p-[var(--bb-space-6,1.5rem)]"
                        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                      >
                        <div className="mb-[var(--bb-space-4,1rem)] flex items-center justify-between">
                          <h3
                            className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)]"
                            style={{ color: 'var(--bb-color-text-primary)' }}
                          >
                            Configure filter
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setEditingFilter(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-[var(--bb-space-4,1rem)]">
                          <div>
                            <label
                              className="mb-[var(--bb-space-1,0.25rem)] block text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)]"
                              style={{ color: 'var(--bb-color-text-primary)' }}
                            >
                              Property
                            </label>
                            <input
                              type="text"
                              value={editingFilter.propertyLabel}
                              disabled
                              className="w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)]"
                              style={{
                                borderColor: 'var(--bb-color-border-subtle)',
                                backgroundColor: 'var(--bb-color-bg-elevated)',
                                color: 'var(--bb-color-text-primary)',
                              }}
                            />
                          </div>

                          <StyledSelect
                            label="Operator"
                            options={getOperatorsForType(editingFilter.propertyType)}
                            value={editingFilter.operator}
                            onChange={(opt) => setEditingFilter({...editingFilter, operator: opt?.value || ''})}
                            isClearable={false}
                            isSearchable={false}
                          />

                          <div>
                            <label
                              className="mb-[var(--bb-space-1,0.25rem)] block text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)]"
                              style={{ color: 'var(--bb-color-text-primary)' }}
                            >
                              Value
                            </label>
                            {editingFilter.propertyType === 'date' ? (
                              <input
                                type="date"
                                value={editingFilter.value}
                                onChange={(e) => setEditingFilter({...editingFilter, value: e.target.value})}
                                className="w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2"
                                style={{
                                  borderColor: 'var(--bb-color-border-subtle)',
                                  backgroundColor: 'var(--bb-color-bg-surface)',
                                  color: 'var(--bb-color-text-primary)',
                                }}
                              />
                            ) : editingFilter.propertyType === 'number' ? (
                              <input
                                type="number"
                                value={editingFilter.value}
                                onChange={(e) => setEditingFilter({...editingFilter, value: e.target.value})}
                                placeholder="Enter number..."
                                className="w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2"
                                style={{
                                  borderColor: 'var(--bb-color-border-subtle)',
                                  backgroundColor: 'var(--bb-color-bg-surface)',
                                  color: 'var(--bb-color-text-primary)',
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                value={editingFilter.value}
                                onChange={(e) => setEditingFilter({...editingFilter, value: e.target.value})}
                                placeholder="Enter value..."
                                className="w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2"
                                style={{
                                  borderColor: 'var(--bb-color-border-subtle)',
                                  backgroundColor: 'var(--bb-color-bg-surface)',
                                  color: 'var(--bb-color-text-primary)',
                                }}
                              />
                            )}
                          </div>

                          {editingFilter.operator === 'between' && (
                            <div>
                              <label
                                className="mb-[var(--bb-space-1,0.25rem)] block text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)]"
                                style={{ color: 'var(--bb-color-text-primary)' }}
                              >
                                End Value
                              </label>
                              <input
                                type="date"
                                value={editingFilter.value2}
                                onChange={(e) => setEditingFilter({...editingFilter, value2: e.target.value})}
                                className="w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2"
                                style={{
                                  borderColor: 'var(--bb-color-border-subtle)',
                                  backgroundColor: 'var(--bb-color-bg-surface)',
                                  color: 'var(--bb-color-text-primary)',
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-[var(--bb-space-2,0.5rem)] p-[var(--bb-space-6,1.5rem)]">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingFilter(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSaveFilter}
                          disabled={!editingFilter.value}
                        >
                          Add filter
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Filter Property List */}
                      <div
                        className="border-b p-[var(--bb-space-6,1.5rem)]"
                        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                      >
                        <h3
                          className="mb-[var(--bb-space-3,0.75rem)] text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)]"
                          style={{ color: 'var(--bb-color-text-primary)' }}
                        >
                          Add filter
                        </h3>
                        <div className="relative">
                          <Search
                            className="absolute left-[var(--bb-space-3,0.75rem)] top-1/2 h-4 w-4 -translate-y-1/2"
                            style={{ color: 'var(--bb-color-text-muted)' }}
                          />
                          <input
                            type="text"
                            placeholder="Search in contact properties"
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            className="w-full rounded-md border py-[var(--bb-space-2,0.5rem)] pl-10 pr-[var(--bb-space-3,0.75rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2"
                            style={{
                              borderColor: 'var(--bb-color-border-subtle)',
                              backgroundColor: 'var(--bb-color-bg-elevated)',
                              color: 'var(--bb-color-text-primary)',
                            }}
                          />
                        </div>
                      </div>

                      {/* Filter Options */}
                      <div className="flex-1 overflow-y-auto p-[var(--bb-space-6,1.5rem)]">
                        <div className="mb-[var(--bb-space-4,1rem)]">
                          <h4
                            className="mb-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-semibold,600)] uppercase"
                            style={{ color: 'var(--bb-color-text-muted)' }}
                          >
                            Contact activity
                          </h4>
                          <div className="space-y-[var(--bb-space-1,0.25rem)]">
                            {advancedFilterProperties
                              .filter(prop => !filterSearch || prop.label.toLowerCase().includes(filterSearch.toLowerCase()))
                              .map((property) => (
                                <Button
                                  key={property.recordId}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-between"
                                  onClick={() => handleAddFilter(property)}
                                  rightIcon={<Plus className="h-4 w-4" />}
                                >
                                  {property.label}
                                </Button>
                              ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between border-t px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-4,1rem)]"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleClearAllFilters}
                  className="text-red-500 hover:text-red-600"
                  disabled={advancedFilters.length === 0 && Object.keys(activeFilters).length === 0}
                >
                  Clear all filters
                </Button>
                <div className="flex gap-[var(--bb-space-2,0.5rem)]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAdvancedFilters(false);
                      setEditingFilter(null);
                      setFilterSearch('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowAdvancedFilters(false);
                      setEditingFilter(null);
                      setFilterSearch('');
                    }}
                  >
                    Apply filters
                  </Button>
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
