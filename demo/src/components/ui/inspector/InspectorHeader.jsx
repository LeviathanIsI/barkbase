/**
 * InspectorHeader - Header section for inspector panels
 * Includes title, subtitle, optional status, and metrics grid
 */

import { cn } from '@/lib/cn';
import StatusPill from '@/components/primitives/StatusPill';

const InspectorHeader = ({
  title,
  subtitle,
  status,
  statusIntent,
  metrics,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'border-b border-[var(--bb-color-border-subtle)]',
        'px-[var(--bb-space-6)] py-[var(--bb-space-5)]',
        'bg-[var(--bb-color-bg-surface)]',
        className
      )}
    >
      {/* Title Row */}
      <div className="flex items-start justify-between gap-[var(--bb-space-3)]">
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] leading-tight">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-[var(--bb-space-1)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
        {status && (
          <StatusPill status={status} intent={statusIntent} />
        )}
      </div>

      {/* Metrics Grid */}
      {metrics && metrics.length > 0 && (
        <div className="mt-[var(--bb-space-4)] grid grid-cols-2 gap-[var(--bb-space-4)] sm:grid-cols-3">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center">
              <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)] uppercase tracking-wide">
                {metric.label}
              </p>
              <p className="mt-[var(--bb-space-1)] text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Additional Content */}
      {children}
    </div>
  );
};

export default InspectorHeader;

