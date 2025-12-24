/**
 * SkeletonAvatar - Avatar/profile image skeleton
 * Circular or rounded avatar placeholder
 */

import { cn } from '@/lib/cn';
import Skeleton from './Skeleton';

const SkeletonAvatar = ({
  size = 'md',
  shape = 'circle',
  className,
}) => {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
    '2xl': 'h-20 w-20',
  };

  return (
    <Skeleton
      className={cn(sizeClasses[size] || sizeClasses.md, className)}
      rounded={shape === 'circle' ? 'full' : 'lg'}
    />
  );
};

export default SkeletonAvatar;

