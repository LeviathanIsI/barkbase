import { format, subWeeks, eachWeekOfInterval, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { BarChart3, TrendingUp, DollarSign, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { useCapacityQuery } from '../api-capacity';

const CapacityHeatmapView = ({ currentDate, filters }) => {
  const weeks = eachWeekOfInterval({
    start: subWeeks(currentDate, 3),
    end: currentDate
  });

  // Fetch real capacity data for the last 30 days
  const startDate = subWeeks(currentDate, 4);
  const { data: capacityData = [], isLoading, isError } = useCapacityQuery(
    format(startDate, 'yyyy-MM-dd'),
    format(currentDate, 'yyyy-MM-dd')
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-96" />
      </Card>
    );
  }

  // Transform capacity data into heatmap grid by week
  const heatmapData = weeks.map(weekStart => {
    const weekDays = eachDayOfInterval({
      start: startOfWeek(weekStart, { weekStartsOn: 1 }),
      end: endOfWeek(weekStart, { weekStartsOn: 1 })
    });

    return weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayCapacity = Array.isArray(capacityData) ? capacityData.find(c => c.date === dayStr) : null;
      return dayCapacity?.utilizationPercent || 0;
    });
  });

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getColorClass = (percentage) => {
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Capacity Heatmap</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Last 30 days</span>
        </div>
      </div>

      <p className="text-gray-600 mb-6">
        Visualize booking patterns over time
      </p>

      {/* Heatmap */}
      <div className="mb-6">
        <div className="grid grid-cols-8 gap-1 text-center text-sm">
          <div></div>
          {days.map(day => (
            <div key={day} className="font-medium text-gray-700 p-2">{day}</div>
          ))}

          {heatmapData.map((weekData, weekIndex) => (
            <div key={week.toISOString()}>
              <div className="font-medium text-gray-700 p-2">
                Wk {weekIndex + 1}
              </div>
              {weekData.map((percentage, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-12 h-8 rounded ${getColorClass(percentage)} flex items-center justify-center text-white text-xs font-medium mx-1`}
                >
                  {percentage}%
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>&lt;50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>50-80%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>80-90%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span>90-95%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>95%+</span>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-3">INSIGHTS</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Thursday-Friday consistently high (90%+)</li>
          <li>• Weekends show strong demand (80-95%)</li>
          <li>• Monday-Wednesday underutilized (55-70%)</li>
          <li>• Weekend booking trend increasing (+5% month-over-month)</li>
        </ul>
      </div>

      {/* Recommended Actions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-900 mb-3">RECOMMENDED ACTIONS</h3>
        <ul className="space-y-2 text-sm text-green-800">
          <li>💰 Raise Thu-Fri prices by $10-15 (demand supports it)</li>
          <li>💡 Run midweek promotion to boost Mon-Wed occupancy</li>
          <li>👥 Consider adding staff for peak weekend periods</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline">
          <BarChart3 className="w-4 h-4 mr-2" />
          Export Data
        </Button>
        <Button variant="outline">
          <TrendingUp className="w-4 h-4 mr-2" />
          View Full Analytics
        </Button>
      </div>
    </Card>
  );
};

export default CapacityHeatmapView;
