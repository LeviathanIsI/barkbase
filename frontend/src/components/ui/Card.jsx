import { cn } from '@/lib/cn';

/**
 * Jumbo-inspired Card Component
 * White background with subtle shadow and rounded corners
 */
export const Card = ({
  children,
  title,
  description,
  className,
  gradient,
  hover = false,
  padding = 'default',
  ...props
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
  };

  const gradientClasses = {
    purple: 'bg-gradient-to-r from-[#9C27B0] to-[#BA68C8] text-white',
    blue: 'bg-gradient-to-r from-[#4B5DD3] to-[#3A4BC2] text-white',
    cyan: 'bg-gradient-to-r from-[#03A9F4] to-[#4FC3F7] text-white',
    teal: 'bg-gradient-to-r from-[#009688] to-[#4DB6AC] text-white',
    green: 'bg-gradient-to-r from-[#4CAF50] to-[#81C784] text-white',
    yellow: 'bg-gradient-to-r from-[#FFC107] to-[#FFD54F] text-white',
    orange: 'bg-gradient-to-r from-[#FF9800] to-[#FFB74D] text-white',
    red: 'bg-gradient-to-r from-[#F44336] to-[#EF5350] text-white',
    pink: 'bg-gradient-to-r from-[#E91E63] to-[#F06292] text-white',
    indigo: 'bg-gradient-to-r from-[#4B5DD3] to-[#7986CB] text-white',
  };

  return (
    <div
      className={cn(
        'rounded-lg bg-white border-0 shadow-sm',
        'transition-all duration-200',
        paddingClasses[padding],
        hover && 'hover:shadow-lg hover:-translate-y-1 cursor-pointer',
        gradient && gradientClasses[gradient],
        !gradient && 'bg-white',
        className
      )}
      {...props}
    >
      {(title || description) && (
        <div className="mb-6">
          {title && <h3 className={cn('text-xl font-semibold text-[#263238]', gradient ? 'text-white' : 'text-[#263238]')}>{title}</h3>}
          {description && <p className={cn('text-sm mt-2 text-[#64748B]', gradient ? 'text-white/80' : 'text-[#64748B]')}>{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className, ...props }) => (
  <div
    className={cn('flex items-center justify-between mb-4', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }) => (
  <h3
    className={cn('text-lg font-semibold text-text', className)}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription = ({ children, className, ...props }) => (
  <p
    className={cn('text-sm text-muted mt-1', className)}
    {...props}
  >
    {children}
  </p>
);

export const CardContent = ({ children, className, ...props }) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className, ...props }) => (
  <div
    className={cn('mt-4 pt-4 border-t border-border/60', className)}
    {...props}
  >
    {children}
  </div>
);

/**
 * Metric Card - For metrics/KPIs like in Jumbo with gradient area charts
 */
export const MetricCard = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  gradient = 'blue',
  chart,
  className,
}) => {
  const gradientClasses = {
    blue: 'bg-gradient-to-r from-[#4B5DD3] to-[#3A4BC2]',
    orange: 'bg-gradient-to-r from-[#FF9800] to-[#FFB74D]',
    purple: 'bg-gradient-to-r from-[#9C27B0] to-[#BA68C8]',
    green: 'bg-gradient-to-r from-[#4CAF50] to-[#81C784]',
    red: 'bg-gradient-to-r from-[#F44336] to-[#EF5350]',
    gray: 'bg-gradient-to-r from-[#78909C] to-[#90A4AE]',
  };

  const chartGradientClasses = {
    blue: 'chart-gradient-blue',
    orange: 'chart-gradient-orange',
    purple: 'chart-gradient-purple',
    green: 'chart-gradient-green',
    red: 'chart-gradient-red',
    gray: 'chart-gradient-gray',
  };

  return (
    <Card className={cn('relative overflow-hidden bg-white', className)}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#64748B]">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <h3 className="text-3xl font-bold text-[#263238]">{value}</h3>
            {trend && (
              <span className={cn(
                'text-sm font-medium',
                trend.includes('+') ? 'text-[#4CAF50]' : 'text-[#F44336]'
              )}>
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[#64748B] mt-1">{subtitle}</p>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            gradientClasses[gradient]
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="h-24">
        {chart ? (
          chart
        ) : (
          <div className={cn('w-full h-full rounded', chartGradientClasses[gradient])} />
        )}
      </div>
    </Card>
  );
};

/**
 * Page Header Component - Breadcrumb navigation and page title
 */
export const PageHeader = ({ title, breadcrumb, actions, className }) => {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumb && (
        <div className="text-sm text-[#64748B] mb-2">
          {breadcrumb}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-[#263238]">{title}</h1>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
