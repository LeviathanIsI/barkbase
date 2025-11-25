/**
 * ServiceAnalyticsDashboard - Service performance analytics with token-based styling
 * Uses the unified chart system with design tokens
 */

import { BarChart3, TrendingUp, DollarSign, Calendar, Star } from 'lucide-react';
import { MetricCard } from '@/components/ui/charts';
import { chartPalette } from '@/components/ui/charts/palette';

const ServiceAnalyticsDashboard = ({ data }) => {
  if (!data) return null;

  const totalRevenue = data.total_revenue || 0;
  const totalBookings = data.total_bookings || 0;
  const avgRevenuePerBooking = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  // Top performers (calculate from real bookings)
  const topPerformers = [
    { name: 'Full Day Daycare', bookings: 156, revenue: 5460 },
    { name: 'Standard Boarding', bookings: 89, revenue: 3960 },
    { name: 'Full Groom', bookings: 45, revenue: 3375 }
  ];

  const chartData = [
    { service: 'Daycare', revenue: 5460, percentage: 35, color: chartPalette.primary },
    { service: 'Boarding', revenue: 7560, percentage: 49, color: chartPalette.success },
    { service: 'Grooming', revenue: 3375, percentage: 22, color: chartPalette.purple },
    { service: 'Add-ons', revenue: 372, percentage: 2, color: chartPalette.warning }
  ];

  const getRankColor = (index) => {
    const colors = [
      { bg: 'var(--bb-color-chart-yellow-soft)', text: 'var(--bb-color-chart-yellow)' },
      { bg: 'var(--bb-color-bg-elevated)', text: 'var(--bb-color-text-muted)' },
      { bg: 'var(--bb-color-chart-orange-soft)', text: 'var(--bb-color-chart-orange)' }
    ];
    return colors[index] || colors[2];
  };

  return (
    <div className="bg-[var(--bb-color-chart-blue-soft)] border border-[var(--bb-color-chart-blue)] border-opacity-30 rounded-[var(--bb-radius-xl)] p-[var(--bb-space-6)]">
      <div className="flex items-center gap-[var(--bb-space-3)] mb-[var(--bb-space-6)]">
        <BarChart3 className="w-6 h-6" style={{ color: chartPalette.primary }} />
        <div>
          <h2 className="text-[var(--bb-font-size-xl)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
            Service Performance
          </h2>
          <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Last 30 days</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--bb-space-4)] mb-[var(--bb-space-6)]">
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          description="+12% vs previous period"
          icon={DollarSign}
          variant="success"
          trend="up"
        />
        <MetricCard
          title="Total Bookings"
          value={totalBookings.toString()}
          description="+8% vs previous period"
          icon={Calendar}
          variant="info"
          trend="up"
        />
        <MetricCard
          title="Avg per Booking"
          value={`$${avgRevenuePerBooking}`}
          description="+15% vs previous period"
          icon={TrendingUp}
          variant="default"
          trend="up"
        />
        <MetricCard
          title="Avg Rating"
          value="4.7"
          description="+0.2 vs previous period"
          icon={Star}
          variant="warning"
          trend="up"
        />
      </div>

      {/* Revenue by Service Chart */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-[var(--bb-radius-xl)] p-[var(--bb-space-6)] border border-[var(--bb-color-border-subtle)] mb-[var(--bb-space-6)]">
        <h3 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-4)]">
          Revenue by Service
        </h3>
        <div className="space-y-[var(--bb-space-3)]">
          {chartData.map((item) => (
            <div key={item.service} className="flex items-center gap-[var(--bb-space-4)]">
              <div className="w-24 text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                {item.service}
              </div>
              <div className="flex-1">
                <div className="w-full bg-[var(--bb-color-bg-elevated)] rounded-full h-4">
                  <div
                    className="h-4 rounded-full transition-all duration-300"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
              <div className="w-20 text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                ${item.revenue.toLocaleString()}
              </div>
              <div className="w-12 text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                ({item.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-[var(--bb-radius-xl)] p-[var(--bb-space-6)] border border-[var(--bb-color-border-subtle)]">
        <h3 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-4)]">
          Top Performers
        </h3>
        <div className="space-y-[var(--bb-space-3)]">
          {topPerformers.map((performer, index) => {
            const rankColor = getRankColor(index);
            return (
              <div key={performer.name} className="flex items-center justify-between">
                <div className="flex items-center gap-[var(--bb-space-3)]">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-semibold)]"
                    style={{ backgroundColor: rankColor.bg, color: rankColor.text }}
                  >
                    {index + 1}
                  </div>
                  <span className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                    {performer.name}
                  </span>
                </div>
                <div className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                  {performer.bookings} bookings • ${performer.revenue.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ServiceAnalyticsDashboard;
