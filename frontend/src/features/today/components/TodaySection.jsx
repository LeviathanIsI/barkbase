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
    <div className={cn('flex flex-col gap-4', className)}>
      {(title || actions) && (
        <div
          className={cn(
            'flex flex-col gap-3 md:flex-row md:items-center md:justify-between',
            headerClassName,
          )}
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-success-600 dark:text-success-500" />}
            <span className={cn('text-xl font-semibold', titleClassName)}>{title}</span>
            {badge}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {subtitle && (
        <p className="text-sm text-gray-600 dark:text-text-secondary">
          {subtitle}
        </p>
      )}

      {children}
    </div>
  );
};

export default TodaySection;

