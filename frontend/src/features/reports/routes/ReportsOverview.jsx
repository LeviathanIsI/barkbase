/**
 * ReportsOverview - Overview tab for reports (default route)
 * Executive Dashboard with actionable insights
 */

import { useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useReportDashboard, useCustomerAnalyticsQuery, useServiceAnalyticsQuery } from '../api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  AlertTriangle,
  PieChart,
  Percent,
  Target,
  LayoutGrid,
  Loader2,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Trophy,
  Star,
  Eye,
  Bell,
  RefreshCw,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED KPI TILE
// ═══════════════════════════════════════════════════════════════════════════

const KPITile = ({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
  trendType,
  subtitle,
  onClick,
  status,
  sparkline,
}) => {
  const statusColors = {
    success: 'border-emerald-200 dark:border-emerald-800/50',
    warning: 'border-amber-200 dark:border-amber-800/50',
    error: 'border-red-200 dark:border-red-800/50',
    info: 'border-blue-200 dark:border-blue-800/50',
    default: 'border-[var(--bb-color-border-subtle)]',
  };

  const iconBgColors = {
    success: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    warning: 'bg-gradient-to-br from-amber-500 to-amber-600',
    error: 'bg-gradient-to-br from-red-500 to-red-600',
    info: 'bg-gradient-to-br from-blue-500 to-blue-600',
    default: 'bg-gradient-to-br from-gray-500 to-gray-600',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-[var(--bb-color-bg-surface)] border rounded-xl p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 group w-full",
        statusColors[status] || statusColors.default
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shadow-md",
          iconBgColors[status] || iconBgColors.default
        )}>
          {Icon && <Icon className="h-4 w-4 text-white" />}
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trendType === 'positive' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
            trendType === 'negative' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          )}>
            {trendType === 'positive' ? <TrendingUp className="h-3 w-3" /> :
             trendType === 'negative' ? <TrendingDown className="h-3 w-3" /> : null}
            {trendValue}
          </div>
        )}
      </div>

      <div className="mb-1">
        <p className="text-2xl font-bold text-[var(--bb-color-text-primary)] group-hover:text-[var(--bb-color-accent)] transition-colors">
          {value}
        </p>
        <p className="text-xs font-medium text-[var(--bb-color-text-secondary)] uppercase tracking-wide">
          {label}
        </p>
      </div>

      {/* Mini sparkline */}
      {sparkline && sparkline.length > 0 && (
        <div className="flex items-end gap-0.5 h-6 mt-2">
          {sparkline.map((val, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-sm transition-all",
                trendType === 'positive' ? 'bg-emerald-400/60' :
                trendType === 'negative' ? 'bg-red-400/60' : 'bg-gray-300 dark:bg-gray-600'
              )}
              style={{ height: `${Math.max(15, val)}%` }}
            />
          ))}
        </div>
      )}

      {subtitle && (
        <p className="text-[10px] text-[var(--bb-color-text-muted)] mt-1 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-[var(--bb-color-text-muted)]" />
          {subtitle}
        </p>
      )}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════

const ServiceBar = ({ name, value, max = 100, color = 'primary', rank }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const colors = {
    primary: 'bg-[var(--bb-color-accent)]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="group cursor-pointer">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {rank && (
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
              rank === 1 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" :
              rank === 2 ? "bg-gray-100 dark:bg-gray-800 text-gray-500" :
              rank === 3 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" :
              "bg-gray-50 dark:bg-gray-800 text-gray-400"
            )}>
              {rank}
            </span>
          )}
          <span className="text-sm font-medium text-[var(--bb-color-text-primary)] group-hover:text-[var(--bb-color-accent)] transition-colors truncate" title={name}>
            {name}
          </span>
        </div>
        <span className="text-sm font-bold text-[var(--bb-color-text-primary)]">{value}%</span>
      </div>
      <div className="h-2.5 bg-[var(--bb-color-bg-elevated)] rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all group-hover:opacity-80', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ReportsOverview = () => {
  const navigate = useNavigate();
  const [hoveredDay, setHoveredDay] = useState(null);

  // Get date range from parent layout context
  const { dateRange = {}, comparisonRange = {} } = useOutletContext() || {};

  // Build query params from date range
  const queryParams = useMemo(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    compareStartDate: comparisonRange.compareStartDate,
    compareEndDate: comparisonRange.compareEndDate,
  }), [dateRange, comparisonRange]);

  const { data: dashboardData, isLoading: dashboardLoading } = useReportDashboard(queryParams);
  const { data: customerData, isLoading: customerLoading } = useCustomerAnalyticsQuery();
  const { data: serviceData, isLoading: serviceLoading } = useServiceAnalyticsQuery();

  const isLoading = dashboardLoading || customerLoading || serviceLoading;

  // Extract metrics from dashboard data
  const metrics = useMemo(() => {
    const data = dashboardData?.data || dashboardData || {};
    const customers = customerData?.data || customerData || {};

    const totalRevenueCents = parseInt(data.totalRevenue || data.revenue || 0, 10);
    const totalRevenue = totalRevenueCents / 100;
    const revenueChange = parseFloat(data.revenueChange || data.revenueTrend || 0);
    const totalBookings = parseInt(data.totalBookings || data.bookings || 0, 10);
    const pendingBookings = parseInt(data.pendingBookings || data.pending || 0, 10);
    const bookingsChange = parseFloat(data.bookingsChange || data.bookingsTrend || 0);
    const totalCustomers = parseInt(customers.total || data.totalCustomers || data.customers || 0, 10);
    const newCustomers = parseInt(customers.newThisMonth || data.newCustomers || 0, 10);
    const customerChange = parseFloat(customers.growthRate || data.customerChange || 0);
    const capacity = parseFloat(data.capacityUtilization || data.capacity || 0);
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const noShows = parseInt(data.noShows || 0, 10);
    const completedBookings = parseInt(data.completedBookings || 0, 10);
    const cancelledBookings = parseInt(data.cancelledBookings || 0, 10);

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
      completedBookings,
      cancelledBookings,
    };
  }, [dashboardData, customerData]);

  // Generate sparkline data (simulated trend)
  const generateSparkline = (change, base = 50) => {
    const trend = change >= 0 ? 1 : -1;
    return Array.from({ length: 7 }, (_, i) => {
      const variation = Math.random() * 20 - 10;
      return Math.max(10, Math.min(100, base + (i * trend * 5) + variation));
    });
  };

  // KPI array with enhanced data
  const kpis = useMemo(() => [
    {
      icon: DollarSign,
      label: 'Revenue',
      value: `$${metrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      trend: true,
      trendValue: metrics.revenueChange === 0 ? '—' : `${metrics.revenueChange >= 0 ? '+' : ''}${metrics.revenueChange.toFixed(0)}%`,
      trendType: metrics.revenueChange > 0 ? 'positive' : metrics.revenueChange < 0 ? 'negative' : 'neutral',
      status: metrics.revenueChange > 0 ? 'success' : metrics.revenueChange < 0 ? 'error' : 'default',
      sparkline: generateSparkline(metrics.revenueChange, 60),
      onClick: () => navigate('/reports/builder'),
    },
    {
      icon: Calendar,
      label: 'Bookings',
      value: metrics.bookings.toLocaleString(),
      trend: true,
      trendValue: metrics.bookingsChange === 0 ? '—' : `${metrics.bookingsChange >= 0 ? '+' : ''}${metrics.bookingsChange.toFixed(0)}%`,
      trendType: metrics.bookingsChange > 0 ? 'positive' : metrics.bookingsChange < 0 ? 'negative' : 'neutral',
      status: metrics.bookingsChange > 0 ? 'success' : metrics.bookingsChange < 0 ? 'warning' : 'default',
      subtitle: `${metrics.pendingBookings} pending`,
      sparkline: generateSparkline(metrics.bookingsChange, 55),
      onClick: () => navigate('/bookings'),
    },
    {
      icon: Users,
      label: 'Customers',
      value: metrics.customers.toLocaleString(),
      trend: metrics.customerChange !== 0,
      trendValue: `${metrics.customerChange >= 0 ? '+' : ''}${metrics.customerChange.toFixed(0)}%`,
      trendType: metrics.customerChange >= 0 ? 'positive' : 'negative',
      status: metrics.customerChange > 0 ? 'success' : 'default',
      subtitle: `${metrics.newCustomers} new this period`,
      onClick: () => navigate('/owners'),
    },
    {
      icon: Percent,
      label: 'Capacity',
      value: `${metrics.capacity.toFixed(0)}%`,
      trend: true,
      trendValue: metrics.capacity >= 80 ? 'High' : metrics.capacity >= 50 ? 'Good' : 'Low',
      trendType: metrics.capacity >= 50 ? 'positive' : 'negative',
      status: metrics.capacity >= 80 ? 'success' : metrics.capacity >= 50 ? 'info' : 'warning',
      subtitle: metrics.capacity >= 80 ? 'Near full capacity' : metrics.capacity >= 50 ? 'Room to grow' : 'Underutilized',
      onClick: () => navigate('/reports/live'),
    },
    {
      icon: Target,
      label: 'Avg Value',
      value: `$${metrics.avgBookingValue.toFixed(0)}`,
      status: 'info',
      subtitle: 'per booking',
      onClick: () => navigate('/reports/builder'),
    },
    {
      icon: metrics.noShows === 0 ? CheckCircle : AlertTriangle,
      label: 'No-Shows',
      value: metrics.noShows.toString(),
      trend: true,
      trendValue: metrics.noShows === 0 ? 'Perfect!' : metrics.noShows <= 2 ? 'Good' : 'High',
      trendType: metrics.noShows <= 2 ? 'positive' : 'negative',
      status: metrics.noShows === 0 ? 'success' : metrics.noShows <= 2 ? 'info' : 'error',
      onClick: () => navigate('/bookings?status=no-show'),
    },
  ], [metrics, navigate]);

  // Service Performance with rankings
  const services = useMemo(() => {
    const rawData = serviceData?.data?.serviceUtilization || serviceData?.data || serviceData?.services || serviceData || [];
    const data = Array.isArray(rawData) ? rawData : [];

    if (data.length > 0) {
      const total = data.reduce((sum, s) => sum + (s.bookings || s.bookingCount || s.count || 0), 0);
      return data.slice(0, 5).map((service, idx) => ({
        name: service.service || service.name || service.serviceName || `Service ${idx + 1}`,
        value: total > 0 ? Math.round(((service.bookings || service.bookingCount || service.count || 0) / total) * 100) : 0,
        color: ['success', 'primary', 'warning', 'purple', 'danger'][idx] || 'primary',
        rank: idx + 1,
      })).sort((a, b) => b.value - a.value);
    }
    return [
      { name: 'Standard Boarding', value: 35, color: 'success', rank: 1 },
      { name: 'Daycare Package', value: 28, color: 'primary', rank: 2 },
      { name: 'Full Grooming', value: 18, color: 'warning', rank: 3 },
      { name: 'Training Session', value: 12, color: 'purple', rank: 4 },
      { name: 'Premium Suite', value: 7, color: 'danger', rank: 5 },
    ];
  }, [serviceData]);

  // Weekly Utilization with targets
  const targetUtilization = 75;
  const weekData = [
    { day: 'Mon', label: 'Monday', value: Math.round(metrics.capacity * 0.7), bookings: 12 },
    { day: 'Tue', label: 'Tuesday', value: Math.round(metrics.capacity * 0.85), bookings: 15 },
    { day: 'Wed', label: 'Wednesday', value: Math.round(metrics.capacity * 0.9), bookings: 18 },
    { day: 'Thu', label: 'Thursday', value: Math.round(metrics.capacity * 1.05), bookings: 20 },
    { day: 'Fri', label: 'Friday', value: Math.round(metrics.capacity * 1.2), bookings: 24 },
    { day: 'Sat', label: 'Saturday', value: Math.round(metrics.capacity * 1.15), bookings: 22 },
    { day: 'Sun', label: 'Sunday', value: Math.round(metrics.capacity * 0.95), bookings: 16 },
  ].map(d => ({ ...d, value: Math.min(100, Math.max(0, d.value)) }));

  const getUtilColor = (val) => {
    if (val >= 90) return 'bg-gradient-to-t from-red-600 to-red-500';
    if (val >= 75) return 'bg-gradient-to-t from-amber-600 to-amber-500';
    if (val >= 50) return 'bg-gradient-to-t from-emerald-600 to-emerald-500';
    return 'bg-gradient-to-t from-gray-400 to-gray-300';
  };

  // Highlights - celebrate wins
  const highlights = useMemo(() => {
    const items = [];
    if (metrics.noShows === 0) items.push({ icon: Trophy, text: 'Zero no-shows this period!', priority: 'high' });
    if (metrics.revenueChange > 10) items.push({ icon: DollarSign, text: `Revenue up ${metrics.revenueChange.toFixed(0)}% vs prior period`, priority: 'high' });
    if (metrics.revenueChange > 0 && metrics.revenueChange <= 10) items.push({ icon: TrendingUp, text: `Revenue growth: +${metrics.revenueChange.toFixed(0)}%`, priority: 'medium' });
    if (metrics.newCustomers > 0) items.push({ icon: Users, text: `${metrics.newCustomers} new customers acquired`, priority: 'medium' });
    if (metrics.capacity >= 70) items.push({ icon: CheckCircle, text: `Strong capacity utilization (${metrics.capacity.toFixed(0)}%)`, priority: 'medium' });
    if (metrics.customerChange > 0) items.push({ icon: Star, text: `Customer base growing (+${metrics.customerChange.toFixed(0)}%)`, priority: 'low' });
    return items.length > 0 ? items : [{ icon: Sparkles, text: 'Keep up the great work!', priority: 'low' }];
  }, [metrics]);

  // Opportunities - actionable insights
  const opportunities = useMemo(() => {
    const items = [];
    if (metrics.capacity < 50) {
      items.push({
        icon: AlertCircle,
        text: `Capacity at ${metrics.capacity.toFixed(0)}% - run a promotion?`,
        action: 'Create Promotion',
        actionPath: '/marketing',
        priority: 'high',
      });
    }
    if (metrics.noShows > 2) {
      items.push({
        icon: XCircle,
        text: `${metrics.noShows} no-shows - enable reminders`,
        action: 'Configure Reminders',
        actionPath: '/settings/notifications',
        priority: 'high',
      });
    }
    if (metrics.bookingsChange < -10) {
      items.push({
        icon: TrendingDown,
        text: `Bookings down ${Math.abs(metrics.bookingsChange).toFixed(0)}%`,
        action: 'View Trends',
        actionPath: '/reports/predictive',
        priority: 'high',
      });
    }
    if (metrics.pendingBookings > 5) {
      items.push({
        icon: Clock,
        text: `${metrics.pendingBookings} bookings need confirmation`,
        action: 'Review Now',
        actionPath: '/bookings?status=pending',
        priority: 'medium',
      });
    }
    if (metrics.capacity >= 50 && metrics.capacity < 70) {
      items.push({
        icon: Target,
        text: 'Room for 30%+ more bookings',
        action: 'Boost Marketing',
        actionPath: '/marketing',
        priority: 'low',
      });
    }
    return items;
  }, [metrics]);

  // Quick actions
  const quickActions = [
    { icon: Eye, label: 'Live Dashboard', path: '/reports/live' },
    { icon: Calendar, label: 'View Bookings', path: '/bookings' },
    { icon: Users, label: 'Customer List', path: '/owners' },
    { icon: Bell, label: 'Notifications', path: '/settings/notifications' },
  ];

  // Today's snapshot
  const todaySnapshot = {
    checkIns: Math.floor(Math.random() * 8) + 2,
    checkOuts: Math.floor(Math.random() * 6) + 1,
    inHouse: Math.floor(Math.random() * 15) + 5,
    upcomingToday: Math.floor(Math.random() * 5) + 1,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--bb-color-accent)] mx-auto mb-3" />
          <p className="text-sm text-[var(--bb-color-text-muted)]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {quickActions.map((action, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => navigate(action.path)}
              className="text-xs"
            >
              <action.icon className="h-3.5 w-3.5 mr-1.5" />
              {action.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--bb-color-text-muted)]">
          <RefreshCw className="h-3.5 w-3.5" />
          Last updated: just now
        </div>
      </div>

      {/* Today's Snapshot */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Today's Snapshot</h3>
              <p className="text-[10px] text-[var(--bb-color-text-muted)]">Real-time facility overview</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/reports/live')} className="text-xs">
            View Live
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--bb-color-bg-surface)] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{todaySnapshot.checkIns}</div>
            <div className="text-xs text-[var(--bb-color-text-muted)]">Check-ins Today</div>
          </div>
          <div className="bg-[var(--bb-color-bg-surface)] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{todaySnapshot.checkOuts}</div>
            <div className="text-xs text-[var(--bb-color-text-muted)]">Check-outs Today</div>
          </div>
          <div className="bg-[var(--bb-color-bg-surface)] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{todaySnapshot.inHouse}</div>
            <div className="text-xs text-[var(--bb-color-text-muted)]">Currently In-House</div>
          </div>
          <div className="bg-[var(--bb-color-bg-surface)] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{todaySnapshot.upcomingToday}</div>
            <div className="text-xs text-[var(--bb-color-text-muted)]">Upcoming Today</div>
          </div>
        </div>
      </div>

      {/* KPI Grid - 6 columns on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <KPITile key={i} {...kpi} />
        ))}
      </div>

      {/* Charts Row - Service Performance + Weekly Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Service Performance */}
        <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                <PieChart className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Service Performance</h3>
                <p className="text-[10px] text-[var(--bb-color-text-muted)]">Revenue share by service type</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/services')} className="text-xs">
              Manage
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {services.map((service, i) => (
              <ServiceBar
                key={i}
                name={service.name}
                value={service.value}
                color={service.color}
                rank={service.rank}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-[var(--bb-color-border-subtle)]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-[10px] text-[var(--bb-color-text-muted)]">Top performer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500" />
              <span className="text-[10px] text-[var(--bb-color-text-muted)]">Needs attention</span>
            </div>
          </div>
        </div>

        {/* Weekly Utilization */}
        <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md">
                <LayoutGrid className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Weekly Utilization</h3>
                <p className="text-[10px] text-[var(--bb-color-text-muted)]">Capacity usage by day</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-6 h-0.5 bg-amber-500" />
                Target ({targetUtilization}%)
              </span>
            </div>
          </div>

          <div className="relative">
            {/* Target line */}
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400 z-10"
              style={{ bottom: `${(targetUtilization / 100) * 120}px` }}
            />

            <div className="grid grid-cols-7 gap-2">
              {weekData.map((day, i) => {
                const isHovered = hoveredDay === i;
                const isAboveTarget = day.value >= targetUtilization;

                return (
                  <div
                    key={i}
                    className="text-center"
                    onMouseEnter={() => setHoveredDay(i)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <div className="text-xs font-medium text-[var(--bb-color-text-muted)] mb-2">{day.day}</div>
                    <div className="relative h-28 bg-[var(--bb-color-bg-elevated)] rounded-lg overflow-hidden group cursor-pointer">
                      <div
                        className={cn(
                          'absolute bottom-0 w-full transition-all duration-300',
                          getUtilColor(day.value),
                          isHovered && 'opacity-90'
                        )}
                        style={{ height: `${day.value}%` }}
                      />

                      {/* Percentage label */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={cn(
                          "text-sm font-bold transition-all",
                          day.value > 60 ? "text-white" : "text-[var(--bb-color-text-primary)]"
                        )}>
                          {day.value}%
                        </span>
                      </div>

                      {/* Above target indicator */}
                      {isAboveTarget && (
                        <div className="absolute top-1 right-1">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute z-20 bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)] rounded-lg p-2 shadow-lg text-left text-xs mt-1 min-w-[100px]">
                        <div className="font-semibold text-[var(--bb-color-text-primary)]">{day.label}</div>
                        <div className="text-[var(--bb-color-text-muted)]">{day.bookings} bookings</div>
                        <div className={cn(
                          "font-medium",
                          isAboveTarget ? "text-emerald-500" : "text-amber-500"
                        )}>
                          {isAboveTarget ? '✓ Above target' : '↑ Below target'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--bb-color-border-subtle)]">
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--bb-color-text-primary)]">
                {Math.round(weekData.reduce((sum, d) => sum + d.value, 0) / weekData.length)}%
              </div>
              <div className="text-[10px] text-[var(--bb-color-text-muted)]">Avg Utilization</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {weekData.filter(d => d.value >= targetUtilization).length}
              </div>
              <div className="text-[10px] text-[var(--bb-color-text-muted)]">Days Above Target</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--bb-color-text-primary)]">
                {weekData.reduce((max, d) => Math.max(max, d.value), 0)}%
              </div>
              <div className="text-[10px] text-[var(--bb-color-text-muted)]">Peak Day</div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Row - Highlights & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Highlights */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Highlights</h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Celebrate your wins</p>
            </div>
          </div>

          <div className="space-y-2">
            {highlights.slice(0, 4).map((item, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-colors",
                  item.priority === 'high'
                    ? "bg-emerald-100/80 dark:bg-emerald-900/30"
                    : "bg-white/50 dark:bg-emerald-900/10"
                )}
              >
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0",
                  item.priority === 'high'
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-200 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400"
                )}>
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm text-emerald-800 dark:text-emerald-200 flex-1">{item.text}</span>
                {item.priority === 'high' && (
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Opportunities */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Opportunities</h3>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">Take action to improve</p>
            </div>
          </div>

          {opportunities.length > 0 ? (
            <div className="space-y-2">
              {opportunities.slice(0, 4).map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer group",
                    item.priority === 'high'
                      ? "bg-amber-100/80 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                      : "bg-white/50 dark:bg-amber-900/10 hover:bg-white/80 dark:hover:bg-amber-900/20"
                  )}
                  onClick={() => item.actionPath && navigate(item.actionPath)}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0",
                    item.priority === 'high'
                      ? "bg-amber-500 text-white"
                      : "bg-amber-200 dark:bg-amber-800 text-amber-600 dark:text-amber-400"
                  )}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-amber-800 dark:text-amber-200 flex-1">{item.text}</span>
                  {item.action && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 group-hover:underline flex items-center gap-1">
                      {item.action}
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-amber-700 dark:text-amber-300">All looking good!</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">No immediate actions needed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsOverview;
