/**
 * CustomReports - Display saved custom reports created in the Builder
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Plus,
  Search,
  MoreVertical,
  Edit3,
  Trash2,
  Copy,
  Star,
  StarOff,
  FolderOpen,
  LayoutGrid,
  List,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useTimezoneUtils } from '@/lib/timezone';
import apiClient from '@/lib/apiClient';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const ChartTypeIcon = ({ type, className }) => {
  switch (type) {
    case 'bar':
    case 'horizontal-bar':
      return <BarChart3 className={className} />;
    case 'line':
    case 'area':
      return <LineChart className={className} />;
    case 'pie':
    case 'donut':
      return <PieChart className={className} />;
    case 'table':
    case 'pivot':
      return <Table2 className={className} />;
    default:
      return <BarChart3 className={className} />;
  }
};

const formatDate = (dateStr, tzFormatDate = null) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (tzFormatDate) {
    return tzFormatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const DataSourceBadge = ({ source }) => {
  const colors = {
    owners: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pets: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    bookings: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    payments: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    services: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    staff: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  };

  return (
    <span className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded capitalize', colors[source] || 'bg-gray-100 text-gray-700')}>
      {source}
    </span>
  );
};

// =============================================================================
// REPORT CARD COMPONENT
// =============================================================================

const ReportCard = ({ report, viewMode, onEdit, onDelete, onDuplicate, onToggleFavorite }) => {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    // TODO: Navigate to report view or open in preview
    navigate(`/reports/builder?id=${report.id}`);
  };

  if (viewMode === 'list') {
    return (
      <div
        className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-surface-primary border border-border rounded-lg hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
        onClick={handleClick}
      >
        {/* Icon */}
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ChartTypeIcon type={report.chartType} className="h-5 w-5 text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text truncate">{report.name}</h3>
            {report.isFavorite && <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted truncate">{report.description}</p>
        </div>

        {/* Data Source */}
        <DataSourceBadge source={report.dataSource} />

        {/* Updated */}
        <div className="text-xs text-muted whitespace-nowrap">
          {formatDate(report.updatedAt)}
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 text-muted hover:text-text hover:bg-surface-hover rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-surface-primary border border-border rounded-lg shadow-lg z-10 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(report);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface-hover"
              >
                <Edit3 className="h-3 w-3" /> Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(report);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface-hover"
              >
                <Copy className="h-3 w-3" /> Duplicate
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(report);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface-hover"
              >
                {report.isFavorite ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                {report.isFavorite ? 'Unfavorite' : 'Favorite'}
              </button>
              <hr className="my-1 border-border" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(report);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className="bg-white dark:bg-surface-primary border border-border rounded-lg hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group overflow-hidden"
      onClick={handleClick}
    >
      {/* Preview Area */}
      <div className="h-32 bg-surface-secondary flex items-center justify-center border-b border-border">
        <ChartTypeIcon type={report.chartType} className="h-12 w-12 text-muted/30" />
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-medium text-text truncate flex-1">{report.name}</h3>
          {report.isFavorite && <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
        </div>
        <p className="text-xs text-muted line-clamp-2 mb-2">{report.description}</p>
        <div className="flex items-center justify-between">
          <DataSourceBadge source={report.dataSource} />
          <span className="text-[10px] text-muted">{formatDate(report.updatedAt)}</span>
        </div>
      </div>

      {/* Hover Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 bg-white dark:bg-surface-primary border border-border rounded shadow-sm text-muted hover:text-text"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const CustomReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('updatedAt'); // 'name', 'updatedAt', 'createdAt'
  const [filterDataSource, setFilterDataSource] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Fetch reports from API
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/v1/analytics/reports/saved');
      setReports(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r => r.name?.toLowerCase().includes(query) || r.description?.toLowerCase().includes(query)
      );
    }

    // Data source filter
    if (filterDataSource !== 'all') {
      filtered = filtered.filter(r => r.dataSource === filterDataSource);
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(r => r.isFavorite);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'updatedAt') return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      if (sortBy === 'createdAt') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return 0;
    });

    return filtered;
  }, [reports, searchQuery, filterDataSource, showFavoritesOnly, sortBy]);

  const handleCreateNew = () => {
    navigate('/reports/builder');
  };

  const handleEdit = (report) => {
    navigate(`/reports/builder?id=${report.id || report.recordId}`);
  };

  const handleDelete = async (report) => {
    if (!confirm(`Are you sure you want to delete "${report.name}"?`)) return;

    try {
      await apiClient.delete(`/api/v1/analytics/reports/saved/${report.id || report.recordId}`);
      setReports(prev => prev.filter(r => r.id !== report.id && r.recordId !== report.recordId));
    } catch (err) {
      console.error('Failed to delete report:', err);
      alert('Failed to delete report: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDuplicate = async (report) => {
    try {
      const response = await apiClient.post(`/api/v1/analytics/reports/saved/${report.id || report.recordId}/duplicate`);
      if (response.data?.data) {
        setReports(prev => [response.data.data, ...prev]);
      }
    } catch (err) {
      console.error('Failed to duplicate report:', err);
      alert('Failed to duplicate report: ' + (err.message || 'Unknown error'));
    }
  };

  const handleToggleFavorite = async (report) => {
    try {
      const newValue = !report.isFavorite;
      await apiClient.put(`/api/v1/analytics/reports/saved/${report.id || report.recordId}`, {
        isFavorite: newValue,
      });
      setReports(prev =>
        prev.map(r =>
          (r.id === report.id || r.recordId === report.recordId)
            ? { ...r, isFavorite: newValue }
            : r
        )
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const dataSources = ['all', 'owners', 'pets', 'bookings', 'payments', 'services', 'staff'];

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted">Loading reports...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-sm font-medium text-text mb-1">Failed to load reports</h3>
        <p className="text-xs text-muted mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchReports}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-surface-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Data Source Filter */}
          <select
            value={filterDataSource}
            onChange={(e) => setFilterDataSource(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-surface-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {dataSources.map(ds => (
              <option key={ds} value={ds}>
                {ds === 'all' ? 'All Sources' : ds.charAt(0).toUpperCase() + ds.slice(1)}
              </option>
            ))}
          </select>

          {/* Favorites Toggle */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg transition-colors",
              showFavoritesOnly
                ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
                : "bg-white dark:bg-surface-primary border-border text-muted hover:text-text"
            )}
          >
            <Star className={cn("h-3.5 w-3.5", showFavoritesOnly && "fill-current")} />
            Favorites
          </button>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-surface-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="updatedAt">Last Modified</option>
            <option value="createdAt">Date Created</option>
            <option value="name">Name</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'grid' ? "bg-primary text-white" : "bg-white dark:bg-surface-primary text-muted hover:text-text"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'list' ? "bg-primary text-white" : "bg-white dark:bg-surface-primary text-muted hover:text-text"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Create New */}
          <Button variant="primary" size="sm" onClick={handleCreateNew} className="h-9">
            <Plus className="h-4 w-4 mr-1.5" />
            New Report
          </Button>
        </div>
      </div>

      {/* Reports Count */}
      <div className="text-xs text-muted">
        {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
        {showFavoritesOnly && ' (favorites only)'}
        {filterDataSource !== 'all' && ` in ${filterDataSource}`}
      </div>

      {/* Reports Grid/List */}
      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
            <FolderOpen className="h-8 w-8 text-muted" />
          </div>
          <h3 className="text-sm font-medium text-text mb-1">No reports found</h3>
          <p className="text-xs text-muted mb-4 max-w-sm">
            {searchQuery || filterDataSource !== 'all' || showFavoritesOnly
              ? "Try adjusting your filters or search query"
              : "Create your first custom report to see it here"}
          </p>
          {!searchQuery && filterDataSource === 'all' && !showFavoritesOnly && (
            <Button variant="primary" size="sm" onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Report
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              viewMode={viewMode}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              viewMode={viewMode}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomReports;
