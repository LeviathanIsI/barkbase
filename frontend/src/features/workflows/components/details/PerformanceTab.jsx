/**
 * PerformanceTab - Performance metrics tab for workflow details
 */
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export default function PerformanceTab({ analytics }) {
  const stats = analytics || {
    totalEnrolled: 0,
    completed: 0,
    failed: 0,
    inProgress: 0,
    completionRate: 0,
    averageCompletionTime: null,
    stepPerformance: [],
    dailyEnrollments: [],
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          iconColor="#3B82F6"
          label="Total Enrolled"
          value={formatNumber(stats.totalEnrolled)}
        />
        <MetricCard
          icon={CheckCircle}
          iconColor="#10B981"
          label="Completed"
          value={formatNumber(stats.completed)}
          subValue={`${stats.completionRate}%`}
        />
        <MetricCard
          icon={XCircle}
          iconColor="#EF4444"
          label="Failed"
          value={formatNumber(stats.failed)}
        />
        <MetricCard
          icon={Clock}
          iconColor="#F59E0B"
          label="In Progress"
          value={formatNumber(stats.inProgress)}
        />
      </div>

      {/* Step Performance */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)]">
        <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)]">
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
            Step Performance
          </h3>
        </div>

        <div className="p-4">
          {stats.stepPerformance?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-[var(--bb-color-text-tertiary)]">
                  <th className="pb-2 font-medium">Step</th>
                  <th className="pb-2 font-medium text-right">Reached</th>
                  <th className="pb-2 font-medium text-right">Completed</th>
                  <th className="pb-2 font-medium text-right">Success Rate</th>
                  <th className="pb-2 font-medium text-right">Avg Time</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {stats.stepPerformance.map((step, index) => (
                  <tr
                    key={step.id || index}
                    className="border-t border-[var(--bb-color-border-subtle)]"
                  >
                    <td className="py-2 text-[var(--bb-color-text-primary)]">
                      {step.name}
                    </td>
                    <td className="py-2 text-right text-[var(--bb-color-text-secondary)]">
                      {formatNumber(step.reached)}
                    </td>
                    <td className="py-2 text-right text-[var(--bb-color-text-secondary)]">
                      {formatNumber(step.completed)}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          step.successRate >= 90
                            ? "bg-[rgba(16,185,129,0.1)] text-[#10B981]"
                            : step.successRate >= 70
                            ? "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                            : "bg-[rgba(239,68,68,0.1)] text-[#EF4444]"
                        )}
                      >
                        {step.successRate}%
                      </span>
                    </td>
                    <td className="py-2 text-right text-[var(--bb-color-text-secondary)]">
                      {step.avgTime || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-sm text-[var(--bb-color-text-tertiary)]">
              No step performance data available yet.
            </div>
          )}
        </div>
      </div>

      {/* Enrollment Trend */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)]">
        <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)]">
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
            Enrollment Trend (Last 30 Days)
          </h3>
        </div>

        <div className="p-4">
          {stats.dailyEnrollments?.length > 0 ? (
            <div className="h-40 flex items-end gap-1">
              {stats.dailyEnrollments.map((day, index) => {
                const maxValue = Math.max(...stats.dailyEnrollments.map(d => d.count));
                const height = maxValue > 0 ? (day.count / maxValue) * 100 : 0;

                return (
                  <div
                    key={index}
                    className="flex-1 bg-[var(--bb-color-accent)] rounded-t opacity-80 hover:opacity-100 transition-opacity"
                    style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                    title={`${day.date}: ${day.count} enrollments`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-[var(--bb-color-text-tertiary)]">
              No enrollment data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Metric card component
function MetricCard({ icon: IconComponent, iconColor, label, value, subValue }) {
  return (
    <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)] p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <IconComponent size={20} style={{ color: iconColor }} />
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

// Format number with commas
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
}
