import { cn } from '@/lib/cn';

const SettingsPage = ({
  title,
  description,
  actions,
  children,
  className,
  contentClassName = 'space-y-6',
}) => (
  <div className={cn('space-y-8', className)}>
    {(title || description || actions) && (
      <header className="rounded-2xl border border-border/70 bg-surface px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {title ? <h1 className="text-3xl font-semibold text-text">{title}</h1> : null}
            {description ? <p className="mt-2 max-w-3xl text-sm text-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      </header>
    )}
    <div className={cn(contentClassName)}>{children}</div>
  </div>
);

export default SettingsPage;
