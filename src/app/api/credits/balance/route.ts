import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { creditBalance: true },
    });

    return NextResponse.json({ balance: user?.creditBalance ?? 0 });
  });
}
