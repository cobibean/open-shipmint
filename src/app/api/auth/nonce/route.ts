import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateNonce } from '@/lib/auth';
import { NONCE_EXPIRY_MINUTES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Delete any existing nonces for this wallet
    await prisma.nonce.deleteMany({
      where: { walletAddress },
    });

    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.nonce.create({
      data: {
        walletAddress,
        nonce,
        expiresAt,
      },
    });

    return NextResponse.json({
      nonce,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Nonce generation error:', error);
    return NextResponse.json({ error: 'Failed to generate nonce' }, { status: 500 });
  }
}
