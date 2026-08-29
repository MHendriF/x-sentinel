import { cn } from '@/lib/utils';

/** Shimmer placeholder block shown while a dataset is still hydrating */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-obsidian-800', className)} />
);
