import { Clock } from 'lucide-react';
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

      {/* Placeholder for real data */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Clock-ins</h3>
        <div className="text-sm text-gray-600">No time clock data yet. Connect time tracking or add endpoints.</div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Attendance</h3>
        <div className="text-sm text-gray-600">Attendance metrics will appear here once available.</div>
      </Card>
    </div>
  );
};

export default TimeClockSystem;
