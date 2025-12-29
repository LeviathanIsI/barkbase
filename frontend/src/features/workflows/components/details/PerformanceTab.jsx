/**
 * PerformanceTab - Performance metrics tab for workflow details
 * Shows enrollment charts, metrics, and step performance table
 */
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  PlayCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/cn';
import { useTimezoneUtils } from '@/lib/timezone';
import { useWorkflowAnalytics } from '../../hooks';
import LoadingState from '@/components/ui/LoadingState';

export default function PerformanceTab({ workflowId }) {
  const tz = useTimezoneUtils();
  const { data, isLoading, error } = useWorkflowAnalytics(workflowId);

  if (isLoading) {
    return <LoadingState label="Loading performance data..." />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-[var(--bb-color-text-tertiary)]">
        Failed to load analytics data
      </div>
    );
  }

  // Extract data from API response
  const analytics = data?.data || data || {};
  const metrics = analytics.metrics || {};
  const enrollmentHistory = analytics.enrollment_history || analytics.dailyEnrollments || [];
  const stepPerformance = analytics.step_performance || analytics.stepPerformance || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          iconColor="#3B82F6"
          label="Total Enrolled"
          value={formatNumber(metrics.total_enrolled || metrics.totalEnrolled || 0)}
        />
        <MetricCard
          icon={PlayCircle}
          iconColor="#F59E0B"
          label="Currently Active"
          value={formatNumber(metrics.currently_active || metrics.inProgress || 0)}
        />
        <MetricCard
          icon={CheckCircle}
          iconColor="#10B981"
          label="Completed"
          value={formatNumber(metrics.completed || 0)}
        />
        <MetricCard
          icon={TrendingUp}
          iconColor="#8B5CF6"
          label="Completion Rate"
          value={`${metrics.completion_rate || metrics.completionRate || 0}%`}
        />
      </div>

      {/* Enrollment Over Time Chart */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)]">
        <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)]">
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
            Enrollments Over Time
          </h3>
        </div>

        <div className="p-4">
          {enrollmentHistory.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={enrollmentHistory}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--bb-color-border-subtle)"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="var(--bb-color-text-tertiary)"
                    fontSize={12}
                    tickFormatter={formatShortDate}
                  />
                  <YAxis
                    stroke="var(--bb-color-text-tertiary)"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bb-color-bg-elevated)',
                      border: '1px solid var(--bb-color-border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--bb-color-text-primary)',
                    }}
                    labelFormatter={formatDate}
                    labelStyle={{ color: 'var(--bb-color-text-primary)' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="enrolled"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    name="Enrolled"
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    name="Completed"
                  />
                  {/* Support legacy data format */}
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    name="Enrollments"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-[var(--bb-color-text-tertiary)]">
              No enrollment data available yet
            </div>
          )}
        </div>
      </div>

      {/* Step Performance Table */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)]">
        <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)]">
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
            Step Performance
          </h3>
        </div>

        <div className="p-4">
          {stepPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-[var(--bb-color-text-tertiary)]">
                    <th className="pb-3 font-medium">Step</th>
                    <th className="pb-3 font-medium text-right">Reached</th>
                    <th className="pb-3 font-medium text-right">Completed</th>
                    <th className="pb-3 font-medium text-right">Completion %</th>
                    <th className="pb-3 font-medium text-right">Avg Time</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {stepPerformance.map((step, index) => {
                    const completionRate = step.completion_rate || step.successRate || 0;
                    return (
                      <tr
                        key={step.id || index}
                        className="border-t border-[var(--bb-color-border-subtle)]"
                      >
                        <td className="py-3 text-[var(--bb-color-text-primary)]">
                          <div className="flex items-center gap-2">
                            <StepTypeIndicator
                              stepType={step.step_type}
                              actionType={step.action_type}
                            />
                            <span>{step.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-[var(--bb-color-text-secondary)]">
                          {formatNumber(step.reached)}
                        </td>
                        <td className="py-3 text-right text-[var(--bb-color-text-secondary)]">
                          {formatNumber(step.completed)}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              completionRate >= 80
                                ? "bg-[rgba(16,185,129,0.1)] text-[#10B981]"
                                : completionRate >= 50
                                ? "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                                : "bg-[rgba(239,68,68,0.1)] text-[#EF4444]"
                            )}
                          >
                            {completionRate}%
                          </span>
                        </td>
                        <td className="py-3 text-right text-[var(--bb-color-text-secondary)]">
                          {formatDuration(step.avg_duration_ms || step.avgTime)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-[var(--bb-color-text-tertiary)]">
              No step performance data available yet
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      {(metrics.failed > 0 || metrics.avg_completion_time_ms) && (
        <div className="grid grid-cols-2 gap-4">
          {metrics.failed > 0 && (
            <MetricCard
              icon={XCircle}
              iconColor="#EF4444"
              label="Failed"
              value={formatNumber(metrics.failed)}
            />
          )}
          {metrics.avg_completion_time_ms && (
            <MetricCard
              icon={Clock}
              iconColor="#6B7280"
              label="Avg Completion Time"
              value={formatDuration(metrics.avg_completion_time_ms)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Metric card component
function MetricCard({ icon, iconColor, label, value, subValue }) {
  const IconComp = icon;
  return (
    <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)] p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <IconComp size={20} style={{ color: iconColor }} />
        </div>
        <div>
          <div className="text-xs text-[var(--bb-color-text-tertiary)]">
            {label}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[var(--bb-color-text-primary)]">
              {value}
            </span>
            {subValue && (
              <span className="text-sm text-[var(--bb-color-text-secondary)]">
                {subValue}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step type indicator
function StepTypeIndicator({ stepType, actionType }) {
  const colors = {
    action: '#3B82F6',
    wait: '#F59E0B',
    determinator: '#8B5CF6',
    gate: '#EF4444',
  };

  const color = colors[stepType] || colors.action;

  return (
    <div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
      title={stepType || actionType}
    />
  );
}

// Format number with commas
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
}

// Format duration from milliseconds
function formatDuration(ms) {
  if (!ms) return '-';
  if (typeof ms === 'string') return ms; // Already formatted
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
  return `${Math.round(ms / 86400000)}d`;
}

// Format date for tooltip
function formatDate(dateStr, tzFormatDate = null) {
  if (!dateStr) return '';
  if (tzFormatDate) {
    return tzFormatDate(dateStr, { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format short date for X axis
function formatShortDate(dateStr, tzFormatDate = null) {
  if (!dateStr) return '';
  if (tzFormatDate) {
    return tzFormatDate(dateStr, { month: 'short', day: 'numeric' });
  }
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
