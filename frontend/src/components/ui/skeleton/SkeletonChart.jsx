/**
 * SkeletonChart - Chart placeholder skeleton
 * Shows a pulsing rectangle for chart loading states
 */

import { cn } from '@/lib/cn';
import Skeleton from './Skeleton';

const SkeletonChart = ({
  height = 240,
  showHeader = true,
  showLegend = false,
  className,
}) => {
  return (
    <div className={cn('space-y-[var(--bb-space-4)]', className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-32 mb-[var(--bb-space-2)]" rounded="sm" />
            <Skeleton className="h-4 w-48" rounded="sm" />
          </div>
          <Skeleton className="h-8 w-24" rounded="md" />
        </div>
      )}
      
      <Skeleton
        className="w-full"
        height={height}
        rounded="lg"
      />
      
      {showLegend && (
        <div className="flex items-center justify-center gap-[var(--bb-space-6)]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-[var(--bb-space-2)]">
              <Skeleton className="h-3 w-3" rounded="full" />
              <Skeleton className="h-3 w-16" rounded="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SkeletonChart;

