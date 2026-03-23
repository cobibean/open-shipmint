import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { GALLERY_PAGE_SIZE } from '@/lib/constants';
import { GalleryFilter } from '@/types';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const cursor = searchParams.get('cursor');
      const filter = (searchParams.get('filter') || 'all') as GalleryFilter;
      const limit = Math.min(
        parseInt(searchParams.get('limit') || String(GALLERY_PAGE_SIZE), 10),
        50
      );

      // Build where clause based on filter
      const where: {
        userId: string;
        isMinted?: boolean;
      } = {
        userId: req.user.id,
      };

      if (filter === 'minted') {
        where.isMinted = true;
      } else if (filter === 'generated') {
        where.isMinted = false;
      }
      // 'all' filter doesn't add isMinted condition

      // Fetch one extra to determine if there are more items
      const generations = await prisma.generation.findMany({
        where,
        take: limit + 1,
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1, // Skip the cursor item
        }),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
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

      // Check if there are more items
      const hasMore = generations.length > limit;
      const items = hasMore ? generations.slice(0, limit) : generations;
      const nextCursor = hasMore ? items[items.length - 1]?.id : null;

      return NextResponse.json({
        items: items.map((gen) => ({
          id: gen.id,
          prompt: gen.prompt,
          modelId: gen.modelId,
          modelName: gen.modelName,
          creditCost: gen.creditCost,
          ipfsCid: gen.ipfsCid,
          ipfsUrl: gen.ipfsUrl,
          isMinted: gen.isMinted,
          mintedAt: gen.mintedAt?.toISOString() ?? null,
          nftAddress: gen.nftAddress,
          mintTxHash: gen.mintTxHash,
          nftTitle: gen.nftTitle,
          createdAt: gen.createdAt.toISOString(),
        })),
        nextCursor,
        hasMore,
      });
    } catch (error) {
      console.error('Gallery fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gallery' },
        { status: 500 }
      );
    }
  });
}
