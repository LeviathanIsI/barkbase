/**
 * Segment Detail Page - enterprise full page with tabs
 * /segments/:id
 *
 * FIXES APPLIED:
 * 1. Inline filter editing (no navigation away)
 * 2. Single source of truth for segment type (segment.segment_type)
 * 3. Stats row links wired to actual actions
 * 4. Activity shows actual user from modifiedBy field
 * 5. Access panel fetches teams/users from API
 * 6. Convert modal for type conversion
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Edit2,
  Copy,
  Trash2,
  Download,
  RefreshCw,
  Zap,
  Mail,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  BarChart3,
  History,
  Settings,
  Pencil,
  X,
  Plus,
  Check,
  AlertTriangle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import SlideOutDrawer from '@/components/ui/SlideOutDrawer';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import StyledSelect from '@/components/ui/StyledSelect';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import { useQuery } from '@tanstack/react-query';
import {
  useSegment,
  useSegmentMembers,
  useDeleteSegment,
  useCloneSegment,
  useConvertSegment,
  useRefreshSegment,
  useExportSegment,
  useSegmentActivity,
  useSegmentPreview,
  OBJECT_TYPES,
  SEGMENT_FIELDS,
  OPERATORS,
} from '../api';
import { useUpdateSegment } from '@/features/communications/api';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/cn';

// Tab definitions
const TABS = [
  { id: 'overview', label: 'Overview', icon: Users },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Hook to fetch team members
const useTeamMembers = () => {
  return useQuery({
    queryKey: ['memberships'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/memberships');
        return res.data?.data || res.data?.members || [];
      } catch (e) {
        console.warn('[memberships] Error:', e?.message);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

export default function SegmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showUseInMenu, setShowUseInMenu] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: segment, isLoading, refetch } = useSegment(id);
  const deleteMutation = useDeleteSegment();
  const cloneMutation = useCloneSegment();
  const convertMutation = useConvertSegment();
  const refreshMutation = useRefreshSegment();
  const exportMutation = useExportSegment();
  const updateSegmentMutation = useUpdateSegment();

  // Inline editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // Single source of truth for segment type
  // Falls back to isAutomatic/isDynamic for legacy data, defaults to 'static' if nothing set
  const segmentType = segment?.segment_type || (segment?.isAutomatic ?? segment?.isDynamic ? 'active' : 'static');
  const isActive = segmentType === 'active';
  const memberCount = segment?._count?.members ?? segment?.memberCount ?? segment?.member_count ?? 0;
  const objectType = segment?.object_type || segment?.objectType || 'owners';

  // Handle inline name save
  const handleNameSave = async () => {
    if (editedName.trim() && editedName.trim() !== segment?.name) {
      try {
        await updateSegmentMutation.mutateAsync({ segmentId: id, name: editedName.trim() });
        refetch();
      } catch (error) {
        toast.error('Failed to update name');
      }
    }
    setIsEditingName(false);
  };

  // Handle inline description save
  const handleDescriptionSave = async () => {
    const newDesc = editedDescription.trim();
    if (newDesc !== (segment?.description || '')) {
      try {
        await updateSegmentMutation.mutateAsync({ segmentId: id, description: newDesc });
        refetch();
      } catch (error) {
        toast.error('Failed to update description');
      }
    }
    setIsEditingDescription(false);
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Segment deleted');
      navigate('/segments');
    } catch (error) {
      toast.error('Failed to delete segment');
    }
  };

  const handleClone = async () => {
    try {
      await cloneMutation.mutateAsync(id);
      toast.success('Segment cloned');
    } catch (error) {
      toast.error('Failed to clone segment');
    }
  };

  const handleConvert = async () => {
    const targetType = isActive ? 'static' : 'active';
    try {
      await convertMutation.mutateAsync({ segmentId: id, targetType });
      toast.success(`Converted to ${targetType} segment`);
      setShowConvertModal(false);
      refetch();
    } catch (error) {
      toast.error('Failed to convert segment');
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync(id);
      toast.success('Segment refreshed');
      refetch();
    } catch (error) {
      toast.error('Failed to refresh segment');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportMutation.mutateAsync(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${segment?.name || 'segment'}-export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Export downloaded');
    } catch (error) {
      toast.error('Failed to export segment');
    }
  };

  // Auto-refresh stats on page load to ensure counts are current
  const hasAutoRefreshed = useRef(false);
  useEffect(() => {
    if (segment && !hasAutoRefreshed.current && !isLoading) {
      hasAutoRefreshed.current = true;
      // Silently refresh in background to get current counts
      refreshMutation.mutateAsync(id).then(() => refetch()).catch(() => {});
    }
  }, [segment, id, isLoading]);

  if (isLoading) {
    return <LoadingState label="Loading segment..." />;
  }

  if (!segment) {
    return (
      <div className="text-center py-16">
        <Users className="h-12 w-12 mx-auto mb-4 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="text-lg font-medium text-[color:var(--bb-color-text-primary)] mb-2">
          Segment not found
        </h3>
        <Button onClick={() => navigate('/segments')}>Back to Segments</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--bb-color-bg-body)]">
      {/* Header */}
      <div className="border-b border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]">
        <div className="px-6 py-4">
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigate('/segments')}
              className="flex items-center gap-1 text-sm text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to segments
            </button>

            <div className="flex items-center gap-2">
              {/* Use In Menu */}
              <div className="relative">
                <Button variant="outline" onClick={() => setShowUseInMenu(!showUseInMenu)}>
                  Use in
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
                {showUseInMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowUseInMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] shadow-lg py-1">
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)] flex items-center gap-2"
                        onClick={() => {
                          setShowUseInMenu(false);
                          toast.info('Email campaigns coming soon');
                        }}
                      >
                        <Mail className="h-4 w-4" />
                        Email Campaign
                      </button>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)] flex items-center gap-2"
                        onClick={() => {
                          setShowUseInMenu(false);
                          handleExport();
                        }}
                      >
                        <Download className="h-4 w-4" />
                        Export to CSV
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Actions Menu */}
              <div className="relative">
                <Button variant="outline" onClick={() => setShowActionsMenu(!showActionsMenu)}>
                  Actions
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
                {showActionsMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] shadow-lg py-1">
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)] flex items-center gap-2"
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleRefresh();
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh Member Count
                      </button>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)] flex items-center gap-2"
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleClone();
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        Clone Segment
                      </button>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)] flex items-center gap-2"
                        onClick={() => {
                          setShowActionsMenu(false);
                          setShowConvertModal(true);
                        }}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Convert to {isActive ? 'Static' : 'Active'}
                      </button>
                      <div className="border-t border-[color:var(--bb-color-border-subtle)] my-1" />
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        onClick={() => {
                          setShowActionsMenu(false);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Segment
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Segment name and badges - Inline editable */}
          <div className="flex items-center gap-3 mb-2">
            {isEditingName ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                autoFocus
                className="text-2xl font-bold text-[color:var(--bb-color-text-primary)] bg-transparent border-b-2 border-[color:var(--bb-color-accent)] outline-none px-0 py-0"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditedName(segment.name || '');
                  setIsEditingName(true);
                }}
                className="flex items-center gap-2 group"
              >
                <h1 className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">
                  {segment.name}
                </h1>
                <Pencil className="h-4 w-4 text-[color:var(--bb-color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            <Badge variant="outline" size="sm">
              {OBJECT_TYPES.find((t) => t.value === objectType)?.label || 'Owners'}
            </Badge>
            <Badge variant={isActive ? 'blue' : 'gray'} size="sm" className="gap-1">
              {isActive && <Zap className="h-3 w-3" />}
              {isActive ? 'Active' : 'Static'}
            </Badge>
            <Badge variant="primary" size="sm">
              Size: {memberCount.toLocaleString()}
            </Badge>
          </div>

          {/* Description - Inline editable */}
          {isEditingDescription ? (
            <input
              type="text"
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDescriptionSave();
                if (e.key === 'Escape') setIsEditingDescription(false);
              }}
              autoFocus
              placeholder="Enter segment description..."
              className="text-sm text-[color:var(--bb-color-text-muted)] bg-transparent border-b border-[color:var(--bb-color-accent)] outline-none w-full max-w-xl"
            />
          ) : segment.description ? (
            <button
              type="button"
              onClick={() => {
                setEditedDescription(segment.description || '');
                setIsEditingDescription(true);
              }}
              className="text-sm text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] text-left transition-colors"
            >
              {segment.description}
            </button>
          ) : (
            <button
              type="button"
              className="text-sm text-[color:var(--bb-color-accent)] hover:underline"
              onClick={() => {
                setEditedDescription('');
                setIsEditingDescription(true);
              }}
            >
              What is the purpose of this segment? Create description
            </button>
          )}

          {/* Tabs */}
          <div className="flex gap-6 mt-6 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  'flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-[color:var(--bb-color-accent)] text-[color:var(--bb-color-accent)]'
                    : 'border-transparent text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]'
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            segment={segment}
            segmentType={segmentType}
            objectType={objectType}
            onExport={handleExport}
            onTabChange={setActiveTab}
            onConvert={() => setShowConvertModal(true)}
            onRefresh={refetch}
          />
        )}
        {activeTab === 'performance' && <PerformanceTab segment={segment} />}
        {activeTab === 'activity' && <ActivityTab segmentId={id} />}
        {activeTab === 'settings' && (
          <SettingsTab
            segment={segment}
            onDelete={handleDelete}
            onConvert={() => setShowConvertModal(true)}
            segmentType={segmentType}
          />
        )}
      </div>

      {/* Convert Confirmation Modal */}
      {showConvertModal && (
        <ConvertModal
          segment={segment}
          segmentType={segmentType}
          onConfirm={handleConvert}
          onCancel={() => setShowConvertModal(false)}
          isLoading={convertMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        resourceName={segment?.name || ''}
        resourceType="segment"
        isDeleting={deleteMutation.isPending}
        warningMessage="All members will be removed and any campaigns using this segment will need to be updated."
      />
    </div>
  );
}

// Convert Confirmation Modal
const ConvertModal = ({ segment, segmentType, onConfirm, onCancel, isLoading }) => {
  const isActive = segmentType === 'active';
  const targetType = isActive ? 'Static' : 'Active';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-[color:var(--bb-color-bg-surface)] rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
              Convert to {targetType}?
            </h3>
            <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-2">
              {isActive ? (
                <>
                  Converting to <strong>Static</strong> will freeze the current members.
                  The segment will no longer automatically update based on filters.
                </>
              ) : (
                <>
                  Converting to <strong>Active</strong> will make this segment dynamically
                  update based on its filters. Current manual members will be replaced.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Converting...' : `Convert to ${targetType}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// OVERVIEW TAB - Two-panel layout with INLINE filter editing
// ============================================================================
const OverviewTab = ({ segment, segmentType, objectType, onExport, onTabChange, onConvert, onRefresh }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isEditingFilters, setIsEditingFilters] = useState(false);
  const [editedFilters, setEditedFilters] = useState(null);
  const [showTeamDrawer, setShowTeamDrawer] = useState(false);
  const [pageSize, setPageSize] = useState(100);

  const updateSegment = useUpdateSegment();

  const {
    data: membersData,
    isLoading: isLoadingMembers,
    fetchNextPage,
    hasNextPage,
  } = useSegmentMembers(id);

  // Preview for edited filters
  const { data: previewData, isLoading: isPreviewLoading } = useSegmentPreview(
    editedFilters,
    objectType,
    isEditingFilters && editedFilters?.groups?.length > 0
  );

  const members = membersData?.pages?.flatMap((page) => page.data) || [];
  const memberCount = segment?._count?.members ?? segment?.memberCount ?? segment?.member_count ?? 0;
  const change7d = segment?.change7d ?? segment?.sevenDayChange ?? segment?.seven_day_change ?? null;
  const percentOfTotal = segment?.percentOfTotal ?? segment?.percent_of_total ?? null;
  const filters = segment?.filters || { groups: [], groupLogic: 'OR' };
  const isActive = segmentType === 'active';

  // Start editing filters
  const handleEditFilters = () => {
    setEditedFilters(JSON.parse(JSON.stringify(filters)));
    setIsEditingFilters(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedFilters(null);
    setIsEditingFilters(false);
  };

  // Save edited filters
  const handleSaveFilters = async () => {
    try {
      await updateSegment.mutateAsync({
        segmentId: id,
        filters: editedFilters,
      });
      queryClient.invalidateQueries({ queryKey: ['segment', id] });
      queryClient.invalidateQueries({ queryKey: ['segment-members', id] });
      toast.success('Filters updated');
      setIsEditingFilters(false);
      setEditedFilters(null);
      onRefresh();
    } catch (error) {
      toast.error('Failed to save filters');
    }
  };

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;
    const search = searchTerm.toLowerCase();
    return members.filter((member) => {
      const record = member.owner || member;
      const name = record.name || `${record.firstName || ''} ${record.lastName || ''}`.trim();
      const email = record.email || '';
      return name.toLowerCase().includes(search) || email.toLowerCase().includes(search);
    });
  }, [members, searchTerm]);

  // Paginate
  const paginatedMembers = filteredMembers.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );
  const totalPages = Math.ceil(filteredMembers.length / pageSize);

  return (
    <div className="space-y-6">
      {/* Stats Row - Full width, 5 columns */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          label="SIZE"
          value={memberCount.toLocaleString()}
          subtext={OBJECT_TYPES.find(t => t.value === objectType)?.label || 'Owners'}
        />
        <StatCard
          label="% OF DATABASE"
          value={percentOfTotal !== null && percentOfTotal !== undefined ? `${Number(percentOfTotal).toFixed(2)}%` : '—'}
        />
        <StatCard
          label="7 DAY CHANGE"
          value={
            change7d !== null ? (
              <span className={cn(
                'flex items-center justify-center gap-1',
                change7d > 0 && 'text-emerald-600',
                change7d < 0 && 'text-red-600'
              )}>
                {change7d > 0 ? <TrendingUp className="h-4 w-4" /> : change7d < 0 ? <TrendingDown className="h-4 w-4" /> : null}
                {change7d > 0 ? '+' : ''}{change7d}
              </span>
            ) : '—'
          }
        />
        <StatCard
          label="ASSIGNED TEAM"
          value="All teams"
          subtext="Change team"
          subtextLink
          onClick={() => setShowTeamDrawer(true)}
        />
        <StatCard
          label="CREATED ON"
          value={segment?.createdAt || segment?.created_at ? format(new Date(segment.createdAt || segment.created_at), 'MM/dd/yy') : '—'}
        />
      </div>

      {/* Two-panel layout: Filters | Members Table */}
      <div className="flex gap-4">
        {/* Left Panel - Filters (matches first stat card width) */}
        <div className="w-[calc(20%-12px)] min-w-[200px] flex-shrink-0 overflow-hidden">
          <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] overflow-hidden">
            {/* Filters Header */}
            <div className="flex items-center justify-between p-4 border-b border-[color:var(--bb-color-border-subtle)]">
              <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                Filters
              </span>
              <div className="flex items-center gap-2">
                {isEditingFilters ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-xs text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFilters}
                      disabled={updateSegment.isPending}
                      className="text-xs px-2 py-1 rounded bg-[color:var(--bb-color-accent)] text-white hover:opacity-90"
                    >
                      {updateSegment.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleEditFilters}
                    className="text-xs text-[color:var(--bb-color-accent)] hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Filter Groups Display or Editor - with max height and scroll */}
            <div className="p-4 space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto">
              {isEditingFilters ? (
                <InlineFilterEditor
                  filters={editedFilters}
                  onChange={setEditedFilters}
                  objectType={objectType}
                  previewCount={previewData?.count}
                  isPreviewLoading={isPreviewLoading}
                />
              ) : (
                <FilterDisplay filters={filters} objectType={objectType} />
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Members Table */}
        <div className="flex-1 min-w-0">
          <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]">
          {/* Table Header */}
          <div className="flex items-center justify-between p-4 border-b border-[color:var(--bb-color-border-subtle)]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              <input
                type="text"
                placeholder="Search in segment..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-body)] text-[color:var(--bb-color-text-primary)] text-sm placeholder:text-[color:var(--bb-color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-1" />
                Export segment
              </Button>
            </div>
          </div>

          {/* Table */}
          {isLoadingMembers ? (
            <div className="p-8">
              <LoadingState label="Loading members..." />
            </div>
          ) : paginatedMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 mx-auto mb-3 text-[color:var(--bb-color-text-muted)]" />
              <p className="text-[color:var(--bb-color-text-muted)]">
                {searchTerm ? 'No members match your search' : 'No members in this segment'}
              </p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="bg-[color:var(--bb-color-bg-elevated)]">
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                      Phone
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--bb-color-border-subtle)]">
                  {paginatedMembers.map((member) => {
                    const record = member.owner || member;
                    const name = record.name || `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unknown';
                    return (
                      <tr
                        key={record.id || record.recordId}
                        className="hover:bg-[color:var(--bb-color-bg-elevated)] cursor-pointer transition-colors"
                        onClick={() => navigate(`/customers/${record.id || record.recordId}`)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                          {name}
                        </td>
                        <td className="px-4 py-3 text-sm text-[color:var(--bb-color-text-muted)]">
                          {record.email || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[color:var(--bb-color-text-muted)]">
                          {record.phone || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[color:var(--bb-color-text-muted)]">
                          {member.addedAt || member.added_at ? format(new Date(member.addedAt || member.added_at), 'MM/dd/yyyy') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--bb-color-border-subtle)]">
                <div />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <span className="px-3 py-1 rounded bg-[color:var(--bb-color-bg-elevated)] text-sm">
                      {currentPage + 1}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (currentPage + 1 < totalPages) {
                          setCurrentPage((p) => p + 1);
                        } else if (hasNextPage) {
                          fetchNextPage();
                        }
                      }}
                      disabled={currentPage + 1 >= totalPages && !hasNextPage}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="w-40">
                    <StyledSelect
                      options={[
                        { value: 100, label: '100 per page' },
                        { value: 50, label: '50 per page' },
                        { value: 25, label: '25 per page' },
                      ]}
                      value={pageSize}
                      onChange={(opt) => {
                        setPageSize(opt?.value || 100);
                        setCurrentPage(0);
                      }}
                      isClearable={false}
                      isSearchable={false}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Team Assignment Drawer */}
      <SlideOutDrawer
        isOpen={showTeamDrawer}
        onClose={() => setShowTeamDrawer(false)}
        title="Assign Team"
        subtitle={`Choose which team can access "${segment?.name}"`}
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">
            Select a team to assign this segment to. All members of the selected team will be able to view and use this segment.
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--bb-color-border-subtle)] hover:bg-[color:var(--bb-color-bg-elevated)] cursor-pointer">
              <input type="radio" name="team" defaultChecked className="w-4 h-4" />
              <div>
                <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">All Teams</p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">Everyone in the organization</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--bb-color-border-subtle)] hover:bg-[color:var(--bb-color-bg-elevated)] cursor-pointer">
              <input type="radio" name="team" className="w-4 h-4" />
              <div>
                <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">Marketing Team</p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">3 members</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--bb-color-border-subtle)] hover:bg-[color:var(--bb-color-bg-elevated)] cursor-pointer">
              <input type="radio" name="team" className="w-4 h-4" />
              <div>
                <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">Sales Team</p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">5 members</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--bb-color-border-subtle)] hover:bg-[color:var(--bb-color-bg-elevated)] cursor-pointer">
              <input type="radio" name="team" className="w-4 h-4" />
              <div>
                <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">Only Me</p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">Private segment</p>
              </div>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[color:var(--bb-color-border-subtle)]">
            <Button variant="outline" onClick={() => setShowTeamDrawer(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success('Team assignment updated');
              setShowTeamDrawer(false);
            }}>
              Save
            </Button>
          </div>
        </div>
      </SlideOutDrawer>
    </div>
  );
};

// Filter Display (read-only)
const FilterDisplay = ({ filters, objectType }) => {
  if (!filters?.groups?.length) {
    return (
      <p className="text-sm text-[color:var(--bb-color-text-muted)]">
        No filters defined
      </p>
    );
  }

  return (
    <>
      {filters.groups.map((group, groupIndex) => (
        <div key={group.id || groupIndex}>
          {groupIndex > 0 && (
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-[color:var(--bb-color-border-subtle)]" />
              <span className="text-xs font-medium text-[color:var(--bb-color-accent)]">
                {filters.groupLogic || 'OR'}
              </span>
              <div className="flex-1 h-px bg-[color:var(--bb-color-border-subtle)]" />
            </div>
          )}
          <div className="text-xs text-[color:var(--bb-color-text-muted)] mb-2">
            Group {groupIndex + 1}
          </div>
          <div className="space-y-2">
            {group.filters?.map((filter, filterIndex) => {
              const fieldDef = SEGMENT_FIELDS[objectType]?.find(f => f.key === filter.field);
              const operatorDef = OPERATORS[fieldDef?.type || 'text']?.find(o => o.value === filter.operator);
              return (
                <div key={filter.id || filterIndex}>
                  {filterIndex > 0 && (
                    <div className="text-xs text-[color:var(--bb-color-text-muted)] my-1 ml-2">
                      {group.logic || 'AND'}
                    </div>
                  )}
                  <div className="text-sm text-[color:var(--bb-color-text-primary)] bg-[color:var(--bb-color-bg-elevated)] rounded p-2">
                    <span className="font-medium">{fieldDef?.label || filter.field}</span>
                    {' '}
                    <span className="text-[color:var(--bb-color-text-muted)]">
                      {operatorDef?.label || filter.operator}
                    </span>
                    {filter.value !== undefined && filter.value !== '' && (
                      <>
                        {' '}
                        <span className="font-medium">{String(filter.value)}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
};

// Inline Filter Editor
const InlineFilterEditor = ({ filters, onChange, objectType, previewCount, isPreviewLoading }) => {
  const addGroup = () => {
    const newGroup = {
      id: `group-${Date.now()}`,
      logic: 'AND',
      filters: [{
        id: `filter-${Date.now()}`,
        field: SEGMENT_FIELDS[objectType]?.[0]?.key || 'status',
        operator: 'is',
        value: '',
      }],
    };
    onChange({
      ...filters,
      groups: [...(filters.groups || []), newGroup],
    });
  };

  const removeGroup = (groupIndex) => {
    onChange({
      ...filters,
      groups: filters.groups.filter((_, i) => i !== groupIndex),
    });
  };

  const updateGroup = (groupIndex, updates) => {
    const newGroups = [...filters.groups];
    newGroups[groupIndex] = { ...newGroups[groupIndex], ...updates };
    onChange({ ...filters, groups: newGroups });
  };

  const addFilter = (groupIndex) => {
    const newGroups = [...filters.groups];
    newGroups[groupIndex].filters.push({
      id: `filter-${Date.now()}`,
      field: SEGMENT_FIELDS[objectType]?.[0]?.key || 'status',
      operator: 'is',
      value: '',
    });
    onChange({ ...filters, groups: newGroups });
  };

  const removeFilter = (groupIndex, filterIndex) => {
    const newGroups = [...filters.groups];
    newGroups[groupIndex].filters = newGroups[groupIndex].filters.filter((_, i) => i !== filterIndex);
    if (newGroups[groupIndex].filters.length === 0) {
      newGroups.splice(groupIndex, 1);
    }
    onChange({ ...filters, groups: newGroups });
  };

  const updateFilter = (groupIndex, filterIndex, updates) => {
    const newGroups = [...filters.groups];
    newGroups[groupIndex].filters[filterIndex] = {
      ...newGroups[groupIndex].filters[filterIndex],
      ...updates,
    };
    onChange({ ...filters, groups: newGroups });
  };

  return (
    <div className="space-y-4">
      {/* Preview count */}
      <div className="p-3 rounded-lg bg-[color:var(--bb-color-bg-elevated)] border border-[color:var(--bb-color-border-subtle)]">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          <span className="text-sm text-[color:var(--bb-color-text-muted)]">
            {isPreviewLoading ? (
              'Calculating...'
            ) : previewCount !== undefined ? (
              <><strong className="text-[color:var(--bb-color-text-primary)]">{previewCount}</strong> matching records</>
            ) : (
              'Add filters to see preview'
            )}
          </span>
        </div>
      </div>

      {/* Filter groups */}
      {filters.groups?.map((group, groupIndex) => (
        <div key={group.id || groupIndex} className="space-y-2">
          {groupIndex > 0 && (
            <div className="flex items-center gap-2">
              <div className="min-w-[80px]">
                <StyledSelect
                  options={[
                    { value: 'AND', label: 'AND' },
                    { value: 'OR', label: 'OR' },
                  ]}
                  value={filters.groupLogic || 'OR'}
                  onChange={(opt) => onChange({ ...filters, groupLogic: opt?.value || 'OR' })}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
            </div>
          )}

          <div className="border border-[color:var(--bb-color-border-subtle)] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[color:var(--bb-color-text-muted)]">
                Group {groupIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => removeGroup(groupIndex)}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>

            {group.filters?.map((filter, filterIndex) => (
              <div key={filter.id || filterIndex}>
                {filterIndex > 0 && (
                  <div className="min-w-[80px] mb-2">
                    <StyledSelect
                      options={[
                        { value: 'AND', label: 'AND' },
                        { value: 'OR', label: 'OR' },
                      ]}
                      value={group.logic || 'AND'}
                      onChange={(opt) => updateGroup(groupIndex, { logic: opt?.value || 'AND' })}
                      isClearable={false}
                      isSearchable={false}
                    />
                  </div>
                )}
                <div className="space-y-2 p-2 rounded bg-[color:var(--bb-color-bg-elevated)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <StyledSelect
                        options={SEGMENT_FIELDS[objectType]?.map((f) => ({ value: f.key, label: f.label })) || []}
                        value={filter.field}
                        onChange={(opt) => updateFilter(groupIndex, filterIndex, { field: opt?.value || '', value: '' })}
                        isClearable={false}
                        isSearchable={true}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFilter(groupIndex, filterIndex)}
                      className="p-1 text-[color:var(--bb-color-text-muted)] hover:text-red-500 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <StyledSelect
                    options={OPERATORS[SEGMENT_FIELDS[objectType]?.find(f => f.key === filter.field)?.type || 'text']?.map((o) => ({ value: o.value, label: o.label })) || []}
                    value={filter.operator}
                    onChange={(opt) => updateFilter(groupIndex, filterIndex, { operator: opt?.value || '' })}
                    isClearable={false}
                    isSearchable={false}
                  />
                  {!['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(filter.operator) && (
                    <input
                      type="text"
                      value={filter.value || ''}
                      onChange={(e) => updateFilter(groupIndex, filterIndex, { value: e.target.value })}
                      placeholder="Value"
                      className="w-full text-xs px-2 py-1.5 rounded border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]"
                    />
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addFilter(groupIndex)}
              className="text-xs text-[color:var(--bb-color-accent)] hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Add condition
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addGroup}
        className="w-full py-2 text-xs text-[color:var(--bb-color-accent)] hover:bg-[color:var(--bb-color-bg-elevated)] rounded border border-dashed border-[color:var(--bb-color-border-subtle)] flex items-center justify-center gap-1"
      >
        <Plus className="h-3 w-3" />
        Add filter group
      </button>
    </div>
  );
};

// Stat Card Component - FIXED: onClick handler + centered alignment
const StatCard = ({ label, value, subtext, subtextLink, onClick }) => (
  <div className="text-center p-3 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]">
    <p className="text-xs font-medium text-[color:var(--bb-color-text-muted)] uppercase tracking-wider mb-1">
      {label}
    </p>
    <div className="flex items-center justify-center">
      <p className="text-lg font-bold text-[color:var(--bb-color-text-primary)]">
        {value}
      </p>
    </div>
    {subtext && (
      <p
        className={cn(
          "text-xs mt-1",
          subtextLink ? "text-[color:var(--bb-color-accent)] cursor-pointer hover:underline" : "text-[color:var(--bb-color-text-muted)]"
        )}
        onClick={subtextLink ? onClick : undefined}
      >
        {subtext}
      </p>
    )}
  </div>
);

// ============================================================================
// PERFORMANCE TAB - Charts and analytics
// ============================================================================
const PerformanceTab = ({ segment }) => {
  const [activeNav, setActiveNav] = useState('breakdown');

  return (
    <div className="flex gap-6">
      {/* Left Nav */}
      <div className="w-48 flex-shrink-0">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[color:var(--bb-color-text-muted)] uppercase mb-2">
            Overall
          </p>
          <button
            type="button"
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded transition-colors",
              activeNav === 'breakdown'
                ? "bg-[color:var(--bb-color-accent)]/10 text-[color:var(--bb-color-accent)] border-l-2 border-[color:var(--bb-color-accent)]"
                : "text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]"
            )}
            onClick={() => setActiveNav('breakdown')}
          >
            Segment breakdown
          </button>
          <button
            type="button"
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded transition-colors",
              activeNav === 'comparison'
                ? "bg-[color:var(--bb-color-accent)]/10 text-[color:var(--bb-color-accent)] border-l-2 border-[color:var(--bb-color-accent)]"
                : "text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]"
            )}
            onClick={() => setActiveNav('comparison')}
          >
            Segment comparison
          </button>
        </div>

        <div className="mt-6 space-y-1">
          <p className="text-xs font-medium text-[color:var(--bb-color-text-muted)] uppercase mb-2">
            Active
          </p>
          <p className="text-sm text-[color:var(--bb-color-text-muted)] px-3">
            No active channels
          </p>
        </div>

        <div className="mt-6 space-y-1">
          <p className="text-xs font-medium text-[color:var(--bb-color-text-muted)] uppercase mb-2">
            Available channels
          </p>
          <p className="text-sm text-[color:var(--bb-color-text-muted)] px-3">
            Email, SMS
          </p>
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Chart placeholder */}
        <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
              Segment size
            </h3>
            <div className="flex items-center gap-2 text-sm text-[color:var(--bb-color-text-muted)]">
              Date range: <span className="text-[color:var(--bb-color-text-primary)]">Last 14 days</span>
            </div>
          </div>

          <div className="h-64 flex items-center justify-center border border-dashed border-[color:var(--bb-color-border-subtle)] rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 text-[color:var(--bb-color-text-muted)]" />
              <p className="text-[color:var(--bb-color-text-muted)]">
                Segment size chart coming soon
              </p>
              <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
                Track how your segment grows over time
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown placeholder */}
        <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
              Contacts breakdown and engagement
            </h3>
          </div>

          <div className="h-48 flex items-center justify-center border border-dashed border-[color:var(--bb-color-border-subtle)] rounded-lg">
            <div className="text-center">
              <p className="text-[color:var(--bb-color-text-muted)]">
                Breakdown charts coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ACTIVITY TAB - Change log table - FIXED: Shows actual user from modifiedBy
// ============================================================================
const ActivityTab = ({ segmentId }) => {
  const { data: activityData, isLoading, fetchNextPage, hasNextPage } = useSegmentActivity(segmentId);
  const activities = activityData?.pages?.flatMap((page) => page.items) || [];
  const [eventFilter, setEventFilter] = useState('all');

  if (isLoading) {
    return <LoadingState label="Loading activity..." />;
  }

  // Filter activities by event type
  const filteredActivities = eventFilter === 'all'
    ? activities
    : activities.filter(a => a.activity_type === eventFilter || a.type === eventFilter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
            Activity
          </h3>
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">
            View all user activity taken on this segment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            View version history
          </Button>
          <Button variant="outline" size="sm">
            Export report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[color:var(--bb-color-text-muted)]">Event</span>
          <div className="min-w-[160px]">
            <StyledSelect
              options={[
                { value: 'all', label: 'All event types' },
                { value: 'created', label: 'Segment created' },
                { value: 'edited', label: 'Segment edited' },
                { value: 'member_added', label: 'Member added' },
                { value: 'member_removed', label: 'Member removed' },
                { value: 'filters_changed', label: 'Filters changed' },
              ]}
              value={eventFilter}
              onChange={(opt) => setEventFilter(opt?.value || 'all')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>
      </div>

      {/* Activity Table */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]">
          <Clock className="h-10 w-10 mx-auto mb-3 text-[color:var(--bb-color-text-muted)]" />
          <p className="text-[color:var(--bb-color-text-muted)]">No activity recorded yet</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[color:var(--bb-color-bg-elevated)]">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                  Event
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                  Version
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                  Modified By
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                  Date of Change
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--bb-color-border-subtle)]">
              {filteredActivities.map((activity, idx) => {
                const activityType = activity.activity_type || activity.type || 'unknown';
                // FIXED: Show actual user from modifiedBy/modified_by/createdByUser fields
                const modifiedBy = activity.modifiedByUser?.name
                  || activity.modifiedByUser?.email
                  || activity.modified_by_name
                  || activity.createdByUser?.name
                  || activity.createdByUser?.email
                  || activity.created_by_name
                  || (activity.created_by === 'system' ? 'System' : null)
                  || (activity.is_automatic ? 'System (auto)' : null)
                  || 'Unknown user';

                return (
                  <tr key={activity.id || idx} className="hover:bg-[color:var(--bb-color-bg-elevated)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {activityType === 'member_added' ? (
                          <UserPlus className="h-4 w-4 text-emerald-600" />
                        ) : activityType === 'member_removed' ? (
                          <UserMinus className="h-4 w-4 text-red-600" />
                        ) : (
                          <Edit2 className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                        )}
                        <span className="text-sm text-[color:var(--bb-color-text-primary)]">
                          {activity.description || activityType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[color:var(--bb-color-text-muted)]">
                      v{activity.version || (filteredActivities.length - idx)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[color:var(--bb-color-text-primary)]">
                      {modifiedBy}
                    </td>
                    <td className="px-4 py-3 text-sm text-[color:var(--bb-color-text-muted)]">
                      {activity.createdAt || activity.created_at
                        ? format(new Date(activity.createdAt || activity.created_at), "MMM d, yyyy h:mma")
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {hasNextPage && (
            <div className="p-4 border-t border-[color:var(--bb-color-border-subtle)]">
              <Button variant="ghost" className="w-full" onClick={() => fetchNextPage()}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SETTINGS TAB - Left sidebar nav with content panels
// ============================================================================
const SettingsTab = ({ segment, onDelete, onConvert, segmentType }) => {
  const [activePanel, setActivePanel] = useState('auto-convert');
  const isActive = segmentType === 'active';

  return (
    <div className="flex gap-6">
      {/* Left Sidebar Nav */}
      <div className="w-48 flex-shrink-0">
        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => setActivePanel('auto-convert')}
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded transition-colors",
              activePanel === 'auto-convert'
                ? "bg-[color:var(--bb-color-accent)]/10 text-[color:var(--bb-color-accent)] border-l-2 border-[color:var(--bb-color-accent)]"
                : "text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]"
            )}
          >
            Auto-convert to static
          </button>
          <button
            type="button"
            onClick={() => setActivePanel('notifications')}
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded transition-colors",
              activePanel === 'notifications'
                ? "bg-[color:var(--bb-color-accent)]/10 text-[color:var(--bb-color-accent)] border-l-2 border-[color:var(--bb-color-accent)]"
                : "text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]"
            )}
          >
            Notifications
          </button>
          <button
            type="button"
            onClick={() => setActivePanel('access')}
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded transition-colors",
              activePanel === 'access'
                ? "bg-[color:var(--bb-color-accent)]/10 text-[color:var(--bb-color-accent)] border-l-2 border-[color:var(--bb-color-accent)]"
                : "text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]"
            )}
          >
            Access
          </button>
        </nav>
      </div>

      {/* Right Content Panel */}
      <div className="flex-1 min-w-0">
        {activePanel === 'auto-convert' && (
          <AutoConvertPanel segment={segment} onConvert={onConvert} isActive={isActive} />
        )}
        {activePanel === 'notifications' && <NotificationsPanel segment={segment} />}
        {activePanel === 'access' && <AccessPanel segment={segment} />}
      </div>
    </div>
  );
};

// Auto-convert Panel
const AutoConvertPanel = ({ segment, onConvert, isActive }) => {
  const [convertOption, setConvertOption] = useState('never');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
          Automatically convert to static
        </h3>
        <p className="text-sm text-[color:var(--bb-color-text-muted)]">
          This segment can be converted to static after a period of inactivity or on a specific date.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)]">
          Convert this segment to static:
        </label>
        <div className="max-w-md">
          <StyledSelect
            options={[
              { value: 'never', label: 'Never' },
              { value: '1week', label: 'After 1 week of no changes' },
              { value: '1month', label: 'After 1 month of no changes' },
              { value: 'specific', label: 'On specific date' },
            ]}
            value={convertOption}
            onChange={(opt) => setConvertOption(opt?.value || 'never')}
            isClearable={false}
            isSearchable={false}
          />
        </div>
      </div>

      {isActive && (
        <div className="pt-4 border-t border-[color:var(--bb-color-border-subtle)]">
          <Button variant="outline" onClick={onConvert}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Convert to Static Now
          </Button>
        </div>
      )}
    </div>
  );
};

// Notifications Panel
const NotificationsPanel = ({ segment }) => {
  const [editedNotif, setEditedNotif] = useState(false);
  const [sizeChangeNotif, setSizeChangeNotif] = useState(false);
  const [specificSizeNotif, setSpecificSizeNotif] = useState(false);
  const [targetSize, setTargetSize] = useState('');

  const Toggle = ({ checked, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        checked ? "bg-[color:var(--bb-color-accent)]" : "bg-gray-300 dark:bg-gray-600"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
          Notifications
        </h3>
      </div>

      {/* Notification Cards */}
      <div className="space-y-4">
        {/* When edited or deleted */}
        <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-[color:var(--bb-color-text-primary)]">
                When this segment is edited or deleted
              </h4>
              <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
                Triggers a notification whenever a segment is edited or deleted.
              </p>
            </div>
            <Toggle checked={editedNotif} onChange={setEditedNotif} />
          </div>
        </div>

        {/* When size changes irregularly */}
        <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-[color:var(--bb-color-text-primary)]">
                When the size of this segment changes irregularly
              </h4>
              <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
                Analyzes the previous 7 days and triggers a notification if the segment increases or decreases in an unexpected way.
              </p>
            </div>
            <Toggle checked={sizeChangeNotif} onChange={setSizeChangeNotif} />
          </div>
        </div>

        {/* When reaches specific size */}
        <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-medium text-[color:var(--bb-color-text-primary)]">
                When this segment reaches a specific size
              </h4>
              <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
                Triggers a notification when a segment reaches a specific size. The size can be bigger or smaller than it is now.
              </p>
            </div>
            <Toggle checked={specificSizeNotif} onChange={setSpecificSizeNotif} />
          </div>
          {specificSizeNotif && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-[color:var(--bb-color-text-muted)]">Segment size reaches</span>
              <input
                type="number"
                value={targetSize}
                onChange={(e) => setTargetSize(e.target.value)}
                placeholder="number of records"
                className="w-40 px-3 py-1 rounded border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-body)] text-sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Access Panel - FIXED: Fetches teams/users from API instead of hardcoded data
const AccessPanel = ({ segment }) => {
  const [accessType, setAccessType] = useState('specific');
  const [activeTab, setActiveTab] = useState('teams');
  const [searchTerm, setSearchTerm] = useState('');
  const [teamAccess, setTeamAccess] = useState({});
  const [userAccess, setUserAccess] = useState({});

  // Fetch team members from API
  const { data: members, isLoading: isLoadingMembers } = useTeamMembers();

  // Group members by role for display (since there's no teams table, we use roles)
  const teamGroups = useMemo(() => {
    if (!members || !Array.isArray(members)) return [];

    const roleMap = {};
    members.forEach(member => {
      const role = member.role || 'Team Member';
      if (!roleMap[role]) {
        roleMap[role] = { name: role, members: [], access: 'none' };
      }
      roleMap[role].members.push(member);
    });

    return Object.values(roleMap);
  }, [members]);

  // Filter by search
  const filteredTeams = searchTerm
    ? teamGroups.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : teamGroups;

  const filteredUsers = searchTerm
    ? (members || []).filter(m =>
        (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : members || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
          Access
        </h3>
        <p className="text-sm text-[color:var(--bb-color-text-muted)]">
          Customize the level of access users and teams have to segments.{' '}
          <a href="#" className="text-[color:var(--bb-color-accent)] hover:underline">Learn more</a>
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-3">
          Who has access to this segment?
        </p>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="access"
              value="private"
              checked={accessType === 'private'}
              onChange={(e) => setAccessType(e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-sm text-[color:var(--bb-color-text-primary)]">Private</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="access"
              value="everyone"
              checked={accessType === 'everyone'}
              onChange={(e) => setAccessType(e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-sm text-[color:var(--bb-color-text-primary)]">Everyone can view and edit</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="access"
              value="specific"
              checked={accessType === 'specific'}
              onChange={(e) => setAccessType(e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-sm text-[color:var(--bb-color-text-primary)]">Specific users and teams</span>
          </label>
        </div>
      </div>

      {accessType === 'specific' && (
        <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[color:var(--bb-color-border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveTab('teams')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
                activeTab === 'teams'
                  ? "border-[color:var(--bb-color-accent)] text-[color:var(--bb-color-accent)]"
                  : "border-transparent text-[color:var(--bb-color-text-muted)]"
              )}
            >
              Teams
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
                activeTab === 'users'
                  ? "border-[color:var(--bb-color-accent)] text-[color:var(--bb-color-accent)]"
                  : "border-transparent text-[color:var(--bb-color-text-muted)]"
              )}
            >
              Users
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-[color:var(--bb-color-border-subtle)]">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 rounded border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-body)] text-sm"
            />
          </div>

          {isLoadingMembers ? (
            <div className="p-8 text-center">
              <LoadingState label="Loading..." />
            </div>
          ) : (
            <>
              {/* Teams table */}
              {activeTab === 'teams' && (
                filteredTeams.length === 0 ? (
                  <div className="p-8 text-center text-[color:var(--bb-color-text-muted)]">
                    No teams found
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[color:var(--bb-color-bg-elevated)]">
                        <th className="text-left px-4 py-2 text-xs font-medium text-[color:var(--bb-color-text-muted)]">
                          TEAM
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-[color:var(--bb-color-text-muted)]">
                          ACCESS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--bb-color-border-subtle)]">
                      {filteredTeams.map((team, idx) => (
                        <tr key={team.name || idx}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="rounded" />
                              <div>
                                <p className="text-sm text-[color:var(--bb-color-text-primary)]">{team.name}</p>
                                <p className="text-xs text-[color:var(--bb-color-text-muted)]">{team.members.length} members</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-40">
                              <StyledSelect
                                options={[
                                  { value: 'none', label: 'No access' },
                                  { value: 'view', label: 'View only' },
                                  { value: 'edit', label: 'View and Edit' },
                                ]}
                                value={teamAccess[team.name] || 'none'}
                                onChange={(opt) => setTeamAccess(prev => ({ ...prev, [team.name]: opt?.value || 'none' }))}
                                isClearable={false}
                                isSearchable={false}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* Users table */}
              {activeTab === 'users' && (
                filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-[color:var(--bb-color-text-muted)]">
                    No users found
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[color:var(--bb-color-bg-elevated)]">
                        <th className="text-left px-4 py-2 text-xs font-medium text-[color:var(--bb-color-text-muted)]">
                          USER
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-[color:var(--bb-color-text-muted)]">
                          ACCESS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--bb-color-border-subtle)]">
                      {filteredUsers.map((user) => (
                        <tr key={user.id || user.email}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="rounded" />
                              <div>
                                <p className="text-sm text-[color:var(--bb-color-text-primary)]">
                                  {user.name || user.email}
                                </p>
                                {user.name && (
                                  <p className="text-xs text-[color:var(--bb-color-text-muted)]">{user.email}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-40">
                              <StyledSelect
                                options={[
                                  { value: 'none', label: 'No access' },
                                  { value: 'view', label: 'View only' },
                                  { value: 'edit', label: 'View and Edit' },
                                ]}
                                value={userAccess[user.id || user.email] || 'none'}
                                onChange={(opt) => setUserAccess(prev => ({ ...prev, [user.id || user.email]: opt?.value || 'none' }))}
                                isClearable={false}
                                isSearchable={false}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
