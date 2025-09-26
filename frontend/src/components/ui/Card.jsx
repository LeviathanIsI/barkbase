import { cn } from '@/lib/cn';

const Card = ({ title, description, children, className, header, footer, ...props }) => (
  <div
    className={cn('rounded-xl border border-border bg-surface shadow-surface/40 shadow-sm', className)}
    {...props}
  >
    {(title || description || header) && (
      <div className="border-b border-border/60 px-6 py-4">
        {header ?? (
          <div className="space-y-1">
            {title && <h3 className="text-lg font-semibold text-text">{title}</h3>}
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
        )}
      </div>
    )}
    <div className="px-6 py-4">{children}</div>
    {footer && <div className="border-t border-border/60 px-6 py-3">{footer}</div>}
  </div>
);

export default Card;
