import EnhancedStatsDashboard from "@/features/calendar/components/EnhancedStatsDashboard";

/**
 * Stats dashboard for schedule page - wraps the EnhancedStatsDashboard
 */
const ScheduleStatsDashboard = ({ currentDate, stats }) => {
  return <EnhancedStatsDashboard currentDate={currentDate} stats={stats} />;
};

export default ScheduleStatsDashboard;

