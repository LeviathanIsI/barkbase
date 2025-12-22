/**
 * ReportsOverview - Overview tab for reports (default route)
 * Compact Executive Dashboard
 */

import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/lib/cn';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
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

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ReportsOverview = () => {
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

export default ReportsOverview;
