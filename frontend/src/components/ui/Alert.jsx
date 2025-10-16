import { cn } from '@/lib/cn';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const Alert = ({
  variant = 'info',
  className,
  children,
  title,
  description,
  ...props
}) => {
  const variants = {
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: CheckCircle,
      iconColor: 'text-blue-600',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: XCircle,
      iconColor: 'text-red-600',
    },
    success: {
      container: 'bg-green-50 border-green-200 text-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-600',
    },
  };

  const config = variants[variant] || variants.info;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'border rounded-lg p-4',
        config.container,
        className
      )}
      {...props}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', config.iconColor)} />
        </div>
        <div className="ml-3">
          {title && (
            <h3 className="text-sm font-medium">
              {title}
            </h3>
          )}
          {description && (
            <div className="mt-2 text-sm">
              {description}
            </div>
          )}
          {children && (
            <div className="mt-2 text-sm">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AlertTitle = ({ className, children, ...props }) => (
  <h5
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  >
    {children}
  </h5>
);

const AlertDescription = ({ className, children, ...props }) => (
  <div
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  >
    {children}
  </div>
);

export { Alert, AlertTitle, AlertDescription };
export default Alert;
