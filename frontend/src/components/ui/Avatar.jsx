/**
 * Professional Avatar Component
 * User/pet profile images with fallback initials
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

const Avatar = React.forwardRef(({ className, src, alt, fallback, size = 'md', ...props }, ref) => {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const [imageError, setImageError] = React.useState(false);

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-surface-secondary',
        sizes[size],
        className
      )}
      {...props}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="aspect-square h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : fallback ? (
        <div className="flex h-full w-full items-center justify-center bg-primary-100 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 font-medium">
          {fallback}
        </div>
      ) : (
        <User className="h-full w-full p-2 text-gray-400 dark:text-text-tertiary" />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
