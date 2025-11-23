// TODO (C1:3 - Directory UX Cleanup): Visual cleanup + consistent directory styling.
const SkeletonBox = ({ className }) => (
  <div className={`animate-pulse rounded bg-gray-200 dark:bg-dark-bg-tertiary ${className}`} />
);

export const DirectoryTableSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, idx) => (
  <div key={idx} className="flex items-center gap-4 rounded-lg border border-gray-200 dark:border-dark-border p-4">
    <SkeletonBox className="h-4 w-full" />
  </div>
    ))}
  </div>
);

export const DirectoryDetailSkeleton = () => (
  <div className="space-y-4">
    <SkeletonBox className="h-8 w-64" />
    <SkeletonBox className="h-4 w-32" />
    <SkeletonBox className="h-6 w-full" />
  </div>
);

export default {
  DirectoryTableSkeleton,
  DirectoryDetailSkeleton,
};

