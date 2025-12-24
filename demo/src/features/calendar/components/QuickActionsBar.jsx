import { Search, Plus, Users, BarChart3, Settings, Dog, Move, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';

const QuickActionsBar = ({ onNewBooking }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-4 sticky bottom-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-text-primary">QUICK ACTIONS</h4>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => navigate('/pets')}
          >
            <Search className="w-4 h-4" />
            Find Pet
          </Button>

          <Button 
            variant="secondary" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={onNewBooking || (() => navigate('/bookings/new'))}
          >
            <Plus className="w-4 h-4" />
            New Booking
          </Button>

          <Button 
            size="sm" 
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => navigate('/calendar?view=checkinout&mode=batch')}
          >
            <Users className="w-4 h-4" />
            Batch Check-in
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => {
              alert('Pet movement feature coming soon! This will allow you to reassign pets to different kennels.');
            }}
          >
            <Move className="w-4 h-4" />
            Move Pets
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => navigate('/reports?type=capacity')}
          >
            <BarChart3 className="w-4 h-4" />
            Capacity Report
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => navigate('/settings/calendar-settings')}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsBar;
