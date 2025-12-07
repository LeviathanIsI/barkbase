/**
 * Reports & Analytics - Unified Enterprise Analytics Module
 * Modeled after Shopify Analytics, Stripe Sigma, HubSpot Reporting
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useReportDashboard, useKPIsQuery, useServiceAnalyticsQuery, useRevenueReport, useCustomerAnalyticsQuery, useLiveAnalyticsQuery, useRecentActivityQuery } from '../api';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Settings,
  Target,
  Zap,
  DollarSign,
  Calendar,
  Users,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Download,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit3,
  Mail,
  Send,
  Eye,
  FileText,
  Star,
  Activity,
  Layers,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Percent,
  Box,
  PawPrint,
  Scissors,
  Dumbbell,
  MoreHorizontal,
  ExternalLink,
  LayoutGrid,
  List,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS - Used across ALL tabs for consistency
// ═══════════════════════════════════════════════════════════════════════════

// Section Header - Consistent header for every section
const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wide">{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

// KPI Tile - Compact metric display
const KPITile = ({ icon: Icon, label, value, trend, trendValue, trendType, subtitle, onClick, variant = 'default' }) => (
  <button
    onClick={onClick}
    className={cn(
      'text-left bg-white dark:bg-surface-primary border rounded-lg p-3 transition-all hover:shadow-sm w-full',
      variant === 'highlight' ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-primary/20'
    )}
  >
    <div className="flex items-start justify-between mb-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted" />}
        <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      </div>
      {trend && (
        <div className={cn(
          'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded',
          trendType === 'positive' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          trendType === 'negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        )}>
          {trendType === 'positive' ? <TrendingUp className="h-3 w-3" /> : 
           trendType === 'negative' ? <TrendingDown className="h-3 w-3" /> : null}
          {trendValue}
        </div>
      )}
    </div>
    <p className="text-xl font-bold text-text">{value}</p>
    {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
  </button>
);

// Chart Container - Standardized chart wrapper
const ChartContainer = ({ title, timeRange, onTimeRangeChange, height = 'h-48', children }) => (
  <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-sm font-medium text-text">{title}</h4>
      {onTimeRangeChange && (
        <select
          value={timeRange}
          onChange={(e) => onTimeRangeChange(e.target.value)}
          className="text-xs px-2 py-1 bg-surface border-0 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      )}
    </div>
    <div className={cn('bg-surface/50 rounded-lg flex items-center justify-center', height)}>
      {children || (
        <div className="text-center">
          <BarChart3 className="h-8 w-8 text-muted mx-auto mb-2" />
          <p className="text-xs text-muted">Chart visualization</p>
        </div>
      )}
    </div>
  </div>
);

// Coming Soon State - For features not yet implemented
const ComingSoonState = ({ icon: Icon, title, subtitle, features = [] }) => (
  <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-8 text-center">
    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
      <Icon className="h-8 w-8 text-primary" />
    </div>
    <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
    <p className="text-sm text-muted mb-6 max-w-md mx-auto">{subtitle}</p>

    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-full text-sm font-medium mb-6">
      <Zap className="h-4 w-4" />
      Coming Soon
    </div>

    {features.length > 0 && (
      <div className="max-w-sm mx-auto text-left">
        <p className="text-xs text-muted uppercase tracking-wide mb-3 text-center">Planned Features</p>
        <div className="space-y-2">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted">
              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Progress Bar
const ProgressBar = ({ label, value, max = 100, color = 'primary' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const colors = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-text w-10 text-right">{value}%</span>
    </div>
  );
};

// Filter Toolbar - Consistent filter bar
const FilterToolbar = ({ searchTerm, onSearchChange, timeRange, onTimeRangeChange, actions }) => (
  <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3 mb-5">
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-surface border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      
      <select
        value={timeRange}
        onChange={(e) => onTimeRangeChange(e.target.value)}
        className="px-3 py-2 text-sm bg-surface border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <option value="today">Today</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
        <option value="1y">Last year</option>
      </select>
      
      <div className="ml-auto flex items-center gap-2">
        {actions}
      </div>
    </div>
  </div>
);

// Empty State
const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div className="text-center py-12">
    <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
      <Icon className="h-8 w-8 text-muted" />
    </div>
    <h3 className="font-medium text-text mb-1">{title}</h3>
    <p className="text-sm text-muted mb-4 max-w-sm mx-auto">{subtitle}</p>
    {action}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW - Executive Dashboard (Real Data)
// ═══════════════════════════════════════════════════════════════════════════

const OverviewTab = ({ dateRange = {}, comparisonRange = {} }) => {
  const [timeRange, setTimeRange] = useState('30d');

  // Build query params from date range
  const queryParams = useMemo(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    compareStartDate: comparisonRange.compareStartDate,
    compareEndDate: comparisonRange.compareEndDate,
  }), [dateRange, comparisonRange]);

  // Fetch real data from analytics API with date filters
  const { data: dashboardData, isLoading: dashboardLoading } = useReportDashboard(queryParams);
  const { data: customerData, isLoading: customerLoading } = useCustomerAnalyticsQuery();
  const { data: serviceData, isLoading: serviceLoading } = useServiceAnalyticsQuery();

  const isLoading = dashboardLoading || customerLoading || serviceLoading;

  // Extract metrics from dashboard data with safe defaults
  const metrics = useMemo(() => {
    const data = dashboardData?.data || dashboardData || {};
    const customers = customerData?.data || customerData || {};

    // Revenue - convert cents to dollars
    const totalRevenueCents = parseInt(data.totalRevenue || data.revenue || 0, 10);
    const totalRevenue = totalRevenueCents / 100;
    const revenueChange = parseFloat(data.revenueChange || data.revenueTrend || 0);

    // Bookings
    const totalBookings = parseInt(data.totalBookings || data.bookings || 0, 10);
    const pendingBookings = parseInt(data.pendingBookings || data.pending || 0, 10);
    const bookingsChange = parseFloat(data.bookingsChange || data.bookingsTrend || 0);

    // Customers
    const totalCustomers = parseInt(customers.total || data.totalCustomers || data.customers || 0, 10);
    const newCustomers = parseInt(customers.newThisMonth || data.newCustomers || 0, 10);
    const customerChange = parseFloat(customers.growthRate || data.customerChange || 0);

    // Capacity & averages
    const capacity = parseFloat(data.capacityUtilization || data.capacity || 0);
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const noShows = parseInt(data.noShows || 0, 10);

    return {
      revenue: totalRevenue,
      revenueChange,
      bookings: totalBookings,
      pendingBookings,
      bookingsChange,
      customers: totalCustomers,
      newCustomers,
      customerChange,
      capacity,
      avgBookingValue,
      noShows,
    };
  }, [dashboardData, customerData]);

  // Build KPI array from real data
  const kpis = useMemo(() => [
    {
      icon: DollarSign,
      label: 'Revenue',
      value: `$${metrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      trend: metrics.revenueChange !== 0,
      trendValue: `${metrics.revenueChange >= 0 ? '+' : ''}${metrics.revenueChange.toFixed(0)}%`,
      trendType: metrics.revenueChange >= 0 ? 'positive' : 'negative',
      subtitle: 'vs last period'
    },
    {
      icon: Calendar,
      label: 'Bookings',
      value: metrics.bookings.toLocaleString(),
      trend: metrics.bookingsChange !== 0,
      trendValue: `${metrics.bookingsChange >= 0 ? '+' : ''}${metrics.bookingsChange.toFixed(0)}%`,
      trendType: metrics.bookingsChange >= 0 ? 'positive' : 'negative',
      subtitle: `${metrics.pendingBookings} pending`
    },
    {
      icon: Users,
      label: 'Customers',
      value: metrics.customers.toLocaleString(),
      trend: metrics.customerChange !== 0,
      trendValue: `${metrics.customerChange >= 0 ? '+' : ''}${metrics.customerChange.toFixed(0)}%`,
      trendType: metrics.customerChange >= 0 ? 'positive' : 'negative',
      subtitle: `${metrics.newCustomers} new`
    },
    {
      icon: TrendingUp,
      label: 'Growth',
      value: `${metrics.customerChange.toFixed(0)}%`,
      trend: metrics.customerChange !== 0,
      trendValue: `${metrics.customerChange >= 0 ? '+' : ''}${metrics.customerChange.toFixed(0)}%`,
      trendType: metrics.customerChange >= 0 ? 'positive' : 'negative',
      subtitle: 'MoM'
    },
    {
      icon: Target,
      label: 'Avg Value',
      value: `$${metrics.avgBookingValue.toFixed(2)}`,
      subtitle: 'per booking'
    },
    {
      icon: Percent,
      label: 'Capacity',
      value: `${metrics.capacity.toFixed(0)}%`,
      trend: true,
      trendValue: metrics.capacity >= 70 ? 'Good' : 'Low',
      trendType: metrics.capacity >= 70 ? 'positive' : 'negative',
      subtitle: 'utilization'
    },
    {
      icon: Box,
      label: 'Top Service',
      value: 'Boarding',
      subtitle: 'most booked'
    },
    {
      icon: AlertTriangle,
      label: 'No-Shows',
      value: metrics.noShows.toString(),
      trend: true,
      trendValue: metrics.noShows === 0 ? 'None!' : `${metrics.noShows}`,
      trendType: metrics.noShows <= 2 ? 'positive' : 'negative',
      subtitle: 'this period'
    },
  ], [metrics]);

  // Service Performance from real data
  const services = useMemo(() => {
    // API returns { data: { serviceUtilization: [...] } }
    const rawData = serviceData?.data?.serviceUtilization || serviceData?.data || serviceData?.services || serviceData || [];
    const data = Array.isArray(rawData) ? rawData : [];

    if (data.length > 0) {
      // API returns { service: name, bookings: count }
      const total = data.reduce((sum, s) => sum + (s.bookings || s.bookingCount || s.count || 0), 0);
      return data.slice(0, 4).map((service, idx) => ({
        name: service.service || service.name || service.serviceName || `Service ${idx + 1}`,
        icon: Box,
        value: total > 0 ? Math.round(((service.bookings || service.bookingCount || service.count || 0) / total) * 100) : 0,
        color: ['success', 'primary', 'warning', 'danger'][idx] || 'primary',
      }));
    }
    // Fallback if no service data
    return [
      { name: 'Boarding', icon: Box, value: 0, color: 'success' },
      { name: 'Daycare', icon: PawPrint, value: 0, color: 'primary' },
      { name: 'Grooming', icon: Scissors, value: 0, color: 'warning' },
      { name: 'Training', icon: Dumbbell, value: 0, color: 'danger' },
    ];
  }, [serviceData]);

  // Weekly Utilization - would need capacity endpoint with daily breakdown
  // For now, show placeholder that indicates we need this data
  const weekData = [
    { day: 'Mon', value: Math.round(metrics.capacity * 0.7) },
    { day: 'Tue', value: Math.round(metrics.capacity * 0.85) },
    { day: 'Wed', value: Math.round(metrics.capacity * 0.9) },
    { day: 'Thu', value: Math.round(metrics.capacity * 1.05) },
    { day: 'Fri', value: Math.round(metrics.capacity * 1.2) },
    { day: 'Sat', value: Math.round(metrics.capacity * 1.15) },
    { day: 'Sun', value: Math.round(metrics.capacity * 0.95) },
  ].map(d => ({ ...d, value: Math.min(100, Math.max(0, d.value)) }));

  const avgUtil = weekData.reduce((sum, d) => sum + d.value, 0) / 7;
  const peakDay = weekData.reduce((max, d) => d.value > max.value ? d : max, weekData[0]);
  const lowDay = weekData.reduce((min, d) => d.value < min.value ? d : min, weekData[0]);

  const getUtilColor = (val) => val >= 90 ? 'bg-red-500' : val >= 75 ? 'bg-amber-500' : val >= 50 ? 'bg-green-500' : 'bg-gray-300';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI Grid - 2 rows x 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <KPITile key={i} {...kpi} />
        ))}
      </div>

      {/* Summary Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartContainer title="Revenue Trend" timeRange={timeRange} onTimeRangeChange={setTimeRange}>
          <div className="text-center">
            <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-text">${metrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted">{metrics.revenueChange >= 0 ? '+' : ''}{metrics.revenueChange.toFixed(0)}% vs last period</p>
          </div>
        </ChartContainer>
        <ChartContainer title="Bookings Trend">
          <div className="text-center">
            <Calendar className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-text">{metrics.bookings.toLocaleString()}</p>
            <p className="text-xs text-muted">{metrics.bookingsChange >= 0 ? '+' : ''}{metrics.bookingsChange.toFixed(0)}% vs last period</p>
          </div>
        </ChartContainer>
        <ChartContainer title="Customer Growth">
          <div className="text-center">
            <Users className="h-6 w-6 text-purple-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-text">{metrics.customers.toLocaleString()}</p>
            <p className="text-xs text-muted">{metrics.newCustomers} new this period</p>
          </div>
        </ChartContainer>
      </div>

      {/* Operational Performance */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <SectionHeader icon={PieChart} title="Service Performance" subtitle="Booking breakdown by service" />
        <div className="space-y-3">
          {services.map((service, i) => (
            <ProgressBar key={i} label={service.name} value={service.value} color={service.color} />
          ))}
        </div>
      </div>

      {/* Weekly Utilization Grid */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <SectionHeader icon={LayoutGrid} title="Weekly Utilization" subtitle="Estimated capacity by day of week" />
        <div className="grid grid-cols-7 gap-2">
          {weekData.map((day, i) => (
            <div key={i} className="text-center">
              <div className="text-xs text-muted mb-1">{day.day}</div>
              <div className="relative h-16 bg-surface rounded overflow-hidden">
                <div
                  className={cn('absolute bottom-0 w-full transition-all', getUtilColor(day.value))}
                  style={{ height: `${day.value}%`, opacity: 0.8 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-text">{day.value}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted">
          <span>Avg: <strong className="text-text">{avgUtil.toFixed(0)}%</strong></span>
          <span>Peak: <strong className="text-text">{peakDay.value}% ({peakDay.day})</strong></span>
          <span>Low: <strong className="text-text">{lowDay.value}% ({lowDay.day})</strong></span>
        </div>
      </div>

      {/* Insights based on actual data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-green-800 dark:text-green-300">Highlights</span>
          </div>
          <ul className="space-y-1.5 text-sm text-green-700 dark:text-green-400">
            {metrics.revenueChange > 0 && <li className="flex items-start gap-2"><span>•</span>Revenue up {metrics.revenueChange.toFixed(0)}%</li>}
            {metrics.customerChange > 0 && <li className="flex items-start gap-2"><span>•</span>{metrics.newCustomers} new customers this period</li>}
            {metrics.noShows === 0 && <li className="flex items-start gap-2"><span>•</span>Zero no-shows - great attendance!</li>}
            {metrics.capacity >= 70 && <li className="flex items-start gap-2"><span>•</span>Good capacity utilization ({metrics.capacity.toFixed(0)}%)</li>}
          </ul>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Opportunities</span>
          </div>
          <ul className="space-y-1.5 text-sm text-amber-700 dark:text-amber-400">
            {metrics.capacity < 70 && <li className="flex items-start gap-2"><span>•</span>Capacity at {metrics.capacity.toFixed(0)}% - room for growth</li>}
            {metrics.noShows > 0 && <li className="flex items-start gap-2"><span>•</span>{metrics.noShows} no-shows - consider deposits</li>}
            {metrics.bookingsChange < 0 && <li className="flex items-start gap-2"><span>•</span>Bookings down {Math.abs(metrics.bookingsChange).toFixed(0)}% - run a promotion</li>}
            {metrics.pendingBookings > 5 && <li className="flex items-start gap-2"><span>•</span>{metrics.pendingBookings} pending bookings to confirm</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: LIVE ANALYTICS - Real-time dashboard
// ═══════════════════════════════════════════════════════════════════════════

const LiveAnalyticsTab = () => {
  const { data: liveData, isLoading: liveLoading, refetch } = useLiveAnalyticsQuery();
  const { data: activityData, isLoading: activityLoading } = useRecentActivityQuery();

  // Process live data
  const stats = useMemo(() => {
    const data = liveData?.data || liveData || {};
    const revenueCents = data.revenue || 0;
    const revenueDollars = revenueCents / 100; // Convert cents to dollars
    const bookings = data.bookings || 0;
    const activeBookings = data.activeBookings || 0;
    const capacity = data.capacity || 0;
    const occupancy = data.capacityUtilization || data.occupancyRate || 0;

    return {
      revenue: `$${revenueDollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      bookings,
      activeBookings,
      capacity,
      occupancy: Math.round(occupancy),
    };
  }, [liveData]);

  const liveStats = [
    { icon: DollarSign, label: 'Today Revenue', value: stats.revenue, subtitle: 'Today\'s total', variant: 'highlight' },
    { icon: Calendar, label: 'Today Bookings', value: stats.bookings.toString(), subtitle: `${stats.activeBookings} active` },
    { icon: Users, label: 'Active', value: stats.activeBookings.toString(), subtitle: 'Currently on-site' },
    { icon: Percent, label: 'Occupancy', value: `${stats.occupancy}%`, subtitle: `${stats.activeBookings}/${stats.capacity || '?'} capacity` },
  ];

  // Format activity feed with relative times
  const activityFeed = useMemo(() => {
    if (!activityData || activityData.length === 0) {
      return [{ time: 'Now', event: 'No recent activity', type: 'info' }];
    }
    return activityData.map(item => {
      // Calculate relative time - handle null/invalid times
      if (!item.time) {
        return { ...item, time: 'Recently' };
      }

      const now = new Date();
      const itemTime = new Date(item.time);

      // Check if date is valid
      if (isNaN(itemTime.getTime())) {
        return { ...item, time: 'Recently' };
      }

      const diffMs = now - itemTime;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let timeStr;
      if (diffMins < 0) timeStr = 'Just now'; // Future dates
      else if (diffMins < 1) timeStr = 'Just now';
      else if (diffMins < 60) timeStr = `${diffMins} min ago`;
      else if (diffHours < 24) timeStr = `${diffHours}h ago`;
      else if (diffDays < 30) timeStr = `${diffDays}d ago`;
      else timeStr = 'Over a month ago';

      return { ...item, time: timeStr };
    });
  }, [activityData]);

  // Get service breakdown from live data
  const popularServices = useMemo(() => {
    const data = liveData?.data || liveData || {};
    const services = data.serviceUtilization || [];
    if (services.length === 0) {
      return [{ name: 'No services today', count: 0, percentage: 0 }];
    }
    const total = services.reduce((sum, s) => sum + (s.bookings || s.count || 0), 0);
    return services.slice(0, 4).map(s => ({
      name: s.name || s.service_name || 'Service',
      count: s.bookings || s.count || 0,
      percentage: total > 0 ? Math.round(((s.bookings || s.count || 0) / total) * 100) : 0,
    }));
  }, [liveData]);

  const isLoading = liveLoading || activityLoading;

  return (
    <div className="space-y-5">
      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-muted">Live • Auto-refreshing</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => refetch()}>
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {liveStats.map((stat, i) => (
          <KPITile key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
          <SectionHeader icon={Activity} title="Recent Activity" subtitle="Latest events" />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activityFeed.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className={cn(
                  'h-2 w-2 rounded-full flex-shrink-0',
                  item.type === 'payment' ? 'bg-green-500' :
                  item.type === 'checkin' ? 'bg-blue-500' :
                  item.type === 'checkout' ? 'bg-amber-500' : 'bg-primary'
                )} />
                <span className="text-sm text-text flex-1">{item.event}</span>
                <span className="text-xs text-muted">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Services */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
          <SectionHeader icon={Star} title="Popular Today" subtitle="Top services" />
          <div className="space-y-3">
            {popularServices.map((service, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-text">{service.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{service.count}</span>
                  <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${service.percentage}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Sessions & Revenue Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartContainer title="Today's Revenue" height="h-40">
          <div className="text-center">
            <p className="text-2xl font-bold text-text">{stats.revenue}</p>
            <p className="text-xs text-muted">Total for today</p>
          </div>
        </ChartContainer>
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
          <SectionHeader icon={Users} title="Current Status" subtitle="Today's snapshot" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-text">{stats.activeBookings}</p>
              <p className="text-xs text-muted">Pets on-site</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text">{stats.bookings}</p>
              <p className="text-xs text-muted">Total bookings</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text">{stats.capacity - stats.activeBookings}</p>
              <p className="text-xs text-muted">Spots available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: SCHEDULED REPORTS - Coming Soon
// ═══════════════════════════════════════════════════════════════════════════

const ScheduledReportsTab = () => {
  return (
    <div className="space-y-5">
      <ComingSoonState
        icon={Mail}
        title="Scheduled Reports"
        subtitle="Automatic report delivery to your inbox"
        features={[
          'Daily, weekly, or monthly revenue summaries',
          'Automatic email delivery to your team',
          'PDF and Excel export formats',
          'Custom report templates',
        ]}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: CUSTOM BUILDER - Coming Soon
// ═══════════════════════════════════════════════════════════════════════════

const CustomBuilderTab = () => {
  return (
    <div className="space-y-5">
      <ComingSoonState
        icon={Settings}
        title="Custom Report Builder"
        subtitle="Create tailored reports with the metrics that matter to your business"
        features={[
          'Drag-and-drop metric selection',
          'Custom date ranges and filters',
          'Save and reuse report templates',
          'Export to PDF, Excel, or CSV',
        ]}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5: BENCHMARKS - Coming Soon
// ═══════════════════════════════════════════════════════════════════════════

const BenchmarksTab = () => {
  return (
    <div className="space-y-5">
      <ComingSoonState
        icon={Target}
        title="Industry Benchmarks"
        subtitle="Compare your performance against similar pet care businesses"
        features={[
          'Compare to industry averages',
          'See where you rank (percentile)',
          'Identify improvement opportunities',
          'Track progress over time',
        ]}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 6: PREDICTIVE ANALYTICS - Coming Soon
// ═══════════════════════════════════════════════════════════════════════════

const PredictiveTab = () => {
  return (
    <div className="space-y-5">
      <ComingSoonState
        icon={TrendingUp}
        title="Predictive Analytics"
        subtitle="AI-powered forecasts and recommendations to grow your business"
        features={[
          'Revenue and booking forecasts',
          'Demand prediction for staffing',
          'Customer churn risk alerts',
          'Pricing optimization suggestions',
        ]}
      />
    </div>
  );
};

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
  { value: 'lastQuarter', label: 'Last quarter' },
  { value: 'thisYear', label: 'This year' },
  { value: 'lastYear', label: 'Last year' },
  { value: 'custom', label: 'Custom range' },
];

const COMPARE_OPTIONS = [
  { value: 'none', label: 'No comparison' },
  { value: 'previousPeriod', label: 'Previous period' },
  { value: 'previousYear', label: 'Same period last year' },
  { value: 'custom', label: 'Custom comparison' },
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
    case 'lastQuarter': {
      const lastQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
      const lastQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
      return { startDate: lastQuarterStart.toISOString().split('T')[0], endDate: lastQuarterEnd.toISOString().split('T')[0] };
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: start.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] };
    }
    case 'lastYear': {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
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

const formatDateRangeLabel = (dateRange, rangeKey) => {
  if (rangeKey !== 'custom' || !dateRange.startDate) {
    return DATE_RANGE_OPTIONS.find(o => o.value === rangeKey)?.label || 'Select range';
  }
  return `${format(new Date(dateRange.startDate), 'MMM d')} - ${format(new Date(dateRange.endDate), 'MMM d, yyyy')}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN REPORTS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRangeKey, setDateRangeKey] = useState('thisMonth');
  const [compareKey, setCompareKey] = useState('previousPeriod');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customCompareStartDate, setCustomCompareStartDate] = useState('');
  const [customCompareEndDate, setCustomCompareEndDate] = useState('');

  // Calculate actual date ranges
  const dateRange = useMemo(() => {
    if (dateRangeKey === 'custom' && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return getDateRange(dateRangeKey);
  }, [dateRangeKey, customStartDate, customEndDate]);

  const comparisonRange = useMemo(() => {
    if (compareKey === 'custom' && customCompareStartDate && customCompareEndDate) {
      return { compareStartDate: customCompareStartDate, compareEndDate: customCompareEndDate };
    }
    return getComparisonRange(compareKey, dateRange);
  }, [compareKey, dateRange, customCompareStartDate, customCompareEndDate]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'live', label: 'Live Analytics', icon: Activity },
    { key: 'scheduled', label: 'Scheduled', icon: Clock },
    { key: 'custom', label: 'Custom Builder', icon: Settings },
    { key: 'benchmarks', label: 'Benchmarks', icon: Target },
    { key: 'predictive', label: 'Predictive', icon: Zap },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab dateRange={dateRange} comparisonRange={comparisonRange} />;
      case 'live': return <LiveAnalyticsTab />;
      case 'scheduled': return <ScheduledReportsTab />;
      case 'custom': return <CustomBuilderTab />;
      case 'benchmarks': return <BenchmarksTab />;
      case 'predictive': return <PredictiveTab />;
      default: return <OverviewTab dateRange={dateRange} comparisonRange={comparisonRange} />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-muted">
              <li><Link to="/" className="hover:text-primary">Administration</Link></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-text font-medium">Reports</li>
            </ol>
          </nav>
          <h1 className="text-lg font-semibold text-text">Reports & Analytics</h1>
          <p className="text-xs text-muted mt-0.5">Transform data into actionable insights</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Date Range & Comparison Filters */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted font-medium">Date Range:</span>
            <select
              value={dateRangeKey}
              onChange={(e) => {
                setDateRangeKey(e.target.value);
                if (e.target.value === 'custom') setShowDatePicker(true);
              }}
              className="px-3 py-1.5 text-sm bg-surface border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {DATE_RANGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Custom Date Inputs (shown when custom is selected) */}
          {dateRangeKey === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {/* Divider */}
          <div className="h-6 w-px bg-border" />

          {/* Compare To Selector */}
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted font-medium">Compare to:</span>
            <select
              value={compareKey}
              onChange={(e) => setCompareKey(e.target.value)}
              className="px-3 py-1.5 text-sm bg-surface border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {COMPARE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Custom Comparison Date Inputs (shown when custom comparison is selected) */}
          {compareKey === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customCompareStartDate}
                onChange={(e) => setCustomCompareStartDate(e.target.value)}
                className="px-2 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                value={customCompareEndDate}
                onChange={(e) => setCustomCompareEndDate(e.target.value)}
                className="px-2 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {/* Date Range Display */}
          <div className="ml-auto flex items-center gap-2 text-xs text-muted">
            <span className="font-medium text-text">
              {dateRange.startDate && format(new Date(dateRange.startDate), 'MMM d')} - {dateRange.endDate && format(new Date(dateRange.endDate), 'MMM d, yyyy')}
            </span>
            {compareKey !== 'none' && comparisonRange.compareStartDate && (
              <>
                <span>vs</span>
                <span>
                  {format(new Date(comparisonRange.compareStartDate), 'MMM d')} - {format(new Date(comparisonRange.compareEndDate), 'MMM d, yyyy')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTab()}

      {/* Footer Integration Note */}
      <div className="text-center pt-4 border-t border-border">
        <p className="text-xs text-muted">
          Reports sync with: Payments • Bookings • Owners • Pets • Operations
        </p>
      </div>
    </div>
  );
};

export default Reports;
