/**
 * Workflows Index Page
 * HubSpot-style table view with filters
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  GitBranch,
  Plus,
  Play,
  Pause,
  Copy,
  Trash2,
  Search,
  X,
  Filter,
  FolderOpen,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  PawPrint,
  CreditCard,
  FileText,
  ClipboardList,
  MoreHorizontal,
  LayoutGrid,
  List,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import {
  getWorkflows,
  deleteWorkflow,
  activateWorkflow,
  pauseWorkflow,
  cloneWorkflow,
} from '../api';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

// Status configuration
const STATUS_CONFIG = {
  draft: { color: 'text-gray-600', label: 'Off' },
  active: { color: 'text-green-600', label: 'On', dot: 'bg-green-500' },
  paused: { color: 'text-yellow-600', label: 'Off' },
};

// Object type configuration
const OBJECT_TYPE_CONFIG = {
  pet: { label: 'Pet', icon: PawPrint },
  booking: { label: 'Booking', icon: Calendar },
  owner: { label: 'Owner', icon: Users },
  payment: { label: 'Payment', icon: CreditCard },
  task: { label: 'Task', icon: ClipboardList },
  invoice: { label: 'Invoice', icon: FileText },
  incident: { label: 'Incident', icon: AlertTriangle },
};

// Tabs configuration
const TABS = [
  { id: 'all', label: 'All workflows', count: null },
  { id: 'deleted', label: 'Deleted', count: null },
  { id: 'unused', label: 'Unused', count: null },
];

function formatDate(dateString) {
  if (!dateString) return '--';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Create Workflow Dropdown
const CreateWorkflowDropdown = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <Button onClick={() => setOpen(!open)}>
        Create workflow
        <ChevronDown className="h-4 w-4 ml-1" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg border py-1 min-w-[180px]"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <button
              onClick={() => {
                setOpen(false);
                navigate('/workflows/new');
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-primary)]"
            >
              From scratch
            </button>
            <button
              onClick={() => {
                setOpen(false);
                toast.info('Templates coming soon');
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]"
            >
              From template
            </button>
            <button
              onClick={() => {
                setOpen(false);
                toast.info('AI workflows coming soon');
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-[color:var(--bb-color-bg-elevated)] flex items-center gap-2"
            >
              <Sparkles className="h-3 w-3" />
              <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                With AI
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Filter Dropdown
const FilterDropdown = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors',
          value
            ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]'
            : 'border-transparent hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-secondary)]'
        )}
      >
        {selectedOption?.label || label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-lg shadow-lg border py-1 min-w-[160px]"
          style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                'w-full px-4 py-2 text-left text-sm hover:bg-[color:var(--bb-color-bg-elevated)]',
                value === option.value ? 'text-[color:var(--bb-color-accent)]' : 'text-[color:var(--bb-color-text-primary)]'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Row Action Menu
const RowActionMenu = ({ workflow, onActivate, onPause, onClone, onDelete, isUpdating }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1.5 rounded hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg border py-1 min-w-[160px]"
          style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
        >
          {workflow.status === 'active' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPause(workflow.id);
                setOpen(false);
              }}
              disabled={isUpdating}
              className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[color:var(--bb-color-bg-elevated)]"
            >
              <Pause className="h-4 w-4" />
              Turn off
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onActivate(workflow.id);
                setOpen(false);
              }}
              disabled={isUpdating}
              className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[color:var(--bb-color-bg-elevated)]"
            >
              <Play className="h-4 w-4" />
              Turn on
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClone(workflow.id);
              setOpen(false);
            }}
            disabled={isUpdating}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[color:var(--bb-color-bg-elevated)]"
          >
            <Copy className="h-4 w-4" />
            Clone
          </button>
          <div className="border-t my-1" style={{ borderColor: 'var(--bb-color-border-subtle)' }} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(workflow.id);
              setOpen(false);
            }}
            disabled={isUpdating}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    objectType: '',
    search: '',
  });

  const navigate = useNavigate();

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWorkflows();
      const data = response.data || {};
      setWorkflows(data.data || data.workflows || []);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
      setError(err.message || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Filtered workflows
  const filteredWorkflows = useMemo(() => {
    let result = workflows;

    // Tab filtering
    if (activeTab === 'deleted') {
      result = result.filter((w) => w.deleted_at != null);
    } else if (activeTab === 'unused') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      result = result.filter((w) => !w.deleted_at && (w.status === 'paused' || !w.last_run_at || new Date(w.last_run_at) < ninetyDaysAgo));
    } else {
      result = result.filter((w) => !w.deleted_at);
    }

    if (filters.status) {
      if (filters.status === 'on') {
        result = result.filter((w) => w.status === 'active');
      } else if (filters.status === 'off') {
        result = result.filter((w) => w.status !== 'active');
      }
    }
    if (filters.objectType) {
      result = result.filter((w) => w.object_type === filters.objectType);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(
        (w) => w.name?.toLowerCase().includes(term) || w.description?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [workflows, filters, activeTab]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: workflows.filter(w => !w.deleted_at).length,
    deleted: workflows.filter(w => w.deleted_at).length,
    unused: workflows.filter(w => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return !w.deleted_at && (w.status === 'paused' || !w.last_run_at || new Date(w.last_run_at) < ninetyDaysAgo);
    }).length,
  }), [workflows]);

  const handleRowClick = useCallback((workflow) => {
    navigate(`/workflows/${workflow.id}`);
  }, [navigate]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      setUpdatingId(id);
      await deleteWorkflow(id);
      toast.success('Workflow deleted');
      fetchWorkflows();
    } catch (err) {
      console.error('Failed to delete workflow:', err);
      toast.error('Failed to delete workflow');
    } finally {
      setUpdatingId(null);
    }
  }, [fetchWorkflows]);

  const handleActivate = useCallback(async (id) => {
    try {
      setUpdatingId(id);
      await activateWorkflow(id);
      toast.success('Workflow activated');
      fetchWorkflows();
    } catch (err) {
      console.error('Failed to activate workflow:', err);
      toast.error('Failed to activate workflow');
    } finally {
      setUpdatingId(null);
    }
  }, [fetchWorkflows]);

  const handlePause = useCallback(async (id) => {
    try {
      setUpdatingId(id);
      await pauseWorkflow(id);
      toast.success('Workflow paused');
      fetchWorkflows();
    } catch (err) {
      console.error('Failed to pause workflow:', err);
      toast.error('Failed to pause workflow');
    } finally {
      setUpdatingId(null);
    }
  }, [fetchWorkflows]);

  const handleClone = useCallback(async (id) => {
    try {
      setUpdatingId(id);
      const response = await cloneWorkflow(id);
      toast.success('Workflow cloned');
      fetchWorkflows();
      if (response.data?.id) {
        navigate(`/workflows/${response.data.id}`);
      }
    } catch (err) {
      console.error('Failed to clone workflow:', err);
      toast.error('Failed to clone workflow');
    } finally {
      setUpdatingId(null);
    }
  }, [fetchWorkflows, navigate]);

  const toggleRowSelection = (id, e) => {
    e.stopPropagation();
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredWorkflows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredWorkflows.map(w => w.id)));
    }
  };

  const hasActiveFilters = filters.status || filters.objectType || filters.search;

  if (loading) {
    return <LoadingState label="Loading workflows..." variant="mascot" />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -mx-6 -mt-6">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">Automation</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => toast.info('Review issues coming soon')}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Review automation issues
          </Button>
          <CreateWorkflowDropdown />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-6 px-6 border-b shrink-0"
        style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
      >
        {['Overview', 'Workflows', 'Analyze', 'Health'].map((tab, i) => (
          <button
            key={tab}
            className={cn(
              'py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              i === 1
                ? 'border-[color:var(--bb-color-accent)] text-[color:var(--bb-color-accent)]'
                : 'border-transparent text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filter Tabs */}
      <div
        className="flex items-center gap-2 px-6 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
              activeTab === tab.id
                ? 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]'
                : 'text-[color:var(--bb-color-text-secondary)] hover:bg-[color:var(--bb-color-bg-elevated)]'
            )}
          >
            {tab.id === 'all' && (
              <span className="flex items-center justify-center h-5 min-w-[20px] px-1 rounded text-xs font-medium bg-[color:var(--bb-color-bg-elevated)]">
                {tabCounts.all}
              </span>
            )}
            {tab.label}
            {tab.id === 'all' && activeTab === 'all' && (
              <X className="h-3 w-3 ml-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); }} />
            )}
          </button>
        ))}
        <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-[color:var(--bb-color-accent)] hover:bg-[color:var(--bb-color-bg-elevated)] rounded-lg">
          <Plus className="h-3 w-3" />
          Add view (3/50)
        </button>
        <button className="px-3 py-1.5 text-sm text-[color:var(--bb-color-text-secondary)] hover:bg-[color:var(--bb-color-bg-elevated)] rounded-lg">
          All views
        </button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm">
          <FolderOpen className="h-4 w-4 mr-2" />
          Folders
        </Button>
      </div>

      {/* Filter Bar */}
      <div
        className="flex items-center gap-2 px-6 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <FilterDropdown
          label="On or Off"
          options={[
            { value: '', label: 'All' },
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
          value={filters.status}
          onChange={(v) => setFilters({ ...filters, status: v })}
        />
        <FilterDropdown
          label="Object Type"
          options={[
            { value: '', label: 'All Types' },
            ...Object.entries(OBJECT_TYPE_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label })),
          ]}
          value={filters.objectType}
          onChange={(v) => setFilters({ ...filters, objectType: v })}
        />
        <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-[color:var(--bb-color-text-secondary)] hover:bg-[color:var(--bb-color-bg-elevated)] rounded-lg">
          Created by <ChevronDown className="h-3 w-3" />
        </button>
        <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-[color:var(--bb-color-text-secondary)] hover:bg-[color:var(--bb-color-bg-elevated)] rounded-lg">
          Folder <ChevronDown className="h-3 w-3" />
        </button>
        <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-[color:var(--bb-color-text-secondary)] hover:bg-[color:var(--bb-color-bg-elevated)] rounded-lg">
          <Plus className="h-3 w-3" /> More
        </button>
        <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-[color:var(--bb-color-text-secondary)] hover:bg-[color:var(--bb-color-bg-elevated)] rounded-lg">
          <Filter className="h-3 w-3" /> Advanced filters
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div
        className="flex items-center gap-4 px-6 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          <input
            type="text"
            placeholder="Search workflows"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
            style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
          />
        </div>
        <div className="flex-1" />
        {selectedRows.size > 0 && (
          <span className="text-sm text-[color:var(--bb-color-text-muted)]">
            {selectedRows.size} selected
          </span>
        )}
        <Button variant="ghost" size="sm">
          Actions <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-6 my-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">{error}</div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}>
            <tr className="border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredWorkflows.length && filteredWorkflows.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                Name
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                Object Type
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                Created On (EST)
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                Enrolled Total
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                Enrolled Last 7-Days
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                On or Off
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
                Description
              </th>
              <th className="w-10 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkflows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 text-[color:var(--bb-color-text-muted)]" />
                  <h3 className="text-lg font-medium mb-2 text-[color:var(--bb-color-text-primary)]">
                    No workflows found
                  </h3>
                  <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4">
                    {hasActiveFilters
                      ? 'No workflows match your current filters.'
                      : 'Create your first workflow to automate tasks.'}
                  </p>
                  {!hasActiveFilters && (
                    <Button onClick={() => navigate('/workflows/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Workflow
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              filteredWorkflows.map((workflow) => {
                const objectConfig = OBJECT_TYPE_CONFIG[workflow.object_type] || OBJECT_TYPE_CONFIG.pet;
                const isActive = workflow.status === 'active';

                return (
                  <tr
                    key={workflow.id}
                    onClick={() => handleRowClick(workflow)}
                    className="border-b cursor-pointer hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
                    style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(workflow.id)}
                        onChange={(e) => toggleRowSelection(workflow.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        to={`/workflows/${workflow.id}`}
                        className="text-sm font-medium text-[color:var(--bb-color-accent)] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {workflow.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-sm text-[color:var(--bb-color-text-secondary)]">
                      {objectConfig.label}
                    </td>
                    <td className="px-3 py-3 text-sm text-[color:var(--bb-color-text-secondary)]">
                      {formatDate(workflow.created_at)}
                    </td>
                    <td className="px-3 py-3 text-sm text-[color:var(--bb-color-text-secondary)]">
                      {workflow.enrolled_count?.toLocaleString() || '--'}
                    </td>
                    <td className="px-3 py-3 text-sm text-[color:var(--bb-color-text-secondary)]">
                      {workflow.enrolled_last_7_days?.toLocaleString() || '--'}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('flex items-center gap-1.5 text-sm', isActive ? 'text-green-600' : 'text-[color:var(--bb-color-text-muted)]')}>
                        {isActive && <span className="h-2 w-2 rounded-full bg-green-500" />}
                        {isActive ? 'On' : 'Off'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-[color:var(--bb-color-text-muted)] max-w-[200px] truncate">
                      {workflow.description || '--'}
                    </td>
                    <td className="px-3 py-3">
                      <RowActionMenu
                        workflow={workflow}
                        onActivate={handleActivate}
                        onPause={handlePause}
                        onClone={handleClone}
                        onDelete={handleDelete}
                        isUpdating={updatingId === workflow.id}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredWorkflows.length > 0 && (
        <div
          className="flex items-center justify-center gap-2 px-6 py-3 border-t shrink-0"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <button className="px-3 py-1 text-sm text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]">
            &lt; Prev
          </button>
          <button className="px-3 py-1 text-sm font-medium text-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)] rounded">
            1
          </button>
          <button className="px-3 py-1 text-sm text-[color:var(--bb-color-text-secondary)] hover:text-[color:var(--bb-color-text-primary)]">
            Next &gt;
          </button>
          <span className="text-sm text-[color:var(--bb-color-text-muted)] ml-4">
            25 per page
          </span>
        </div>
      )}
    </div>
  );
}
