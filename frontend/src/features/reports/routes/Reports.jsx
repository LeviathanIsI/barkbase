/**
 * Reports & Analytics - Unified Enterprise Analytics Module
 * ATF Compliant - Compact single-screen layout
 */

import { useState, useMemo } from 'react';
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
  Download,
  RefreshCw,
  Activity,
  PieChart,
  CheckCircle,
  Percent,
  Box,
  PawPrint,
  Scissors,
  Dumbbell,
  LayoutGrid,
  Loader2,
  Star,
  Mail,
  LogIn,
  LogOut,
  Bell,
  UserCheck,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import { cn } from '@/lib/cn';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS - Compact versions
// ═══════════════════════════════════════════════════════════════════════════

// Compact KPI Tile
const KPITile = ({ icon: Icon, label, value, trend, trendValue, trendType, subtitle }) => (
  <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-2.5 h-full">
    <div className="flex items-center justify-between mb-0.5">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted" />}
        <span className="text-[10px] text-muted uppercase tracking-wide">{label}</span>
      </div>
      {trend && (
        <div className={cn(
          'flex items-center gap-0.5 text-[10px] font-medium px-1 py-0.5 rounded',
          trendType === 'positive' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          trendType === 'negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        )}>
          {trendType === 'positive' ? <TrendingUp className="h-2.5 w-2.5" /> :
           trendType === 'negative' ? <TrendingDown className="h-2.5 w-2.5" /> : null}
          {trendValue}
        </div>
      )}
    </div>
    <p className="text-base font-bold text-text">{value}</p>
    {subtitle && <p className="text-[10px] text-muted">{subtitle}</p>}
  </div>
);

// Progress Bar - Compact
const ProgressBar = ({ label, value, max = 100, color = 'primary' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const colors = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted w-16 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-text w-8 text-right">{value}%</span>
    </div>
  );
};

// Coming Soon State - Compact
const ComingSoonState = ({ icon: Icon, title, subtitle, features = [] }) => (
  <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-6 text-center">
    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <h3 className="text-base font-semibold text-text mb-1">{title}</h3>
    <p className="text-xs text-muted mb-4 max-w-sm mx-auto">{subtitle}</p>
    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-full text-xs font-medium mb-4">
      <Zap className="h-3 w-3" />
      Coming Soon
    </div>
    {features.length > 0 && (
      <div className="max-w-xs mx-auto text-left">
        <div className="space-y-1">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted">
              <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW - Compact Executive Dashboard
// ═══════════════════════════════════════════════════════════════════════════

const OverviewTab = ({ dateRange = {}, comparisonRange = {} }) => {
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

  // KPI array
  const kpis = useMemo(() => [
    {
      icon: DollarSign,
      label: 'Revenue',
      value: `$${metrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      trend: metrics.revenueChange !== 0,
      trendValue: `${metrics.revenueChange >= 0 ? '+' : ''}${metrics.revenueChange.toFixed(0)}%`,
      trendType: metrics.revenueChange >= 0 ? 'positive' : 'negative',
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
      icon: Percent,
      label: 'Capacity',
      value: `${metrics.capacity.toFixed(0)}%`,
      trend: true,
      trendValue: metrics.capacity >= 70 ? 'Good' : 'Low',
      trendType: metrics.capacity >= 70 ? 'positive' : 'negative',
    },
    {
      icon: Target,
      label: 'Avg Value',
      value: `$${metrics.avgBookingValue.toFixed(0)}`,
      subtitle: 'per booking'
    },
    {
      icon: AlertTriangle,
      label: 'No-Shows',
      value: metrics.noShows.toString(),
      trend: true,
      trendValue: metrics.noShows === 0 ? 'None!' : `${metrics.noShows}`,
      trendType: metrics.noShows <= 2 ? 'positive' : 'negative',
    },
  ], [metrics]);

  // Service Performance
  const services = useMemo(() => {
    const rawData = serviceData?.data?.serviceUtilization || serviceData?.data || serviceData?.services || serviceData || [];
    const data = Array.isArray(rawData) ? rawData : [];

    if (data.length > 0) {
      const total = data.reduce((sum, s) => sum + (s.bookings || s.bookingCount || s.count || 0), 0);
      return data.slice(0, 4).map((service, idx) => ({
        name: service.service || service.name || service.serviceName || `Service ${idx + 1}`,
        value: total > 0 ? Math.round(((service.bookings || service.bookingCount || service.count || 0) / total) * 100) : 0,
        color: ['success', 'primary', 'warning', 'danger'][idx] || 'primary',
      }));
    }
    return [
      { name: 'Boarding', value: 0, color: 'success' },
      { name: 'Daycare', value: 0, color: 'primary' },
      { name: 'Grooming', value: 0, color: 'warning' },
      { name: 'Training', value: 0, color: 'danger' },
    ];
  }, [serviceData]);

  // Weekly Utilization
  const weekData = [
    { day: 'Mon', value: Math.round(metrics.capacity * 0.7) },
    { day: 'Tue', value: Math.round(metrics.capacity * 0.85) },
    { day: 'Wed', value: Math.round(metrics.capacity * 0.9) },
    { day: 'Thu', value: Math.round(metrics.capacity * 1.05) },
    { day: 'Fri', value: Math.round(metrics.capacity * 1.2) },
    { day: 'Sat', value: Math.round(metrics.capacity * 1.15) },
    { day: 'Sun', value: Math.round(metrics.capacity * 0.95) },
  ].map(d => ({ ...d, value: Math.min(100, Math.max(0, d.value)) }));

  const getUtilColor = (val) => val >= 90 ? 'bg-red-500' : val >= 75 ? 'bg-amber-500' : val >= 50 ? 'bg-green-500' : 'bg-gray-300';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* KPI Grid - 6 columns on desktop */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {kpis.map((kpi, i) => (
          <KPITile key={i} {...kpi} />
        ))}
      </div>

      {/* Service Performance + Weekly Utilization - Side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Service Performance */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-text uppercase tracking-wide">Service Performance</span>
          </div>
          <div className="space-y-2">
            {services.map((service, i) => (
              <ProgressBar key={i} label={service.name} value={service.value} color={service.color} />
            ))}
          </div>
        </div>

        {/* Weekly Utilization */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-text uppercase tracking-wide">Weekly Utilization</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weekData.map((day, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] text-muted mb-0.5">{day.day}</div>
                <div className="relative h-10 bg-surface rounded overflow-hidden">
                  <div
                    className={cn('absolute bottom-0 w-full transition-all', getUtilColor(day.value))}
                    style={{ height: `${day.value}%`, opacity: 0.8 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-text">{day.value}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights - Compact side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-semibold text-green-800 dark:text-green-300">Highlights</span>
          </div>
          <ul className="space-y-0.5 text-xs text-green-700 dark:text-green-400">
            {metrics.revenueChange > 0 && <li>• Revenue up {metrics.revenueChange.toFixed(0)}%</li>}
            {metrics.customerChange > 0 && <li>• {metrics.newCustomers} new customers</li>}
            {metrics.noShows === 0 && <li>• Zero no-shows</li>}
            {metrics.capacity >= 70 && <li>• Good capacity ({metrics.capacity.toFixed(0)}%)</li>}
          </ul>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Opportunities</span>
          </div>
          <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
            {metrics.capacity < 70 && <li>• Capacity at {metrics.capacity.toFixed(0)}%</li>}
            {metrics.noShows > 0 && <li>• {metrics.noShows} no-shows</li>}
            {metrics.bookingsChange < 0 && <li>• Bookings down {Math.abs(metrics.bookingsChange).toFixed(0)}%</li>}
            {metrics.pendingBookings > 5 && <li>• {metrics.pendingBookings} pending</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: LIVE ANALYTICS - Full viewport with more widgets
// ═══════════════════════════════════════════════════════════════════════════

const LiveAnalyticsTab = () => {
  const { data: liveData, isLoading: liveLoading, refetch } = useLiveAnalyticsQuery();
  const { data: activityData, isLoading: activityLoading } = useRecentActivityQuery();

  const stats = useMemo(() => {
    const data = liveData?.data || liveData || {};
    const revenueCents = data.revenue || 0;
    const revenueDollars = revenueCents / 100;
    const bookings = data.bookings || 0;
    const activeBookings = data.activeBookings || 0;
    const capacity = data.capacity || 0;
    const occupancy = data.capacityUtilization || data.occupancyRate || 0;

    return {
      revenue: `$${revenueDollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      bookings,
      activeBookings,
      capacity,
      occupancy: Math.round(occupancy),
      availableSpots: Math.max(0, capacity - activeBookings),
    };
  }, [liveData]);

  const liveStats = [
    { icon: DollarSign, label: 'Today Revenue', value: stats.revenue },
    { icon: Calendar, label: 'Bookings', value: stats.bookings.toString(), subtitle: 'today' },
    { icon: Users, label: 'On-Site', value: stats.activeBookings.toString(), subtitle: 'active' },
    { icon: Percent, label: 'Occupancy', value: `${stats.occupancy}%` },
  ];

  const activityFeed = useMemo(() => {
    if (!activityData || activityData.length === 0) {
      return [{ time: 'Now', event: 'No recent activity', type: 'info' }];
    }
    return activityData.slice(0, 8).map(item => {
      if (!item.time) return { ...item, time: 'Recently' };
      const now = new Date();
      const itemTime = new Date(item.time);
      if (isNaN(itemTime.getTime())) return { ...item, time: 'Recently' };
      const diffMins = Math.floor((now - itemTime) / 60000);
      const diffHours = Math.floor(diffMins / 60);
      let timeStr = diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins}m` : `${diffHours}h`;
      return { ...item, time: timeStr };
    });
  }, [activityData]);

  const popularServices = useMemo(() => {
    const data = liveData?.data || liveData || {};
    const services = data.serviceUtilization || [];
    if (services.length === 0) return [{ name: 'No services', count: 0, percentage: 0 }];
    const total = services.reduce((sum, s) => sum + (s.bookings || s.count || 0), 0);
    return services.slice(0, 4).map(s => ({
      name: s.name || s.service_name || 'Service',
      count: s.bookings || s.count || 0,
      percentage: total > 0 ? Math.round(((s.bookings || s.count || 0) / total) * 100) : 0,
    }));
  }, [liveData]);

  const isLoading = liveLoading || activityLoading;

  // Mock data for new widgets (would come from API)
  const petsNeedingCheckout = [
    { name: 'Max', breed: 'Golden Retriever', checkoutTime: '3:00 PM', owner: 'Smith' },
    { name: 'Bella', breed: 'Labrador', checkoutTime: '4:30 PM', owner: 'Johnson' },
    { name: 'Charlie', breed: 'Beagle', checkoutTime: '5:00 PM', owner: 'Williams' },
  ];

  const staffOnDuty = [
    { name: 'Sarah M.', role: 'Manager', since: '8:00 AM' },
    { name: 'Mike T.', role: 'Groomer', since: '9:00 AM' },
    { name: 'Emily R.', role: 'Kennel Tech', since: '7:00 AM' },
  ];

  const alerts = [
    { type: 'warning', message: 'Max vaccination expires in 3 days', time: '10m ago' },
    { type: 'info', message: 'Bella requested early pickup', time: '25m ago' },
  ];

  return (
    <div className="space-y-3">
      {/* Live indicator + refresh */}
      <div className="flex items-center gap-2 text-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-muted">Live</span>
        <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => refetch()}>
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Live KPIs - Compact row */}
      <div className="grid grid-cols-4 gap-2">
        {liveStats.map((stat, i) => (
          <KPITile key={i} {...stat} />
        ))}
      </div>

      {/* Main content grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Activity Feed */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-text uppercase">Recent Activity</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {activityFeed.map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                <div className={cn(
                  'h-1.5 w-1.5 rounded-full flex-shrink-0',
                  item.type === 'payment' ? 'bg-green-500' :
                  item.type === 'checkin' ? 'bg-blue-500' :
                  item.type === 'checkout' ? 'bg-amber-500' : 'bg-primary'
                )} />
                <span className="text-xs text-text flex-1 truncate">{item.event}</span>
                <span className="text-[10px] text-muted">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pets Needing Checkout */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <LogOut className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-text uppercase">Checkouts Soon</span>
          </div>
          <div className="space-y-1.5">
            {petsNeedingCheckout.map((pet, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                <div>
                  <span className="text-xs font-medium text-text">{pet.name}</span>
                  <span className="text-[10px] text-muted ml-1">({pet.owner})</span>
                </div>
                <span className="text-[10px] text-amber-600 font-medium">{pet.checkoutTime}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Staff On Duty */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-semibold text-text uppercase">Staff On Duty</span>
          </div>
          <div className="space-y-1.5">
            {staffOnDuty.map((staff, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                <div>
                  <span className="text-xs font-medium text-text">{staff.name}</span>
                  <span className="text-[10px] text-muted ml-1">{staff.role}</span>
                </div>
                <span className="text-[10px] text-muted">since {staff.since}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row - Services + Alerts + Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Popular Services */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-text uppercase">Popular Today</span>
          </div>
          <div className="space-y-1.5">
            {popularServices.map((service, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-text">{service.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted">{service.count}</span>
                  <div className="w-12 h-1 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${service.percentage}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-text uppercase">Alerts</span>
          </div>
          <div className="space-y-1.5">
            {alerts.length === 0 ? (
              <p className="text-xs text-muted">No alerts</p>
            ) : (
              alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <AlertTriangle className={cn(
                    'h-3 w-3 flex-shrink-0 mt-0.5',
                    alert.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text truncate">{alert.message}</p>
                    <p className="text-[10px] text-muted">{alert.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Status */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-text uppercase">Status</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-text">{stats.activeBookings}</p>
              <p className="text-[10px] text-muted">On-site</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text">{stats.bookings}</p>
              <p className="text-[10px] text-muted">Total</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{stats.availableSpots}</p>
              <p className="text-[10px] text-muted">Available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// OTHER TABS - Coming Soon (Compact)
// ═══════════════════════════════════════════════════════════════════════════

const ScheduledReportsTab = () => (
  <ComingSoonState
    icon={Mail}
    title="Scheduled Reports"
    subtitle="Automatic report delivery"
    features={['Daily/weekly summaries', 'Email delivery', 'PDF/Excel export']}
  />
);

const CustomBuilderTab = () => (
  <ComingSoonState
    icon={Settings}
    title="Custom Report Builder"
    subtitle="Create tailored reports"
    features={['Drag-and-drop metrics', 'Custom filters', 'Save templates']}
  />
);

const BenchmarksTab = () => (
  <ComingSoonState
    icon={Target}
    title="Industry Benchmarks"
    subtitle="Compare performance"
    features={['Industry averages', 'Percentile ranking', 'Trend tracking']}
  />
);

const PredictiveTab = () => (
  <ComingSoonState
    icon={TrendingUp}
    title="Predictive Analytics"
    subtitle="AI-powered forecasts"
    features={['Revenue forecasts', 'Demand prediction', 'Churn alerts']}
  />
);

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
// MAIN REPORTS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRangeKey, setDateRangeKey] = useState('thisMonth');
  const [compareKey, setCompareKey] = useState('previousPeriod');

  const dateRange = useMemo(() => getDateRange(dateRangeKey), [dateRangeKey]);
  const comparisonRange = useMemo(() => getComparisonRange(compareKey, dateRange), [compareKey, dateRange]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'live', label: 'Live', icon: Activity },
    { key: 'scheduled', label: 'Scheduled', icon: Clock },
    { key: 'custom', label: 'Builder', icon: Settings },
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

      {/* Date Range Filters - Compact inline */}
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

      {/* Tabs - Compact */}
      <div className="flex items-center gap-0.5 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            )}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTab()}
    </div>
  );
};

export default Reports;
