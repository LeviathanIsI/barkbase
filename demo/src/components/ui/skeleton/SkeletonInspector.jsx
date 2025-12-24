/**
 * SkeletonInspector - Inspector/drawer skeleton
 * Shows skeleton for inspector panel loading states
 */

import { cn } from '@/lib/cn';
import Skeleton from './Skeleton';
import SkeletonAvatar from './SkeletonAvatar';
import SkeletonText from './SkeletonText';

const SkeletonInspector = ({
  showHeader = true,
  showAvatar = true,
  sections = 3,
  className,
}) => {
  return (
    <div className={cn('space-y-[var(--bb-space-6)]', className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-start gap-[var(--bb-space-4)] pb-[var(--bb-space-4)] border-b border-[var(--bb-color-border-subtle)]">
          {showAvatar && <SkeletonAvatar size="xl" />}
          <div className="flex-1">
            <Skeleton className="h-6 w-40 mb-[var(--bb-space-2)]" rounded="sm" />
            <Skeleton className="h-4 w-28 mb-[var(--bb-space-3)]" rounded="sm" />
            <div className="flex gap-[var(--bb-space-2)]">
              <Skeleton className="h-6 w-16" rounded="full" />
              <Skeleton className="h-6 w-20" rounded="full" />
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      {Array.from({ length: sections }).map((_, index) => (
        <div key={index} className="space-y-[var(--bb-space-3)]">
          <Skeleton className="h-4 w-24 mb-[var(--bb-space-2)]" rounded="sm" />
          <div className="space-y-[var(--bb-space-3)]">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" rounded="sm" />
                <Skeleton className="h-4 w-32" rounded="sm" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonInspector;

