import { Card } from '@/components/ui/Card';

const CalendarView = ({ bookings, currentDate, onDateChange, onBookingClick }) => {
  return (
    <Card className="p-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Calendar View</h3>
        <p className="text-gray-600">Visual calendar with drag-and-drop booking management coming soon...</p>
      </div>
    </Card>
  );
};

export default CalendarView;
