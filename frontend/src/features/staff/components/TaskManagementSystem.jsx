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

      {/* Sample Tasks */}
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
