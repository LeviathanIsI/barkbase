import { cn } from '@/lib/cn';

/**
 * Responsive CSS grid wrapper for detail sections.
 * Defaults to two columns and collapses to one on smaller breakpoints.
 */
export default function DetailsGrid({
  children,
  columns = 2,
  gap = 'gap-6',
  dense = false,
  className,
  as: Component = 'div',
}) {
  const columnClass =
    columns === 3
      ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2';

  return (
    <Component
      className={cn(
        'grid',
        columnClass,
        dense ? 'gap-4' : gap,
        className,
      )}
    >
      {children}
    </Component>
  );
}
