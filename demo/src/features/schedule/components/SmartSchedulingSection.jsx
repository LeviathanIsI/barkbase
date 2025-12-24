import { Brain, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { useTodayStats } from "../hooks/useTodayStats";
import { useBookingsQuery } from "@/features/bookings/api";

/**
 * Smart Scheduling Assistant section - shows scheduling insights and recommendations
 */
const SmartSchedulingSection = ({ currentDate = new Date() }) => {
  const today = format(currentDate, 'yyyy-MM-dd');
  const stats = useTodayStats(currentDate);
  const { data: todayBookings } = useBookingsQuery({ from: today, to: today });

  // Generate insights based on real data
  const insights = [];

  // Check capacity utilization
  if (stats.occupancyPct >= 90) {
    insights.push({
      type: 'warning',
      icon: AlertTriangle,
      title: 'High Capacity Alert',
      message: `Facility is at ${Math.round(stats.occupancyPct)}% capacity. Consider limiting new bookings.`,
      color: 'text-orange-600 bg-orange-50 dark:bg-surface-primary border-orange-200'
    });
  } else if (stats.occupancyPct >= 80) {
    insights.push({
      type: 'info',
      icon: Info,
      title: 'Moderate Capacity',
      message: `Facility is at ${Math.round(stats.occupancyPct)}% capacity. ${stats.availableSpots} spots remaining.`,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-surface-primary border-blue-200 dark:border-blue-900/30'
    });
  } else {
    insights.push({
      type: 'success',
      icon: CheckCircle,
      title: 'Good Availability',
      message: `${stats.availableSpots} of ${stats.totalCapacity} spots available. Great time to accept new bookings.`,
      color: 'text-green-600 bg-green-50 dark:bg-surface-primary border-green-200 dark:border-green-900/30'
    });
  }

  // Check for pending check-ins
  if (stats.checkInsPending > 0) {
    insights.push({
      type: 'info',
      icon: Info,
      title: 'Pending Check-ins',
      message: `${stats.checkInsPending} guest${stats.checkInsPending > 1 ? 's' : ''} scheduled to check in today. Ensure kennels are prepared.`,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-surface-primary border-blue-200 dark:border-blue-900/30'
    });
  }

  // Check for bookings without kennel assignments
  const bookingsWithoutKennels = (todayBookings || []).filter(
    b => !b.segments || b.segments.length === 0
  );
  if (bookingsWithoutKennels.length > 0) {
    insights.push({
      type: 'warning',
      icon: AlertTriangle,
      title: 'Unassigned Kennels',
      message: `${bookingsWithoutKennels.length} booking${bookingsWithoutKennels.length > 1 ? 's' : ''} need kennel assignments.`,
      color: 'text-orange-600 bg-orange-50 dark:bg-surface-primary border-orange-200'
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'success',
      icon: CheckCircle,
      title: 'All Systems Optimal',
      message: 'No scheduling conflicts or recommendations at this time.',
      color: 'text-green-600 bg-green-50 dark:bg-surface-primary border-green-200 dark:border-green-900/30'
    });
  }

  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
          <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">
            Smart Scheduling Assistant
          </h3>
          <p className="text-sm text-gray-600 dark:text-text-secondary">
            Real-time insights and recommendations
          </p>
        </div>
      </div>
      
      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 p-4 rounded-lg border ${insight.color}`}
          >
            <insight.icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
              <p className="text-sm opacity-90">{insight.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmartSchedulingSection;

