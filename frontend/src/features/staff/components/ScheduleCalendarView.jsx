import { Calendar, ChevronLeft, ChevronRight, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ScheduleCalendarView = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Team Schedule</h2>
          <p className="text-gray-600">Manage staff shifts, time off, and coverage</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Week</Button>
          <Button variant="outline">Month</Button>
          <Button variant="outline">Day</Button>
          <Button variant="outline">List</Button>
          <Button>Add Shift</Button>
          <Button variant="outline">Import</Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            Today
          </Button>
          <Button variant="outline" size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <h3 className="text-lg font-semibold">Week of Oct 13-19, 2025</h3>
      </div>

      {/* Coverage Analysis */}
      <Card className="p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Coverage Analysis</h4>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>Mon-Fri: ✅ Fully staffed (8 staff scheduled)</span>
          </div>
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="w-5 h-5" />
            <span>Saturday: ⚠️ Low coverage (4 staff - could use 1 more)</span>
          </div>
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="w-5 h-5" />
            <span>Sunday: ⚠️ Low coverage (3 staff - could use 2 more)</span>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <p><strong>Staff-to-pet ratios:</strong></p>
          <p>• Monday: 1:6 ✅ Within safe limits</p>
          <p>• Friday: 1:8 ⚠️ Approaching maximum (1:10 limit)</p>
        </div>
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">💡 Consider scheduling additional staff for Friday</p>
        </div>
      </Card>

      {/* Simple Calendar Preview */}
      <Card className="p-6">
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Visual Schedule Calendar</h3>
          <p className="text-gray-600">Weekly calendar view with staff assignments and coverage analysis coming soon...</p>
        </div>
      </Card>
    </div>
  );
};

export default ScheduleCalendarView;
