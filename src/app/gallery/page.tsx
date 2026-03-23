'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useGallery } from '@/hooks/useGallery';
import {
  GalleryFilters,
  GalleryGrid,
  DetailModal,
  EmptyState,
} from '@/components/gallery';
import { MintModal } from '@/components/mint/MintModal';
import { Generation } from '@/types';

export default function GalleryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { items, filter, loading, hasMore, loadMore, changeFilter, refresh } =
    useGallery();

  const [selectedGeneration, setSelectedGeneration] =
    useState<Generation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);

  const handleItemClick = useCallback((generation: Generation) => {
    setSelectedGeneration(generation);
    setShowDetailModal(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetailModal(false);
  }, []);

  const handleMint = useCallback((generation: Generation) => {
    setSelectedGeneration(generation);
    setShowDetailModal(false);
    setShowMintModal(true);
  }, []);

  const handleMintSuccess = useCallback(() => {
    setShowMintModal(false);
    refresh();
  }, [refresh]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">My Gallery</h1>
          <GalleryFilters filter={filter} onChange={changeFilter} />
        </div>

        {/* Content */}
        {items.length === 0 && !loading ? (
          <EmptyState filter={filter} />
        ) : (
          <GalleryGrid
            items={items}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onItemClick={handleItemClick}
          />
        )}
      </motion.div>

      {/* Detail Modal */}
      <DetailModal
        generation={selectedGeneration}
        isOpen={showDetailModal}
        onClose={handleCloseDetail}
        onMint={handleMint}
      />

      {/* Mint Modal */}
      {selectedGeneration && (
        <MintModal
          isOpen={showMintModal}
          onClose={() => setShowMintModal(false)}
          generation={selectedGeneration}
          onSuccess={handleMintSuccess}
        />
      )}
    </div>
  );
}
