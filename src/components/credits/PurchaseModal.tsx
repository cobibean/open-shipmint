'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';
import { Tooltip, tooltips } from '@/components/help/Tooltip';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseModal = ({ isOpen, onClose }: Props) => {
  const { packs, solPrice, loading, purchasing, fetchPacks, purchasePack } = useCredits();
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Debug: Log when isOpen changes
  console.log('[PurchaseModal] render', { isOpen });

  useEffect(() => {
    if (isOpen) {
      fetchPacks();
      setSelectedPack(null);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, fetchPacks]);

  const handlePurchase = async () => {
    if (!selectedPack) return;

    setError(null);
    const result = await purchasePack(selectedPack);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setError(result.error || 'Purchase failed');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-xl bg-[#1a1a2e] p-6 shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1 text-white/50 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold flex items-center gap-2">
                Buy Credits
                <Tooltip content={tooltips.credits} />
              </h2>
              <p className="text-sm text-white/60">
                SOL Price: ${solPrice.toFixed(2)} • Credits never expire
              </p>
            </div>

            {success ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center py-8"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                  <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-medium">Purchase Complete!</p>
              </motion.div>
            ) : (
              <>
                {/* Pack selection */}
                <div className="mb-6 space-y-3">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
                    </div>
                  ) : (
                    packs.map((pack) => (
                      <button
                        key={pack.id}
                        onClick={() => setSelectedPack(pack.id)}
                        className={cn(
                          'w-full rounded-lg border p-4 text-left transition-colors',
                          selectedPack === pack.id
                            ? 'border-yellow-500 bg-yellow-500/10'
                            : 'border-white/10 hover:border-white/20'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{pack.name}</p>
                            <p className="text-sm text-white/60">{pack.credits} credits</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{pack.solPrice.toFixed(4)} SOL</p>
                            <p className="text-sm text-white/60">${pack.usdPrice}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {error && (
                  <p className="mb-4 text-center text-sm text-red-400">{error}</p>
                )}

                {/* Purchase button */}
                <button
                  onClick={handlePurchase}
                  disabled={!selectedPack || purchasing}
                  className={cn(
                    'w-full rounded-lg py-3 font-medium transition-colors',
                    selectedPack && !purchasing
                      ? 'bg-yellow-600 hover:bg-yellow-700'
                      : 'cursor-not-allowed bg-white/10 text-white/50'
                  )}
                >
                  {purchasing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Processing...
                    </span>
                  ) : (
                    'Purchase'
                  )}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
