/**
 * DirectorySkeleton - Skeleton components for directory pages
 * Uses unified skeleton system with design tokens
 */

import { Skeleton, SkeletonAvatar, SkeletonCard, SkeletonText } from '@/components/ui/skeleton';

export const DirectoryTableSkeleton = ({ rows = 5 }) => (
  <div 
    className="rounded-[var(--bb-radius-xl)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] overflow-hidden"
  >
    {/* Header */}
    <div className="border-b border-[var(--bb-color-border-subtle)] px-[var(--bb-space-6)] py-[var(--bb-space-4)]">
      <div className="flex items-center gap-[var(--bb-space-6)]">
        <Skeleton className="h-4 w-32" rounded="sm" />
        <Skeleton className="h-4 w-24" rounded="sm" />
        <Skeleton className="h-4 w-20" rounded="sm" />
        <Skeleton className="h-4 w-28" rounded="sm" />
      </div>
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, idx) => (
      <div 
        key={idx} 
        className="flex items-center gap-[var(--bb-space-4)] px-[var(--bb-space-6)] py-[var(--bb-space-4)] border-b border-[var(--bb-color-border-subtle)] last:border-b-0"
      >
        <SkeletonAvatar size="sm" />
        <div className="flex-1 space-y-[var(--bb-space-2)]">
          <Skeleton className="h-4 w-40" rounded="sm" />
          <Skeleton className="h-3 w-24" rounded="sm" />
        </div>
        <Skeleton className="h-4 w-20" rounded="sm" />
        <Skeleton className="h-6 w-16" rounded="full" />
        <Skeleton className="h-8 w-16" rounded="md" />
      </div>
    ))}
  </div>
);

export const DirectoryDetailSkeleton = () => (
  <div className="space-y-[var(--bb-space-6)]">
    {/* Header */}
    <div className="flex items-start gap-[var(--bb-space-6)]">
      <SkeletonAvatar size="xl" />
      <div className="flex-1 space-y-[var(--bb-space-3)]">
        <Skeleton className="h-8 w-48" rounded="sm" />
        <Skeleton className="h-4 w-32" rounded="sm" />
        <div className="flex gap-[var(--bb-space-2)]">
          <Skeleton className="h-6 w-20" rounded="full" />
          <Skeleton className="h-6 w-24" rounded="full" />
        </div>
      </div>
    </div>
    
    {/* Content sections */}
    <div className="grid gap-[var(--bb-space-6)] md:grid-cols-2">
      <SkeletonCard lines={4} />
      <SkeletonCard lines={4} />
    </div>
  </div>
);

export const DirectoryCardSkeleton = ({ count = 6 }) => (
  <div className="grid gap-[var(--bb-space-4)] md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, idx) => (
      <SkeletonCard key={idx} showAvatar lines={2} />
    ))}
  </div>
);

export default {
  DirectoryTableSkeleton,
  DirectoryDetailSkeleton,
  DirectoryCardSkeleton,
};

