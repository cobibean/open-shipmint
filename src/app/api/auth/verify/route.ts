import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySignature, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature, nonce } = await request.json();

    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json(
        { error: 'Wallet address, signature, and nonce required' },
        { status: 400 }
      );
    }

    // Find and validate nonce
    const storedNonce = await prisma.nonce.findFirst({
      where: {
        walletAddress,
        nonce,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedNonce) {
      return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 });
    }

    // Verify signature
    const isValid = verifySignature(nonce, signature, walletAddress);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Delete used nonce
    await prisma.nonce.delete({ where: { id: storedNonce.id } });

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress },
      });
    }

    // Generate JWT
    const token = createToken(walletAddress, user.id);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        creditBalance: user.creditBalance,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
