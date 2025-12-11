import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * SettingsPage Component
 * Standardized wrapper for settings pages with token-based styling
 */
const SettingsPage = ({
  title,
  description,
  actions,
  children,
  className,
  contentClassName = 'space-y-[var(--bb-space-6,1.5rem)]',
  backLink,
  backLabel,
}) => (
  <div className={cn('space-y-[var(--bb-space-6,1.5rem)]', className)}>
    {(title || description || actions || backLink) && (
      <header
        className="rounded-lg border px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-5,1.25rem)]"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
      >
        {backLink && (
          <Link
            to={backLink}
            className="inline-flex items-center gap-1 text-sm text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel || 'Back'}
          </Link>
        )}
        <div className="flex flex-wrap items-start justify-between gap-[var(--bb-space-4,1rem)]">
          <div>
            {title ? (
              <h1 className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)]">
                {title}
              </h1>
            ) : null}
            {description ? (
              typeof description === 'string' ? (
                <p className="mt-[var(--bb-space-2,0.5rem)] max-w-3xl text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)]">
                  {description}
                </p>
              ) : (
                <div className="mt-[var(--bb-space-2,0.5rem)]">{description}</div>
              )
            ) : null}
          </div>
          {actions && (
            <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">{actions}</div>
          )}
        </div>
      </header>
    )}
    <div className={cn(contentClassName)}>{children}</div>
  </div>
);

export default SettingsPage;
