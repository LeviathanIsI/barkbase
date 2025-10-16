import { Calendar, Clock, Users, DollarSign, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const QuickStatsDashboard = ({ bookings }) => {
  // Calculate quick stats
  const thisWeekBookings = 18; // Mock data
  const thisWeekRevenue = 1247; // Mock data
  const averageValue = 69.28; // Mock data
  const cancellations = 2; // Mock data
  const noShows = 0; // Mock data

  const upcomingCheckIns = 34; // Mock data
  const upcomingCheckOuts = 29; // Mock data
  const peakCapacity = 95; // Mock data
  const expectedRevenue = 2340; // Mock data

  const alerts = [
    { message: '3 bookings missing vaccination records', action: 'Review Records' },
    { message: '2 customers haven\'t confirmed (reminder sent)', action: 'Follow Up' },
    { message: '1 overbooked slot on Saturday needs resolution', action: 'Fix Conflict' }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* This Week Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📊 THIS WEEK (Oct 13-19)
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">New bookings:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{thisWeekBookings}</span>
              <span className="text-green-600 text-sm flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +3 vs last week
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total revenue:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">${thisWeekRevenue}</span>
              <span className="text-green-600 text-sm flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12% vs last week
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Average value:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">${averageValue}</span>
              <span className="text-green-600 text-sm">+$5.15</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Cancellations:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{cancellations}</span>
              <span className="text-red-600 text-sm flex items-center gap-1">
                <TrendingUp className="w-3 h-3 rotate-180" />
                -1 vs last week
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">No-shows:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-600">{noShows}</span>
              <span className="text-green-600 text-sm">✅ Perfect!</span>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Top service:</span>
              <span className="font-semibold text-gray-900">Boarding (62%)</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-600">Busiest day:</span>
              <span className="font-semibold text-gray-900">Friday (23 bookings)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Upcoming Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📅 UPCOMING (Next 7 days)
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Check-ins scheduled:</span>
            <span className="font-semibold text-gray-900">{upcomingCheckIns}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Check-outs scheduled:</span>
            <span className="font-semibold text-gray-900">{upcomingCheckOuts}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Peak capacity day:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Friday ({peakCapacity}% full)</span>
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Expected revenue:</span>
            <span className="font-semibold text-gray-900">${expectedRevenue}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">⚠️ ALERTS:</h4>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-start justify-between py-2 px-3 bg-yellow-50 border border-yellow-200 rounded">
                <span className="text-sm text-yellow-800">{alert.message}</span>
                <Button size="sm" variant="outline" className="ml-2 text-xs">
                  {alert.action}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default QuickStatsDashboard;
