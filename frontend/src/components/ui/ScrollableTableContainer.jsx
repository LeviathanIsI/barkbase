import { cn } from '@/lib/utils';

/**
 * ScrollableTableContainer - Wrapper for tables with inner scroll and styled scrollbar
 * Use this for data tables that need to scroll within a fixed viewport
 *
 * Features:
 * - Premium glassmorphism container (backdrop blur, semi-transparent)
 * - Subtle inner glow for depth
 * - Custom styled scrollbar
 */
export function ScrollableTableContainer({ children, className, variant = 'glass', style }) {
  return (
    <div
      className={cn(
        'flex-1 min-h-0 overflow-y-scroll overflow-x-auto',
        // Premium glass container effect
        variant === 'glass' && [
          'backdrop-blur-[12px]',
          'bg-[var(--bb-glass-bg)]',
          'shadow-[0_4px_24px_rgba(0,0,0,0.06),_inset_0_0_0_1px_rgba(255,255,255,0.08)]',
          'dark:shadow-[0_4px_24px_rgba(0,0,0,0.2),_inset_0_0_0_1px_rgba(255,255,255,0.04)]',
        ],
        // Webkit scrollbar (Chrome, Safari, Edge)
        '[&::-webkit-scrollbar]:w-2',
        '[&::-webkit-scrollbar-track]:bg-slate-100/50 dark:[&::-webkit-scrollbar-track]:bg-slate-800/50',
        '[&::-webkit-scrollbar-thumb]:bg-slate-300/80 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80',
        '[&::-webkit-scrollbar-thumb]:rounded-full',
        '[&::-webkit-scrollbar-thumb:hover]:bg-slate-400 dark:[&::-webkit-scrollbar-thumb:hover]:bg-slate-500',
        // Firefox
        'scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-slate-300 dark:scrollbar-track-slate-800 dark:scrollbar-thumb-slate-600',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export default ScrollableTableContainer;
