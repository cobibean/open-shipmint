'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';
import { useAppStore } from '@/stores/appStore';
import { Generation, GalleryFilter } from '@/types';

interface GalleryResponse {
  items: Generation[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function useGallery() {
  const authFetch = useAuthenticatedFetch();
  const {
    galleryItems,
    galleryFilter,
    galleryLoading,
    galleryHasMore,
    galleryCursor,
    setGalleryItems,
    appendGalleryItems,
    setGalleryFilter,
    setGalleryLoading,
    setGalleryPagination,
    isAuthenticated,
  } = useAppStore();

  const isInitialMount = useRef(true);

  // Fetch gallery items
  const fetchGallery = useCallback(
    async (reset: boolean = false) => {
      if (!isAuthenticated) return;
      if (galleryLoading) return;

      setGalleryLoading(true);

      try {
        const cursor = reset ? null : galleryCursor;
        const params = new URLSearchParams();
        params.set('filter', galleryFilter);
        if (cursor) {
          params.set('cursor', cursor);
        }

        const response = await authFetch(`/api/gallery?${params.toString()}`);
        const data: GalleryResponse = await response.json();

        if (!response.ok) {
          throw new Error('Failed to fetch gallery');
        }

        if (reset) {
          setGalleryItems(data.items);
        } else {
          appendGalleryItems(data.items);
        }

        setGalleryPagination(data.hasMore, data.nextCursor);
      } catch (error) {
        console.error('Gallery fetch error:', error);
      } finally {
        setGalleryLoading(false);
      }
    },
    [
      isAuthenticated,
      galleryLoading,
      galleryCursor,
      galleryFilter,
      authFetch,
      setGalleryItems,
      appendGalleryItems,
      setGalleryLoading,
      setGalleryPagination,
    ]
  );

  // Load more items (for infinite scroll)
  const loadMore = useCallback(() => {
    if (galleryHasMore && !galleryLoading) {
      fetchGallery(false);
    }
  }, [galleryHasMore, galleryLoading, fetchGallery]);

  // Change filter
  const changeFilter = useCallback(
    (filter: GalleryFilter) => {
      if (filter !== galleryFilter) {
        setGalleryFilter(filter);
      }
    },
    [galleryFilter, setGalleryFilter]
  );

  // Refresh gallery (reset and fetch)
  const refresh = useCallback(() => {
    setGalleryItems([]);
    setGalleryPagination(true, null);
    // Fetch will happen via effect
  }, [setGalleryItems, setGalleryPagination]);

  // Initial load and filter change effect
  useEffect(() => {
    if (!isAuthenticated) return;

    // Skip the first mount to avoid double fetch
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchGallery(true);
      return;
    }

    // Fetch when filter changes
    fetchGallery(true);
  }, [galleryFilter, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    items: galleryItems,
    filter: galleryFilter,
    loading: galleryLoading,
    hasMore: galleryHasMore,
    loadMore,
    changeFilter,
    refresh,
  };
}
