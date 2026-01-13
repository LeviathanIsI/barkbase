/**
 * CustomReports - Display saved custom reports created in the Builder
 * First-class content library for report management
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
  Play,
  Download,
  Clock,
  CalendarClock,
  Eye,
  X,
  Users,
  PawPrint,
  CreditCard,
  CalendarDays,
  Wrench,
  UserCog,
  TrendingUp,
  Activity,
  Layers,
  Circle,
  Grid3X3,
  Filter as FilterIcon,
  GitMerge,
  Gauge,
  FolderTree,
  Sparkles,
  FileText,
  Share2,
  Folder,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import apiClient from '@/lib/apiClient';

// =============================================================================
// CHART TYPE ICONS AND COLORS
// =============================================================================

const CHART_TYPE_CONFIG = {
  bar: { icon: BarChart3, label: 'Bar Chart', color: '#3B82F6' },
  column: { icon: BarChart3, label: 'Column Chart', color: '#3B82F6' },
  line: { icon: Activity, label: 'Line Chart', color: '#10B981' },
  area: { icon: TrendingUp, label: 'Area Chart', color: '#10B981' },
  pie: { icon: PieChart, label: 'Pie Chart', color: '#8B5CF6' },
  donut: { icon: Circle, label: 'Donut Chart', color: '#8B5CF6' },
  table: { icon: Table2, label: 'Table', color: '#6B7280' },
  pivot: { icon: Grid3X3, label: 'Pivot Table', color: '#6B7280' },
  stacked: { icon: Layers, label: 'Stacked Chart', color: '#F59E0B' },
  treemap: { icon: FolderTree, label: 'Treemap', color: '#EC4899' },
  funnel: { icon: FilterIcon, label: 'Funnel', color: '#06B6D4' },
  sankey: { icon: GitMerge, label: 'Sankey', color: '#14B8A6' },
  gauge: { icon: Gauge, label: 'Gauge', color: '#EF4444' },
};

const DATA_SOURCE_CONFIG = {
  owners: { icon: Users, label: 'Owners', color: '#3B82F6', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  pets: { icon: PawPrint, label: 'Pets', color: '#10B981', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  bookings: { icon: CalendarDays, label: 'Bookings', color: '#8B5CF6', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  payments: { icon: CreditCard, label: 'Payments', color: '#10B981', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  services: { icon: Wrench, label: 'Services', color: '#F59E0B', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  staff: { icon: UserCog, label: 'Staff', color: '#EC4899', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400' },
};

// Sample report templates
const SAMPLE_TEMPLATES = [
  {
    id: 'revenue-by-service',
    name: 'Revenue by Service',
    description: 'See which services generate the most revenue',
    chartType: 'bar',
    dataSource: 'bookings',
  },
  {
    id: 'bookings-over-time',
    name: 'Bookings Over Time',
    description: 'Track booking trends by day or week',
    chartType: 'line',
    dataSource: 'bookings',
  },
  {
    id: 'pets-by-species',
    name: 'Pets by Species',
    description: 'Distribution of pets by type',
    chartType: 'pie',
    dataSource: 'pets',
  },
  {
    id: 'top-customers',
    name: 'Top Customers',
    description: 'Your highest-value customers',
    chartType: 'table',
    dataSource: 'owners',
  },
  {
    id: 'staff-workload',
    name: 'Staff Workload',
    description: 'Bookings assigned per staff member',
    chartType: 'column',
    dataSource: 'staff',
  },
  {
    id: 'payment-methods',
    name: 'Payment Methods',
    description: 'How customers prefer to pay',
    chartType: 'donut',
    dataSource: 'payments',
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const ChartTypeIcon = ({ type, className, showLabel = false }) => {
  const config = CHART_TYPE_CONFIG[type] || CHART_TYPE_CONFIG.bar;
  const Icon = config.icon;

  if (showLabel) {
    return (
      <div className="flex items-center gap-1.5">
        <Icon className={className} style={{ color: config.color }} />
        <span className="text-xs text-muted">{config.label}</span>
      </div>
    );
  }

  return <Icon className={className} style={{ color: config.color }} />;
};

const DataSourceBadge = ({ source, size = 'sm' }) => {
  const config = DATA_SOURCE_CONFIG[source] || {};
  const Icon = config.icon || FileText;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-medium rounded-full capitalize',
      config.bg || 'bg-gray-100 dark:bg-gray-800',
      config.text || 'text-gray-700 dark:text-gray-400',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
    )}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {config.label || source}
    </span>
  );
};

// =============================================================================
// REPORT PREVIEW MODAL
// =============================================================================

const ReportPreviewModal = ({ report, onClose, onEdit, onRun }) => {
  const config = CHART_TYPE_CONFIG[report.chartType] || CHART_TYPE_CONFIG.bar;
  const ChartIcon = config.icon;
  const sourceConfig = DATA_SOURCE_CONFIG[report.dataSource] || {};
  const SourceIcon = sourceConfig.icon || FileText;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[var(--bb-color-bg-surface)] rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <ChartIcon className="h-6 w-6" style={{ color: config.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[var(--bb-color-text-primary)] text-lg">{report.name}</h3>
                {report.isFavorite && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
              </div>
              <p className="text-sm text-[var(--bb-color-text-muted)]">{report.description || 'No description'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bb-color-bg-elevated)] rounded-lg">
            <X className="h-5 w-5 text-[var(--bb-color-text-muted)]" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="h-64 bg-[var(--bb-color-bg-elevated)] flex items-center justify-center border-b border-[var(--bb-color-border-subtle)]">
          <div className="text-center">
            <ChartIcon className="h-16 w-16 text-[var(--bb-color-text-muted)]/30 mx-auto mb-3" />
            <p className="text-sm text-[var(--bb-color-text-muted)]">Chart preview coming soon</p>
          </div>
        </div>

        {/* Details */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-[var(--bb-color-bg-elevated)]">
              <div className="text-xs text-[var(--bb-color-text-muted)] mb-1">Data Source</div>
              <div className="flex items-center gap-2">
                <SourceIcon className="h-4 w-4" style={{ color: sourceConfig.color }} />
                <span className="font-medium text-[var(--bb-color-text-primary)]">{sourceConfig.label || report.dataSource}</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[var(--bb-color-bg-elevated)]">
              <div className="text-xs text-[var(--bb-color-text-muted)] mb-1">Chart Type</div>
              <div className="flex items-center gap-2">
                <ChartIcon className="h-4 w-4" style={{ color: config.color }} />
                <span className="font-medium text-[var(--bb-color-text-primary)]">{config.label}</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[var(--bb-color-bg-elevated)]">
              <div className="text-xs text-[var(--bb-color-text-muted)] mb-1">Created</div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                <span className="font-medium text-[var(--bb-color-text-primary)]">{formatDate(report.createdAt)}</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[var(--bb-color-bg-elevated)]">
              <div className="text-xs text-[var(--bb-color-text-muted)] mb-1">Last Modified</div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                <span className="font-medium text-[var(--bb-color-text-primary)]">{formatDate(report.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={() => onRun(report)} className="flex-1">
              <Play className="h-4 w-4 mr-1.5" />
              Run Report
            </Button>
            <Button variant="outline" onClick={() => onEdit(report)} className="flex-1">
              <Edit3 className="h-4 w-4 mr-1.5" />
              Edit in Builder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// REPORT CARD COMPONENT (GRID VIEW)
// =============================================================================

const ReportCardGrid = ({ report, onEdit, onDelete, onDuplicate, onToggleFavorite, onPreview, onRun, onExport, onSchedule }) => {
  const [showMenu, setShowMenu] = useState(false);
  const config = CHART_TYPE_CONFIG[report.chartType] || CHART_TYPE_CONFIG.bar;
  const ChartIcon = config.icon;

  return (
    <div className="relative bg-white dark:bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-xl hover:border-[var(--bb-color-accent)]/50 hover:shadow-lg transition-all group overflow-hidden">
      {/* Preview Area */}
      <div
        className="h-36 flex items-center justify-center cursor-pointer relative"
        style={{ backgroundColor: `${config.color}08` }}
        onClick={() => onPreview(report)}
      >
        <ChartIcon className="h-14 w-14" style={{ color: `${config.color}40` }} />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(report); }}
            className="p-2.5 bg-white rounded-lg text-gray-800 hover:bg-gray-100 transition-colors"
            title="Quick preview"
          >
            <Eye className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRun(report); }}
            className="p-2.5 bg-[var(--bb-color-accent)] rounded-lg text-white hover:bg-[var(--bb-color-accent-hover)] transition-colors"
            title="Run report"
          >
            <Play className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Favorite star */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(report); }}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-lg transition-all",
          report.isFavorite
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-500"
            : "bg-white/80 dark:bg-gray-800/80 text-gray-400 opacity-0 group-hover:opacity-100"
        )}
      >
        <Star className={cn("h-4 w-4", report.isFavorite && "fill-current")} />
      </button>

      {/* Content */}
      <div className="p-4 border-t border-[var(--bb-color-border-subtle)]">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-[var(--bb-color-text-primary)] truncate flex-1 group-hover:text-[var(--bb-color-accent)]">
            {report.name}
          </h3>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1 text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)] rounded transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)] rounded-lg shadow-lg z-20 py-1">
                  <button onClick={() => { onRun(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]">
                    <Play className="h-3.5 w-3.5 text-emerald-500" /> Run Report
                  </button>
                  <button onClick={() => { onEdit(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]">
                    <Edit3 className="h-3.5 w-3.5 text-[var(--bb-color-text-muted)]" /> Edit in Builder
                  </button>
                  <button onClick={() => { onDuplicate(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]">
                    <Copy className="h-3.5 w-3.5 text-[var(--bb-color-text-muted)]" /> Duplicate
                  </button>
                  <div className="border-t border-[var(--bb-color-border-subtle)] my-1" />
                  <button onClick={() => { onExport(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]">
                    <Download className="h-3.5 w-3.5 text-[var(--bb-color-text-muted)]" /> Export
                  </button>
                  <button onClick={() => { onSchedule(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]">
                    <CalendarClock className="h-3.5 w-3.5 text-[var(--bb-color-text-muted)]" /> Add to Schedule
                  </button>
                  <div className="border-t border-[var(--bb-color-border-subtle)] my-1" />
                  <button onClick={() => { onToggleFavorite(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]">
                    {report.isFavorite ? <StarOff className="h-3.5 w-3.5 text-amber-500" /> : <Star className="h-3.5 w-3.5 text-amber-500" />}
                    {report.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </button>
                  <div className="border-t border-[var(--bb-color-border-subtle)] my-1" />
                  <button onClick={() => { onDelete(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {report.description && (
          <p className="text-xs text-[var(--bb-color-text-muted)] line-clamp-2 mb-3">{report.description}</p>
        )}

        <div className="flex items-center justify-between">
          <DataSourceBadge source={report.dataSource} />
          <span className="text-[10px] text-[var(--bb-color-text-muted)]">{formatDate(report.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// REPORT ROW COMPONENT (LIST VIEW)
// =============================================================================

const ReportRowList = ({ report, onEdit, onDelete, onDuplicate, onToggleFavorite, onPreview, onRun, onExport, onSchedule }) => {
  const [showMenu, setShowMenu] = useState(false);
  const config = CHART_TYPE_CONFIG[report.chartType] || CHART_TYPE_CONFIG.bar;
  const ChartIcon = config.icon;

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-lg hover:border-[var(--bb-color-accent)]/50 hover:shadow-sm transition-all group">
      {/* Chart Icon */}
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
        style={{ backgroundColor: `${config.color}15` }}
        onClick={() => onPreview(report)}
      >
        <ChartIcon className="h-5 w-5" style={{ color: config.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onPreview(report)}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)] truncate group-hover:text-[var(--bb-color-accent)]">
            {report.name}
          </h3>
          {report.isFavorite && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
        </div>
        {report.description && (
          <p className="text-xs text-[var(--bb-color-text-muted)] truncate">{report.description}</p>
        )}
      </div>

      {/* Data Source */}
      <DataSourceBadge source={report.dataSource} />

      {/* Chart Type */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-[var(--bb-color-text-muted)]">
        <ChartIcon className="h-3.5 w-3.5" style={{ color: config.color }} />
        <span>{config.label}</span>
      </div>

      {/* Last Modified */}
      <div className="text-xs text-[var(--bb-color-text-muted)] whitespace-nowrap w-24 text-right">
        {formatDate(report.updatedAt)}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onRun(report)}
          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
          title="Run report"
        >
          <Play className="h-4 w-4" />
        </button>
        <button
          onClick={() => onEdit(report)}
          className="p-1.5 text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)] rounded-lg transition-colors"
          title="Edit"
        >
          <Edit3 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onToggleFavorite(report)}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            report.isFavorite
              ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              : "text-[var(--bb-color-text-muted)] hover:text-amber-500 hover:bg-[var(--bb-color-bg-elevated)]"
          )}
          title={report.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={cn("h-4 w-4", report.isFavorite && "fill-current")} />
        </button>
      </div>

      {/* More Menu */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="p-1.5 text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)] rounded-lg transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)] rounded-lg shadow-lg z-20 py-1">
              <button onClick={() => { onPreview(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]">
                <Eye className="h-3.5 w-3.5 text-[var(--bb-color-text-muted)]" /> Quick Preview
              </button>
              <button onClick={() => { onDuplicate(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]">
                <Copy className="h-3.5 w-3.5 text-[var(--bb-color-text-muted)]" /> Duplicate
              </button>
              <div className="border-t border-[var(--bb-color-border-subtle)] my-1" />
              <button onClick={() => { onExport(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]">
                <Download className="h-3.5 w-3.5 text-[var(--bb-color-text-muted)]" /> Export
              </button>
              <button onClick={() => { onSchedule(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]">
                <CalendarClock className="h-3.5 w-3.5 text-[var(--bb-color-text-muted)]" /> Add to Schedule
              </button>
              <div className="border-t border-[var(--bb-color-border-subtle)] my-1" />
              <button onClick={() => { onDelete(report); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// TEMPLATE CARD COMPONENT
// =============================================================================

const TemplateCard = ({ template, onUse }) => {
  const config = CHART_TYPE_CONFIG[template.chartType] || CHART_TYPE_CONFIG.bar;
  const ChartIcon = config.icon;
  const sourceConfig = DATA_SOURCE_CONFIG[template.dataSource] || {};

  return (
    <button
      onClick={() => onUse(template)}
      className="text-left p-4 rounded-xl border-2 border-dashed border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-accent)] hover:bg-[var(--bb-color-accent)]/5 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <ChartIcon size={20} style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-[var(--bb-color-text-primary)] group-hover:text-[var(--bb-color-accent)] truncate">
            {template.name}
          </h4>
          <p className="text-xs text-[var(--bb-color-text-muted)] line-clamp-1 mt-0.5">
            {template.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-muted)]">
              {config.label}
            </span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded', sourceConfig.bg, sourceConfig.text)}>
              {sourceConfig.label}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-[var(--bb-color-text-muted)] group-hover:text-[var(--bb-color-accent)] group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
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
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [filterDataSource, setFilterDataSource] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'favorites', 'templates'

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

    // Tab filter
    if (activeTab === 'favorites') {
      filtered = filtered.filter(r => r.isFavorite);
    }

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

    // Favorites filter (only in 'all' tab)
    if (activeTab === 'all' && showFavoritesOnly) {
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
  }, [reports, searchQuery, filterDataSource, showFavoritesOnly, sortBy, activeTab]);

  const favoritesCount = useMemo(() => reports.filter(r => r.isFavorite).length, [reports]);

  const handleCreateNew = () => navigate('/reports/builder');
  const handleEdit = (report) => navigate(`/reports/builder?id=${report.id || report.recordId}`);
  const handleRun = (report) => navigate(`/reports/builder?id=${report.id || report.recordId}&run=true`);
  const handlePreview = (report) => setPreviewReport(report);
  const handleExport = (report) => {
    // TODO: Implement export functionality
    alert(`Export "${report.name}" - Coming soon!`);
  };
  const handleSchedule = (report) => {
    // TODO: Navigate to schedule tab with this report
    alert(`Schedule "${report.name}" - Coming soon!`);
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

  const handleUseTemplate = (template) => {
    navigate(`/reports/builder?template=${template.id}`);
  };

  const dataSources = ['all', 'owners', 'pets', 'bookings', 'payments', 'services', 'staff'];

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-[var(--bb-color-accent)] animate-spin mb-4" />
        <p className="text-sm text-[var(--bb-color-text-muted)]">Loading reports...</p>
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
        <h3 className="text-sm font-medium text-[var(--bb-color-text-primary)] mb-1">Failed to load reports</h3>
        <p className="text-xs text-[var(--bb-color-text-muted)] mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchReports}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Modal */}
      {previewReport && (
        <ReportPreviewModal
          report={previewReport}
          onClose={() => setPreviewReport(null)}
          onEdit={(r) => { setPreviewReport(null); handleEdit(r); }}
          onRun={(r) => { setPreviewReport(null); handleRun(r); }}
        />
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bb-color-bg-elevated)] rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'all'
              ? "bg-white dark:bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)] shadow-sm"
              : "text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)]"
          )}
        >
          <span className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            All Reports
            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-muted)]">
              {reports.length}
            </span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'favorites'
              ? "bg-white dark:bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)] shadow-sm"
              : "text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)]"
          )}
        >
          <span className="flex items-center gap-2">
            <Star className={cn("h-4 w-4", activeTab === 'favorites' && "text-amber-500")} />
            Favorites
            {favoritesCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                {favoritesCount}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'templates'
              ? "bg-white dark:bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)] shadow-sm"
              : "text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)]"
          )}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Templates
          </span>
        </button>
      </div>

      {/* Templates Tab Content */}
      {activeTab === 'templates' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[var(--bb-color-text-primary)]">Report Templates</h3>
              <p className="text-sm text-[var(--bb-color-text-muted)]">Start with a pre-built template to save time</p>
            </div>
            <Button variant="primary" onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-1.5" />
              Blank Report
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SAMPLE_TEMPLATES.map(template => (
              <TemplateCard key={template.id} template={template} onUse={handleUseTemplate} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Header Actions */}
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--bb-color-text-muted)]" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]/20 focus:border-[var(--bb-color-accent)]"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              {/* Data Source Filter */}
              <select
                value={filterDataSource}
                onChange={(e) => setFilterDataSource(e.target.value)}
                className="px-3 py-2 text-xs bg-white dark:bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]/20"
              >
                {dataSources.map(ds => (
                  <option key={ds} value={ds}>
                    {ds === 'all' ? 'All Sources' : DATA_SOURCE_CONFIG[ds]?.label || ds}
                  </option>
                ))}
              </select>

              {/* Favorites Toggle (only in All tab) */}
              {activeTab === 'all' && (
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg transition-colors",
                    showFavoritesOnly
                      ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
                      : "bg-white dark:bg-[var(--bb-color-bg-surface)] border-[var(--bb-color-border-subtle)] text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)]"
                  )}
                >
                  <Star className={cn("h-3.5 w-3.5", showFavoritesOnly && "fill-current")} />
                  Favorites
                </button>
              )}

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs bg-white dark:bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]/20"
              >
                <option value="updatedAt">Last Modified</option>
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center border border-[var(--bb-color-border-subtle)] rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === 'grid'
                      ? "bg-[var(--bb-color-accent)] text-white"
                      : "bg-white dark:bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)]"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === 'list'
                      ? "bg-[var(--bb-color-accent)] text-white"
                      : "bg-white dark:bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)]"
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
          <div className="text-xs text-[var(--bb-color-text-muted)]">
            {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
            {showFavoritesOnly && ' (favorites only)'}
            {filterDataSource !== 'all' && ` in ${DATA_SOURCE_CONFIG[filterDataSource]?.label || filterDataSource}`}
          </div>

          {/* Reports Grid/List */}
          {filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-6">
                <FolderOpen className="h-10 w-10 text-violet-500" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--bb-color-text-primary)] mb-2">
                {activeTab === 'favorites' ? 'No favorite reports yet' : 'No reports found'}
              </h3>
              <p className="text-sm text-[var(--bb-color-text-muted)] mb-6 max-w-md">
                {searchQuery || filterDataSource !== 'all' || showFavoritesOnly
                  ? "Try adjusting your filters or search query"
                  : activeTab === 'favorites'
                    ? "Star reports to add them to your favorites for quick access"
                    : "Create your first custom report to see it here, or start with a template"}
              </p>
              {!searchQuery && filterDataSource === 'all' && !showFavoritesOnly && activeTab !== 'favorites' && (
                <div className="flex items-center gap-3">
                  <Button variant="primary" onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create Report
                  </Button>
                  <span className="text-sm text-[var(--bb-color-text-muted)]">or</span>
                  <Button variant="outline" onClick={() => setActiveTab('templates')}>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Browse Templates
                  </Button>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredReports.map(report => (
                <ReportCardGrid
                  key={report.id || report.recordId}
                  report={report}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onToggleFavorite={handleToggleFavorite}
                  onPreview={handlePreview}
                  onRun={handleRun}
                  onExport={handleExport}
                  onSchedule={handleSchedule}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReports.map(report => (
                <ReportRowList
                  key={report.id || report.recordId}
                  report={report}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onToggleFavorite={handleToggleFavorite}
                  onPreview={handlePreview}
                  onRun={handleRun}
                  onExport={handleExport}
                  onSchedule={handleSchedule}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomReports;
