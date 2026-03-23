/**
 * Swap Execution Endpoint
 *
 * Internal endpoint to execute a queued swap.
 * Called asynchronously from purchase verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processSwap } from '@/lib/swap/swapQueue';
import { getSwapConfig } from '@/lib/swap/pumpSwap';

export async function POST(request: NextRequest) {
  try {
    // Check if swap is enabled
    const config = getSwapConfig();
    if (!config.enabled) {
      return NextResponse.json({ error: 'Swap is disabled' }, { status: 400 });
    }

    const { swapId } = await request.json();

    if (!swapId) {
      return NextResponse.json({ error: 'swapId required' }, { status: 400 });
    }

    console.log(`[SwapExecute] Processing swap ${swapId}`);

    const result = await processSwap(swapId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        signature: result.signature,
      });
    }

    return NextResponse.json({
      success: false,
      error: result.error,
    });
  } catch (error) {
    console.error('[SwapExecute] Error:', error);
    return NextResponse.json(
      { error: 'Swap execution failed' },
      { status: 500 }
    );
  }
}
