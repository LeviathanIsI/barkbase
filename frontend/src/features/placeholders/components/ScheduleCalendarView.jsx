import { Calendar, ChevronLeft, ChevronRight, CheckCircle, Clock, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ScheduleCalendarView = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-text-primary">Team Schedule</h2>
          <p className="text-gray-600 dark:text-text-secondary">Manage staff shifts, time off, and coverage</p>
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
        <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-3">Coverage Analysis</h4>
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
        <div className="mt-3 text-sm text-gray-600 dark:text-text-secondary">
          <p><strong>Staff-to-pet ratios:</strong></p>
          <p>• Monday: 1:6 ✅ Within safe limits</p>
          <p>• Friday: 1:8 ⚠️ Approaching maximum (1:10 limit)</p>
        </div>
        <div className="mt-3 p-3 bg-blue-50 dark:bg-surface-primary rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">💡 Consider scheduling additional staff for Friday</p>
        </div>
      </Card>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <table className="w-full border border-gray-200 dark:border-surface-border">
            <thead>
              <tr className="bg-gray-50 dark:bg-surface-secondary">
                <th className="p-4 text-left font-semibold border-r border-gray-200 dark:border-surface-border">Staff</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200 dark:border-surface-border">Mon Oct 13</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200 dark:border-surface-border">Tue Oct 14</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200 dark:border-surface-border bg-blue-50 dark:bg-surface-primary">Wed Oct 15 TODAY</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200 dark:border-surface-border">Thu Oct 16</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200 dark:border-surface-border">Fri Oct 17</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200 dark:border-surface-border">Sat Oct 18</th>
                <th className="p-4 text-center font-semibold">Sun Oct 19</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 dark:border-surface-border">
                <td className="p-4 font-medium border-r border-gray-200 dark:border-surface-border">Jenny Martinez</td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 px-2 py-1 rounded">8-5 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 px-2 py-1 rounded">8-5 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border bg-blue-50 dark:bg-surface-primary">
                  <div className="text-xs bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 px-2 py-1 rounded">8-5 🟢NOW</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-gray-100 dark:bg-surface-secondary text-gray-600 dark:text-text-secondary px-2 py-1 rounded">8-5</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-gray-100 dark:bg-surface-secondary text-gray-600 dark:text-text-secondary px-2 py-1 rounded">8-5</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <span className="text-xs text-gray-400 dark:text-text-tertiary">OFF</span>
                </td>
                <td className="p-2 text-center">
                  <span className="text-xs text-gray-400 dark:text-text-tertiary">OFF</span>
                </td>
              </tr>
              <tr className="border-b border-gray-200 dark:border-surface-border">
                <td className="p-4 font-medium border-r border-gray-200 dark:border-surface-border">Mike Thompson</td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 px-2 py-1 rounded">7-4 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 px-2 py-1 rounded">7-4 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border bg-blue-50 dark:bg-surface-primary">
                  <div className="text-xs bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 px-2 py-1 rounded">7-4 🟢NOW</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-gray-100 dark:bg-surface-secondary text-gray-600 dark:text-text-secondary px-2 py-1 rounded">7-4</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-gray-100 dark:bg-surface-secondary text-gray-600 dark:text-text-secondary px-2 py-1 rounded">7-4</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-gray-100 dark:bg-surface-secondary text-gray-600 dark:text-text-secondary px-2 py-1 rounded">9-6</div>
                </td>
                <td className="p-2 text-center">
                  <span className="text-xs text-gray-400 dark:text-text-tertiary">OFF</span>
                </td>
              </tr>
              <tr className="border-b border-gray-200 dark:border-surface-border">
                <td className="p-4 font-medium border-r border-gray-200 dark:border-surface-border">Sarah Johnson</td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 px-2 py-1 rounded">10-6 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 px-2 py-1 rounded">10-6 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border bg-blue-50 dark:bg-surface-primary">
                  <div className="text-xs bg-orange-100 dark:bg-surface-secondary text-orange-800 dark:text-orange-200 px-2 py-1 rounded">🏖️PTO</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <div className="text-xs bg-orange-100 dark:bg-surface-secondary text-orange-800 dark:text-orange-200 px-2 py-1 rounded">🏖️PTO</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <span className="text-xs text-gray-400 dark:text-text-tertiary">OFF</span>
                </td>
                <td className="p-2 text-center border-r border-gray-200 dark:border-surface-border">
                  <span className="text-xs text-gray-400 dark:text-text-tertiary">OFF</span>
                </td>
                <td className="p-2 text-center">
                  <span className="text-xs text-gray-400 dark:text-text-tertiary">OFF</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Time Off */}
      <Card className="p-4">
        <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-3">Upcoming Time Off</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-surface-primary rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-text-primary">Sarah Johnson</p>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Oct 15-18 (Vacation) 🏖️</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-surface-primary rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-text-primary">Mike Thompson</p>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Oct 25-27 (Personal) 📅</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-surface-primary rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-text-primary">Jenny Martinez</p>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Nov 22-24 (Thanksgiving) 🦃</p>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Button variant="outline" size="sm">
            View All Time Off Requests
          </Button>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Print Schedule</Button>
        <Button variant="outline">Export</Button>
        <Button variant="outline">Email to Team</Button>
        <Button variant="outline">Copy Last Week</Button>
      </div>
    </div>
  );
};

export default ScheduleCalendarView;
