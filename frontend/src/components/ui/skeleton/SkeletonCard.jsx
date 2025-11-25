/**
 * SkeletonCard - Card skeleton with common patterns
 * Supports different card layouts
 */

import { cn } from '@/lib/cn';
import Skeleton from './Skeleton';
import SkeletonText from './SkeletonText';
import SkeletonAvatar from './SkeletonAvatar';

const SkeletonCard = ({
  variant = 'default',
  showAvatar = false,
  showImage = false,
  lines = 2,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-[var(--bb-radius-xl)] border border-[var(--bb-color-border-subtle)]',
        'bg-[var(--bb-color-bg-surface)] p-[var(--bb-space-4)]',
        className
      )}
    >
      {showImage && (
        <Skeleton
          className="w-full h-32 mb-[var(--bb-space-4)]"
          rounded="lg"
        />
      )}

      {variant === 'profile' && (
        <div className="flex items-start gap-[var(--bb-space-4)]">
          <SkeletonAvatar size="lg" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-[var(--bb-space-2)]" rounded="sm" />
            <Skeleton className="h-4 w-24" rounded="sm" />
          </div>
        </div>
      )}

      {variant === 'stat' && (
        <div>
          <Skeleton className="h-4 w-20 mb-[var(--bb-space-3)]" rounded="sm" />
          <Skeleton className="h-8 w-28 mb-[var(--bb-space-2)]" rounded="sm" />
          <Skeleton className="h-3 w-16" rounded="sm" />
        </div>
      )}

      {variant === 'default' && (
        <>
          {showAvatar && (
            <div className="flex items-center gap-[var(--bb-space-3)] mb-[var(--bb-space-4)]">
              <SkeletonAvatar size="sm" />
              <Skeleton className="h-4 w-24" rounded="sm" />
            </div>
          )}
          <Skeleton className="h-5 w-3/4 mb-[var(--bb-space-3)]" rounded="sm" />
          <SkeletonText lines={lines} size="sm" />
        </>
      )}

      {variant === 'list-item' && (
        <div className="flex items-center gap-[var(--bb-space-4)]">
          {showAvatar && <SkeletonAvatar size="md" />}
          <div className="flex-1">
            <Skeleton className="h-4 w-40 mb-[var(--bb-space-2)]" rounded="sm" />
            <Skeleton className="h-3 w-24" rounded="sm" />
          </div>
          <Skeleton className="h-8 w-20" rounded="md" />
        </div>
      )}
    </div>
  );
};

export default SkeletonCard;

