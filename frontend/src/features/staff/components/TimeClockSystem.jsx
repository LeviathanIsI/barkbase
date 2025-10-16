import { Clock, User, TrendingUp, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const TimeClockSystem = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Time Clock</h2>
          <p className="text-gray-600">Track staff hours and attendance</p>
        </div>
        <Button variant="outline">View Reports</Button>
      </div>

      {/* Currently Clocked In */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Currently Clocked In (4 staff)</h3>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">J</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Jenny Martinez</p>
              <p className="text-sm text-gray-600">Clocked in: 7:58 AM (6h 2m ago)</p>
              <p className="text-sm text-gray-600">Expected out: 5:00 PM (in 59 mins)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm">Clock Out</Button>
            <Button variant="outline" size="sm">View Timesheet</Button>
          </div>
        </div>
      </Card>

      {/* Today's Attendance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Attendance</h3>
        <div className="grid gap-4 md:grid-cols-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">8</div>
            <div className="text-sm text-gray-600">Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">4</div>
            <div className="text-sm text-gray-600">Clocked in</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">3</div>
            <div className="text-sm text-gray-600">On time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">1</div>
            <div className="text-sm text-gray-600">Late</div>
          </div>
        </div>
        <div className="text-center text-sm text-gray-600 mb-4">
          Attendance rate: 100% ✅
        </div>
      </Card>

      {/* This Week's Hours */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">This Week's Hours</h3>
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">267h 35m</div>
            <div className="text-sm text-gray-600">Total hours worked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">255h 20m</div>
            <div className="text-sm text-gray-600">Regular hours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">12h 15m</div>
            <div className="text-sm text-gray-600">Overtime hours</div>
          </div>
        </div>
        <div className="text-center mb-4">
          <div className="text-lg font-bold text-gray-900">$4,256.50</div>
          <div className="text-sm text-gray-600">Projected payroll</div>
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="outline">View Detailed Report</Button>
          <Button variant="outline">Export for Payroll</Button>
        </div>
      </Card>
    </div>
  );
};

export default TimeClockSystem;
