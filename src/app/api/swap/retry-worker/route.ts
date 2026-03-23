/**
 * Swap Retry Worker Endpoint
 *
 * Cron-triggered endpoint to retry failed swaps.
 * Can be called by Vercel Cron or external scheduler.
 */

import { NextRequest, NextResponse } from 'next/server';
import { retryFailedSwaps } from '@/lib/swap/swapQueue';
import { getSwapConfig } from '@/lib/swap/pumpSwap';

// Vercel Cron secret for authentication (optional)
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret if configured
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Check if swap is enabled
    const config = getSwapConfig();
    if (!config.enabled) {
      return NextResponse.json({
        message: 'Swap is disabled',
        processed: 0,
        succeeded: 0,
        failed: 0,
      });
    }

    console.log('[RetryWorker] Starting swap retry worker');

    const result = await retryFailedSwaps();

    console.log(
      `[RetryWorker] Complete: ${result.succeeded} succeeded, ${result.failed} failed`
    );

    return NextResponse.json({
      message: 'Retry worker complete',
      ...result,
    });
  } catch (error) {
    console.error('[RetryWorker] Error:', error);
    return NextResponse.json(
      { error: 'Retry worker failed' },
      { status: 500 }
    );
  }
}

// Also support GET for easier testing
export async function GET(request: NextRequest) {
  return POST(request);
}
