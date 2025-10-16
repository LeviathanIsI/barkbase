import { Search, Plus, Users, BarChart3, Settings, Dog, Move, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

const QuickActionsBar = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sticky bottom-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">QUICK ACTIONS</h4>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Find Pet
          </Button>

          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Booking
          </Button>

          <Button size="sm" className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
            <Users className="w-4 h-4" />
            Batch Check-in
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Move className="w-4 h-4" />
            Move Pets
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Capacity Report
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsBar;
