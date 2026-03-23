/**
 * Swap Monitoring Utilities
 *
 * Functions for tracking swap statistics and health.
 */

import { prisma } from '@/lib/prisma';
import { SwapStats, SwapAttemptRecord } from '@/types/swap';
import { getSwapConfig } from './pumpSwap';

/**
 * Get comprehensive swap statistics
 */
export async function getSwapStats(): Promise<SwapStats> {
  const [totalSwaps, confirmedSwaps, failedSwaps, pendingSwaps, totalSolResult] =
    await Promise.all([
      prisma.swapAttempt.count(),
      prisma.swapAttempt.count({ where: { status: 'confirmed' } }),
      prisma.swapAttempt.count({ where: { status: 'failed' } }),
      prisma.swapAttempt.count({ where: { status: 'pending' } }),
      prisma.swapAttempt.aggregate({
        where: { status: 'confirmed' },
        _sum: { solAmount: true },
      }),
    ]);

  const totalSolSwapped = totalSolResult._sum.solAmount || 0;
  const successRate =
    totalSwaps > 0
      ? Math.round((confirmedSwaps / (confirmedSwaps + failedSwaps)) * 100 * 100) / 100
      : 0;

  return {
    totalSwaps,
    confirmedSwaps,
    failedSwaps,
    pendingSwaps,
    successRate,
    totalSolSwapped,
  };
}

/**
 * Get list of pending swaps awaiting retry
 */
export async function getPendingSwapsList(): Promise<SwapAttemptRecord[]> {
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
 * Get list of permanently failed swaps
 */
export async function getFailedSwapsList(limit = 50): Promise<SwapAttemptRecord[]> {
  const swaps = await prisma.swapAttempt.findMany({
    where: { status: 'failed' },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  return swaps as SwapAttemptRecord[];
}

/**
 * Get recent swap activity
 */
export async function getRecentSwaps(limit = 20): Promise<SwapAttemptRecord[]> {
  const swaps = await prisma.swapAttempt.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return swaps as SwapAttemptRecord[];
}

/**
 * Get swap stats for a specific time period
 */
export async function getSwapStatsForPeriod(
  startDate: Date,
  endDate: Date
): Promise<{
  totalSwaps: number;
  confirmedSwaps: number;
  failedSwaps: number;
  totalSolSwapped: number;
}> {
  const dateFilter = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  const [totalSwaps, confirmedSwaps, failedSwaps, totalSolResult] = await Promise.all([
    prisma.swapAttempt.count({ where: dateFilter }),
    prisma.swapAttempt.count({ where: { ...dateFilter, status: 'confirmed' } }),
    prisma.swapAttempt.count({ where: { ...dateFilter, status: 'failed' } }),
    prisma.swapAttempt.aggregate({
      where: { ...dateFilter, status: 'confirmed' },
      _sum: { solAmount: true },
    }),
  ]);

  return {
    totalSwaps,
    confirmedSwaps,
    failedSwaps,
    totalSolSwapped: totalSolResult._sum.solAmount || 0,
  };
}

/**
 * Get swaps that are stuck (pending for too long)
 */
export async function getStuckSwaps(olderThanMinutes = 30): Promise<SwapAttemptRecord[]> {
  const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const swaps = await prisma.swapAttempt.findMany({
    where: {
      status: 'pending',
      updatedAt: { lt: cutoffTime },
    },
    orderBy: { createdAt: 'asc' },
  });

  return swaps as SwapAttemptRecord[];
}
