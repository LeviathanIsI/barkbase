import { Star, Plus, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const PerformanceReviews = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Performance Reviews</h2>
          <p className="text-gray-600">Track and improve team performance</p>
        </div>
        <Button variant="outline">Schedule Review</Button>
      </div>

      {/* Review Schedule */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Schedule</h3>
        <div className="space-y-3">
          <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Jenny Martinez - Annual review</p>
                <p className="text-sm text-gray-600">Due Oct 20</p>
              </div>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded">📝 In Progress</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="outline" size="sm">View All Reviews</Button>
          <Button variant="outline" size="sm">Create Review Template</Button>
        </div>
      </Card>

      {/* Current Review */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Jenny Martinez - Annual Review</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-600">Review Period: Oct 2024 - Oct 2025</p>
          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded mt-2 inline-block">📝 In Progress (70% complete)</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">Customer Satisfaction: 4.9/5.0</span>
            </div>
            <p className="text-sm text-gray-600">Based on 147 reviews this year</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Task Completion: 98.5% on-time</span>
            </div>
            <p className="text-sm text-gray-600">2,847 tasks completed this year</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button>Complete Review</Button>
          <Button variant="outline">Schedule Meeting</Button>
          <Button variant="outline">Save Draft</Button>
        </div>
      </Card>
    </div>
  );
};

export default PerformanceReviews;
