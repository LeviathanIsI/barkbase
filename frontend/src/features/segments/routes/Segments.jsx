/**
 * Segments List Page - enterprise table view
 * /segments
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  X,
  
  
  Copy,
  Trash2,
  Zap,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import { ScrollableTableContainer } from '@/components/ui/ScrollableTableContainer';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import {
  useSegments,
  useDeleteSegment,
  useRefreshSegments,
  useCloneSegment,
  OBJECT_TYPES,
} from '../api';
import { formatDistanceToNow, format } from 'date-fns';
import StyledSelect from '@/components/ui/StyledSelect';
import { cn } from '@/lib/cn';

export default function Segments() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [objectFilter, setObjectFilter] = useState('all');
  const [sortField, setSortField] = useState('updatedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());

  const { data: segments, isLoading } = useSegments();
  const deleteSegment = useDeleteSegment();
  const refreshSegments = useRefreshSegments();
  const cloneSegment = useCloneSegment();

  // Filter and sort segments
  const filteredSegments = useMemo(() => {
    if (!segments) return [];

    return segments
      .filter((segment) => {
        // Search filter
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const name = (segment.name || '').toLowerCase();
          const description = (segment.description || '').toLowerCase();
          if (!name.includes(search) && !description.includes(search)) {
            return false;
          }
        }

        // Type filter - Use segment_type as single source of truth (consistent with detail page)
        if (typeFilter !== 'all') {
          const segmentType = segment.segment_type || (segment.isAutomatic ?? segment.isDynamic ? 'active' : 'static');
          if (typeFilter === 'active' && segmentType !== 'active') return false;
          if (typeFilter === 'static' && segmentType !== 'static') return false;
        }

        // Object filter
        if (objectFilter !== 'all') {
          const objectType = segment.object_type || segment.objectType || 'owners';
          if (objectType !== objectFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let aVal, bVal;

        switch (sortField) {
          case 'name':
            aVal = a.name || '';
            bVal = b.name || '';
            break;
          case 'memberCount':
            aVal = a._count?.members ?? a.memberCount ?? a.member_count ?? 0;
            bVal = b._count?.members ?? b.memberCount ?? b.member_count ?? 0;
            break;
          case 'createdAt':
            aVal = new Date(a.createdAt || a.created_at || 0);
            bVal = new Date(b.createdAt || b.created_at || 0);
            break;
          case 'updatedAt':
          default:
            aVal = new Date(a.updatedAt || a.updated_at || 0);
            bVal = new Date(b.updatedAt || b.updated_at || 0);
            break;
        }

        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        }
        return aVal < bVal ? 1 : -1;
      });
  }, [segments, searchTerm, typeFilter, objectFilter, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDeleteClick = (segment, e) => {
    e?.stopPropagation();
    setSegmentToDelete(segment);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (segmentToDelete) {
      await deleteSegment.mutateAsync(segmentToDelete.recordId ?? segmentToDelete.id);
      setDeleteModalOpen(false);
      setSegmentToDelete(null);
    }
  };

  const handleClone = async (segment, e) => {
    e?.stopPropagation();
    await cloneSegment.mutateAsync(segment.recordId ?? segment.id);
  };

  // Navigate to full page on row click
  const handleRowClick = (segment) => {
    navigate(`/segments/${segment.recordId ?? segment.id}`);
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedRows.size === filteredSegments.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredSegments.map((s) => s.recordId ?? s.id)));
    }
  };

  const handleSelectRow = (segmentId, e) => {
    e?.stopPropagation();
    const newSelected = new Set(selectedRows);
    if (newSelected.has(segmentId)) {
      newSelected.delete(segmentId);
    } else {
      newSelected.add(segmentId);
    }
    setSelectedRows(newSelected);
  };

  const handleBulkDelete = () => {
    // For bulk delete, we'll delete one at a time with confirmation
    const selectedSegments = filteredSegments.filter(
      (s) => selectedRows.has(s.recordId ?? s.id)
    );
    if (selectedSegments.length === 1) {
      setSegmentToDelete(selectedSegments[0]);
      setDeleteModalOpen(true);
    } else if (selectedSegments.length > 1) {
      // For multiple, set a placeholder that indicates bulk delete
      setSegmentToDelete({ name: `${selectedSegments.length} segments`, _bulk: selectedSegments });
      setDeleteModalOpen(true);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (segmentToDelete?._bulk) {
      // Bulk delete
      for (const seg of segmentToDelete._bulk) {
        await deleteSegment.mutateAsync(seg.recordId ?? seg.id);
      }
      setSelectedRows(new Set());
    } else if (segmentToDelete) {
      await deleteSegment.mutateAsync(segmentToDelete.recordId ?? segmentToDelete.id);
      setSelectedRows(new Set());
    }
    setDeleteModalOpen(false);
    setSegmentToDelete(null);
  };

  const SortHeader = ({ field, children }) => (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-[color:var(--bb-color-text-primary)] transition-colors"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );

  if (isLoading) {
    return <LoadingState label="Loading segments..." />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
      {/* Header - fixed, doesn't shrink */}
      <div className="flex-shrink-0 flex items-center justify-between pb-6">
        <div>
          <nav className="mb-2">
            <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
              <li><span>Clients</span></li>
              <li className="flex items-center"><ChevronRight className="h-3 w-3" /></li>
              <li className="text-[color:var(--bb-color-text-primary)] font-medium">Segments</li>
            </ol>
          </nav>
          <h1 className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">
            Customer Segments
          </h1>
          <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
            Group customers for targeted marketing and personalized service
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refreshSegments.mutateAsync()}
            disabled={refreshSegments.isPending}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshSegments.isPending && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/segments/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Segment
          </Button>
        </div>
      </div>

      {/* Filters - fixed, doesn't shrink */}
      <div className="flex-shrink-0 flex items-center gap-4 flex-wrap pb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          <input
            type="text"
            placeholder="Search segments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)] placeholder:text-[color:var(--bb-color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]/50"
          />
        </div>

        {/* Type Filter */}
        <div className="min-w-[140px]">
          <StyledSelect
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'active', label: 'Active' },
              { value: 'static', label: 'Static' },
            ]}
            value={typeFilter}
            onChange={(opt) => setTypeFilter(opt?.value || 'all')}
            isClearable={false}
            isSearchable={false}
          />
        </div>

        {/* Object Filter */}
        <div className="min-w-[140px]">
          <StyledSelect
            options={[
              { value: 'all', label: 'All Objects' },
              ...OBJECT_TYPES.map((type) => ({ value: type.value, label: type.label })),
            ]}
            value={objectFilter}
            onChange={(opt) => setObjectFilter(opt?.value || 'all')}
            isClearable={false}
            isSearchable
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRows.size > 0 && (
        <div className="flex-shrink-0 flex items-center gap-4 px-4 py-3 mb-4 rounded-lg bg-[color:var(--bb-color-accent)]/10 border border-[color:var(--bb-color-accent)]/30">
          <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
            {selectedRows.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
          <button
            type="button"
            className="ml-auto p-1 rounded hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
            onClick={() => setSelectedRows(new Set())}
          >
            <X className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          </button>
        </div>
      )}

      {/* Table - scrollable */}
      {filteredSegments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]">
          <Users className="h-12 w-12 mb-4 text-[color:var(--bb-color-text-muted)]" />
          <h3 className="text-lg font-medium text-[color:var(--bb-color-text-primary)] mb-2">
            {searchTerm || typeFilter !== 'all' || objectFilter !== 'all'
              ? 'No segments match your filters'
              : 'No segments yet'}
          </h3>
          <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-6">
            {searchTerm || typeFilter !== 'all' || objectFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first segment to start organizing customers'}
          </p>
          {!searchTerm && typeFilter === 'all' && objectFilter === 'all' && (
            <Button onClick={() => navigate('/segments/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Segment
            </Button>
          )}
        </div>
      ) : (
        <ScrollableTableContainer className="flex-1 rounded-lg border border-[color:var(--bb-color-border-subtle)]">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr style={{ backgroundColor: 'var(--bb-color-bg-elevated)', boxShadow: '0 1px 0 var(--bb-color-border-subtle)' }}>
                <th className="w-12 px-4 py-3" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filteredSegments.length && filteredSegments.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-[color:var(--bb-color-accent)] focus:ring-[color:var(--bb-color-accent)]"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                  <SortHeader field="name">Name</SortHeader>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                  Object
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                  <SortHeader field="memberCount">Size</SortHeader>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                  % of Total
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                  7 Day Change
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                  <SortHeader field="createdAt">Created</SortHeader>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                  <SortHeader field="updatedAt">Last Updated</SortHeader>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--bb-color-border-subtle)]">
              {filteredSegments.map((segment) => {
                // Use segment_type as single source of truth (consistent with detail page)
                // Falls back to isAutomatic/isDynamic for legacy data, defaults to 'static' if nothing set
                const segmentType = segment.segment_type || (segment.isAutomatic ?? segment.isDynamic ? 'active' : 'static');
                const isAuto = segmentType === 'active';
                const memberCount = segment._count?.members ?? segment.memberCount ?? segment.member_count ?? 0;
                const objectType = segment.object_type || segment.objectType || 'owners';
                const change7d = segment.change7d ?? segment.sevenDayChange ?? null;

                const segmentId = segment.recordId ?? segment.id;

                return (
                  <tr
                    key={segmentId}
                    className={cn(
                      "hover:bg-[color:var(--bb-color-bg-elevated)] cursor-pointer transition-colors",
                      selectedRows.has(segmentId) && "bg-[color:var(--bb-color-accent)]/5"
                    )}
                    onClick={() => handleRowClick(segment)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(segmentId)}
                        onChange={(e) => handleSelectRow(segmentId, e)}
                        className="h-4 w-4 rounded border-gray-300 text-[color:var(--bb-color-accent)] focus:ring-[color:var(--bb-color-accent)]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[color:var(--bb-color-text-primary)]">
                          {segment.name}
                        </p>
                        {segment.description && (
                          <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate max-w-xs">
                            {segment.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={isAuto ? 'blue' : 'gray'}
                        size="sm"
                        className="gap-1"
                      >
                        {isAuto && <Zap className="h-3 w-3" />}
                        {isAuto ? 'Active' : 'Static'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-[color:var(--bb-color-text-primary)]">
                      {OBJECT_TYPES.find((t) => t.value === objectType)?.label || 'Owners'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                      {memberCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[color:var(--bb-color-text-muted)]">
                      {segment.percentOfTotal ? `${segment.percentOfTotal.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {change7d !== null ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-sm font-medium',
                            change7d > 0 && 'text-emerald-600',
                            change7d < 0 && 'text-red-600',
                            change7d === 0 && 'text-[color:var(--bb-color-text-muted)]'
                          )}
                        >
                          {change7d > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : change7d < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {change7d > 0 ? '+' : ''}
                          {change7d}
                        </span>
                      ) : (
                        <span className="text-sm text-[color:var(--bb-color-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[color:var(--bb-color-text-muted)]">
                      {segment.createdAt || segment.created_at
                        ? format(new Date(segment.createdAt || segment.created_at), 'MMM d, yyyy')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[color:var(--bb-color-text-muted)]">
                      {segment.updatedAt || segment.updated_at
                        ? formatDistanceToNow(new Date(segment.updatedAt || segment.updated_at), {
                            addSuffix: true,
                          })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollableTableContainer>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSegmentToDelete(null);
        }}
        onConfirm={handleBulkDeleteConfirm}
        resourceName={segmentToDelete?.name || ''}
        resourceType="segment"
        isDeleting={deleteSegment.isPending}
      />
    </div>
  );
}
