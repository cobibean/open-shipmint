'use client';

import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

export const Skeleton = ({ className }: Props) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-white/10',
        className
      )}
    />
  );
};

export const ImageSkeleton = ({ className }: Props) => {
  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      <Skeleton className="aspect-square w-full" />
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <Skeleton className="mb-4 aspect-square w-full" />
      <Skeleton className="mb-2 h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
};

export const GallerySkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ImageSkeleton key={i} />
      ))}
    </div>
  );
};

export const TextSkeleton = ({ className }: Props) => {
  return <Skeleton className={cn('h-4 w-full', className)} />;
};

export const ButtonSkeleton = ({ className }: Props) => {
  return <Skeleton className={cn('h-10 w-24', className)} />;
};
