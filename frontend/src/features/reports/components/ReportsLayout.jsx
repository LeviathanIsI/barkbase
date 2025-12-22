/**
 * ReportsLayout - Layout wrapper for reports section with tab navigation
 * Uses route-based tabs instead of internal state
 */

import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import {
  BarChart3,
  Activity,
  Clock,
  Settings,
  Target,
  Zap,
  Calendar,
  TrendingUp,
  ChevronRight,
  Download,
  FileBarChart,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import { cn } from '@/lib/cn';

// ═══════════════════════════════════════════════════════════════════════════
// DATE RANGE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'thisQuarter', label: 'This quarter' },
  { value: 'thisYear', label: 'This year' },
];

const COMPARE_OPTIONS = [
  { value: 'none', label: 'No comparison' },
  { value: 'previousPeriod', label: 'Previous period' },
  { value: 'previousYear', label: 'Same period last year' },
];

const getDateRange = (rangeKey) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (rangeKey) {
    case 'today':
      return { startDate: today.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday.toISOString().split('T')[0], endDate: yesterday.toISOString().split('T')[0] };
    }
    case 'last7': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { startDate: start.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    }
    case 'last30': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { startDate: start.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
    }
    case 'thisQuarter': {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return { startDate: quarterStart.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: start.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    }
    default:
      return { startDate: null, endDate: null };
  }
};

const getComparisonRange = (compareKey, dateRange) => {
  if (!dateRange.startDate || !dateRange.endDate || compareKey === 'none') {
    return { compareStartDate: null, compareEndDate: null };
  }

  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  switch (compareKey) {
    case 'previousPeriod': {
      const compareEnd = new Date(start);
      compareEnd.setDate(compareEnd.getDate() - 1);
      const compareStart = new Date(compareEnd);
      compareStart.setDate(compareStart.getDate() - daysDiff + 1);
      return { compareStartDate: compareStart.toISOString().split('T')[0], compareEndDate: compareEnd.toISOString().split('T')[0] };
    }
    case 'previousYear': {
      const compareStart = new Date(start);
      compareStart.setFullYear(compareStart.getFullYear() - 1);
      const compareEnd = new Date(end);
      compareEnd.setFullYear(compareEnd.getFullYear() - 1);
      return { compareStartDate: compareStart.toISOString().split('T')[0], compareEndDate: compareEnd.toISOString().split('T')[0] };
    }
    default:
      return { compareStartDate: null, compareEndDate: null };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const tabs = [
  { path: '/reports', label: 'Overview', icon: BarChart3, end: true },
  { path: '/reports/live', label: 'Live', icon: Activity },
  { path: '/reports/scheduled', label: 'Scheduled', icon: Clock },
  { path: '/reports/builder', label: 'Builder', icon: Settings },
  { path: '/reports/custom', label: 'Custom Reports', icon: FileBarChart },
  { path: '/reports/benchmarks', label: 'Benchmarks', icon: Target },
  { path: '/reports/predictive', label: 'Predictive', icon: Zap },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LAYOUT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ReportsLayout = () => {
  const [dateRangeKey, setDateRangeKey] = useState('thisMonth');
  const [compareKey, setCompareKey] = useState('previousPeriod');
  const location = useLocation();

  const dateRange = useMemo(() => getDateRange(dateRangeKey), [dateRangeKey]);
  const comparisonRange = useMemo(() => getComparisonRange(compareKey, dateRange), [compareKey, dateRange]);

  // Hide date filters on certain tabs
  const showDateFilters = !location.pathname.includes('/builder') &&
                          !location.pathname.includes('/custom') &&
                          !location.pathname.includes('/benchmarks') &&
                          !location.pathname.includes('/predictive');

  return (
    <div className="space-y-3">
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="mb-0.5">
            <ol className="flex items-center gap-1 text-[10px] text-muted">
              <li>Administration</li>
              <li><ChevronRight className="h-2.5 w-2.5" /></li>
              <li className="text-text font-medium">Reports</li>
            </ol>
          </nav>
          <h1 className="text-base font-semibold text-text">Reports & Analytics</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Range Filters - Compact inline (only show on relevant tabs) */}
      {showDateFilters && (
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg px-3 py-2 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted" />
            <div className="min-w-[130px]">
              <StyledSelect
                options={DATE_RANGE_OPTIONS}
                value={dateRangeKey}
                onChange={(opt) => setDateRangeKey(opt?.value || 'thisMonth')}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted" />
            <div className="min-w-[160px]">
              <StyledSelect
                options={COMPARE_OPTIONS}
                value={compareKey}
                onChange={(opt) => setCompareKey(opt?.value || 'previousPeriod')}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>
          <div className="ml-auto text-[10px] text-muted">
            {dateRange.startDate && format(new Date(dateRange.startDate), 'MMM d')} - {dateRange.endDate && format(new Date(dateRange.endDate), 'MMM d')}
          </div>
        </div>
      )}

      {/* Tabs - Compact using NavLink */}
      <div className="flex items-center gap-0.5 border-b border-border">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) => cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            )}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Tab Content - Pass date range context to children */}
      <Outlet context={{ dateRange, comparisonRange }} />
    </div>
  );
};

export default ReportsLayout;
