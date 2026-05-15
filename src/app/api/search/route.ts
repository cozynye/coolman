import { NextRequest, NextResponse } from 'next/server';
import { searchBunjang } from '@/lib/scrapers/bunjang';
import { searchJoongna } from '@/lib/scrapers/joongna';
import { CONFIG } from '@/lib/config';
import type { Product, SearchResponse } from '@/lib/types';

// 인메모리 캐시 (Vercel Edge 환경에서는 인스턴스마다 독립적이므로 TTL만 사용)
const cache = new Map<string, { data: SearchResponse; time: number }>();

function getCached(key: string): SearchResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CONFIG.CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: SearchResponse): void {
  if (cache.size >= CONFIG.CACHE_MAX_SIZE) {
    cache.delete(cache.keys().next().value!);
  }
  cache.set(key, { data, time: Date.now() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawKeyword = body?.keyword;

    if (!rawKeyword || typeof rawKeyword !== 'string') {
      return NextResponse.json({ error: '검색어를 입력해주세요.' }, { status: 400 });
    }

    const keyword = rawKeyword.trim().substring(0, CONFIG.MAX_KEYWORD_LENGTH);
    if (!keyword) {
      return NextResponse.json({ error: '검색어를 입력해주세요.' }, { status: 400 });
    }

    const cacheKey = keyword.toLowerCase();
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const meta: SearchResponse['meta'] = { bunjang: 'success', joonggo: 'success' };

    const [bunjangResults, joonggoResults] = await Promise.all([
      searchBunjang(keyword).catch((err) => {
        console.error('번개장터 실패:', err.message);
        meta.bunjang = 'failed';
        return [] as Product[];
      }),
      searchJoongna(keyword).catch((err) => {
        console.error('중고나라 실패:', err.message);
        meta.joonggo = 'failed';
        return [] as Product[];
      }),
    ]);

    const results = [...bunjangResults, ...joonggoResults].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    const response: SearchResponse = {
      keyword,
      timestamp: new Date().toISOString(),
      results,
      meta,
    };

    setCache(cacheKey, response);
    return NextResponse.json(response);
  } catch (err) {
    console.error('검색 에러:', err);
    return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
