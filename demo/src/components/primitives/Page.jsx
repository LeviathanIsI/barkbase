import { cn } from '@/lib/cn';

/**
 * High-level page shell with optional header, toolbar, and breadcrumb slots.
 * Keeps layout concerns centralized so feature screens only provide content.
 */
export default function Page({
  title,
  subtitle,
  breadcrumbs,
  actions,
  toolbar,
  children,
  className,
  headerClassName,
  contentClassName,
  stickyHeader = false,
}) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      {(title || breadcrumbs || actions || toolbar) && (
        <div
          className={cn(
            'border-b border-border bg-white dark:bg-surface-primary',
            stickyHeader && 'sticky top-0 z-10',
            headerClassName,
          )}
        >
          <div className="flex w-full flex-col gap-3 px-6 py-6">
            {(breadcrumbs || title || subtitle || actions) && (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  {breadcrumbs && (
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
                      {breadcrumbs}
                    </div>
                  )}
                  {title && (
                    <h1 className="truncate text-2xl font-semibold text-text">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="truncate text-sm text-muted">{subtitle}</p>
                  )}
                </div>
                {actions && (
                  <div className="flex flex-wrap items-center gap-2">
                    {actions}
                  </div>
                )}
              </div>
            )}
            {toolbar && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                {toolbar}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={cn('flex w-full flex-1 flex-col px-6 py-8', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
