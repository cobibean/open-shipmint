'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useMint } from '@/hooks/useMint';
import { Generation } from '@/types';
import { Confetti } from './Confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  generation: Generation;
  onSuccess: () => void;
}

export const MintModal = ({ isOpen, onClose, generation, onSuccess }: Props) => {
  const { mint, minting, progress, mintFee } = useMint();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [nftAddress, setNftAddress] = useState<string | null>(null);
  const [refundPending, setRefundPending] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setError(null);
      setSuccess(false);
      setExplorerUrl(null);
      setNftAddress(null);
      setRefundPending(false);
    }
  }, [isOpen]);

  const handleMint = async () => {
    setError(null);

    const result = await mint(generation, title);

    if (result.success) {
      setSuccess(true);
      setExplorerUrl(result.explorerUrl || null);
      setNftAddress(result.nftAddress || null);
    } else {
      setError(result.error || 'Minting failed');
      setRefundPending(result.refundPending || false);
    }
  };

  const handleClose = () => {
    if (success) {
      onSuccess();
    }
    onClose();
  };

  // Prevent closing during minting
  const canClose = !minting;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Confetti on success */}
          {success && <Confetti />}

          {/* Modal container with backdrop - uses flex centering instead of translate */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={canClose ? handleClose : undefined}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-[#1a1a2e] shadow-2xl"
            >
            {/* Close button */}
            {canClose && (
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 z-10 rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {success ? (
              /* Success state */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2, damping: 15 }}
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20"
                >
                  <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-2 text-2xl font-bold"
                >
                  NFT Minted!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6 text-white/60"
                >
                  Your image is now a permanent 1/1 NFT on Solana
                </motion.p>

                {nftAddress && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mb-6 break-all rounded-lg bg-white/5 p-3 font-mono text-xs text-white/40"
                  >
                    {nftAddress}
                  </motion.p>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3"
                >
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-600 py-3 font-medium transition-colors hover:bg-yellow-700"
                    >
                      View on Solscan
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={handleClose}
                    className="w-full rounded-lg bg-white/10 py-3 font-medium transition-colors hover:bg-white/20"
                  >
                    Back to Gallery
                  </button>
                </motion.div>
              </motion.div>
            ) : (
              /* Mint form */
              <div className="flex flex-col">
                {/* Image preview - constrained height */}
                <div className="relative h-48 w-full shrink-0 overflow-hidden bg-black/20">
                  <Image
                    src={generation.ipfsUrl}
                    alt={generation.prompt}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>

                <div className="p-4">
                  <h2 className="mb-1 text-lg font-semibold">Mint as 1/1 NFT</h2>

                  {/* Title input */}
                  <div className="mb-3">
                    <label className="mb-1 block text-sm text-white/60">
                      NFT Title <span className="text-white/40">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title for your NFT..."
                      disabled={minting}
                      maxLength={32}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder-white/30 transition-colors focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Prompt preview */}
                  <div className="mb-3 rounded-lg bg-white/5 p-2">
                    <p className="mb-0.5 text-xs text-white/40">Prompt</p>
                    <p className="line-clamp-2 text-xs text-white/70">
                      {generation.prompt}
                    </p>
                  </div>

                  {/* Fee display */}
                  <div className="mb-4 flex items-center justify-between rounded-lg bg-yellow-500/10 p-3">
                    <span className="text-sm text-white/60">Mint Fee</span>
                    <span className="font-semibold text-yellow-400">{mintFee} SOL</span>
                  </div>

                  {/* Error message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <div className={`rounded-lg p-3 text-center text-sm ${
                          refundPending
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          <p>{error}</p>
                          {refundPending && (
                            <p className="mt-1 text-xs text-white/50">
                              You will receive your SOL back within a few minutes.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Progress message */}
                  <AnimatePresence>
                    {minting && progress && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <p className="text-center text-sm text-yellow-400">
                          {progress}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Mint button */}
                  <button
                    onClick={handleMint}
                    disabled={minting}
                    className={`w-full rounded-lg py-2.5 text-sm font-medium transition-all ${
                      minting
                        ? 'cursor-not-allowed bg-white/10 text-white/50'
                        : 'bg-gradient-to-r from-yellow-600 to-pink-600 hover:from-yellow-500 hover:to-pink-500'
                    }`}
                  >
                    {minting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {progress || 'Minting...'}
                      </span>
                    ) : (
                      `Mint for ${mintFee} SOL`
                    )}
                  </button>
                </div>
              </div>
            )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
