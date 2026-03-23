/**
 * Mint Status Endpoint
 *
 * Check the status of a mint request.
 * Used by frontend to poll for completion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id: mintRequestId } = await params;

      if (!mintRequestId) {
        return NextResponse.json({ error: 'Mint request ID required' }, { status: 400 });
      }

      const mintRequest = await prisma.mintRequest.findUnique({
        where: { id: mintRequestId },
        include: { generation: true },
      });

      if (!mintRequest) {
        return NextResponse.json({ error: 'Mint request not found' }, { status: 404 });
      }

      if (mintRequest.userId !== req.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';

      const response: Record<string, unknown> = {
        id: mintRequest.id,
        status: mintRequest.status,
        nftTitle: mintRequest.nftTitle,
        solAmount: mintRequest.solAmount,
        createdAt: mintRequest.createdAt.toISOString(),
        expiresAt: mintRequest.expiresAt.toISOString(),
      };

      // Add timestamps based on status
      if (mintRequest.paidAt) {
        response.paidAt = mintRequest.paidAt.toISOString();
      }
      if (mintRequest.completedAt) {
        response.completedAt = mintRequest.completedAt.toISOString();
      }
      if (mintRequest.refundedAt) {
        response.refundedAt = mintRequest.refundedAt.toISOString();
      }

      // Add NFT info if completed
      if (mintRequest.nftAddress) {
        response.nftAddress = mintRequest.nftAddress;
        response.explorerUrl = `https://solscan.io/token/${mintRequest.nftAddress}${
          network === 'devnet' ? '?cluster=devnet' : ''
        }`;
      }

      // Add refund info if refunded
      if (mintRequest.status === 'refunded' && mintRequest.refundTxSig) {
        response.refundTxSig = mintRequest.refundTxSig;
        response.refundAmount = mintRequest.refundAmount;
      }

      // Add error message if failed
      if (mintRequest.errorMessage) {
        response.errorMessage = mintRequest.errorMessage;
      }

      // Add attempt count for debugging
      response.mintAttempts = mintRequest.mintAttempts;

      return NextResponse.json(response);
    } catch (error) {
      console.error('Mint status error:', error);
      return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
    }
  });
}
