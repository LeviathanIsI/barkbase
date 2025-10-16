import { TrendingUp, Users, Clock, Star, AlertTriangle, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const TeamAnalytics = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Team Analytics</h2>
          <p className="text-gray-600">Insights into team performance and efficiency</p>
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 border border-gray-300 rounded-md">
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Health Score */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Team Health Score</h3>
          <div className="text-6xl font-bold text-green-600 mb-2">87/100</div>
          <div className="text-xl text-green-700 mb-4">⭐ VERY GOOD</div>
          <div className="grid gap-4 md:grid-cols-4 text-sm">
            <div>
              <div className="font-medium text-green-700">✅ Productivity: 92/100</div>
              <div className="text-gray-600">Excellent</div>
            </div>
            <div>
              <div className="font-medium text-green-700">✅ Customer Satisfaction: 94/100</div>
              <div className="text-gray-600">Excellent</div>
            </div>
            <div>
              <div className="font-medium text-orange-700">⚠️ Attendance: 78/100</div>
              <div className="text-gray-600">Needs Improvement</div>
            </div>
            <div>
              <div className="font-medium text-green-700">✅ Task Completion: 96/100</div>
              <div className="text-gray-600">Excellent</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Productivity Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Productivity Metrics</h3>
        <div className="grid gap-4 md:grid-cols-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">2,847</div>
            <div className="text-sm text-gray-600">Tasks completed</div>
            <div className="text-xs text-gray-500">avg 95/day</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">96.2%</div>
            <div className="text-sm text-gray-600">On-time completion</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">28 min</div>
            <div className="text-sm text-gray-600">Average completion time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">8.2</div>
            <div className="text-sm text-gray-600">Tasks per staff member</div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Top Performers</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>1. Jenny Martinez - 412 tasks (97% on-time)</span>
              <span className="text-green-600">⭐</span>
            </div>
            <div className="flex justify-between">
              <span>2. Mike Thompson - 387 tasks (99% on-time)</span>
              <span className="text-green-600">⭐</span>
            </div>
            <div className="flex justify-between">
              <span>3. Amanda Chen - 356 tasks (95% on-time)</span>
              <span className="text-green-600">⭐</span>
            </div>
          </div>
        </div>

        <Button variant="outline">View Detailed Productivity Report</Button>
      </Card>

      {/* Customer Satisfaction */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Satisfaction</h3>
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-yellow-500 mb-2">⭐⭐⭐⭐⭐ 4.7/5.0</div>
          <div className="text-gray-600">Based on 247 customer reviews</div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span>Jenny Martinez: 4.9/5.0 (147 reviews)</span>
            <span className="text-green-600">⭐ Top rated</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Amanda Chen: 4.8/5.0 (89 reviews)</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Mike Thompson: 4.7/5.0 (67 reviews)</span>
          </div>
          <div className="flex justify-between items-center">
            <span>David Martinez: 4.2/5.0 (38 reviews)</span>
            <span className="text-orange-600">⚠️ Needs improvement</span>
          </div>
        </div>

        <Button variant="outline">View Full Feedback Analysis</Button>
      </Card>

      {/* Actionable Insights */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actionable Insights</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-green-700 mb-2">📈 OPPORTUNITIES:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Jenny Martinez ready for leadership role</li>
              <li>• Team morale high - 87% satisfaction score</li>
              <li>• Labor costs efficient at 32.5% of revenue</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-red-700 mb-2">⚠️ CONCERNS:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• David Martinez needs coaching</li>
              <li>• Overtime costs increasing</li>
              <li>• CPR certification compliance</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-blue-700 mb-2">🎯 RECOMMENDED ACTIONS:</h4>
            <ol className="text-sm text-gray-700 space-y-1">
              <li>1. Coach David on punctuality</li>
              <li>2. Schedule CPR certification</li>
              <li>3. Consider promoting Jenny</li>
              <li>4. Hire part-time staff</li>
            </ol>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline">Generate Action Plan</Button>
          <Button variant="outline">Schedule Manager Meeting</Button>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Export Report</Button>
        <Button variant="outline">Schedule Email</Button>
        <Button variant="outline">Compare to Last Month</Button>
      </div>
    </div>
  );
};

export default TeamAnalytics;
