import { Calendar, ChevronLeft, ChevronRight, CheckCircle, Clock, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
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

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-4 text-left font-semibold border-r border-gray-200">Staff</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200">Mon Oct 13</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200">Tue Oct 14</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200 bg-blue-50">Wed Oct 15 TODAY</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200">Thu Oct 16</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200">Fri Oct 17</th>
                <th className="p-4 text-center font-semibold border-r border-gray-200">Sat Oct 18</th>
                <th className="p-4 text-center font-semibold">Sun Oct 19</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-4 font-medium border-r border-gray-200">Jenny Martinez</td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">8-5 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">8-5 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 bg-blue-50">
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">8-5 🟢NOW</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">8-5</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">8-5</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <span className="text-xs text-gray-400">OFF</span>
                </td>
                <td className="p-2 text-center">
                  <span className="text-xs text-gray-400">OFF</span>
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-4 font-medium border-r border-gray-200">Mike Thompson</td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">7-4 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">7-4 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 bg-blue-50">
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">7-4 🟢NOW</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">7-4</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">7-4</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">9-6</div>
                </td>
                <td className="p-2 text-center">
                  <span className="text-xs text-gray-400">OFF</span>
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-4 font-medium border-r border-gray-200">Sarah Johnson</td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">10-6 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">10-6 🟢</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200 bg-blue-50">
                  <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">🏖️PTO</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">🏖️PTO</div>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <span className="text-xs text-gray-400">OFF</span>
                </td>
                <td className="p-2 text-center border-r border-gray-200">
                  <span className="text-xs text-gray-400">OFF</span>
                </td>
                <td className="p-2 text-center">
                  <span className="text-xs text-gray-400">OFF</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Time Off */}
      <Card className="p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Upcoming Time Off</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Sarah Johnson</p>
              <p className="text-sm text-gray-600">Oct 15-18 (Vacation) 🏖️</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Mike Thompson</p>
              <p className="text-sm text-gray-600">Oct 25-27 (Personal) 📅</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Jenny Martinez</p>
              <p className="text-sm text-gray-600">Nov 22-24 (Thanksgiving) 🦃</p>
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
