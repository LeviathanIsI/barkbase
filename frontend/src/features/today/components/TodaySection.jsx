import { cn } from '@/lib/cn';

const TodaySection = ({
  title,
  icon: Icon,
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
            'flex flex-col gap-[var(--bb-space-3,0.75rem)] md:flex-row md:items-center md:justify-between',
            headerClassName,
          )}
        >
          <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
            {Icon && <Icon className="h-5 w-5 text-success-600 dark:text-success-500" />}
            <span
              className={cn(
                'text-[var(--bb-font-size-md,1.125rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary,#0f172a)]',
                titleClassName,
              )}
            >
              {title}
            </span>
            {badge}
          </div>
          {actions && <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">{actions}</div>}
        </div>
      )}

      {subtitle && (
        <p className="text-[color:var(--bb-color-text-muted,#52525b)] text-[var(--bb-font-size-sm,1rem)] dark:text-text-secondary">
          {subtitle}
        </p>
      )}

      {children}
    </div>
  );
};

export default TodaySection;

