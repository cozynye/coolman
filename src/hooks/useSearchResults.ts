'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { recentStore } from '@/lib/recentStore';
import { bunjangStore, joongnaStore } from '@/lib/platformStore';
import { usePlatformSearch } from '@/hooks/usePlatformSearch';
import { applyFilter, calcStats } from '@/lib/productFilter';
import type { FilterState } from '@/lib/types';

const DEFAULT_FILTER: FilterState = { platform: 'all', sort: 'latest', priceMin: 0, priceMax: 0 };

// 검색 결과 데이터 레이어를 한 곳에 캡슐화.
// URL(?q=)이 검색어 SSOT → keyword는 순수 파생값, fetch는 단일 effect가 트리거.
export function useSearchResults() {
  const searchParams = useSearchParams();
  const keyword = (searchParams.get('q') ?? '').trim(); // 공백-only q → '' (무한 로딩 방지)

  const [cardSize, setCardSize] = useState<'large' | 'small'>('large');
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  const bunjang = usePlatformSearch(bunjangStore, keyword);
  const joongna = usePlatformSearch(joongnaStore, keyword);

  // keyword 변경 → fetch 트리거 + 최근검색 저장 + 필터 초기화 (유일한 데이터 effect)
  useEffect(() => {
    if (!keyword) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    setFilter(DEFAULT_FILTER);
    recentStore.save(keyword);
    bunjangStore.ensure(keyword);
    joongnaStore.ensure(keyword);
  }, [keyword]);

  // 동적 document.title (검색어 반영 → 검색 결과 title 개선)
  useEffect(() => {
    document.title = keyword
      ? `${keyword} 중고 | 번개장터·중고나라 통합검색 - 중고모아`
      : '중고모아 - 중고나라 × 번개장터 통합 검색';
  }, [keyword]);

  const handleSearch = useCallback(
    (kw: string) => {
      const k = kw.trim();
      if (!k) return;
      if (k === keyword) {
        // 동일 키워드는 URL이 안 바뀌어 effect가 안 돈다 → 강제 재검색
        window.scrollTo({ top: 0, behavior: 'instant' });
        bunjangStore.ensure(k, true);
        joongnaStore.ensure(k, true);
      } else {
        // URL 변경 → useSearchParams 반영 → keyword 갱신 → effect가 fetch
        window.history.pushState({}, '', `/?q=${encodeURIComponent(k)}`);
      }
    },
    [keyword],
  );

  const goHome = useCallback(() => {
    window.history.pushState({}, '', '/');
  }, []);

  const onFilterChange = useCallback((partial: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...partial }));
  }, []);

  // 스토어 상태에서 파생 (idle = effect 실행 전 → 로딩 취급해 '결과 없음' 깜빡임 방지)
  const bunjangProducts = bunjang.data;
  const joongnaProducts = joongna.data;
  const bunjangDone = bunjang.status === 'success' || bunjang.status === 'failed';
  const joongnaDone = joongna.status === 'success' || joongna.status === 'failed';
  const bunjangFailed = bunjang.status === 'failed';
  const joongnaFailed = joongna.status === 'failed';
  const bunjangPending = !!keyword && (bunjang.status === 'idle' || bunjang.status === 'loading');
  const joongnaPending = !!keyword && (joongna.status === 'idle' || joongna.status === 'loading');
  const isLoading = bunjangPending || joongnaPending;

  const allProducts = useMemo(
    () => [...bunjangProducts, ...joongnaProducts],
    [bunjangProducts, joongnaProducts],
  );
  const filtered = useMemo(() => applyFilter(allProducts, filter), [allProducts, filter]);
  const stats = useMemo(() => calcStats(filtered), [filtered]);
  const bunjangStats = useMemo(() => calcStats(bunjangProducts), [bunjangProducts]);
  const joongnaStats = useMemo(() => calcStats(joongnaProducts), [joongnaProducts]);

  return {
    keyword,
    cardSize,
    setCardSize,
    filter,
    onFilterChange,
    handleSearch,
    goHome,
    bunjangProducts,
    joongnaProducts,
    bunjangCount: bunjangProducts.length,
    joongnaCount: joongnaProducts.length,
    bunjangDone,
    joongnaDone,
    bunjangFailed,
    joongnaFailed,
    isLoading,
    allProducts,
    filtered,
    stats,
    bunjangStats,
    joongnaStats,
  };
}
