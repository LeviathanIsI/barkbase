/**
 * SkeletonTableRow - Table row skeleton
 * Renders skeleton cells for table loading states
 */

import { cn } from '@/lib/cn';
import Skeleton from './Skeleton';
import SkeletonAvatar from './SkeletonAvatar';

const SkeletonTableRow = ({
  columns = 4,
  showAvatar = false,
  showCheckbox = false,
  className,
}) => {
  return (
    <tr className={cn('border-b border-[var(--bb-color-border-subtle)]', className)}>
      {showCheckbox && (
        <td className="px-[var(--bb-space-4)] py-[var(--bb-space-3)]">
          <Skeleton className="h-4 w-4" rounded="sm" />
        </td>
      )}
      
      {showAvatar && (
        <td className="px-[var(--bb-space-4)] py-[var(--bb-space-3)]">
          <div className="flex items-center gap-[var(--bb-space-3)]">
            <SkeletonAvatar size="sm" />
            <div>
              <Skeleton className="h-4 w-28 mb-[var(--bb-space-1)]" rounded="sm" />
              <Skeleton className="h-3 w-20" rounded="sm" />
            </div>
          </div>
        </td>
      )}
      
      {Array.from({ length: showAvatar ? columns - 1 : columns }).map((_, index) => (
        <td key={index} className="px-[var(--bb-space-4)] py-[var(--bb-space-3)]">
          <Skeleton
            className="h-4"
            width={index === 0 ? '80%' : index % 2 === 0 ? '60%' : '40%'}
            rounded="sm"
          />
        </td>
      ))}
    </tr>
  );
};

export default SkeletonTableRow;

