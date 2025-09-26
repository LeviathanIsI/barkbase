import { cn } from '@/lib/cn';

const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-muted/30', className)} aria-hidden="true" />
);

export default Skeleton;
