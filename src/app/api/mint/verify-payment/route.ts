/**
 * Mint Verify Payment Endpoint
 *
 * Step 2 of pay-first minting flow:
 * Verifies user's payment transaction and triggers minting.
 * If payment verified, immediately starts minting process.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { verifyTransaction } from '@/lib/solana';
import { uploadJsonToPinata } from '@/lib/pinata';
import { createNftMetadata, createNftWithUmi } from '@/lib/metaplex';

const MAX_MINT_ATTEMPTS = 3;

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { mintRequestId, txSignature } = await req.json();

      if (!mintRequestId || !txSignature) {
        return NextResponse.json(
          { error: 'Mint request ID and transaction signature required' },
          { status: 400 }
        );
      }

      // Get mint request with generation
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

      // Check status
      if (mintRequest.status === 'completed') {
        return NextResponse.json({
          status: 'completed',
          nftAddress: mintRequest.nftAddress,
          explorerUrl: getExplorerUrl(mintRequest.nftAddress!),
        });
      }

      if (mintRequest.status === 'expired') {
        return NextResponse.json({ error: 'Mint request expired' }, { status: 400 });
      }

      if (mintRequest.status === 'failed') {
        return NextResponse.json({ error: 'Mint request failed' }, { status: 400 });
      }

      // Check expiry
      if (mintRequest.expiresAt < new Date() && mintRequest.status === 'pending') {
        await prisma.mintRequest.update({
          where: { id: mintRequestId },
          data: { status: 'expired' },
        });
        return NextResponse.json({ error: 'Mint request expired' }, { status: 400 });
      }

      // Check if already paid with same signature
      if (mintRequest.paymentTxSig === txSignature) {
        // Payment already verified, return current status
        return NextResponse.json({
          status: mintRequest.status,
          nftAddress: mintRequest.nftAddress,
          explorerUrl: mintRequest.nftAddress ? getExplorerUrl(mintRequest.nftAddress) : undefined,
        });
      }

      // Check for duplicate payment signature
      const existingPayment = await prisma.mintRequest.findUnique({
        where: { paymentTxSig: txSignature },
      });

      if (existingPayment) {
        return NextResponse.json(
          { error: 'Transaction already used for another mint' },
          { status: 400 }
        );
      }

      // Verify payment transaction
      console.log(`[MintVerify] Verifying payment ${txSignature} for request ${mintRequestId}`);
      const verification = await verifyTransaction(
        txSignature,
        mintRequest.solAmount,
        req.user.walletAddress
      );

      if (!verification.verified) {
        return NextResponse.json(
          { error: verification.error || 'Payment verification failed' },
          { status: 400 }
        );
      }

      // Payment verified! Update status and record signature
      console.log(`[MintVerify] Payment verified for ${mintRequestId}`);
      await prisma.mintRequest.update({
        where: { id: mintRequestId },
        data: {
          status: 'paid',
          paymentTxSig: txSignature,
          paidAt: new Date(),
        },
      });

      // Now proceed to mint
      const mintResult = await processMint(mintRequest.id, req.user.walletAddress);

      return NextResponse.json(mintResult);
    } catch (error) {
      console.error('Mint verify-payment error:', error);
      return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
    }
  });
}

/**
 * Process the actual minting after payment is verified
 * This uploads metadata and mints the NFT
 */
async function processMint(
  mintRequestId: string,
  walletAddress: string
): Promise<{
  status: string;
  nftAddress?: string;
  explorerUrl?: string;
  error?: string;
}> {
  try {
    // Update status to minting
    const mintRequest = await prisma.mintRequest.update({
      where: { id: mintRequestId },
      data: {
        status: 'minting',
        mintAttempts: { increment: 1 },
      },
      include: { generation: true },
    });

    console.log(`[MintProcess] Starting mint attempt ${mintRequest.mintAttempts} for ${mintRequestId}`);

    // Step 1: Upload metadata to IPFS
    console.log('[MintProcess] Uploading metadata to IPFS...');
    const metadata = createNftMetadata(
      mintRequest.nftTitle,
      mintRequest.generation.prompt,
      mintRequest.generation.ipfsUrl,
      mintRequest.generation.modelName,
      mintRequest.generation.createdAt.toISOString(),
      walletAddress
    );

    const metadataResult = await uploadJsonToPinata(
      metadata,
      `${mintRequest.nftTitle.replace(/[^a-zA-Z0-9]/g, '-')}-metadata.json`
    );

    console.log(`[MintProcess] Metadata uploaded: ${metadataResult.gatewayUrl}`);

    // Update with metadata URI
    await prisma.mintRequest.update({
      where: { id: mintRequestId },
      data: { metadataUri: metadataResult.gatewayUrl },
    });

    // Step 2: Mint the NFT
    console.log('[MintProcess] Minting NFT...');
    const nftResult = await createNftWithUmi({
      metadataUri: metadataResult.gatewayUrl,
      name: mintRequest.nftTitle,
      symbol: 'SHIP',
      sellerFeeBasisPoints: 0,
      ownerAddress: walletAddress,
    });

    console.log(`[MintProcess] NFT minted: ${nftResult.mintAddress}`);

    // Success! Update everything
    const explorerUrl = getExplorerUrl(nftResult.mintAddress);

    await prisma.$transaction([
      // Update mint request
      prisma.mintRequest.update({
        where: { id: mintRequestId },
        data: {
          status: 'completed',
          nftAddress: nftResult.mintAddress,
          mintTxSig: nftResult.signature,
          completedAt: new Date(),
        },
      }),
      // Update generation
      prisma.generation.update({
        where: { id: mintRequest.generationId },
        data: {
          isMinted: true,
          mintedAt: new Date(),
          nftAddress: nftResult.mintAddress,
          mintTxHash: nftResult.signature,
          nftTitle: mintRequest.nftTitle,
        },
      }),
    ]);

    console.log(`[MintProcess] Completed mint for ${mintRequestId}`);

    return {
      status: 'completed',
      nftAddress: nftResult.mintAddress,
      explorerUrl,
    };
  } catch (error) {
    console.error(`[MintProcess] Mint failed for ${mintRequestId}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Minting failed';

    // Get current attempt count
    const current = await prisma.mintRequest.findUnique({
      where: { id: mintRequestId },
    });

    if (current && current.mintAttempts >= MAX_MINT_ATTEMPTS) {
      // Max attempts reached - mark for refund
      await prisma.mintRequest.update({
        where: { id: mintRequestId },
        data: {
          status: 'refund_pending',
          errorMessage,
          refundAmount: current.solAmount,
        },
      });

      return {
        status: 'refund_pending',
        error: 'Minting failed after multiple attempts. A refund will be processed.',
      };
    }

    // Still have attempts left - mark as paid so it can be retried
    await prisma.mintRequest.update({
      where: { id: mintRequestId },
      data: {
        status: 'paid',
        errorMessage,
      },
    });

    return {
      status: 'retry',
      error: `Minting failed: ${errorMessage}. Please try again.`,
    };
  }
}

function getExplorerUrl(nftAddress: string): string {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
  return `https://solscan.io/token/${nftAddress}${network === 'devnet' ? '?cluster=devnet' : ''}`;
}
