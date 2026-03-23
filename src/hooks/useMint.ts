'use client';

/**
 * useMint Hook - Pay-First Minting Flow
 *
 * Flow:
 * 1. Initiate mint request (get payment instructions)
 * 2. User pays the mint fee
 * 3. Verify payment and trigger minting
 * 4. Poll for completion if needed
 *
 * If minting fails after payment, a refund is automatically processed.
 */

import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';
import { useAppStore } from '@/stores/appStore';
import { Generation } from '@/types';
import { MINT_FEE_SOL } from '@/lib/constants';

interface MintResult {
  success: boolean;
  nftAddress?: string;
  txSignature?: string;
  explorerUrl?: string;
  error?: string;
  refundPending?: boolean;
}

export type MintProgress =
  | 'idle'
  | 'initiating'
  | 'awaiting_payment'
  | 'confirming_payment'
  | 'verifying'
  | 'minting'
  | 'completed'
  | 'failed';

const PROGRESS_MESSAGES: Record<MintProgress, string> = {
  idle: '',
  initiating: 'Preparing mint request...',
  awaiting_payment: 'Please approve the payment...',
  confirming_payment: 'Confirming payment...',
  verifying: 'Verifying payment...',
  minting: 'Minting your NFT...',
  completed: 'Mint complete!',
  failed: 'Minting failed',
};

export function useMint() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const authFetch = useAuthenticatedFetch();
  const { updateGenerationMintStatus } = useAppStore();

  const [minting, setMinting] = useState(false);
  const [progressStep, setProgressStep] = useState<MintProgress>('idle');
  const [progress, setProgress] = useState<string>('');

  const updateProgress = useCallback((step: MintProgress) => {
    setProgressStep(step);
    setProgress(PROGRESS_MESSAGES[step]);
  }, []);

  /**
   * Poll for mint completion when minting is in progress
   */
  const pollForCompletion = useCallback(
    async (
      mintRequestId: string,
      generation: Generation,
      paymentSignature: string
    ): Promise<MintResult> => {
      const maxAttempts = 60; // 1 minute total (1 second per poll)
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;

        try {
          const statusRes = await authFetch(`/api/mint/status/${mintRequestId}`);
          if (!statusRes.ok) {
            continue;
          }

          const statusData = await statusRes.json();

          if (statusData.status === 'completed') {
            updateProgress('completed');
            updateGenerationMintStatus(
              generation.id,
              statusData.nftAddress,
              paymentSignature
            );

            return {
              success: true,
              nftAddress: statusData.nftAddress,
              txSignature: paymentSignature,
              explorerUrl: statusData.explorerUrl,
            };
          }

          if (statusData.status === 'refunded') {
            return {
              success: false,
              error: 'Minting failed. Your payment has been refunded.',
              refundPending: false,
            };
          }

          if (statusData.status === 'refund_pending') {
            return {
              success: false,
              error: 'Minting failed. A refund is being processed.',
              refundPending: true,
            };
          }

          if (statusData.status === 'failed') {
            return {
              success: false,
              error: statusData.errorMessage || 'Minting failed',
            };
          }

          // Still processing
          updateProgress('minting');
        } catch (error) {
          console.warn('[Mint] Poll error:', error);
        }
      }

      // Timeout - minting might still complete
      return {
        success: false,
        error: 'Minting is taking longer than expected. Please check your gallery later.',
      };
    },
    [authFetch, updateGenerationMintStatus, updateProgress]
  );

  const mint = useCallback(
    async (generation: Generation, title: string): Promise<MintResult> => {
      if (!publicKey) {
        return { success: false, error: 'Wallet not connected' };
      }

      setMinting(true);
      updateProgress('initiating');

      try {
        // Step 1: Initiate mint request (gets payment instructions)
        const initiateRes = await authFetch('/api/mint/initiate', {
          method: 'POST',
          body: JSON.stringify({
            generationId: generation.id,
            title,
          }),
        });

        if (!initiateRes.ok) {
          const error = await initiateRes.json();
          throw new Error(error.error || 'Failed to initiate mint');
        }

        const initiateData = await initiateRes.json();
        const { mintRequestId, solAmount, treasuryAddress } = initiateData;

        console.log('[Mint] Initiated request:', mintRequestId);

        // Step 2: Build and send payment transaction
        updateProgress('awaiting_payment');

        const transaction = new Transaction();

        // Add compute budget for priority
        transaction.add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 1000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 })
        );

        // Add the transfer
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(treasuryAddress),
            lamports: Math.round(solAmount * LAMPORTS_PER_SOL),
          })
        );

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Send transaction
        const signature = await sendTransaction(transaction, connection, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        console.log('[Mint] Payment sent:', signature);
        updateProgress('confirming_payment');

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          'confirmed'
        );

        if (confirmation.value.err) {
          throw new Error('Payment transaction failed');
        }

        console.log('[Mint] Payment confirmed');
        updateProgress('verifying');

        // Step 3: Verify payment and trigger minting
        const verifyRes = await authFetch('/api/mint/verify-payment', {
          method: 'POST',
          body: JSON.stringify({
            mintRequestId,
            txSignature: signature,
          }),
        });

        if (!verifyRes.ok) {
          const error = await verifyRes.json();
          throw new Error(error.error || 'Payment verification failed');
        }

        const verifyData = await verifyRes.json();

        // Handle different statuses
        if (verifyData.status === 'completed') {
          updateProgress('completed');

          // Update local state
          updateGenerationMintStatus(
            generation.id,
            verifyData.nftAddress,
            signature
          );

          return {
            success: true,
            nftAddress: verifyData.nftAddress,
            txSignature: signature,
            explorerUrl: verifyData.explorerUrl,
          };
        }

        if (verifyData.status === 'refund_pending') {
          return {
            success: false,
            error: verifyData.error || 'Minting failed. A refund is being processed.',
            refundPending: true,
          };
        }

        if (verifyData.status === 'retry') {
          // Minting failed but can be retried - poll for completion
          updateProgress('minting');
          return await pollForCompletion(mintRequestId, generation, signature);
        }

        // Minting still in progress - poll for completion
        if (verifyData.status === 'minting' || verifyData.status === 'paid') {
          updateProgress('minting');
          return await pollForCompletion(mintRequestId, generation, signature);
        }

        throw new Error(`Unexpected status: ${verifyData.status}`);
      } catch (error) {
        console.error('Mint error:', error);
        updateProgress('failed');

        // Handle user rejection
        if (error instanceof Error) {
          if (error.message.includes('User rejected') || error.message.includes('rejected')) {
            return { success: false, error: 'Transaction cancelled' };
          }
          return { success: false, error: error.message };
        }

        return { success: false, error: 'Minting failed' };
      } finally {
        setMinting(false);
        setProgressStep('idle');
        setProgress('');
      }
    },
    [publicKey, sendTransaction, connection, authFetch, updateGenerationMintStatus, updateProgress, pollForCompletion]
  );

  return {
    mint,
    minting,
    progress,
    progressStep,
    mintFee: MINT_FEE_SOL,
  };
}
