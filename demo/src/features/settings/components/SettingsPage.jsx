import { cn } from '@/lib/cn';

/**
 * SettingsPage Component
 * Standardized wrapper for settings pages with consistent layout
 */
const SettingsPage = ({
  title,
  description,
  actions,
  children,
  className,
  maxWidth = true, // Constrain form width for readability
}) => (
  <div className={cn('space-y-6', maxWidth && 'max-w-4xl', className)}>
    {/* Header */}
    {(title || description || actions) && (
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {title && (
            <h1 className="text-xl font-semibold text-text">{title}</h1>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>
        )}
      </header>
    )}
    {/* Content */}
    <div className="space-y-6">{children}</div>
  </div>
);

export default SettingsPage;
