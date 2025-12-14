/**
 * LiveAnalyticsDashboard - Real-time analytics with token-based styling
 * Uses the unified chart system with design tokens
 */

import { useState } from 'react';
import { DollarSign, Calendar, Users, BarChart3, TrendingUp, Target } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import StyledSelect from '@/components/ui/StyledSelect';
import { MetricCard } from '@/components/ui/charts';
import { chartPalette } from '@/components/ui/charts/palette';

const LiveAnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('last7');

  const todaysSnapshot = [
    {
      title: 'Today\'s Revenue',
      value: '$1,247',
      target: '$850',
      change: '+47%',
      changeType: 'positive',
      icon: DollarSign,
      variant: 'success'
    },
    {
      title: 'Check-ins',
      value: '8',
      subtitle: 'On schedule',
      icon: Calendar,
      variant: 'info'
    },
    {
      title: 'Check-outs',
      value: '6',
      subtitle: '2 pending',
      icon: Users,
      variant: 'warning'
    },
    {
      title: 'Current Occupancy',
      value: '73%',
      subtitle: '25/34 full',
      icon: BarChart3,
      variant: 'default'
    }
  ];

  const weeklyMetrics = {
    revenue: '$6,340',
    avgDaily: '$905.71',
    bestDay: 'Sat ($1,247)',
    bookings: 89,
    avgBooking: '$71.24'
  };

  const servicePerformance = [
    { service: 'Boarding', percentage: 62, color: chartPalette.success },
    { service: 'Daycare', percentage: 27, color: chartPalette.primary },
    { service: 'Grooming', percentage: 9, color: chartPalette.warning },
    { service: 'Training', percentage: 2, color: chartPalette.purple }
  ];

  const capacityData = [
    { day: 'Mon', utilization: 52 },
    { day: 'Tue', utilization: 65 },
    { day: 'Wed', utilization: 68 },
    { day: 'Thu', utilization: 82 },
    { day: 'Fri', utilization: 95 },
    { day: 'Sat', utilization: 88 },
    { day: 'Sun', utilization: 72 }
  ];

  const proFeatures = [
    'Real-time profit margins',
    'Customer acquisition cost',
    'Lifetime value tracking',
    'Predictive revenue forecasting',
    'Staff productivity metrics',
    'Custom KPI dashboards'
  ];

  const getUtilizationColor = (utilization) => {
    if (utilization >= 90) return chartPalette.danger;
    if (utilization >= 80) return chartPalette.warning;
    if (utilization >= 60) return chartPalette.primary;
    return chartPalette.success;
  };

  return (
    <div className="space-y-[var(--bb-space-6)]">
      {/* Today's Snapshot */}
      <Card className="p-[var(--bb-space-6)]">
        <h3 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-6)]">
          TODAY'S SNAPSHOT
        </h3>

        <div className="grid gap-[var(--bb-space-4)] md:grid-cols-2 lg:grid-cols-4">
          {todaysSnapshot.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              description={metric.subtitle || (metric.target ? `Target: ${metric.target} ✅` : undefined)}
              icon={metric.icon}
              variant={metric.variant}
              trend={metric.changeType === 'positive' ? 'up' : metric.changeType === 'negative' ? 'down' : undefined}
              trendValue={metric.change}
            />
          ))}
        </div>
      </Card>

      {/* Key Metrics (Last 7 Days) */}
      <Card className="p-[var(--bb-space-6)]">
        <div className="flex items-center justify-between mb-[var(--bb-space-6)]">
          <h3 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
            KEY METRICS (Last 7 Days)
          </h3>
          <div className="min-w-[140px]">
            <StyledSelect
              options={[
                { value: 'last7', label: 'Last 7 days' },
                { value: 'last30', label: 'Last 30 days' },
                { value: 'last90', label: 'Last 90 days' },
              ]}
              value={dateRange}
              onChange={(opt) => setDateRange(opt?.value || 'last7')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="mb-[var(--bb-space-6)]">
          <h4 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">
            Revenue Trend
          </h4>
          <div className="h-32 bg-[var(--bb-color-bg-elevated)] rounded-[var(--bb-radius-lg)] flex items-end justify-center">
            <div className="text-center py-[var(--bb-space-8)]">
              <div className="text-4xl mb-[var(--bb-space-2)]">📈</div>
              <p className="text-[var(--bb-color-text-muted)] text-[var(--bb-font-size-sm)]">Revenue trend visualization</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-[var(--bb-space-2)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-secondary)]">
            <div className="flex gap-[var(--bb-space-4)]">
              <span>Total: <strong className="text-[var(--bb-color-text-primary)]">{weeklyMetrics.revenue}</strong></span>
              <span>Avg/day: <strong className="text-[var(--bb-color-text-primary)]">{weeklyMetrics.avgDaily}</strong></span>
              <span>Best: <strong className="text-[var(--bb-color-text-primary)]">{weeklyMetrics.bestDay}</strong></span>
            </div>
          </div>
        </div>

        {/* Service Performance */}
        <div className="mb-[var(--bb-space-6)]">
          <h4 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-3)]">
            SERVICE PERFORMANCE
          </h4>
          <div className="space-y-[var(--bb-space-3)]">
            {servicePerformance.map((service, index) => (
              <div key={index} className="flex items-center gap-[var(--bb-space-3)]">
                <div className="w-24 text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">{service.service}</div>
                <div className="flex-1">
                  <div className="w-full bg-[var(--bb-color-bg-elevated)] rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-300"
                      style={{ width: `${service.percentage}%`, backgroundColor: service.color }}
                    />
                  </div>
                </div>
                <div className="w-12 text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] text-right">
                  {service.percentage}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Capacity Utilization */}
        <div>
          <h4 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-3)]">
            CAPACITY UTILIZATION
          </h4>
          <div className="grid grid-cols-7 gap-[var(--bb-space-2)] mb-[var(--bb-space-3)]">
            {capacityData.map((day, index) => (
              <div key={index} className="text-center">
                <div className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)] mb-[var(--bb-space-1)]">{day.day}</div>
                <div className="relative">
                  <div className="w-full bg-[var(--bb-color-bg-elevated)] rounded-[var(--bb-radius-sm)] h-16 flex items-end justify-center overflow-hidden">
                    <div
                      className="w-full rounded-b-[var(--bb-radius-sm)] transition-all duration-300"
                      style={{ 
                        height: `${day.utilization}%`, 
                        backgroundColor: getUtilizationColor(day.utilization),
                        opacity: 0.8
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                      {day.utilization}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-[var(--bb-space-4)] text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
            <span>Average: <strong className="text-[var(--bb-color-text-primary)]">73%</strong></span>
            <span>Peak: <strong className="text-[var(--bb-color-text-primary)]">95% (Friday)</strong></span>
            <span>Low: <strong className="text-[var(--bb-color-text-primary)]">52% (Monday)</strong></span>
          </div>
          <div className="mt-[var(--bb-space-2)] p-[var(--bb-space-3)] bg-[var(--bb-color-status-info-soft)] border border-[var(--bb-color-status-info)] border-opacity-30 rounded-[var(--bb-radius-lg)]">
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-status-info)]">
              💡 <strong>Monday-Tuesday underutilized</strong> - Opportunity for promotion
            </p>
          </div>
        </div>
      </Card>

      {/* PRO Features Upsell */}
      <Card className="p-[var(--bb-space-6)] bg-[var(--bb-color-chart-purple-soft)] border-[var(--bb-color-chart-purple)] border-opacity-30">
        <div className="text-center">
          <div className="flex items-center justify-center gap-[var(--bb-space-2)] mb-[var(--bb-space-4)]">
            <Target className="w-8 h-8" style={{ color: chartPalette.purple }} />
            <h3 className="text-[var(--bb-font-size-xl)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
              UNLOCK PRO ANALYTICS
            </h3>
          </div>

          <div className="grid gap-[var(--bb-space-3)] md:grid-cols-2 lg:grid-cols-3 mb-[var(--bb-space-6)] text-left">
            {proFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-[var(--bb-space-2)]">
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: chartPalette.purple }}
                />
                <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-secondary)]">{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-[var(--bb-space-4)]">
            <Button>
              Upgrade to PRO
            </Button>
            <Button variant="outline">
              See Full Pro Features
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LiveAnalyticsDashboard;

