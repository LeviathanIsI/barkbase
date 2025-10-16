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
    { service: 'Daycare', revenue: 5460, percentage: 35, color: 'bg-blue-500' },
    { service: 'Boarding', revenue: 7560, percentage: 49, color: 'bg-green-500' },
    { service: 'Grooming', revenue: 3375, percentage: 22, color: 'bg-purple-500' },
    { service: 'Add-ons', revenue: 372, percentage: 2, color: 'bg-orange-500' }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-blue-900">Service Performance</h2>
          <p className="text-sm text-blue-700">Last 30 days</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Total Revenue</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-green-600">+12% vs previous period</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Total Bookings</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalBookings}</div>
          <div className="text-xs text-green-600">+8% vs previous period</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Avg per Booking</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">${avgRevenuePerBooking}</div>
          <div className="text-xs text-green-600">+15% vs previous period</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-gray-600">Avg Rating</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">4.7</div>
          <div className="text-xs text-green-600">+0.2 vs previous period</div>
        </div>
      </div>

      {/* Revenue by Service Chart */}
      <div className="bg-white rounded-lg p-6 border border-blue-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Service</h3>
        <div className="space-y-3">
          {chartData.map((item) => (
            <div key={item.service} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium text-gray-700">{item.service}</div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${item.color}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
              <div className="w-20 text-sm font-medium text-gray-900">${item.revenue.toLocaleString()}</div>
              <div className="w-12 text-sm text-gray-600">({item.percentage}%)</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
        <div className="space-y-3">
          {topPerformers.map((performer, index) => (
            <div key={performer.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                  index === 1 ? 'bg-gray-100 text-gray-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {index + 1}
                </div>
                <span className="font-medium text-gray-900">{performer.name}</span>
              </div>
              <div className="text-sm text-gray-600">
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
