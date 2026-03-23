'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Generation } from '@/types';

interface Props {
  generation: Generation;
  onClick: () => void;
}

export const GalleryCard = ({ generation, onClick }: Props) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Truncate prompt for hover display
  const truncatedPrompt =
    generation.prompt.length > 80
      ? generation.prompt.slice(0, 80) + '...'
      : generation.prompt;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/5"
    >
      {/* Loading skeleton */}
      {!imageLoaded && (
        <div className="absolute inset-0 animate-pulse bg-white/10" />
      )}

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={generation.ipfsUrl}
        alt={generation.prompt}
        onLoad={() => setImageLoaded(true)}
        className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Minted badge */}
      {generation.isMinted && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Minted
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <p className="text-sm text-white/90">{truncatedPrompt}</p>
        <p className="mt-1 text-xs text-white/60">{generation.modelName}</p>
      </div>
    </motion.div>
  );
};
