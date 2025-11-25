/**
 * Skeleton - Base skeleton loading component
 * Uses token-based styling with pulse animation
 */

import { cn } from '@/lib/cn';

const Skeleton = ({
  width,
  height,
  rounded = 'md',
  className,
  ...props
}) => {
  const roundedClass = {
    none: 'rounded-none',
    sm: 'rounded-[var(--bb-radius-sm)]',
    md: 'rounded-[var(--bb-radius-md)]',
    lg: 'rounded-[var(--bb-radius-lg)]',
    xl: 'rounded-[var(--bb-radius-xl)]',
    full: 'rounded-full',
  };

  return (
    <div
      className={cn(
        'bb-skeleton-pulse bg-[var(--bb-color-skeleton-base)]',
        roundedClass[rounded] || roundedClass.md,
        className
      )}
      style={{
        width: width,
        height: height,
      }}
      {...props}
    />
  );
};

export default Skeleton;

