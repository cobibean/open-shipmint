'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Generation } from '@/types';

interface Props {
  generation: Generation | null;
  isOpen: boolean;
  onClose: () => void;
  onMint?: (generation: Generation) => void;
}

export const DetailModal = ({ generation, isOpen, onClose, onMint }: Props) => {
  const [copied, setCopied] = useState(false);

  const copyPrompt = useCallback(async () => {
    if (!generation) return;

    try {
      await navigator.clipboard.writeText(generation.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [generation]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExplorerUrl = (address: string) => {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta';
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/address/${address}${cluster}`;
  };

  if (!generation) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl md:flex-row"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white/60 backdrop-blur-sm transition-colors hover:text-white"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Image */}
            <div className="relative h-64 w-full shrink-0 bg-black/20 md:h-[70vh] md:w-1/2">
              <Image
                src={generation.ipfsUrl}
                alt={generation.prompt}
                fill
                unoptimized
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
                {generation.isMinted && (
                  <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-green-500/90 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                    <svg
                      className="h-4 w-4"
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
            </div>

            {/* Details */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
              {/* Title */}
              <h2 className="mb-4 text-xl font-semibold text-white">
                {generation.nftTitle || 'Untitled Generation'}
              </h2>

              {/* Prompt */}
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-white/60">
                    Prompt
                  </span>
                  <button
                    onClick={copyPrompt}
                    className="flex items-center gap-1 text-xs text-yellow-400 transition-colors hover:text-yellow-300"
                  >
                    {copied ? (
                      <>
                        <svg
                          className="h-4 w-4"
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
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="rounded-lg bg-white/5 p-3 text-sm text-white/80">
                  {generation.prompt}
                </p>
              </div>

              {/* Metadata */}
              <div className="mb-6 space-y-3">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-sm text-white/60">Model</span>
                  <span className="text-sm text-white">
                    {generation.modelName}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-sm text-white/60">Created</span>
                  <span className="text-sm text-white">
                    {formatDate(generation.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-sm text-white/60">Credits Used</span>
                  <span className="text-sm text-white">
                    {generation.creditCost}
                  </span>
                </div>
                {generation.isMinted && generation.mintedAt && (
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-sm text-white/60">Minted</span>
                    <span className="text-sm text-white">
                      {formatDate(generation.mintedAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-auto flex gap-3">
                {generation.isMinted && generation.nftAddress ? (
                  <a
                    href={getExplorerUrl(generation.nftAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-yellow-600 px-4 py-3 font-medium text-white transition-colors hover:bg-yellow-700"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    View on Explorer
                  </a>
                ) : (
                  <button
                    onClick={() => onMint?.(generation)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-yellow-600 px-4 py-3 font-medium text-white transition-colors hover:bg-yellow-700"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Mint as NFT
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
