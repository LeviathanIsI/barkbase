/**
 * Professional Skeleton Component
 * Loading placeholders with subtle animation
 */

import React from 'react';
import { cn } from '@/lib/utils';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
      {...props}
    />
  );
};

export default Skeleton;
