import type { Product, FilterState, PriceStats, SortOption } from './types';

// 정렬·가격대 옵션 (사이드바/모바일 칩 공용 — 단일 소스)
export const SORTS: { value: SortOption; label: string }[] = [
  { value: 'latest', label: '혼합순' },
  { value: 'price-asc', label: '낮은가격순' },
  { value: 'price-desc', label: '높은가격순' },
];

export const PRICE_PRESETS = [
  { label: '전체', min: 0, max: 0 },
  { label: '~10만', min: 0, max: 100_000 },
  { label: '10~100만', min: 100_000, max: 1_000_000 },
  { label: '100~300만', min: 1_000_000, max: 3_000_000 },
  { label: '300만+', min: 3_000_000, max: 0 },
];

// 필터 + 정렬. 'latest'(혼합순)는 전체 선택 시 두 플랫폼을 교차 병합.
export function applyFilter(products: Product[], filter: FilterState): Product[] {
  const filtered = products.filter((p) => {
    if (filter.platform !== 'all' && p.platform !== filter.platform) return false;
    if (filter.priceMin > 0 && p.priceNum < filter.priceMin) return false;
    if (filter.priceMax > 0 && p.priceNum > filter.priceMax) return false;
    return true;
  });

  // 낮은가격순: 가격문의(priceNum=0)는 맨 뒤로 (0원이 상단을 도배하는 문제 방지)
  if (filter.sort === 'price-asc') {
    return [...filtered].sort((a, b) => (a.priceNum || Infinity) - (b.priceNum || Infinity));
  }
  if (filter.sort === 'price-desc') {
    return [...filtered].sort((a, b) => b.priceNum - a.priceNum);
  }

  // 기본(혼합순): 특정 플랫폼 선택 시 API 관련도순 유지, 전체일 때 교차 병합
  if (filter.platform !== 'all') return filtered;

  const bunjang = filtered.filter((p) => p.platform === '번개장터');
  const joongna = filtered.filter((p) => p.platform === '중고나라');
  const result: Product[] = [];
  const len = Math.max(bunjang.length, joongna.length);
  for (let i = 0; i < len; i++) {
    if (i < bunjang.length) result.push(bunjang[i]);
    if (i < joongna.length) result.push(joongna[i]);
  }
  return result;
}

// 유효 가격(>0)만으로 min/avg/max 단일 패스 계산.
export function calcStats(products: Product[]): PriceStats | null {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  for (const p of products) {
    const v = p.priceNum;
    if (typeof v === 'number' && isFinite(v) && v > 0) {
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      count++;
    }
  }
  if (count === 0) return null;
  return { min, max, avg: Math.round(sum / count), count };
}
