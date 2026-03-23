import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { verifyTransaction } from '@/lib/solana';
import { queueSwap } from '@/lib/swap/swapQueue';
import { getSwapConfig, calculateSwapAmount } from '@/lib/swap/pumpSwap';

/**
 * Fire swap execution asynchronously (non-blocking)
 * This ensures credits are granted immediately without waiting for swap
 */
function triggerSwapAsync(swapId: string): void {
  // Use the internal swap execute endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  fetch(`${baseUrl}/api/swap/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ swapId }),
  }).catch((err) => {
    // Log but don't throw - swap failure shouldn't affect credit purchase
    console.error('[Purchase] Failed to trigger async swap:', err);
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;

      const purchase = await prisma.purchase.findUnique({
        where: { id },
      });

      if (!purchase) {
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
      }

      if (purchase.userId !== req.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // If already confirmed, return status
      if (purchase.status === 'confirmed') {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { creditBalance: true },
        });

        return NextResponse.json({
          status: 'confirmed',
          credits: purchase.credits,
          newBalance: user?.creditBalance ?? 0,
        });
      }

      // If pending, verify transaction
      if (purchase.status === 'pending') {
        console.log(`[Purchase Verify] Checking tx ${purchase.txSignature} for ${purchase.solAmount} SOL from ${req.user.walletAddress}`);
        
        const verification = await verifyTransaction(
          purchase.txSignature,
          purchase.solAmount,
          req.user.walletAddress
        );

        console.log(`[Purchase Verify] Result:`, verification);

        if (verification.verified) {
          // Update purchase and add credits atomically
          await prisma.$transaction([
            prisma.purchase.update({
              where: { id: purchase.id },
              data: { status: 'confirmed', confirmedAt: new Date() },
            }),
            prisma.user.update({
              where: { id: req.user.id },
              data: { creditBalance: { increment: purchase.credits } },
            }),
          ]);

          // Queue token swap asynchronously (non-blocking)
          const swapConfig = getSwapConfig();
          let swapInfo = null;

          if (swapConfig.enabled && swapConfig.tokenMint) {
            const swapAmount = calculateSwapAmount(purchase.solAmount, swapConfig.percentage);

            if (swapAmount >= 0.0001) {
              try {
                const swapAttempt = await queueSwap(purchase.id, swapAmount);

                // Fire async swap execution (non-blocking)
                triggerSwapAsync(swapAttempt.id);

                swapInfo = {
                  status: 'pending',
                  solAmount: swapAmount,
                  swapId: swapAttempt.id,
                };

                console.log(`[Purchase] Queued swap ${swapAttempt.id} for ${swapAmount} SOL`);
              } catch (swapError) {
                // Log but don't fail the credit purchase
                console.error('[Purchase] Failed to queue swap:', swapError);
              }
            }
          }

          const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { creditBalance: true },
          });

          return NextResponse.json({
            status: 'confirmed',
            credits: purchase.credits,
            newBalance: user?.creditBalance ?? 0,
            swap: swapInfo,
          });
        }

        // Check if transaction failed permanently
        // For now, keep as pending and let client retry
        return NextResponse.json({
          status: 'pending',
          error: verification.error,
        });
      }

      return NextResponse.json({
        status: purchase.status,
      });
    } catch (error) {
      console.error('Purchase check error:', error);
      return NextResponse.json({ error: 'Check failed' }, { status: 500 });
    }
  });
}
