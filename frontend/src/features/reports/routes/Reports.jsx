/**
 * Reports & Analytics - Unified Enterprise Analytics Module
 * Modeled after Shopify Analytics, Stripe Sigma, HubSpot Reporting
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
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
// TAB 1: OVERVIEW - Executive Dashboard
// ═══════════════════════════════════════════════════════════════════════════

const OverviewTab = () => {
  const [timeRange, setTimeRange] = useState('30d');

  // KPI Data
  const kpis = [
    { icon: DollarSign, label: 'Revenue', value: '$12,450', trend: true, trendValue: '+15%', trendType: 'positive', subtitle: 'vs last period' },
    { icon: Calendar, label: 'Bookings', value: '156', trend: true, trendValue: '+8%', trendType: 'positive', subtitle: '23 pending' },
    { icon: Users, label: 'Customers', value: '89', trend: true, trendValue: '+12%', trendType: 'positive', subtitle: '14 new' },
    { icon: TrendingUp, label: 'Growth', value: '18%', trend: true, trendValue: '+3%', trendType: 'positive', subtitle: 'MoM' },
    { icon: Target, label: 'Avg Value', value: '$79.81', trend: true, trendValue: '+5%', trendType: 'positive', subtitle: 'per booking' },
    { icon: Percent, label: 'Capacity', value: '73%', trend: true, trendValue: '-2%', trendType: 'negative', subtitle: 'utilization' },
    { icon: Box, label: 'Top Service', value: 'Boarding', subtitle: '62% of revenue' },
    { icon: AlertTriangle, label: 'No-Shows', value: '3', trend: true, trendValue: '-40%', trendType: 'positive', subtitle: 'this period' },
  ];

  // Service Performance
  const services = [
    { name: 'Boarding', icon: Box, value: 62, color: 'success' },
    { name: 'Daycare', icon: PawPrint, value: 27, color: 'primary' },
    { name: 'Grooming', icon: Scissors, value: 9, color: 'warning' },
    { name: 'Training', icon: Dumbbell, value: 2, color: 'danger' },
  ];

  // Weekly Utilization
  const weekData = [
    { day: 'Mon', value: 52 },
    { day: 'Tue', value: 65 },
    { day: 'Wed', value: 68 },
    { day: 'Thu', value: 82 },
    { day: 'Fri', value: 95 },
    { day: 'Sat', value: 88 },
    { day: 'Sun', value: 72 },
  ];

  const getUtilColor = (val) => val >= 90 ? 'bg-red-500' : val >= 75 ? 'bg-amber-500' : val >= 50 ? 'bg-green-500' : 'bg-gray-300';

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
            <p className="text-lg font-bold text-text">$12,450</p>
            <p className="text-xs text-muted">+15% vs last period</p>
          </div>
        </ChartContainer>
        <ChartContainer title="Bookings Trend">
          <div className="text-center">
            <Calendar className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-text">156</p>
            <p className="text-xs text-muted">+8% vs last period</p>
          </div>
        </ChartContainer>
        <ChartContainer title="Customer Growth">
          <div className="text-center">
            <Users className="h-6 w-6 text-purple-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-text">89</p>
            <p className="text-xs text-muted">+12% vs last period</p>
          </div>
        </ChartContainer>
      </div>

      {/* Operational Performance */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <SectionHeader icon={PieChart} title="Service Performance" subtitle="Revenue breakdown by service" />
        <div className="space-y-3">
          {services.map((service, i) => (
            <ProgressBar key={i} label={service.name} value={service.value} color={service.color} />
          ))}
        </div>
      </div>

      {/* Weekly Utilization Grid */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <SectionHeader icon={LayoutGrid} title="Weekly Utilization" subtitle="Capacity by day of week" />
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
          <span>Avg: <strong className="text-text">73%</strong></span>
          <span>Peak: <strong className="text-text">95% (Fri)</strong></span>
          <span>Low: <strong className="text-text">52% (Mon)</strong></span>
        </div>
      </div>

      {/* Recommendations - Compact single card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-green-800 dark:text-green-300">What's Working</span>
          </div>
          <ul className="space-y-1.5 text-sm text-green-700 dark:text-green-400">
            <li className="flex items-start gap-2"><span>•</span>Weekend bookings up 23%</li>
            <li className="flex items-start gap-2"><span>•</span>Customer retention at 78%</li>
            <li className="flex items-start gap-2"><span>•</span>Grooming add-ons growing</li>
          </ul>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Needs Attention</span>
          </div>
          <ul className="space-y-1.5 text-sm text-amber-700 dark:text-amber-400">
            <li className="flex items-start gap-2"><span>•</span>Monday-Tuesday underutilized</li>
            <li className="flex items-start gap-2"><span>•</span>3 no-shows this week</li>
            <li className="flex items-start gap-2"><span>•</span>Training bookings declining</li>
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
  const liveStats = [
    { icon: DollarSign, label: 'Live Revenue', value: '$1,247', subtitle: 'Target: $850 ✅', variant: 'highlight' },
    { icon: Calendar, label: 'Today Bookings', value: '14', subtitle: '8 completed' },
    { icon: Users, label: 'Check-ins', value: '8', subtitle: 'On schedule' },
    { icon: Percent, label: 'Occupancy', value: '73%', subtitle: '25/34 full' },
  ];

  const activityFeed = [
    { time: '2 min ago', event: 'Max checked in for boarding', type: 'checkin' },
    { time: '5 min ago', event: 'Payment received - $125.00', type: 'payment' },
    { time: '12 min ago', event: 'New booking: Bella (Daycare)', type: 'booking' },
    { time: '18 min ago', event: 'Luna checked out', type: 'checkout' },
    { time: '24 min ago', event: 'Payment received - $89.00', type: 'payment' },
  ];

  const popularServices = [
    { name: 'Boarding (Standard)', count: 6, percentage: 43 },
    { name: 'Daycare (Full Day)', count: 4, percentage: 29 },
    { name: 'Boarding (Deluxe)', count: 2, percentage: 14 },
    { name: 'Grooming (Basic)', count: 2, percentage: 14 },
  ];

  return (
    <div className="space-y-5">
      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-muted">Live • Updated just now</span>
        <Button variant="ghost" size="sm" className="ml-auto">
          <RefreshCw className="h-3.5 w-3.5" />
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
          <SectionHeader icon={Activity} title="Live Activity Feed" subtitle="Real-time events" />
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
        <ChartContainer title="Today's Revenue Timeline" height="h-40">
          <div className="text-center">
            <p className="text-2xl font-bold text-text">$1,247</p>
            <p className="text-xs text-muted">+47% vs yesterday this time</p>
          </div>
        </ChartContainer>
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
          <SectionHeader icon={Users} title="Current Sessions" subtitle="Active users" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-text">25</p>
              <p className="text-xs text-muted">Pets on-site</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text">3</p>
              <p className="text-xs text-muted">Staff active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text">9</p>
              <p className="text-xs text-muted">Runs available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: SCHEDULED REPORTS - Table layout
// ═══════════════════════════════════════════════════════════════════════════

const ScheduledReportsTab = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const schedules = [
    { id: 1, name: 'Daily Revenue Summary', frequency: 'Daily @ 8:00 AM', recipients: 'owner@happypaws.com', format: 'PDF', status: 'active', lastSent: 'Today @ 8:00 AM' },
    { id: 2, name: 'Weekly Performance', frequency: 'Monday @ 9:00 AM', recipients: 'owner@happypaws.com, manager@...', format: 'PDF + Excel', status: 'active', lastSent: 'Oct 14 @ 9:00 AM' },
    { id: 3, name: 'Monthly Financials', frequency: '1st of month @ 9:00 AM', recipients: 'owner@happypaws.com', format: 'PDF', status: 'paused', lastSent: 'Oct 1 @ 9:00 AM' },
  ];

  return (
    <div className="space-y-5">
      <FilterToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        timeRange="30d"
        onTimeRangeChange={() => {}}
        actions={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Schedule
          </Button>
        }
      />

      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Report Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Frequency</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Recipients</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Format</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Last Sent</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr key={schedule.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted" />
                    <span className="text-sm font-medium text-text">{schedule.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted">{schedule.frequency}</td>
                <td className="px-4 py-3 text-sm text-muted truncate max-w-[150px]">{schedule.recipients}</td>
                <td className="px-4 py-3">
                  <Badge variant="neutral" size="sm">{schedule.format}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted">{schedule.lastSent}</td>
                <td className="px-4 py-3">
                  <Badge variant={schedule.status === 'active' ? 'success' : 'warning'} size="sm">
                    {schedule.status === 'active' ? 'Active' : 'Paused'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm"><Edit3 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm">
                      {schedule.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm"><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                    <Button size="sm">Send Now</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {schedules.length === 0 && (
        <EmptyState
          icon={Clock}
          title="No scheduled reports"
          subtitle="Set up automatic report delivery to your inbox"
          action={<Button><Plus className="h-4 w-4 mr-1.5" />Create Schedule</Button>}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: CUSTOM BUILDER - 3-step wizard
// ═══════════════════════════════════════════════════════════════════════════

const CustomBuilderTab = () => {
  const [step, setStep] = useState(1);
  const [reportName, setReportName] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState([]);

  const metrics = [
    { id: 'revenue', label: 'Revenue', category: 'Financial' },
    { id: 'bookings', label: 'Bookings', category: 'Operations' },
    { id: 'customers', label: 'Customers', category: 'Customers' },
    { id: 'capacity', label: 'Capacity', category: 'Operations' },
    { id: 'avgValue', label: 'Avg Booking Value', category: 'Financial' },
    { id: 'retention', label: 'Retention Rate', category: 'Customers' },
  ];

  return (
    <div className="space-y-5">
      {/* Report Name */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <label className="block text-sm font-medium text-text mb-2">Report Name</label>
        <input
          type="text"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
          placeholder="e.g., Weekend Revenue Analysis"
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* 3-Step Wizard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Step 1: Metrics */}
        <div className={cn(
          'bg-white dark:bg-surface-primary border rounded-lg p-4',
          step === 1 ? 'border-primary ring-2 ring-primary/20' : 'border-border'
        )}>
          <div className="flex items-center gap-2 mb-4">
            <span className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
              step >= 1 ? 'bg-primary text-white' : 'bg-surface text-muted'
            )}>1</span>
            <span className="text-sm font-medium text-text">Select Metrics</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {metrics.map((metric) => (
              <label key={metric.id} className="flex items-center gap-2 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMetrics([...selectedMetrics, metric.id]);
                    } else {
                      setSelectedMetrics(selectedMetrics.filter(m => m !== metric.id));
                    }
                  }}
                  className="rounded border-border"
                />
                <span className="text-sm text-text">{metric.label}</span>
                <span className="text-xs text-muted ml-auto">{metric.category}</span>
              </label>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setStep(2)}>
            Next: Filters →
          </Button>
        </div>

        {/* Step 2: Filters */}
        <div className={cn(
          'bg-white dark:bg-surface-primary border rounded-lg p-4',
          step === 2 ? 'border-primary ring-2 ring-primary/20' : 'border-border'
        )}>
          <div className="flex items-center gap-2 mb-4">
            <span className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
              step >= 2 ? 'bg-primary text-white' : 'bg-surface text-muted'
            )}>2</span>
            <span className="text-sm font-medium text-text">Apply Filters</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1">Date Range</label>
              <select className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>This year</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Service Type</label>
              <select className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded">
                <option>All Services</option>
                <option>Boarding</option>
                <option>Daycare</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Group By</label>
              <select className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded">
                <option>Day</option>
                <option>Week</option>
                <option>Month</option>
              </select>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setStep(3)}>
            Next: Preview →
          </Button>
        </div>

        {/* Step 3: Preview */}
        <div className={cn(
          'bg-white dark:bg-surface-primary border rounded-lg p-4',
          step === 3 ? 'border-primary ring-2 ring-primary/20' : 'border-border'
        )}>
          <div className="flex items-center gap-2 mb-4">
            <span className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
              step >= 3 ? 'bg-primary text-white' : 'bg-surface text-muted'
            )}>3</span>
            <span className="text-sm font-medium text-text">Preview & Generate</span>
          </div>
          <div className="bg-surface rounded-lg p-4 h-32 flex items-center justify-center mb-3">
            <div className="text-center">
              <Eye className="h-6 w-6 text-muted mx-auto mb-1" />
              <p className="text-xs text-muted">
                {selectedMetrics.length > 0 
                  ? `${selectedMetrics.length} metrics selected`
                  : 'Select metrics to preview'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
            <Button size="sm" className="flex-1" disabled={selectedMetrics.length === 0}>
              Generate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5: BENCHMARKS - Compressed comparison grid
// ═══════════════════════════════════════════════════════════════════════════

const BenchmarksTab = () => {
  const benchmarks = [
    { metric: 'Avg Booking Value', you: '$74.50', avg: '$68.20', top25: '$81.00', percentile: 92, status: 'above' },
    { metric: 'Capacity Utilization', you: '73%', avg: '69%', top25: '84%', percentile: 68, status: 'average' },
    { metric: 'Customer Retention', you: '73%', avg: '67%', top25: '$81%', percentile: 78, status: 'above' },
    { metric: 'Revenue/Kennel/Day', you: '$39.54', avg: '$42.10', top25: '$54.30', percentile: 55, status: 'below' },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-3">
        <KPITile icon={Target} label="Your Percentile" value="73rd" subtitle="Overall ranking" />
        <KPITile icon={TrendingUp} label="Improvement" value="+8%" subtitle="vs last quarter" trendType="positive" trend trendValue="+8%" />
        <KPITile icon={DollarSign} label="Potential" value="+$4,735/mo" subtitle="If matching top 25%" />
      </div>

      {/* Comparison Grid */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Metric</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wide">You</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wide">Average</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wide">Top 25%</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wide">%tile</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((b, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm font-medium text-text">{b.metric}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-text">{b.you}</td>
                <td className="px-4 py-3 text-center text-sm text-muted">{b.avg}</td>
                <td className="px-4 py-3 text-center text-sm text-muted">{b.top25}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded',
                    b.status === 'above' ? 'bg-green-100 text-green-700' :
                    b.status === 'below' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  )}>{b.percentile}th</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {b.status === 'above' && <TrendingUp className="h-3.5 w-3.5 text-green-600" />}
                    {b.status === 'below' && <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
                    {b.status === 'average' && <ArrowUpRight className="h-3.5 w-3.5 text-amber-600" />}
                    <span className={cn(
                      'text-xs',
                      b.status === 'above' ? 'text-green-600' :
                      b.status === 'below' ? 'text-red-600' : 'text-amber-600'
                    )}>
                      {b.status === 'above' ? 'Above avg' : b.status === 'below' ? 'Below avg' : 'Room to grow'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommendations - Compact */}
      <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <SectionHeader icon={Target} title="Actionable Recommendations" subtitle="Based on benchmarking data" />
        <div className="space-y-2">
          {[
            { text: 'Increase pricing by 5-8% to match top performers', impact: '+$925/mo' },
            { text: 'Improve capacity utilization from 73% to 80%', impact: '+$1,470/mo' },
            { text: 'Boost retention from 73% to 81% (top 25%)', impact: '+$2,340/mo' },
          ].map((rec, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-surface-primary rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-text">{rec.text}</span>
              </div>
              <span className="text-sm font-semibold text-green-700">{rec.impact}</span>
            </div>
          ))}
        </div>
        <div className="text-center mt-4">
          <span className="text-lg font-bold text-green-800">Total potential: +$4,735/month</span>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 6: PREDICTIVE ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

const PredictiveTab = () => {
  const forecast = {
    revenue: '$24,750',
    confidence: '87%',
    bookings: '312',
    walkIns: '18',
  };

  const demandAlerts = [
    { period: 'Thanksgiving (Nov 25-30)', capacity: '98%', action: 'Raise prices 15%', impact: '+$825' },
    { period: 'Christmas (Dec 24-30)', capacity: '100%', action: 'Enable waitlist', impact: '+$1,100' },
  ];

  const churnRisk = [
    { name: 'Mike Thompson', ltv: '$723', inactive: '67 days', probability: '89%' },
    { name: 'Emma Davis', ltv: '$689', inactive: '58 days', probability: '76%' },
    { name: 'Jessica Lee', ltv: '$584', inactive: '45 days', probability: '64%' },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPITile icon={DollarSign} label="Forecasted Revenue" value={forecast.revenue} subtitle="Next 30 days" variant="highlight" />
        <KPITile icon={Target} label="Confidence" value={forecast.confidence} subtitle="Based on historical data" />
        <KPITile icon={Calendar} label="Expected Bookings" value={forecast.bookings} subtitle="Next 30 days" />
        <KPITile icon={Users} label="Predicted Walk-ins" value={forecast.walkIns} subtitle="Estimated" />
      </div>

      {/* Forecast Chart */}
      <ChartContainer title="30-Day Revenue Forecast" height="h-40">
        <div className="text-center">
          <p className="text-2xl font-bold text-text">{forecast.revenue}</p>
          <p className="text-xs text-muted">+15% vs same period last year</p>
        </div>
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Demand Alerts */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
          <SectionHeader icon={AlertTriangle} title="Demand Alerts" subtitle="Upcoming high-demand periods" />
          <div className="space-y-3">
            {demandAlerts.map((alert, i) => (
              <div key={i} className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-800 dark:text-red-300">{alert.period}</span>
                  <Badge variant="danger" size="sm">{alert.capacity}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-700 dark:text-red-400">💡 {alert.action}</span>
                  <span className="font-semibold text-green-700">{alert.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Churn Risk */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
          <SectionHeader 
            icon={AlertCircle} 
            title="Churn Risk" 
            subtitle="Customers at risk of leaving"
            action={<Button size="sm" variant="outline">Win-Back Campaign</Button>}
          />
          <div className="space-y-2">
            {churnRisk.map((customer, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-text">{customer.name}</p>
                  <p className="text-xs text-muted">LTV: {customer.ltv} • Inactive: {customer.inactive}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{customer.probability}</p>
                  <p className="text-xs text-muted">churn risk</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Demand Alert */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Low-demand period: Mid-January (Jan 15-31)</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">Expected 45% capacity • Run 20% off promotion to boost bookings</p>
          </div>
          <Button size="sm" variant="outline">Create Promotion</Button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN REPORTS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview');

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
      case 'overview': return <OverviewTab />;
      case 'live': return <LiveAnalyticsTab />;
      case 'scheduled': return <ScheduledReportsTab />;
      case 'custom': return <CustomBuilderTab />;
      case 'benchmarks': return <BenchmarksTab />;
      case 'predictive': return <PredictiveTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
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
