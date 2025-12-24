import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/skeleton';

const VARIANT_STYLES = {
  row: 'h-5 w-full',
  rect: 'h-32 w-full',
  avatar: 'h-12 w-12 rounded-full',
  details: 'h-60 w-full',
};

/**
 * Provides a handful of opinionated skeleton presets used across pages.
 */
export default function SkeletonBlock({
  variant = 'row',
  className,
}) {
  return <Skeleton className={cn(VARIANT_STYLES[variant] ?? VARIANT_STYLES.row, className)} />;
}
