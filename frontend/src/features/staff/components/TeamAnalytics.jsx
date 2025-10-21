import { TrendingUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useState, useMemo } from 'react';
import { useTasksQuery } from '@/features/tasks/api';
import { useStaffQuery } from '@/features/settings/api';

const TeamAnalytics = () => {
  const [rangeDays, setRangeDays] = useState(30);

  const { data: tasksData, isLoading: tasksLoading } = useTasksQuery();
  const { data: staffData } = useStaffQuery();

  const staff = useMemo(() => Array.isArray(staffData) ? staffData : (staffData?.data || []), [staffData]);
  const tasks = useMemo(() => Array.isArray(tasksData) ? tasksData : (tasksData?.data || []), [tasksData]);

  const windowStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    return d.getTime();
  }, [rangeDays]);

  const tasksInWindow = useMemo(() => {
    return tasks.filter((t) => {
      const d = new Date(t.dueAt || t.completedAt || t.updatedAt || Date.now()).getTime();
      return d >= windowStart;
    });
  }, [tasks, windowStart]);

  const completed = tasksInWindow.filter((t) => !!t.completedAt);
  const onTime = completed.filter((t) => t.dueAt && new Date(t.completedAt).getTime() <= new Date(t.dueAt).getTime());
  const overdueOpen = tasksInWindow.filter((t) => !t.completedAt && t.dueAt && new Date(t.dueAt).getTime() < Date.now());
  const tasksPerStaff = staff.length ? (tasksInWindow.length / staff.length) : 0;
  const totalCount = tasksInWindow.length;
  const completionRate = totalCount > 0 ? completed.length / totalCount : 0;
  const onTimeRate = completed.length > 0 ? onTime.length / completed.length : 0;
  const overdueRate = totalCount > 0 ? overdueOpen.length / totalCount : 0;
  const healthScore = Math.round(100 * (0.6 * completionRate + 0.3 * onTimeRate + 0.1 * (1 - overdueRate)));

  // Top performers by completed tasks (based on assignedTo)
  const topPerformers = useMemo(() => {
    const completedByAssignee = new Map();
    for (const t of completed) {
      const key = t.assignedTo || 'unassigned';
      completedByAssignee.set(key, (completedByAssignee.get(key) || 0) + 1);
    }
    const entries = [...completedByAssignee.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return entries.map(([assignee, count]) => {
      const member = staff.find((s) => s.membershipId === assignee || s.recordId === assignee || s.userId === assignee);
      const name = member?.name || member?.email || (assignee === 'unassigned' ? 'Unassigned' : String(assignee));
      return { name, count };
    });
  }, [completed, staff]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Team Analytics</h2>
          <p className="text-gray-600">Insights into team performance and efficiency</p>
        </div>
        <div className="flex gap-2">
          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Health Score */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Team Health Score</h3>
          {tasksLoading ? (
            <div className="text-sm text-gray-700">Calculating…</div>
          ) : (
            <>
              <div className="text-6xl font-bold text-green-600 mb-2">{isNaN(healthScore) ? 0 : healthScore}/100</div>
              <div className="text-sm text-green-700 mb-4">Based on completion, on-time, and overdue rates</div>
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <div className="font-medium text-green-700">Completion</div>
                  <div className="text-gray-600">{Math.round(completionRate * 100)}%</div>
                </div>
                <div>
                  <div className="font-medium text-green-700">On-time</div>
                  <div className="text-gray-600">{Math.round(onTimeRate * 100)}%</div>
                </div>
                <div>
                  <div className="font-medium text-green-700">Overdue open</div>
                  <div className="text-gray-600">{Math.round(overdueRate * 100)}%</div>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Productivity Metrics</h3>
        {tasksLoading ? (
          <div className="text-sm text-gray-600">Loading metrics…</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{completed.length}</div>
              <div className="text-sm text-gray-600">Tasks completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 0}%</div>
              <div className="text-sm text-gray-600">On-time completion</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{overdueOpen.length}</div>
              <div className="text-sm text-gray-600">Overdue open</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{tasksPerStaff.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Tasks per staff</div>
            </div>
          </div>
        )}

        {/* Top performers */}
        <div className="mb-2">
          <h4 className="font-medium text-gray-900 mb-2">Top Performers</h4>
          {topPerformers.length === 0 ? (
            <div className="text-sm text-gray-600">No completed tasks in this period.</div>
          ) : (
            <div className="space-y-2 text-sm">
              {topPerformers.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{idx + 1}. {p.name}</span>
                  <span className="text-green-700">{p.count} completed</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <Button variant="outline" className="inline-flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            View Detailed Productivity Report
          </Button>
        </div>
      </Card>

      {/* Customer Satisfaction (placeholder until reviews data exists) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Satisfaction</h3>
        <div className="text-sm text-gray-600">No review data available yet. When reviews are stored, we will show average ratings and counts here.</div>
      </Card>

      {/* Actionable Insights (derived from current metrics) */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actionable Insights</h3>
        <div className="space-y-2 text-sm text-gray-800">
          {overdueOpen.length > 0 && (
            <div>• {overdueOpen.length} overdue task{overdueOpen.length === 1 ? '' : 's'} — prioritize resolution.</div>
          )}
          {completionRate < 0.7 && (
            <div>• Completion rate is {Math.round(completionRate * 100)}% — review workload and blockers.</div>
          )}
          {onTimeRate < 0.8 && (
            <div>• On-time rate is {Math.round(onTimeRate * 100)}% — tighten task scheduling.</div>
          )}
          {tasksPerStaff > 10 && (
            <div>• High tasks per staff ({tasksPerStaff.toFixed(1)}) — consider redistributing or staffing.</div>
          )}
          {overdueOpen.length === 0 && completionRate >= 0.7 && onTimeRate >= 0.8 && tasksPerStaff <= 10 && (
            <div>• Metrics look healthy over the last {rangeDays} days.</div>
          )}
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="inline-flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Export Summary
          </Button>
          <Button variant="outline">Schedule Email</Button>
        </div>
      </Card>
    </div>
  );
};

export default TeamAnalytics;
