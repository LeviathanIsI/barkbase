import { cn } from '@/lib/cn';

/**
 * SettingsTabs - Consistent tab navigation for settings pages
 */
export const SettingsTabs = ({ children, className }) => (
  <div className={cn('border-b border-border', className)}>
    <nav className="flex gap-6 -mb-px">{children}</nav>
  </div>
);

export const SettingsTab = ({ active, onClick, icon: Icon, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors',
      active
        ? 'border-primary text-primary'
        : 'border-transparent text-muted hover:text-text hover:border-border'
    )}
  >
    {Icon && <Icon className="h-4 w-4" />}
    {children}
  </button>
);

export default SettingsTabs;
