/**
 * SkeletonForm - Form field skeleton
 * Shows skeleton for form loading states
 */

import { cn } from '@/lib/cn';
import Skeleton from './Skeleton';

const SkeletonFormField = ({ showLabel = true }) => (
  <div className="space-y-[var(--bb-space-2)]">
    {showLabel && <Skeleton className="h-4 w-24" rounded="sm" />}
    <Skeleton className="h-10 w-full" rounded="md" />
  </div>
);

const SkeletonForm = ({
  fields = 4,
  columns = 1,
  showLabels = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'space-y-[var(--bb-space-6)]',
        columns > 1 && `grid grid-cols-${columns} gap-[var(--bb-space-6)]`,
        className
      )}
      style={columns > 1 ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 'var(--bb-space-6)' } : undefined}
    >
      {Array.from({ length: fields }).map((_, index) => (
        <SkeletonFormField key={index} showLabel={showLabels} />
      ))}
    </div>
  );
};

SkeletonForm.Field = SkeletonFormField;

export default SkeletonForm;

