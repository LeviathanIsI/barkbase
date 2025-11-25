/**
 * SkeletonText - Text line skeleton
 * Simulates text content loading
 */

import { cn } from '@/lib/cn';
import Skeleton from './Skeleton';

const SkeletonText = ({
  lines = 1,
  width = '100%',
  size = 'base',
  className,
}) => {
  const sizeClasses = {
    xs: 'h-3',
    sm: 'h-4',
    base: 'h-5',
    lg: 'h-6',
    xl: 'h-7',
  };

  const lineWidths = ['100%', '90%', '80%', '95%', '85%'];

  return (
    <div className={cn('space-y-[var(--bb-space-2)]', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={sizeClasses[size] || sizeClasses.base}
          width={lines > 1 ? lineWidths[index % lineWidths.length] : width}
          rounded="sm"
        />
      ))}
    </div>
  );
};

export default SkeletonText;

