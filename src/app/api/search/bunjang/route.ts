import { NextRequest, NextResponse } from 'next/server';
import { searchBunjang } from '@/lib/scrapers/bunjang';
import { CONFIG } from '@/lib/config';
import type { Product } from '@/lib/types';

const cache = new Map<string, { data: Product[]; time: number }>();

function getCached(key: string): Product[] | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.time > CONFIG.CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export async function POST(req: NextRequest) {
  try {
    const { keyword } = await req.json();
    if (!keyword?.trim()) {
      return NextResponse.json({ error: 'keyword required' }, { status: 400 });
    }
    const key = keyword.trim().toLowerCase();
    const cached = getCached(key);
    if (cached) return NextResponse.json({ results: cached, status: 'success' });

    const results = await searchBunjang(keyword.trim());
    if (cache.size >= CONFIG.CACHE_MAX_SIZE) cache.delete(cache.keys().next().value!);
    cache.set(key, { data: results, time: Date.now() });
    return NextResponse.json({ results, status: 'success' });
  } catch {
    return NextResponse.json({ results: [], status: 'failed' });
  }
}
