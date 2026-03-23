/**
 * Swap Queue Service
 *
 * Manages the queue of pending swaps, execution, and retry logic.
 * Uses the SwapAttempt database model for persistence.
 */

import { prisma } from '@/lib/prisma';
import { SwapAttemptRecord } from '@/types/swap';
import { executeSwap, getSwapConfig } from './pumpSwap';

/**
 * Queue a new swap for execution
 *
 * @param purchaseId - ID of the credit purchase
 * @param solAmount - Amount of SOL to swap (after percentage calculation)
 * @returns The created SwapAttempt record
 */
export async function queueSwap(
  purchaseId: string,
  solAmount: number
): Promise<SwapAttemptRecord> {
  const config = getSwapConfig();

  const swap = await prisma.swapAttempt.create({
    data: {
      purchaseId,
      solAmount,
      tokenMint: config.tokenMint,
      status: 'pending',
      attempts: 0,
    },
  });

  console.log(`[SwapQueue] Queued swap ${swap.id} for ${solAmount} SOL`);

  return swap as SwapAttemptRecord;
}

/**
 * Process a single swap attempt
 *
 * @param swapId - ID of the SwapAttempt record
 * @returns Result of the swap execution
 */
export async function processSwap(swapId: string): Promise<{
  success: boolean;
  signature?: string;
  error?: string;
}> {
  const config = getSwapConfig();

  // Get swap record
  const swap = await prisma.swapAttempt.findUnique({
    where: { id: swapId },
  });

  if (!swap) {
    return { success: false, error: 'Swap not found' };
  }

  if (swap.status === 'confirmed') {
    return { success: true, signature: swap.txSignature || undefined };
  }

  if (swap.status === 'failed') {
    return { success: false, error: 'Swap permanently failed' };
  }

  // Check if max retries exceeded
  if (swap.attempts >= config.maxRetries) {
    await markSwapFailed(swapId, 'Max retries exceeded');
    return { success: false, error: 'Max retries exceeded' };
  }

  // Increment attempt counter
  await prisma.swapAttempt.update({
    where: { id: swapId },
    data: { attempts: swap.attempts + 1 },
  });

  console.log(
    `[SwapQueue] Processing swap ${swapId} (attempt ${swap.attempts + 1}/${config.maxRetries})`
  );

  // Execute the swap
  const result = await executeSwap(swap.solAmount);

  if (result.success && result.signature) {
    await markSwapConfirmed(swapId, result.signature);
    return { success: true, signature: result.signature };
  }

  // Record the error (sanitize to prevent invalid UTF-8 characters)
  const sanitizedError = result.error
    ? result.error.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').substring(0, 500)
    : 'Unknown error';

  await prisma.swapAttempt.update({
    where: { id: swapId },
    data: { lastError: sanitizedError },
  });

  // Check if this was the last attempt
  if (swap.attempts + 1 >= config.maxRetries) {
    await markSwapFailed(swapId, sanitizedError);
    return { success: false, error: `Failed after ${config.maxRetries} attempts: ${result.error}` };
  }

  return { success: false, error: result.error };
}

/**
 * Mark a swap as confirmed
 */
export async function markSwapConfirmed(
  swapId: string,
  txSignature: string
): Promise<void> {
  await prisma.swapAttempt.update({
    where: { id: swapId },
    data: {
      status: 'confirmed',
      txSignature,
      confirmedAt: new Date(),
    },
  });

  console.log(`[SwapQueue] Swap ${swapId} confirmed: ${txSignature}`);
}

/**
 * Mark a swap as permanently failed
 */
export async function markSwapFailed(
  swapId: string,
  error: string
): Promise<void> {
  // Sanitize error to prevent invalid UTF-8 characters
  const sanitizedError = error
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .substring(0, 500);

  await prisma.swapAttempt.update({
    where: { id: swapId },
    data: {
      status: 'failed',
      lastError: sanitizedError,
    },
  });

  console.log(`[SwapQueue] Swap ${swapId} failed permanently: ${sanitizedError}`);
}

/**
 * Get all pending swaps that need retry
 *
 * @returns List of pending swaps with attempts < maxRetries
 */
export async function getPendingSwaps(): Promise<SwapAttemptRecord[]> {
  const config = getSwapConfig();

  const swaps = await prisma.swapAttempt.findMany({
    where: {
      status: 'pending',
      attempts: { lt: config.maxRetries },
    },
    orderBy: { createdAt: 'asc' },
  });

  return swaps as SwapAttemptRecord[];
}

/**
 * Process all pending swaps with retry logic
 *
 * @returns Summary of processing results
 */
export async function retryFailedSwaps(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const pendingSwaps = await getPendingSwaps();

  console.log(`[SwapQueue] Processing ${pendingSwaps.length} pending swaps`);

  let succeeded = 0;
  let failed = 0;

  for (const swap of pendingSwaps) {
    // Add exponential backoff delay between retries
    const backoffMs = Math.pow(2, swap.attempts) * 1000; // 1s, 2s, 4s
    if (swap.attempts > 0) {
      const timeSinceUpdate = Date.now() - swap.updatedAt.getTime();
      if (timeSinceUpdate < backoffMs) {
        console.log(
          `[SwapQueue] Skipping swap ${swap.id} - backoff not elapsed (${backoffMs - timeSinceUpdate}ms remaining)`
        );
        continue;
      }
    }

    const result = await processSwap(swap.id);

    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  console.log(
    `[SwapQueue] Retry complete: ${succeeded} succeeded, ${failed} failed`
  );

  return {
    processed: pendingSwaps.length,
    succeeded,
    failed,
  };
}

/**
 * Get a swap by ID
 */
export async function getSwapById(swapId: string): Promise<SwapAttemptRecord | null> {
  const swap = await prisma.swapAttempt.findUnique({
    where: { id: swapId },
  });

  return swap as SwapAttemptRecord | null;
}

/**
 * Get swaps for a specific purchase
 */
export async function getSwapsForPurchase(purchaseId: string): Promise<SwapAttemptRecord[]> {
  const swaps = await prisma.swapAttempt.findMany({
    where: { purchaseId },
    orderBy: { createdAt: 'desc' },
  });

  return swaps as SwapAttemptRecord[];
}
