import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { CREDIT_PACKS } from '@/lib/constants';
import { getSolPrice } from '@/lib/solana';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { packId, txSignature } = await req.json();

      if (!packId || !txSignature) {
        return NextResponse.json(
          { error: 'Pack ID and transaction signature required' },
          { status: 400 }
        );
      }

      const pack = CREDIT_PACKS.find((p) => p.id === packId);
      if (!pack) {
        return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });
      }

      // Check for duplicate transaction
      const existingPurchase = await prisma.purchase.findUnique({
        where: { txSignature },
      });

      if (existingPurchase) {
        return NextResponse.json(
          { error: 'Transaction already processed' },
          { status: 400 }
        );
      }

      const solPrice = await getSolPrice();
      const solAmount = pack.usdPrice / solPrice;

      // Create pending purchase
      const purchase = await prisma.purchase.create({
        data: {
          userId: req.user.id,
          packType: pack.id,
          credits: pack.credits,
          solAmount,
          usdEquivalent: pack.usdPrice,
          txSignature,
          status: 'pending',
        },
      });

      return NextResponse.json({
        status: 'pending',
        purchaseId: purchase.id,
      });
    } catch (error) {
      console.error('Purchase error:', error);
      return NextResponse.json({ error: 'Purchase failed' }, { status: 500 });
    }
  });
}
