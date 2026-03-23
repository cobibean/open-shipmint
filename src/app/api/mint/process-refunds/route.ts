/**
 * Process Refunds Worker
 *
 * Cron-triggered endpoint that processes pending refunds.
 * Runs every 5 minutes to handle failed mints that need refunding.
 *
 * Also retries failed mints that still have attempts remaining.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendRefund } from '@/lib/solana';
import { uploadJsonToPinata } from '@/lib/pinata';
import { createNftMetadata, createNftWithUmi } from '@/lib/metaplex';

const MAX_MINT_ATTEMPTS = 3;
const BATCH_SIZE = 10;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    console.log('[RefundWorker] Starting refund/retry processing...');

    // Process pending refunds
    const refundResults = await processRefunds();

    // Retry failed mints that have attempts remaining
    const retryResults = await retryFailedMints();

    // Expire old pending requests
    const expiredCount = await expireOldRequests();

    console.log('[RefundWorker] Completed:', {
      refunds: refundResults,
      retries: retryResults,
      expired: expiredCount,
    });

    return NextResponse.json({
      refunds: refundResults,
      retries: retryResults,
      expired: expiredCount,
    });
  } catch (error) {
    console.error('[RefundWorker] Error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function processRefunds(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const pendingRefunds = await prisma.mintRequest.findMany({
    where: { status: 'refund_pending' },
    include: { user: true },
    take: BATCH_SIZE,
  });

  let succeeded = 0;
  let failed = 0;

  for (const request of pendingRefunds) {
    if (!request.refundAmount) {
      console.warn(`[RefundWorker] No refund amount for ${request.id}`);
      continue;
    }

    console.log(`[RefundWorker] Processing refund ${request.id} to ${request.user.walletAddress}`);

    const result = await sendRefund(request.user.walletAddress, request.refundAmount);

    if (result.success) {
      await prisma.mintRequest.update({
        where: { id: request.id },
        data: {
          status: 'refunded',
          refundTxSig: result.signature,
          refundedAt: new Date(),
        },
      });
      succeeded++;
      console.log(`[RefundWorker] Refund succeeded: ${request.id}`);
    } else {
      // Keep as refund_pending for next run
      await prisma.mintRequest.update({
        where: { id: request.id },
        data: {
          errorMessage: `Refund failed: ${result.error}`,
        },
      });
      failed++;
      console.error(`[RefundWorker] Refund failed: ${request.id} - ${result.error}`);
    }
  }

  return { processed: pendingRefunds.length, succeeded, failed };
}

async function retryFailedMints(): Promise<{ processed: number; succeeded: number; failed: number }> {
  // Find paid requests that haven't exceeded max attempts
  // and have been in 'paid' status for at least 1 minute (to avoid racing with verify-payment)
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const retryable = await prisma.mintRequest.findMany({
    where: {
      status: 'paid',
      mintAttempts: { lt: MAX_MINT_ATTEMPTS },
      paidAt: { lt: oneMinuteAgo },
    },
    include: { generation: true, user: true },
    take: BATCH_SIZE,
  });

  let succeeded = 0;
  let failed = 0;

  for (const request of retryable) {
    console.log(`[RefundWorker] Retrying mint ${request.id} (attempt ${request.mintAttempts + 1})`);

    try {
      // Update to minting status and increment attempts
      await prisma.mintRequest.update({
        where: { id: request.id },
        data: {
          status: 'minting',
          mintAttempts: { increment: 1 },
        },
      });

      // Upload metadata if not already done
      let metadataUri = request.metadataUri;
      if (!metadataUri) {
        const metadata = createNftMetadata(
          request.nftTitle,
          request.generation.prompt,
          request.generation.ipfsUrl,
          request.generation.modelName,
          request.generation.createdAt.toISOString(),
          request.user.walletAddress
        );

        const metadataResult = await uploadJsonToPinata(
          metadata,
          `${request.nftTitle.replace(/[^a-zA-Z0-9]/g, '-')}-metadata.json`
        );

        metadataUri = metadataResult.gatewayUrl;
        await prisma.mintRequest.update({
          where: { id: request.id },
          data: { metadataUri },
        });
      }

      // Mint the NFT
      const nftResult = await createNftWithUmi({
        metadataUri,
        name: request.nftTitle,
        symbol: 'SHIP',
        sellerFeeBasisPoints: 0,
        ownerAddress: request.user.walletAddress,
      });

      // Success!
      await prisma.$transaction([
        prisma.mintRequest.update({
          where: { id: request.id },
          data: {
            status: 'completed',
            nftAddress: nftResult.mintAddress,
            mintTxSig: nftResult.signature,
            completedAt: new Date(),
            errorMessage: null,
          },
        }),
        prisma.generation.update({
          where: { id: request.generationId },
          data: {
            isMinted: true,
            mintedAt: new Date(),
            nftAddress: nftResult.mintAddress,
            mintTxHash: nftResult.signature,
            nftTitle: request.nftTitle,
          },
        }),
      ]);

      succeeded++;
      console.log(`[RefundWorker] Retry succeeded: ${request.id} -> ${nftResult.mintAddress}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if max attempts reached
      const updated = await prisma.mintRequest.findUnique({
        where: { id: request.id },
      });

      if (updated && updated.mintAttempts >= MAX_MINT_ATTEMPTS) {
        await prisma.mintRequest.update({
          where: { id: request.id },
          data: {
            status: 'refund_pending',
            errorMessage,
            refundAmount: request.solAmount,
          },
        });
        console.log(`[RefundWorker] Max attempts reached for ${request.id}, queued for refund`);
      } else {
        await prisma.mintRequest.update({
          where: { id: request.id },
          data: {
            status: 'paid',
            errorMessage,
          },
        });
      }

      failed++;
      console.error(`[RefundWorker] Retry failed: ${request.id} - ${errorMessage}`);
    }
  }

  return { processed: retryable.length, succeeded, failed };
}

async function expireOldRequests(): Promise<number> {
  const result = await prisma.mintRequest.updateMany({
    where: {
      status: 'pending',
      expiresAt: { lt: new Date() },
    },
    data: {
      status: 'expired',
    },
  });

  if (result.count > 0) {
    console.log(`[RefundWorker] Expired ${result.count} pending requests`);
  }

  return result.count;
}
