import { Calendar, Clock, Users, DollarSign, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const QuickStatsDashboard = ({ bookings }) => {
  // Calculate quick stats
  const thisWeekBookings = bookings?.length || 0;
  const thisWeekRevenue = bookings?.reduce((sum, b) => sum + (b.totalCents || 0), 0) || 0;
  const averageValue = thisWeekBookings > 0 ? thisWeekRevenue / thisWeekBookings : 0;
  const cancellations = bookings?.filter(b => b.status === 'CANCELLED')?.length || 0;
  const noShows = bookings?.filter(b => b.status === 'NO_SHOW')?.length || 0;

  const upcomingCheckIns = bookings?.filter(b => b.status === 'CONFIRMED' && new Date(b.checkIn) > new Date())?.length || 0;
  const upcomingCheckOuts = bookings?.filter(b => b.status === 'CHECKED_IN')?.length || 0;
  const peakCapacity = 0; // Calculate from capacity API
  const expectedRevenue = bookings?.filter(b => b.status !== 'CANCELLED').reduce((sum, b) => sum + (b.totalCents || 0), 0) || 0;

  // TODO: Replace with real alerts from API
  const alerts = []; // Will be populated from alerts/conflicts API

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
            <span className="font-semibold text-gray-900">{thisWeekBookings}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total revenue:</span>
            <span className="font-semibold text-gray-900">${thisWeekRevenue}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Average value:</span>
            <span className="font-semibold text-gray-900">${averageValue}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Cancellations:</span>
            <span className="font-semibold text-gray-900">{cancellations}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">No-shows:</span>
            <span className="font-semibold text-gray-900">{noShows}</span>
          </div>

          {thisWeekBookings > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <div className="text-center text-gray-500 text-sm">
                Additional analytics will be available with more booking data
              </div>
            </div>
          )}
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

          {upcomingCheckIns > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Capacity info:</span>
              <span className="text-gray-500 text-sm">Available with capacity data</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Expected revenue:</span>
            <span className="font-semibold text-gray-900">${expectedRevenue}</span>
          </div>
        </div>

        {alerts.length > 0 && (
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
        )}
      </Card>
    </div>
  );
};

export default QuickStatsDashboard;
