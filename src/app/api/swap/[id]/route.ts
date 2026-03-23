/**
 * Swap Status Endpoint
 *
 * Check status of a specific swap.
 * For monitoring and debugging purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSwapById } from '@/lib/swap/swapQueue';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const swap = await getSwapById(id);

    if (!swap) {
      return NextResponse.json({ error: 'Swap not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: swap.id,
      purchaseId: swap.purchaseId,
      status: swap.status,
      solAmount: swap.solAmount,
      tokenMint: swap.tokenMint,
      txSignature: swap.txSignature,
      attempts: swap.attempts,
      lastError: swap.lastError,
      createdAt: swap.createdAt.toISOString(),
      updatedAt: swap.updatedAt.toISOString(),
      confirmedAt: swap.confirmedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[SwapStatus] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get swap status' },
      { status: 500 }
    );
  }
}
