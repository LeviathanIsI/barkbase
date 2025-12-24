/**
 * TableSkeleton - Full table skeleton loading state
 * Renders a table with skeleton rows for loading states
 */

import { cn } from '@/lib/cn';
import Skeleton from './Skeleton';
import SkeletonTableRow from './SkeletonTableRow';

const TableSkeleton = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  showCheckbox = false,
  showAvatar = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full rounded-lg border overflow-hidden',
        className
      )}
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
    >
      <table className="w-full">
        {showHeader && (
          <thead>
            <tr
              className="border-b"
              style={{
                backgroundColor: 'var(--bb-color-bg-elevated)',
                borderColor: 'var(--bb-color-border-subtle)',
              }}
            >
              {showCheckbox && (
                <th className="px-[var(--bb-space-4)] py-[var(--bb-space-3)] w-12">
                  <Skeleton className="h-4 w-4" rounded="sm" />
                </th>
              )}
              {Array.from({ length: columns }).map((_, index) => (
                <th
                  key={index}
                  className="px-[var(--bb-space-4)] py-[var(--bb-space-3)] text-left"
                >
                  <Skeleton
                    className="h-3"
                    width={index === 0 ? '60%' : '40%'}
                    rounded="sm"
                  />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <SkeletonTableRow
              key={index}
              columns={columns}
              showCheckbox={showCheckbox}
              showAvatar={showAvatar && index < 3} // Only first 3 rows have avatars for variety
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableSkeleton;
