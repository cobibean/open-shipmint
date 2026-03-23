/**
 * Admin Swap Stats Endpoint
 *
 * Returns swap statistics for monitoring dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSwapStats,
  getPendingSwapsList,
  getFailedSwapsList,
  getRecentSwaps,
  getStuckSwaps,
} from '@/lib/swap/monitoring';
import { getSwapConfig } from '@/lib/swap/pumpSwap';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey) {
      return NextResponse.json({ error: 'Admin API not configured' }, { status: 503 });
    }

    if (authHeader !== adminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';

    const config = getSwapConfig();
    const stats = await getSwapStats();

    const response: Record<string, unknown> = {
      config: {
        enabled: config.enabled,
        percentage: config.percentage,
        tokenMint: config.tokenMint,
        slippage: config.slippage,
        priorityFee: config.priorityFee,
        maxRetries: config.maxRetries,
      },
      stats,
    };

    if (includeDetails) {
      const [pendingSwaps, failedSwaps, recentSwaps, stuckSwaps] = await Promise.all([
        getPendingSwapsList(),
        getFailedSwapsList(10),
        getRecentSwaps(10),
        getStuckSwaps(30),
      ]);

      response.pendingSwaps = pendingSwaps.map((s) => ({
        id: s.id,
        solAmount: s.solAmount,
        attempts: s.attempts,
        createdAt: s.createdAt,
        lastError: s.lastError,
      }));

      response.failedSwaps = failedSwaps.map((s) => ({
        id: s.id,
        solAmount: s.solAmount,
        attempts: s.attempts,
        lastError: s.lastError,
        createdAt: s.createdAt,
      }));

      response.recentSwaps = recentSwaps.map((s) => ({
        id: s.id,
        status: s.status,
        solAmount: s.solAmount,
        txSignature: s.txSignature,
        createdAt: s.createdAt,
      }));

      response.stuckSwaps = stuckSwaps.map((s) => ({
        id: s.id,
        solAmount: s.solAmount,
        attempts: s.attempts,
        lastError: s.lastError,
        updatedAt: s.updatedAt,
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[SwapStats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get swap stats' },
      { status: 500 }
    );
  }
}
