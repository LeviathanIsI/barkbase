/**
 * ChartContainer - Wrapper for chart library components
 * Handles responsive sizing, padding, and theme adaptation
 */

import { cn } from '@/lib/cn';

const ChartContainer = ({
  children,
  height = 200,
  className,
  aspectRatio,
}) => {
  return (
    <div
      className={cn(
        'w-full',
        className
      )}
      style={{
        height: aspectRatio ? undefined : height,
        aspectRatio: aspectRatio || undefined,
      }}
    >
      {children}
    </div>
  );
};

export default ChartContainer;

