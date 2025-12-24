import { cn } from '@/lib/cn';

const DashboardLayout = ({ title, description, actions, children, className }) => (
  <section className={cn('space-y-6', className)}>
    {(title || description || actions) && (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {title && <h2 className="text-2xl font-semibold text-text dark:text-text-primary">{title}</h2>}
          {description && <p className="text-sm text-muted dark:text-text-secondary">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    )}
    <div className="space-y-6">{children}</div>
  </section>
);

export default DashboardLayout;
