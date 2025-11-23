const SkeletonBox = ({ className }) => (
  <div className={`animate-pulse rounded bg-gray-200 dark:bg-dark-bg-tertiary ${className}`} />
);

export const TodayHeroSkeleton = () => (
  <div className="flex flex-col gap-4">
    <SkeletonBox className="h-8 w-64" />
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, idx) => (
        <div key={idx} className="rounded-lg border border-gray-200 dark:border-dark-border p-4">
          <SkeletonBox className="h-4 w-20 mb-2" />
          <SkeletonBox className="h-6 w-12" />
        </div>
      ))}
    </div>
  </div>
);

export const TodayListSkeleton = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, idx) => (
      <div key={idx} className="flex items-center gap-4 rounded-lg border border-gray-200 dark:border-dark-border p-4">
        <SkeletonBox className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-4 w-40" />
          <SkeletonBox className="h-3 w-32" />
        </div>
      </div>
    ))}
  </div>
);

export default {
  TodayHeroSkeleton,
  TodayListSkeleton,
};

