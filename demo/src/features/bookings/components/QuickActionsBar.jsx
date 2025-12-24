import { Plus, Calendar, Users, DollarSign, Bell, BarChart3 } from 'lucide-react';
import Button from '@/components/ui/Button';

const QuickActionsBar = ({
  onNewBooking,
  onBatchCheckIn,
  onSendReminders,
  onPendingPayments,
  onAnalytics
}) => {
  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-text-primary">QUICK ACTIONS</h4>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={onNewBooking}>
            <Plus className="w-4 h-4" />
            New Booking
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Calendar View
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={onBatchCheckIn}>
            <Users className="w-4 h-4" />
            Batch Check-in
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={onAnalytics}>
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={onSendReminders}>
            <Bell className="w-4 h-4" />
            Send Reminders
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={onPendingPayments}>
            <DollarSign className="w-4 h-4" />
            Pending Payments
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsBar;
