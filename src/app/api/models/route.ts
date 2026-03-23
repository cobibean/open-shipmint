import { NextResponse } from 'next/server';
import { getActiveModels } from '@/lib/modelService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/models
 * Returns active models for the frontend model selector
 * Public endpoint - no auth required
 */
export async function GET() {
  try {
    const models = await getActiveModels();
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
