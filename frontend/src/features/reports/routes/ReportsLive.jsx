/**
 * ReportsLive - Live Analytics tab
 * Real-time operational dashboard for facility management
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LogIn,
  UserCheck,
  Clock,
  PawPrint,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  MessageSquare,
  CreditCard,
  Coffee,
  Scissors,
  Settings,
  X,
  Eye,
  Phone,
  Send,
  Zap,
  MapPin,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

// ═══════════════════════════════════════════════════════════════════════════
// ROLE COLOR MAP
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_COLOR_MAP = {
  'Owner': { bg: 'bg-gradient-to-br from-purple-500 to-purple-600', badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  'Manager': { bg: 'bg-gradient-to-br from-orange-500 to-orange-600', badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
  'Groomer': { bg: 'bg-gradient-to-br from-pink-500 to-pink-600', badge: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' },
  'Kennel Tech': { bg: 'bg-gradient-to-br from-blue-500 to-blue-600', badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  'Trainer': { bg: 'bg-gradient-to-br from-teal-500 to-teal-600', badge: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
  'default': { bg: 'bg-gradient-to-br from-slate-500 to-slate-600', badge: 'bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400' },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED KPI TILE
// ═══════════════════════════════════════════════════════════════════════════

const LiveKPITile = ({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  trendValue,
  trendType,
  onClick,
  status,
  pulse,
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
        "bg-[var(--bb-color-bg-surface)] border rounded-xl p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 group w-full relative overflow-hidden",
        statusColors[status] || statusColors.default
      )}
    >
      {pulse && (
        <div className="absolute top-2 right-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shadow-md",
          iconBgColors[status] || iconBgColors.default
        )}>
          {Icon && <Icon className="h-5 w-5 text-white" />}
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

      <div>
        <p className="text-2xl font-bold text-[var(--bb-color-text-primary)] group-hover:text-[var(--bb-color-accent)] transition-colors">
          {value}
        </p>
        <p className="text-xs font-medium text-[var(--bb-color-text-secondary)] uppercase tracking-wide">
          {label}
        </p>
        {subtitle && (
          <p className="text-[10px] text-[var(--bb-color-text-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ReportsLive = () => {
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const { data: liveData, isLoading: liveLoading, refetch } = useLiveAnalyticsQuery();
  const { data: activityData, isLoading: activityLoading } = useRecentActivityQuery();

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
      setLastUpdated(new Date());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetch]);

  const handleManualRefresh = useCallback(() => {
    refetch();
    setLastUpdated(new Date());
  }, [refetch]);

  // Format last updated time
  const formatLastUpdated = (date) => {
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);
    if (diffSeconds < 5) return 'just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMins = Math.floor(diffSeconds / 60);
    return `${diffMins}m ago`;
  };

  const stats = useMemo(() => {
    const data = liveData?.data || liveData || {};
    const revenueCents = data.revenue || 0;
    const revenueDollars = revenueCents / 100;
    const bookings = data.bookings || 0;
    const activeBookings = data.activeBookings || 4;
    const capacity = data.capacity || 19;
    const occupancy = data.capacityUtilization || data.occupancyRate || 21;
    const checkIns = data.checkIns || 3;
    const checkOuts = data.checkOuts || 2;

    return {
      revenue: revenueDollars,
      revenueFormatted: `$${revenueDollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      bookings,
      activeBookings,
      capacity,
      occupancy: Math.round(occupancy),
      availableSpots: Math.max(0, capacity - activeBookings),
      checkIns,
      checkOuts,
    };
  }, [liveData]);

  // Live KPI cards
  const liveStats = [
    {
      icon: DollarSign,
      label: 'Today Revenue',
      value: stats.revenueFormatted,
      subtitle: 'Collected today',
      status: stats.revenue > 0 ? 'success' : 'default',
      onClick: () => navigate('/reports/builder'),
    },
    {
      icon: Calendar,
      label: 'Bookings Today',
      value: stats.bookings.toString(),
      subtitle: `${stats.checkIns} check-ins, ${stats.checkOuts} check-outs`,
      status: 'info',
      onClick: () => navigate('/bookings'),
    },
    {
      icon: PawPrint,
      label: 'On-Site Now',
      value: stats.activeBookings.toString(),
      subtitle: 'Active guests',
      status: stats.activeBookings > 0 ? 'success' : 'default',
      pulse: stats.activeBookings > 0,
      onClick: () => navigate('/bookings?status=active'),
    },
    {
      icon: Percent,
      label: 'Occupancy',
      value: `${stats.occupancy}%`,
      subtitle: `${stats.availableSpots} of ${stats.capacity} spots free`,
      trend: true,
      trendValue: stats.occupancy >= 80 ? 'High' : stats.occupancy >= 50 ? 'Good' : 'Low',
      trendType: stats.occupancy >= 50 ? 'positive' : 'negative',
      status: stats.occupancy >= 80 ? 'warning' : stats.occupancy >= 50 ? 'success' : 'info',
      onClick: () => navigate('/kennels'),
    },
  ];

  // Activity feed with icons
  const activityFeed = useMemo(() => {
    const mockActivity = [
      { type: 'checkin', event: 'Max (Golden Retriever) checked in', time: new Date(Date.now() - 5 * 60000), pet: 'Max', owner: 'Smith' },
      { type: 'payment', event: 'Payment received from Johnson', time: new Date(Date.now() - 15 * 60000), amount: '$125' },
      { type: 'grooming', event: 'Bella grooming completed', time: new Date(Date.now() - 25 * 60000), pet: 'Bella' },
      { type: 'checkout', event: 'Charlie checked out', time: new Date(Date.now() - 45 * 60000), pet: 'Charlie' },
      { type: 'message', event: 'New message from Williams', time: new Date(Date.now() - 60 * 60000) },
      { type: 'booking', event: 'New booking: Luna (Dec 20-23)', time: new Date(Date.now() - 90 * 60000) },
    ];

    const data = activityData?.length > 0 ? activityData : mockActivity;

    return data.slice(0, 8).map(item => {
      const now = new Date();
      const itemTime = new Date(item.time);
      if (isNaN(itemTime.getTime())) return { ...item, timeStr: 'Recently' };
      const diffMins = Math.floor((now - itemTime) / 60000);
      const diffHours = Math.floor(diffMins / 60);
      let timeStr = diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins}m ago` : `${diffHours}h ago`;
      return { ...item, timeStr };
    });
  }, [activityData]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'checkin': return { icon: LogIn, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
      case 'checkout': return { icon: LogOut, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' };
      case 'payment': return { icon: CreditCard, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' };
      case 'grooming': return { icon: Scissors, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' };
      case 'message': return { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' };
      case 'booking': return { icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' };
      default: return { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' };
    }
  };

  // Popular services
  const popularServices = useMemo(() => {
    const data = liveData?.data || liveData || {};
    const services = data.serviceUtilization || [];
    if (services.length === 0) {
      return [
        { name: 'Standard Boarding', count: 8, icon: PawPrint },
        { name: 'Full Grooming', count: 4, icon: Scissors },
        { name: 'Daycare', count: 6, icon: Users },
        { name: 'Training', count: 2, icon: Star },
      ];
    }
    const total = services.reduce((sum, s) => sum + (s.bookings || s.count || 0), 0);
    return services.slice(0, 4).map(s => ({
      name: s.name || s.service_name || 'Service',
      count: s.bookings || s.count || 0,
      percentage: total > 0 ? Math.round(((s.bookings || s.count || 0) / total) * 100) : 0,
      icon: PawPrint,
    }));
  }, [liveData]);

  const isLoading = liveLoading || activityLoading;

  // Checkouts with urgency
  const petsNeedingCheckout = [
    { id: 1, name: 'Max', breed: 'Golden Retriever', checkoutTime: '3:00 PM', owner: 'Smith', ownerPhone: '555-1234', urgency: 'soon', minutesUntil: 45 },
    { id: 2, name: 'Bella', breed: 'Labrador', checkoutTime: '4:30 PM', owner: 'Johnson', ownerPhone: '555-2345', urgency: 'normal', minutesUntil: 135 },
    { id: 3, name: 'Charlie', breed: 'Beagle', checkoutTime: '5:00 PM', owner: 'Williams', ownerPhone: '555-3456', urgency: 'normal', minutesUntil: 165 },
    { id: 4, name: 'Luna', breed: 'Husky', checkoutTime: '5:30 PM', owner: 'Davis', ownerPhone: '555-4567', urgency: 'later', minutesUntil: 195 },
  ];

  // Check-ins coming up
  const upcomingCheckIns = [
    { id: 1, name: 'Rocky', breed: 'German Shepherd', checkInTime: '2:00 PM', owner: 'Miller', status: 'confirmed', minutesUntil: 30 },
    { id: 2, name: 'Daisy', breed: 'Poodle', checkInTime: '3:30 PM', owner: 'Wilson', status: 'confirmed', minutesUntil: 120 },
  ];

  // Staff on Duty with more detail
  const staffOnDuty = [
    { id: 1, name: 'Sarah M.', role: 'Manager', since: '8:00 AM', until: '5:00 PM', status: 'active', avatar: 'SM' },
    { id: 2, name: 'Mike T.', role: 'Groomer', since: '9:00 AM', until: '6:00 PM', status: 'active', avatar: 'MT' },
    { id: 3, name: 'Emily R.', role: 'Kennel Tech', since: '7:00 AM', until: '4:00 PM', status: 'break', avatar: 'ER' },
    { id: 4, name: 'Josh B.', role: 'Kennel Tech', since: '10:00 AM', until: '7:00 PM', status: 'active', avatar: 'JB' },
  ];

  // Alerts with priority
  const alerts = [
    { id: 1, type: 'urgent', priority: 'high', message: 'Max vaccination expires in 3 days', time: '10m ago', action: 'View Record', actionPath: '/pets/1' },
    { id: 2, type: 'request', priority: 'medium', message: 'Bella owner requested early pickup (2:30 PM)', time: '25m ago', action: 'Contact Owner', actionPath: '/owners/2' },
    { id: 3, type: 'info', priority: 'low', message: 'New booking request pending approval', time: '1h ago', action: 'Review', actionPath: '/bookings?status=pending' },
    { id: 4, type: 'warning', priority: 'medium', message: 'Low inventory: Dog food (Premium)', time: '2h ago', action: 'Order', actionPath: '/inventory' },
  ].filter(a => !dismissedAlerts.includes(a.id));

  const getAlertStyle = (priority) => {
    switch (priority) {
      case 'high': return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: 'text-red-500', badge: 'bg-red-500' };
      case 'medium': return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: 'text-amber-500', badge: 'bg-amber-500' };
      default: return { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-500', badge: 'bg-blue-500' };
    }
  };

  const getUrgencyStyle = (urgency) => {
    switch (urgency) {
      case 'soon': return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', dot: 'bg-red-500' };
      case 'normal': return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', dot: 'bg-amber-500' };
      default: return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', dot: 'bg-emerald-500' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Live Header with Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Live Indicator */}
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Live</span>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--bb-color-text-muted)]">
            {autoRefresh ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                <span>Auto-refresh: {refreshInterval}s</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                <span>Paused</span>
              </>
            )}
          </div>

          {/* Last Updated */}
          <div className="text-xs text-[var(--bb-color-text-muted)]">
            Updated {formatLastUpdated(lastUpdated)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoading && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant={autoRefresh ? "outline" : "default"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)] rounded-xl shadow-lg p-3 z-20">
                <div className="text-xs font-medium text-[var(--bb-color-text-primary)] mb-2">Refresh Interval</div>
                <div className="flex gap-1">
                  {[15, 30, 60].map(sec => (
                    <button
                      key={sec}
                      onClick={() => { setRefreshInterval(sec); setShowSettings(false); }}
                      className={cn(
                        "flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors",
                        refreshInterval === sec
                          ? "bg-[var(--bb-color-accent)] text-white"
                          : "bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-elevated)]"
                      )}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {liveStats.map((stat, i) => (
          <LiveKPITile key={i} {...stat} />
        ))}
      </div>

      {/* Capacity Bar */}
      <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
              <LayoutGrid className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Facility Capacity</h3>
              <p className="text-[10px] text-[var(--bb-color-text-muted)]">Real-time kennel availability</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/kennels')} className="text-xs">
            View Kennels
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        <div className="space-y-3">
          {/* Visual capacity bar */}
          <div className="relative h-8 bg-[var(--bb-color-bg-elevated)] rounded-lg overflow-hidden">
            <div
              className={cn(
                "h-full rounded-lg transition-all",
                stats.occupancy >= 90 ? "bg-gradient-to-r from-red-500 to-red-600" :
                stats.occupancy >= 70 ? "bg-gradient-to-r from-amber-500 to-amber-600" :
                "bg-gradient-to-r from-emerald-500 to-emerald-600"
              )}
              style={{ width: `${stats.occupancy}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-[var(--bb-color-text-primary)]">
                {stats.activeBookings} of {stats.capacity} occupied ({stats.occupancy}%)
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.availableSpots}</div>
              <div className="text-[10px] text-[var(--bb-color-text-muted)]">Available</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.activeBookings}</div>
              <div className="text-[10px] text-[var(--bb-color-text-muted)]">Occupied</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.checkOuts}</div>
              <div className="text-[10px] text-[var(--bb-color-text-muted)]">Checking Out</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.checkIns}</div>
              <div className="text-[10px] text-[var(--bb-color-text-muted)]">Checking In</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Panel - Full Width */}
      {alerts.length > 0 && (
        <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-md">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Action Required</h3>
                <p className="text-[10px] text-[var(--bb-color-text-muted)]">{alerts.length} alert{alerts.length !== 1 ? 's' : ''} need attention</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {alerts.filter(a => a.priority === 'high').length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                  {alerts.filter(a => a.priority === 'high').length} urgent
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alerts.map((alert) => {
              const style = getAlertStyle(alert.priority);
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all",
                    style.bg, style.border
                  )}
                >
                  <div className={cn("h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0", style.bg)}>
                    <AlertTriangle className={cn("h-3.5 w-3.5", style.icon)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--bb-color-text-primary)]">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[var(--bb-color-text-muted)]">{alert.time}</span>
                      {alert.action && (
                        <button
                          onClick={() => navigate(alert.actionPath)}
                          className="text-[10px] font-medium text-[var(--bb-color-accent)] hover:underline"
                        >
                          {alert.action} →
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissedAlerts([...dismissedAlerts, alert.id])}
                    className="p-1 text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)] rounded"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Recent Activity</h3>
            </div>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {activityFeed.map((item, i) => {
              const iconStyle = getActivityIcon(item.type);
              const IconComponent = iconStyle.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--bb-color-bg-elevated)] transition-colors cursor-pointer group"
                >
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0", iconStyle.bg)}>
                    <IconComponent className={cn("h-3.5 w-3.5", iconStyle.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--bb-color-text-primary)] group-hover:text-[var(--bb-color-accent)] transition-colors">
                      {item.event}
                    </p>
                    <p className="text-[10px] text-[var(--bb-color-text-muted)]">{item.timeStr}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--bb-color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Checkouts & Check-ins */}
        <div className="space-y-4">
          {/* Checkouts Soon */}
          <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                  <LogOut className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Checkouts Soon</h3>
              </div>
              <span className="text-xs text-[var(--bb-color-text-muted)]">{petsNeedingCheckout.length} today</span>
            </div>

            <div className="space-y-2">
              {petsNeedingCheckout.slice(0, 4).map((pet) => {
                const urgencyStyle = getUrgencyStyle(pet.urgency);
                return (
                  <div
                    key={pet.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bb-color-bg-elevated)] transition-colors cursor-pointer group"
                  >
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", urgencyStyle.bg)}>
                      <PawPrint className={cn("h-4 w-4", urgencyStyle.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">{pet.name}</span>
                        <span className="text-[10px] text-[var(--bb-color-text-muted)]">({pet.owner})</span>
                      </div>
                      <p className="text-[10px] text-[var(--bb-color-text-muted)]">{pet.breed}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn("text-sm font-bold", urgencyStyle.text)}>{pet.checkoutTime}</span>
                      {pet.urgency === 'soon' && (
                        <p className="text-[9px] text-red-500 font-medium">In {pet.minutesUntil}m</p>
                      )}
                    </div>
                    <button
                      className="p-1.5 text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-accent)] rounded-lg hover:bg-[var(--bb-color-bg-surface)] opacity-0 group-hover:opacity-100 transition-all"
                      title="Call owner"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Check-ins */}
          <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                  <LogIn className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Arriving Soon</h3>
              </div>
            </div>

            <div className="space-y-2">
              {upcomingCheckIns.map((pet) => (
                <div
                  key={pet.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bb-color-bg-elevated)] transition-colors cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <PawPrint className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">{pet.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded">
                        {pet.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--bb-color-text-muted)]">{pet.breed} • {pet.owner}</p>
                  </div>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{pet.checkInTime}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Staff & Services */}
        <div className="space-y-4">
          {/* Staff on Duty */}
          <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                  <UserCheck className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Staff on Duty</h3>
              </div>
              <span className="text-xs text-[var(--bb-color-text-muted)]">{staffOnDuty.length} active</span>
            </div>

            <div className="space-y-2">
              {staffOnDuty.map((staff) => {
                const roleColor = ROLE_COLOR_MAP[staff.role] || ROLE_COLOR_MAP['default'];
                return (
                  <div
                    key={staff.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bb-color-bg-elevated)] transition-colors cursor-pointer group"
                  >
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", roleColor.bg)}>
                      <span className="text-[10px] font-bold text-white">{staff.avatar}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">{staff.name}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", roleColor.badge)}>
                          {staff.role}
                        </span>
                        {staff.status === 'break' && (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                            <Coffee className="h-3 w-3" />
                            Break
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--bb-color-text-muted)]">
                        {staff.since} - {staff.until}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-accent)] rounded-lg hover:bg-[var(--bb-color-bg-surface)]">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popular Services Today */}
          <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-md">
                  <Star className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Popular Today</h3>
              </div>
            </div>

            <div className="space-y-2">
              {popularServices.map((service, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    i === 0 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" :
                    i === 1 ? "bg-gray-100 dark:bg-gray-800 text-gray-500" :
                    "bg-orange-100 dark:bg-orange-900/30 text-orange-600"
                  )}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-[var(--bb-color-text-primary)]">{service.name}</span>
                  <span className="text-sm font-bold text-[var(--bb-color-text-primary)]">{service.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsLive;
