/**
 * EmptyState - Premium empty state component
 * Polished, branded experience for empty/zero states
 *
 * Features:
 * - Dual-tone gradient icons with soft glow
 * - Background decorative shapes
 * - Professional yet friendly copy
 * - Prominent CTAs with visual hierarchy
 * - Multiple variants for different contexts
 */

import { cn } from '@/lib/cn';

/**
 * Preset variants for common empty states
 * Each variant has semantic colors and suggested messaging
 */
const presetVariants = {
  // Arrivals - Blue/cyan for incoming
  arrivals: {
    gradient: 'from-blue-500 to-cyan-400',
    bgGlow: 'bg-blue-500/20 dark:bg-blue-400/15',
    bgSoft: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30',
    accentDot: 'bg-cyan-400',
  },
  // Departures - Violet/purple for outgoing
  departures: {
    gradient: 'from-violet-500 to-purple-400',
    bgGlow: 'bg-violet-500/20 dark:bg-violet-400/15',
    bgSoft: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30',
    accentDot: 'bg-purple-400',
  },
  // Success - Green for completed states
  success: {
    gradient: 'from-emerald-500 to-green-400',
    bgGlow: 'bg-emerald-500/20 dark:bg-emerald-400/15',
    bgSoft: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30',
    accentDot: 'bg-green-400',
  },
  // Tasks - Amber/orange for todos
  tasks: {
    gradient: 'from-amber-500 to-orange-400',
    bgGlow: 'bg-amber-500/20 dark:bg-amber-400/15',
    bgSoft: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
    accentDot: 'bg-orange-400',
  },
  // Messages - Indigo for communication
  messages: {
    gradient: 'from-indigo-500 to-blue-400',
    bgGlow: 'bg-indigo-500/20 dark:bg-indigo-400/15',
    bgSoft: 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30',
    accentDot: 'bg-blue-400',
  },
  // Neutral - Gray for generic empty states
  neutral: {
    gradient: 'from-slate-500 to-gray-400',
    bgGlow: 'bg-slate-500/15 dark:bg-slate-400/10',
    bgSoft: 'bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30',
    accentDot: 'bg-gray-400',
  },
  // Search - For no search results
  search: {
    gradient: 'from-slate-400 to-slate-500',
    bgGlow: 'bg-slate-500/15 dark:bg-slate-400/10',
    bgSoft: 'bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-950/30 dark:to-gray-900/30',
    accentDot: 'bg-slate-400',
  },
};

/**
 * Premium Empty State Component
 *
 * @param {Object} props
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {string} props.title - Main headline
 * @param {string} props.description - Supporting text
 * @param {React.ReactNode} props.actions - CTA buttons
 * @param {string} props.variant - Preset variant (arrivals, departures, success, tasks, messages, neutral, search)
 * @param {boolean} props.compact - Use compact sizing for cards
 * @param {boolean} props.showDecorations - Show background decorative elements
 * @param {React.ComponentType} props.accentIcon - Small accent icon (optional)
 * @param {string} props.className - Additional classes
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  actions,
  variant = 'neutral',
  compact = false,
  showDecorations = true,
  accentIcon: AccentIcon,
  className,
}) => {
  const styles = presetVariants[variant] || presetVariants.neutral;

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'rounded-2xl',
        compact
          ? 'px-[var(--bb-space-4)] py-[var(--bb-space-6)]'
          : 'px-[var(--bb-space-6)] py-[var(--bb-space-10)]',
        'flex flex-col items-center justify-center text-center',
        className
      )}
    >
      {/* Background decorative elements */}
      {showDecorations && (
        <>
          {/* Soft gradient background */}
          <div
            className={cn(
              'absolute inset-0 opacity-50',
              styles.bgSoft
            )}
            aria-hidden="true"
          />

          {/* Decorative circles */}
          <div
            className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-30 blur-3xl"
            style={{ background: `radial-gradient(circle, var(--bb-color-accent-soft) 0%, transparent 70%)` }}
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full opacity-20 blur-2xl"
            style={{ background: `radial-gradient(circle, var(--bb-color-accent-soft) 0%, transparent 70%)` }}
            aria-hidden="true"
          />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Icon container with glow */}
      {Icon && (
        <div className={cn('relative', compact ? 'mb-3' : 'mb-5')}>
          {/* Glow effect behind icon */}
          <div
            className={cn(
              'absolute inset-0 rounded-2xl blur-xl scale-150',
              styles.bgGlow
            )}
            aria-hidden="true"
          />

          {/* Icon background with gradient */}
          <div
            className={cn(
              'relative flex items-center justify-center rounded-2xl',
              'bg-gradient-to-br shadow-lg',
              styles.gradient,
              compact ? 'h-14 w-14' : 'h-20 w-20'
            )}
          >
            <Icon
              className={cn(
                'text-white drop-shadow-sm',
                compact ? 'h-7 w-7' : 'h-10 w-10'
              )}
              strokeWidth={1.75}
            />
          </div>

          {/* Accent icon (optional) */}
          {AccentIcon && (
            <div
              className={cn(
                'absolute -top-1 -right-1 flex items-center justify-center',
                'rounded-full bg-white dark:bg-gray-900 shadow-md',
                compact ? 'h-6 w-6' : 'h-8 w-8'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center rounded-full',
                  styles.accentDot,
                  compact ? 'h-5 w-5' : 'h-6 w-6'
                )}
              >
                <AccentIcon
                  className={cn('text-white', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')}
                  strokeWidth={2.5}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {title && (
          <h3
            className={cn(
              'font-semibold text-[color:var(--bb-color-text-primary)]',
              'leading-tight',
              compact
                ? 'text-[var(--bb-font-size-base)]'
                : 'text-[var(--bb-font-size-lg)]'
            )}
          >
            {title}
          </h3>
        )}

        {description && (
          <p
            className={cn(
              'text-[color:var(--bb-color-text-muted)]',
              'max-w-xs mx-auto',
              compact
                ? 'text-[var(--bb-font-size-sm)] mt-1'
                : 'text-[var(--bb-font-size-sm)] mt-2 leading-relaxed'
            )}
          >
            {description}
          </p>
        )}

        {actions && (
          <div
            className={cn(
              'flex items-center justify-center gap-3',
              compact ? 'mt-4' : 'mt-6'
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Inline Empty State - Compact version for small spaces
 * Used in cards, sidebars, and compact lists
 */
export const InlineEmpty = ({
  icon: Icon,
  message,
  action,
  variant = 'neutral',
  className,
}) => {
  const styles = presetVariants[variant] || presetVariants.neutral;

  return (
    <div
      className={cn(
        'flex items-center gap-[var(--bb-space-3)]',
        'px-[var(--bb-space-4)] py-[var(--bb-space-4)]',
        'rounded-xl',
        styles.bgSoft,
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            'bg-gradient-to-br shadow-sm',
            styles.gradient
          )}
        >
          <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-[var(--bb-font-size-sm)] text-[color:var(--bb-color-text-primary)] font-medium">
          {message}
        </span>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

/**
 * Table Empty State - For use inside tables
 * Wraps EmptyState in proper table structure
 */
export const TableEmptyState = ({
  icon,
  title = 'No results found',
  description = 'Try adjusting your search or filters.',
  onReset,
  resetLabel = 'Clear filters',
  variant = 'search',
  colSpan = 1,
  className,
}) => {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          variant={variant}
          compact
          showDecorations={false}
          actions={
            onReset && (
              <button
                onClick={onReset}
                className={cn(
                  'text-[var(--bb-font-size-sm)] font-medium',
                  'text-[color:var(--bb-color-accent)]',
                  'hover:underline transition-colors'
                )}
              >
                {resetLabel}
              </button>
            )
          }
          className={className}
        />
      </td>
    </tr>
  );
};

export default EmptyState;
