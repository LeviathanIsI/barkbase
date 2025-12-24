/**
 * TableEmptyState - Empty state specifically for tables
 * Centered display with optional filter reset action
 */

import { cn } from '@/lib/cn';
import { SearchX } from 'lucide-react';
import Button from '@/components/ui/Button';

const TableEmptyState = ({
  icon: Icon = SearchX,
  title = 'No results found',
  description = 'Try adjusting your search or filters.',
  onReset,
  resetLabel = 'Clear filters',
  colSpan = 1,
  className,
}) => {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div
          className={cn(
            'flex flex-col items-center justify-center py-[var(--bb-space-12)] px-[var(--bb-space-6)]',
            className
          )}
        >
          {Icon && (
            <div className="mb-[var(--bb-space-4)] flex h-12 w-12 items-center justify-center rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-elevated)]">
              <Icon className="h-6 w-6 text-[var(--bb-color-text-muted)]" />
            </div>
          )}
          
          <h4 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-1)]">
            {title}
          </h4>
          
          <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] mb-[var(--bb-space-4)] text-center max-w-sm">
            {description}
          </p>
          
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset}>
              {resetLabel}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default TableEmptyState;

