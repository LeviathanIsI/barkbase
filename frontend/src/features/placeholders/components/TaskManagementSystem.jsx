import { Target, Plus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const TaskManagementSystem = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Task Management</h2>
          <p className="text-gray-600">Assign and track tasks for your team</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">View My Tasks</Button>
          <Button variant="outline">Team Tasks</Button>
          <Button variant="outline">Completed</Button>
          <Button>
            <Plus className="w-4 h-4 mr-1" />
            New Task
          </Button>
        </div>
      </div>

      {/* Today's Tasks Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Tasks (24 total)</h3>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">8</div>
            <div className="text-sm text-gray-600">⏰ Pending</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">14</div>
            <div className="text-sm text-gray-600">✅ Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 mb-1">2</div>
            <div className="text-sm text-gray-600">⚠️ Overdue</div>
          </div>
        </div>
      </Card>

      {/* Pending Tasks */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">PENDING TASKS (8):</h3>
        <div className="space-y-4">
          <Card className="p-4 border-l-4 border-red-500">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">HIGH PRIORITY</span>
                  <span className="text-sm text-gray-500">⏰ Due in 1 hour</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">📌 Administer medication to Max @ 2:00 PM</h4>
                <p className="text-sm text-gray-600 mb-2">Assigned to: Jenny Martinez</p>
                <p className="text-sm text-gray-600">Details: Apoquel 16mg with food</p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm">Mark Complete</Button>
                <Button variant="outline" size="sm">Reassign</Button>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-orange-500">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">MEDIUM PRIORITY</span>
                  <span className="text-sm text-gray-500">⏰ Due in 6 hours</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">🧹 Deep clean Kennel K-11 (maintenance scheduled)</h4>
                <p className="text-sm text-gray-600 mb-2">Assigned to: David Martinez</p>
                <p className="text-sm text-gray-600">Details: Repair complete, needs sanitizing</p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm">Mark Complete</Button>
                <Button variant="outline" size="sm">Reassign</Button>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-blue-500">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">RECURRING TASK</span>
                  <span className="text-sm text-gray-500">⏰ Due in 4 hours</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">📸 Upload daily photos to 12 customer accounts</h4>
                <p className="text-sm text-gray-600 mb-2">Assigned to: Jenny Martinez, David Martinez</p>
                <p className="text-sm text-gray-600">Progress: 5/12 completed</p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm">Mark Complete</Button>
                <Button variant="outline" size="sm">View Details</Button>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Overdue Tasks */}
      <div>
        <h3 className="text-lg font-semibold text-red-700 mb-4">OVERDUE TASKS (2):</h3>
        <Card className="p-4 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">⚠️ OVERDUE</span>
                <span className="text-sm text-gray-500">23 hours overdue</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-1">📝 Complete incident report for Max (aggressive behavior)</h4>
              <p className="text-sm text-gray-600 mb-2">Assigned to: Mike Thompson</p>
            </div>
            <div className="flex gap-2 ml-4">
              <Button size="sm">Complete Now</Button>
              <Button variant="outline" size="sm">Reassign</Button>
              <Button variant="outline" size="sm">Follow Up</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3 pt-6 border-t border-gray-200">
        <Button variant="outline">View All Tasks</Button>
        <Button variant="outline">Create Recurring Task</Button>
        <Button variant="outline">Task Templates</Button>
      </div>
    </div>
  );
};

export default TaskManagementSystem;
