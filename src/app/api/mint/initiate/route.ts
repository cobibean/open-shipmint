/**
 * Mint Initiate Endpoint
 *
 * Step 1 of pay-first minting flow:
 * Creates a MintRequest record and returns payment instructions.
 * NO minting happens here - user must pay first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { MINT_FEE_SOL } from '@/lib/constants';

// Mint request expires after 10 minutes if not paid
const MINT_REQUEST_EXPIRY_MINUTES = 10;

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { generationId, title } = await req.json();

      if (!generationId) {
        return NextResponse.json({ error: 'Generation ID required' }, { status: 400 });
      }

      // Get generation
      const generation = await prisma.generation.findUnique({
        where: { id: generationId },
      });

      if (!generation) {
        return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
      }

      if (generation.userId !== req.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      if (generation.isMinted) {
        return NextResponse.json({ error: 'Already minted' }, { status: 400 });
      }

      // Check for existing pending mint request for this generation
      const existingRequest = await prisma.mintRequest.findFirst({
        where: {
          generationId,
          status: { in: ['pending', 'paid', 'minting'] },
        },
      });

      if (existingRequest) {
        // If not expired, return existing request
        if (existingRequest.expiresAt > new Date()) {
          return NextResponse.json({
            mintRequestId: existingRequest.id,
            title: existingRequest.nftTitle,
            solAmount: existingRequest.solAmount,
            treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS,
            expiresAt: existingRequest.expiresAt.toISOString(),
            status: existingRequest.status,
          });
        }

        // Mark expired request
        await prisma.mintRequest.update({
          where: { id: existingRequest.id },
          data: { status: 'expired' },
        });
      }

      // Generate title if not provided
      const nftTitle = title?.trim() || `shipmint #${Date.now().toString(36).toUpperCase()}`;

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + MINT_REQUEST_EXPIRY_MINUTES);

      // Create mint request
      const mintRequest = await prisma.mintRequest.create({
        data: {
          userId: req.user.id,
          generationId,
          nftTitle,
          solAmount: MINT_FEE_SOL,
          status: 'pending',
          expiresAt,
        },
      });

      console.log(`[MintInitiate] Created request ${mintRequest.id} for generation ${generationId}`);

      return NextResponse.json({
        mintRequestId: mintRequest.id,
        title: nftTitle,
        solAmount: MINT_FEE_SOL,
        treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS,
        expiresAt: expiresAt.toISOString(),
        status: 'pending',
      });
    } catch (error) {
      console.error('Mint initiate error:', error);
      return NextResponse.json({ error: 'Failed to initiate mint' }, { status: 500 });
    }
  });
}
