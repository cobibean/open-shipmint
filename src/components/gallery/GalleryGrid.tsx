'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Generation } from '@/types';
import { GalleryCard } from './GalleryCard';

interface Props {
  items: Generation[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onItemClick: (generation: Generation) => void;
}

export const GalleryGrid = ({
  items,
  loading,
  hasMore,
  onLoadMore,
  onItemClick,
}: Props) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Set up intersection observer for infinite scroll
  const setLoadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (node && hasMore && !loading) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              onLoadMore();
            }
          },
          { threshold: 0.1 }
        );
        observerRef.current.observe(node);
      }

      loadMoreRef.current = node;
    },
    [hasMore, loading, onLoadMore]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((generation) => (
          <GalleryCard
            key={generation.id}
            generation={generation}
            onClick={() => onItemClick(generation)}
          />
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-yellow-500" />
        </div>
      )}

      {/* Intersection observer target for infinite scroll */}
      {hasMore && !loading && <div ref={setLoadMoreRef} className="h-4" />}
    </div>
  );
};
