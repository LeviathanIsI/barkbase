import { cn } from '@/lib/utils';

/**
 * ScrollableTableContainer - Wrapper for tables with inner scroll and styled scrollbar
 * Use this for data tables that need to scroll within a fixed viewport
 */
export function ScrollableTableContainer({ children, className, style }) {
  return (
    <div
      className={cn(
        'flex-1 min-h-0 overflow-y-scroll overflow-x-auto',
        // Webkit scrollbar (Chrome, Safari, Edge)
        '[&::-webkit-scrollbar]:w-2',
        '[&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800',
        '[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600',
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
