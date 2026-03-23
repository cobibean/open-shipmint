'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Generation, GenerationStatus } from '@/types';

interface Props {
  status: GenerationStatus;
  generation: Generation | null;
  error: string | null;
  onMint?: () => void;
}

export const ImageDisplay = ({ status, generation, error, onMint }: Props) => {
  return (
    <div className="relative aspect-square w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full items-center justify-center text-white/40"
          >
            <div className="text-center">
              <svg
                className="mx-auto mb-4 h-16 w-16 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p>Enter a prompt to generate an image</p>
            </div>
          </motion.div>
        )}

        {status === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full flex-col items-center justify-center"
          >
            <div className="relative">
              {/* Pulsing gradient background */}
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-yellow-500 to-pink-500 opacity-20 blur-xl" />
              <div className="relative h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-yellow-500" />
            </div>
            <p className="mt-6 text-white/60">Creating your image...</p>
            <p className="mt-2 text-sm text-white/40">This may take 10-30 seconds</p>
          </motion.div>
        )}

        {status === 'complete' && generation && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generation.ipfsUrl}
              alt={generation.prompt}
              className="h-full w-full object-cover"
            />
            {/* Overlay with mint button */}
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent p-6 opacity-0 transition-opacity hover:opacity-100">
              <button
                onClick={onMint}
                className="rounded-lg bg-yellow-600 px-6 py-3 font-medium transition-colors hover:bg-yellow-700"
              >
                Mint as 1/1 NFT
              </button>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full flex-col items-center justify-center text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <svg
                className="h-8 w-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="mb-2 font-medium text-red-400">Generation Failed</p>
            <p className="text-sm text-white/60">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
