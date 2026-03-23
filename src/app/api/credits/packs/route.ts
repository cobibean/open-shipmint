import { NextResponse } from 'next/server';
import { CREDIT_PACKS } from '@/lib/constants';
import { getSolPrice } from '@/lib/solana';

export async function GET() {
  try {
    const solPrice = await getSolPrice();

    const packs = CREDIT_PACKS.map((pack) => ({
      id: pack.id,
      name: pack.name,
      credits: pack.credits,
      usdPrice: pack.usdPrice,
      solPrice: Number((pack.usdPrice / solPrice).toFixed(6)),
    }));

    return NextResponse.json({ solPrice, packs });
  } catch (error) {
    console.error('Failed to get packs:', error);
    return NextResponse.json({ error: 'Failed to load packs' }, { status: 500 });
  }
}
