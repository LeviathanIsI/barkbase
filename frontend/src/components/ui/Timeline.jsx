import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Timeline component for displaying activity history
 * Used in History tabs to show chronological events
 *
 * @param {Array} items - Timeline items (REAL data from API)
 * @param {function} renderItem - Custom item renderer
 *
 * @example
 * <Timeline
 *   items={activityHistory}
 *   renderItem={(item) => (
 *     <TimelineItem
 *       title={item.action}
 *       description={item.details}
 *       timestamp={item.createdAt}
 *       icon={item.icon}
 *     />
 *   )}
 * />
 */
export function Timeline({ items, renderItem, emptyMessage = "No activity yet", className }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {items.map((item, index) => (
        <div key={item.id || item.recordId || index} className="relative pb-8 last:pb-0">
          {/* Timeline line */}
          {index !== items.length - 1 && (
            <span
              className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-[var(--border-light)]"
              aria-hidden="true"
            />
          )}

          {/* Timeline content */}
          <div className="relative flex items-start space-x-3">
            {renderItem ? renderItem(item, index) : (
              <TimelineItem
                title={item.title || item.action}
                description={item.description || item.details}
                timestamp={item.timestamp || item.createdAt}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Individual timeline item
 */
export function TimelineItem({
  icon: Icon,
  iconBg = 'bg-primary-100 dark:bg-primary-900/20',
  iconColor = 'text-primary-600',
  title,
  description,
  timestamp,
  metadata,
  actions,
}) {
  return (
    <>
      {/* Icon */}
      <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", iconBg)}>
          {Icon ? (
            <Icon className={cn("h-4 w-4", iconColor)} />
          ) : (
            <div className={cn("h-2 w-2 rounded-full", iconColor)} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {title}
            </p>
            {description && (
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                {description}
              </p>
            )}
            {metadata && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {metadata}
              </div>
            )}
          </div>
          {actions && (
            <div className="ml-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
        {timestamp && (
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {new Date(timestamp).toLocaleString()}
          </p>
        )}
      </div>
    </>
  );
}

Timeline.displayName = 'Timeline';
TimelineItem.displayName = 'TimelineItem';
