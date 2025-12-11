import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumbs Component
 *
 * Displays a non-clickable breadcrumb trail showing the current location in the nav hierarchy.
 *
 * @param {Object} props
 * @param {string[]} props.items - Array of breadcrumb labels (e.g., ['Operations', 'Bookings'])
 *
 * @example
 * <Breadcrumbs items={['Operations', 'Bookings']} />
 * // Renders: Operations › Bookings
 */
const Breadcrumbs = ({ items = [] }) => {
  if (!items.length) return null;

  return (
    <nav className="mb-2">
      <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3 w-3" />}
            <span
              className={
                index === items.length - 1
                  ? 'text-[color:var(--bb-color-text-primary)] font-medium'
                  : ''
              }
            >
              {item}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
