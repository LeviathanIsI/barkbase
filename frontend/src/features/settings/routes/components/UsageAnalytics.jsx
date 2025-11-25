/**
 * UsageAnalytics - Property usage insights with token-based styling
 * Uses the unified chart system with design tokens
 */

import { BarChart3, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { chartPalette } from '@/components/ui/charts/palette';

const UsageAnalytics = ({ data }) => {
  if (!data) return null;

  const totalProperties = data.total_properties || 0;
  const totalPets = data.total_pets || 295;
  const usageRate = totalPets > 0 ? Math.round((totalProperties / totalPets) * 100) : 0;

  const insights = [
    {
      icon: BarChart3,
      label: `${totalProperties} active properties across ${totalPets} pets`,
      color: chartPalette.primary
    },
    {
      icon: AlertTriangle,
      label: '83 pets missing daycare group assignment',
      action: 'Bulk assign groups',
      color: chartPalette.warning
    },
    {
      icon: TrendingUp,
      label: '"Behavioral Flags" has grown 15% this month',
      color: chartPalette.success
    },
    {
      icon: CheckCircle,
      label: 'Most used: Daycare Group (72% of pets)',
      color: chartPalette.success
    },
    {
      icon: AlertTriangle,
      label: 'Rarely used: Grooming Preferences (8% of pets)',
      action: 'Archive unused property',
      color: 'var(--bb-color-text-muted)'
    }
  ];

  return (
    <div className="bg-[var(--bb-color-chart-blue-soft)] border border-[var(--bb-color-chart-blue)] border-opacity-30 rounded-[var(--bb-radius-xl)] p-[var(--bb-space-6)]">
      <div className="flex items-center gap-[var(--bb-space-3)] mb-[var(--bb-space-4)]">
        <BarChart3 className="w-6 h-6" style={{ color: chartPalette.primary }} />
        <h2 className="text-[var(--bb-font-size-xl)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
          Property Usage Insights
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--bb-space-4)]">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div 
              key={index} 
              className="bg-[var(--bb-color-bg-surface)] rounded-[var(--bb-radius-lg)] p-[var(--bb-space-4)] border border-[var(--bb-color-border-subtle)]"
            >
              <div className="flex items-start gap-[var(--bb-space-3)]">
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: insight.color }} />
                <div className="flex-1">
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">{insight.label}</p>
                  {insight.action && (
                    <button className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-accent)] hover:underline mt-[var(--bb-space-1)]">
                      {insight.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Summary */}
      <div className="mt-[var(--bb-space-6)] pt-[var(--bb-space-4)] border-t border-[var(--bb-color-border-subtle)]">
        <div className="flex items-center justify-between text-[var(--bb-font-size-sm)]">
          <span className="text-[var(--bb-color-text-muted)]">Overall Usage Rate:</span>
          <span className="font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
            {usageRate}% of pets have custom properties
          </span>
        </div>
        <div className="w-full bg-[var(--bb-color-bg-elevated)] rounded-full h-2 mt-[var(--bb-space-2)]">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(usageRate, 100)}%`, backgroundColor: chartPalette.primary }}
          />
        </div>
      </div>
    </div>
  );
};

export default UsageAnalytics;
