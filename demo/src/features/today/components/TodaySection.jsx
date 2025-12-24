import { cn } from '@/lib/cn';

const TodaySection = ({
  title,
  icon: Icon,
  iconClassName,
  badge,
  actions,
  subtitle,
  children,
  className,
  headerClassName,
  titleClassName,
}) => {
  return (
    <div className={cn('flex flex-col gap-[var(--bb-space-4,1rem)]', className)}>
      {(title || actions) && (
        <div
          className={cn(
            'flex items-center justify-between gap-[var(--bb-space-3,0.75rem)]',
            headerClassName,
          )}
        >
          <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
            {Icon && (
              <Icon
                className={cn('h-5 w-5 text-[color:var(--bb-color-text-muted)]', iconClassName)}
              />
            )}
            <h2
              className={cn(
                'text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)]',
                titleClassName,
              )}
            >
              {title}
            </h2>
            {badge}
          </div>
          {actions && (
            <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">{actions}</div>
          )}
        </div>
      )}

      {subtitle && (
        <p className="text-[color:var(--bb-color-text-muted)] text-[var(--bb-font-size-sm,0.875rem)]">
          {subtitle}
        </p>
      )}

      {children}
    </div>
  );
};

export default TodaySection;

