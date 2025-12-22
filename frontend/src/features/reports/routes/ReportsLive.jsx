/**
 * ReportsLive - Live Analytics tab
 * Real-time dashboard with activity feed and status widgets
 */

import { useMemo } from 'react';
import { useLiveAnalyticsQuery, useRecentActivityQuery } from '../api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  AlertTriangle,
  Percent,
  LayoutGrid,
  RefreshCw,
  Activity,
  Star,
  Bell,
  LogOut,
  UserCheck,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

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

const ReportsLive = () => {
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

export default ReportsLive;
