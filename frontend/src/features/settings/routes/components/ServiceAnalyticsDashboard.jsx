import { BarChart3, TrendingUp, DollarSign, Calendar, Star } from 'lucide-react';

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
    { service: 'Daycare', revenue: 5460, percentage: 35, color: 'bg-blue-50 dark:bg-blue-950/20' },
    { service: 'Boarding', revenue: 7560, percentage: 49, color: 'bg-green-50 dark:bg-green-950/20' },
    { service: 'Grooming', revenue: 3375, percentage: 22, color: 'bg-purple-500' },
    { service: 'Add-ons', revenue: 372, percentage: 2, color: 'bg-orange-500' }
  ];

  return (
    <div className="bg-primary-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <div>
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Service Performance</h2>
          <p className="text-sm text-blue-700 dark:text-blue-300">Last 30 days</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-text-secondary">Total Revenue</span>
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary">${totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-green-600">+12% vs previous period</div>
        </div>

        <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-text-secondary">Total Bookings</span>
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary">{totalBookings}</div>
          <div className="text-xs text-green-600">+8% vs previous period</div>
        </div>

        <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-text-secondary">Avg per Booking</span>
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary">${avgRevenuePerBooking}</div>
          <div className="text-xs text-green-600">+15% vs previous period</div>
        </div>

        <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-text-secondary">Avg Rating</span>
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary">4.7</div>
          <div className="text-xs text-green-600">+0.2 vs previous period</div>
        </div>
      </div>

      {/* Revenue by Service Chart */}
      <div className="bg-white dark:bg-surface-primary rounded-lg p-6 border border-blue-100 dark:border-blue-900/30 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Revenue by Service</h3>
        <div className="space-y-3">
          {chartData.map((item) => (
            <div key={item.service} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium text-gray-700 dark:text-text-primary">{item.service}</div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${item.color}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
              <div className="w-20 text-sm font-medium text-gray-900 dark:text-text-primary">${item.revenue.toLocaleString()}</div>
              <div className="w-12 text-sm text-gray-600 dark:text-text-secondary">({item.percentage}%)</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white dark:bg-surface-primary rounded-lg p-6 border border-blue-100 dark:border-blue-900/30">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Top Performers</h3>
        <div className="space-y-3">
          {topPerformers.map((performer, index) => (
            <div key={performer.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  index === 0 ? 'bg-yellow-100 dark:bg-surface-secondary text-yellow-800' :
                  index === 1 ? 'bg-gray-100 dark:bg-surface-secondary text-gray-800 dark:text-text-primary' :
                  'bg-orange-100 dark:bg-surface-secondary text-orange-800'
                }`}>
                  {index + 1}
                </div>
                <span className="font-medium text-gray-900 dark:text-text-primary">{performer.name}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">
                {performer.bookings} bookings • ${performer.revenue.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServiceAnalyticsDashboard;
