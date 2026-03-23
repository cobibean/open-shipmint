import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;

      const generation = await prisma.generation.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          prompt: true,
          modelId: true,
          modelName: true,
          creditCost: true,
          ipfsCid: true,
          ipfsUrl: true,
          isMinted: true,
          mintedAt: true,
          nftAddress: true,
          mintTxHash: true,
          nftTitle: true,
          createdAt: true,
        },
      });

      if (!generation) {
        return NextResponse.json(
          { error: 'Generation not found' },
          { status: 404 }
        );
      }

      // Ensure user can only access their own generations
      if (generation.userId !== req.user.id) {
        return NextResponse.json(
          { error: 'Not authorized' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        id: generation.id,
        prompt: generation.prompt,
        modelId: generation.modelId,
        modelName: generation.modelName,
        creditCost: generation.creditCost,
        ipfsCid: generation.ipfsCid,
        ipfsUrl: generation.ipfsUrl,
        isMinted: generation.isMinted,
        mintedAt: generation.mintedAt?.toISOString() ?? null,
        nftAddress: generation.nftAddress,
        mintTxHash: generation.mintTxHash,
        nftTitle: generation.nftTitle,
        createdAt: generation.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('Gallery detail fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch generation' },
        { status: 500 }
      );
    }
  });
}
