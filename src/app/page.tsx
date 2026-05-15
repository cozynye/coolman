'use client';

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar, { saveRecentSearch } from '@/components/SearchBar';
import ProductCard from '@/components/ProductCard';
import SkeletonCard from '@/components/SkeletonCard';
import SearchProgressBanner from '@/components/SearchProgressBanner';
import FilterSidebar from '@/components/FilterSidebar';
import type { Product, FilterState, PriceStats } from '@/lib/types';

// ─── 필터·정렬 로직 ────────────────────────────────────────────────
function applyFilter(products: Product[], filter: FilterState): Product[] {
  return products
    .filter((p) => {
      if (filter.platform !== 'all' && p.platform !== filter.platform) return false;
      if (filter.priceMin > 0 && p.priceNum < filter.priceMin) return false;
      if (filter.priceMax > 0 && p.priceNum > filter.priceMax) return false;
      return true;
    })
    .sort((a, b) => {
      if (filter.sort === 'price-asc') return a.priceNum - b.priceNum;
      if (filter.sort === 'price-desc') return b.priceNum - a.priceNum;
      return b.timestamp - a.timestamp;
    });
}

function calcStats(products: Product[]): PriceStats | null {
  const prices = products
    .map((p) => p.priceNum)
    .filter((p) => typeof p === 'number' && isFinite(p) && p > 0);
  if (prices.length === 0) return null;
  const sum = prices.reduce((a, b) => a + b, 0);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: Math.round(sum / prices.length),
    count: prices.length,
  };
}

function fmt(n: number) {
  return n >= 10000
    ? (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + '만원'
    : n.toLocaleString() + '원';
}

// ─── 플랫폼 상태 표시 ─────────────────────────────────────────────
function PlatformStatusBar({
  meta,
  bunjangCount,
  joongnaCount,
}: {
  meta: { bunjang: 'success' | 'failed'; joonggo: 'success' | 'failed' };
  bunjangCount: number;
  joongnaCount: number;
}) {
  return (
    <div className="flex items-center gap-4 text-sm text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
        번개장터 {meta.bunjang === 'failed' ? '실패' : `${bunjangCount}개`}
      </span>
      <span className="text-gray-200">|</span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-teal-400" />
        중고나라 {meta.joonggo === 'failed' ? '실패' : `${joongnaCount}개`}
      </span>
    </div>
  );
}

// ─── 모바일 인라인 필터 칩 바 ────────────────────────────────────
function MobileFilterBar({
  filter,
  onChange,
  totalCount,
  bunjangCount,
  joongnaCount,
}: {
  filter: FilterState;
  onChange: (f: Partial<FilterState>) => void;
  totalCount: number;
  bunjangCount: number;
  joongnaCount: number;
}) {
  const [open, setOpen] = useState(false);

  const SORTS = [
    { value: 'latest' as const, label: '최신순' },
    { value: 'price-asc' as const, label: '낮은가격' },
    { value: 'price-desc' as const, label: '높은가격' },
  ];

  const sortActive = filter.sort !== 'latest';
  const platformActive = filter.platform !== 'all';
  const priceActive = filter.priceMin > 0 || filter.priceMax > 0;
  const anyActive = sortActive || platformActive || priceActive;

  const sortLabel = SORTS.find((s) => s.value === filter.sort)?.label ?? '최신순';
  const platformLabel = filter.platform === 'all' ? '플랫폼' : filter.platform;
  const priceLabel = (() => {
    if (!priceActive) return '가격대';
    const min = filter.priceMin > 0 ? `${filter.priceMin / 10000}만` : '';
    const max = filter.priceMax > 0 ? `${filter.priceMax / 10000}만` : '';
    return min && max ? `${min}~${max}` : min ? `${min}~` : `~${max}`;
  })();

  function Chip({ label, active }: { label: string; active: boolean }) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
          active
            ? 'bg-teal-500 text-white border-teal-500'
            : 'bg-white text-gray-600 border-gray-200'
        }`}
      >
        {label}
        {active ? (
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 ml-0.5" />
        ) : (
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <>
      {/* 칩 바 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-4 px-4">
        <Chip label={sortLabel} active={sortActive} />
        <Chip label={platformLabel} active={platformActive} />
        <Chip label={priceLabel} active={priceActive} />
        {anyActive && (
          <button
            onClick={() => onChange({ platform: 'all', sort: 'latest', priceMin: 0, priceMax: 0 })}
            className="flex items-center shrink-0 px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-500 bg-white"
          >
            초기화
          </button>
        )}
      </div>

      {/* 바텀 시트 */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-3xl px-5 pt-4 pb-8 space-y-5 animate-fadeIn">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />

            {/* 플랫폼 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">플랫폼</p>
              <div className="flex gap-2">
                {[
                  { value: 'all' as const, label: `전체 ${totalCount}` },
                  { value: '번개장터' as const, label: `번개장터 ${bunjangCount}` },
                  { value: '중고나라' as const, label: `중고나라 ${joongnaCount}` },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ platform: opt.value })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      filter.platform === opt.value
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 정렬 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">정렬</p>
              <div className="flex gap-2">
                {SORTS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => onChange({ sort: s.value })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      filter.sort === s.value
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="w-full py-3 bg-gray-900 text-white rounded-2xl font-semibold text-sm"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── 홈 히어로 ───────────────────────────────────────────────────
function Hero({ onSearch, isLoading }: { onSearch: (kw: string) => void; isLoading: boolean }) {
  return (
    <main className="flex flex-col items-center justify-center min-h-[80dvh] px-4">
      <div className="w-full max-w-xl space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">중고모아</h1>
          <p className="text-gray-500 text-base">번개장터와 중고나라, 한 번에 비교하세요</p>
        </div>
        <SearchBar onSearch={onSearch} isLoading={isLoading} />
        <p className="text-xs text-gray-400">
          번개장터 · 중고나라를 동시에 검색합니다
        </p>
      </div>
    </main>
  );
}

// ─── 결과 그리드 ─────────────────────────────────────────────────
const PAGE_SIZE = 40;

function ResultGrid({ products, size }: { products: Product[]; size: 'large' | 'small' }) {
  const [page, setPage] = useState(1);
  const visible = products.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < products.length;

  const cols =
    size === 'small'
      ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';

  return (
    <div>
      <div className={`grid ${cols} gap-3`}>
        {visible.map((p, i) => (
          <ProductCard key={`${p.platform}-${p.link}-${i}`} product={p} size={size} />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setPage((n) => n + 1)}
          className="mt-6 w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          더 보기 ({products.length - visible.length}개 남음)
        </button>
      )}
      {!hasMore && products.length > 0 && (
        <p className="mt-6 text-center text-xs text-gray-400">모든 결과를 불러왔습니다</p>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 (useSearchParams 사용 → Suspense 필요) ─────────
function HomePageInner() {
  const searchParams = useSearchParams();

  const [bunjangProducts, setBunjangProducts] = useState<Product[]>([]);
  const [joongnaProducts, setJoongnaProducts] = useState<Product[]>([]);
  const [bunjangDone, setBunjangDone] = useState(false);
  const [joongnaDone, setJoongnaDone] = useState(false);
  const [bunjangFailed, setBunjangFailed] = useState(false);
  const [joongnaFailed, setJoongnaFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [cardSize, setCardSize] = useState<'large' | 'small'>('large');
  const [filter, setFilter] = useState<FilterState>({
    platform: 'all',
    sort: 'latest',
    priceMin: 0,
    priceMax: 0,
  });

  const runSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setCurrentKeyword(keyword);
    setFilter({ platform: 'all', sort: 'latest', priceMin: 0, priceMax: 0 });
    setBunjangProducts([]);
    setJoongnaProducts([]);
    setBunjangDone(false);
    setJoongnaDone(false);
    setBunjangFailed(false);
    setJoongnaFailed(false);

    const body = JSON.stringify({ keyword });
    const headers = { 'Content-Type': 'application/json' };

    const fetchBunjang = fetch('/api/search/bunjang', { method: 'POST', headers, body })
      .then((r) => r.json())
      .then((data) => setBunjangProducts(data.results ?? []))
      .catch(() => setBunjangFailed(true))
      .finally(() => setBunjangDone(true));

    const fetchJoongna = fetch('/api/search/joongna', { method: 'POST', headers, body })
      .then((r) => r.json())
      .then((data) => setJoongnaProducts(data.results ?? []))
      .catch(() => setJoongnaFailed(true))
      .finally(() => setJoongnaDone(true));

    await Promise.all([fetchBunjang, fetchJoongna]);
    saveRecentSearch(keyword);
    // 배너에 "검색 완료!" 잠깐 보여준 뒤 결과만 표시
    await new Promise((r) => setTimeout(r, 900));
    setIsLoading(false);
  }, []);

  // URL → 검색: ?q= 파라미터로 바로 검색
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) runSearch(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback((keyword: string) => {
    if (!keyword.trim()) return;
    // URL 업데이트 (리렌더 없이 URL 바만 변경, 뒤로가기 지원)
    window.history.pushState({}, '', `/?q=${encodeURIComponent(keyword.trim())}`);
    runSearch(keyword);
  }, [runSearch]);

  const handleFilterChange = useCallback((partial: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...partial }));
  }, []);

  const allProducts = useMemo(
    () => [...bunjangProducts, ...joongnaProducts],
    [bunjangProducts, joongnaProducts]
  );
  const filtered = useMemo(() => applyFilter(allProducts, filter), [allProducts, filter]);
  const stats = useMemo(() => calcStats(filtered), [filtered]);

  const bunjangCount = bunjangProducts.length;
  const joongnaCount = joongnaProducts.length;

  // 검색 전 홈 화면
  if (!currentKeyword && !isLoading) {
    return <Hero onSearch={handleSearch} isLoading={isLoading} />;
  }

  // 검색 중 또는 결과 화면 (레이아웃 공유)
  return (
    <div className="min-h-screen bg-gray-50 animate-fadeIn">
      {/* 헤더 — 모바일: 더 작고 컴팩트, 데스크탑: 여유 있는 높이 */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => { setBunjangProducts([]); setJoongnaProducts([]); setCurrentKeyword(''); window.history.pushState({}, '', '/'); }}
            className="text-gray-900 font-bold text-sm sm:text-lg shrink-0 hover:text-teal-600 transition-colors"
          >
            중고모아
          </button>
          <div className="flex-1 max-w-2xl">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} compact />
          </div>
        </div>
      </header>

      {/* 본문 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 결과 요약 */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              &ldquo;{currentKeyword}&rdquo;
              {isLoading ? (
                <span className="text-sm font-normal text-gray-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 animate-spin text-teal-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  검색 중...
                </span>
              ) : (
                <span className="text-base font-normal text-gray-500">
                  {filtered.length.toLocaleString()}개
                </span>
              )}
            </h2>
            {!isLoading && (
              <PlatformStatusBar
                meta={{
                  bunjang: bunjangFailed ? 'failed' : 'success',
                  joonggo: joongnaFailed ? 'failed' : 'success',
                }}
                bunjangCount={bunjangCount}
                joongnaCount={joongnaCount}
              />
            )}
          </div>

          {/* 뷰 사이즈 토글 + 공유 */}
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const url = `${location.origin}/?q=${encodeURIComponent(currentKeyword)}`;
                try {
                  await navigator.clipboard.writeText(url);
                } catch {
                  /* ignore */
                }
              }}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              aria-label="공유"
              title="URL 복사"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <div className="hidden sm:flex items-center border border-gray-200 rounded-xl overflow-hidden">
              {(['large', 'small'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setCardSize(s)}
                  className={`p-2 transition-colors ${
                    cardSize === s ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  aria-label={s === 'large' ? '크게 보기' : '작게 보기'}
                >
                  {s === 'large' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} />
                      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} />
                      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} />
                      <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2} />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="4" height="4" rx="0.5" strokeWidth={2} />
                      <rect x="10" y="3" width="4" height="4" rx="0.5" strokeWidth={2} />
                      <rect x="17" y="3" width="4" height="4" rx="0.5" strokeWidth={2} />
                      <rect x="3" y="10" width="4" height="4" rx="0.5" strokeWidth={2} />
                      <rect x="10" y="10" width="4" height="4" rx="0.5" strokeWidth={2} />
                      <rect x="17" y="10" width="4" height="4" rx="0.5" strokeWidth={2} />
                      <rect x="3" y="17" width="4" height="4" rx="0.5" strokeWidth={2} />
                      <rect x="10" y="17" width="4" height="4" rx="0.5" strokeWidth={2} />
                      <rect x="17" y="17" width="4" height="4" rx="0.5" strokeWidth={2} />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 진행률 배너 — 검색 중·완료 양쪽에 항상 표시 (레이아웃 시프트 없음) */}
        <SearchProgressBanner
          isLoading={isLoading}
          bunjangDone={bunjangDone}
          joongnaDone={joongnaDone}
          bunjangCount={bunjangCount}
          joongnaCount={joongnaCount}
          stats={stats}
        />


        {/* 모바일 필터 칩 바 */}
        <div className="md:hidden mb-4">
          <MobileFilterBar
            filter={filter}
            onChange={handleFilterChange}
            totalCount={allProducts.length}
            bunjangCount={bunjangCount}
            joongnaCount={joongnaCount}
          />
        </div>

        {/* 사이드바 + 그리드 레이아웃 */}
        <div className="flex gap-8">
          {/* 데스크탑 사이드바 (md 이상) */}
          <div className="hidden md:block">
            <FilterSidebar
              filter={filter}
              onChange={handleFilterChange}
              totalCount={allProducts.length}
              bunjangCount={bunjangCount}
              joongnaCount={joongnaCount}
            />
          </div>

          {/* 결과 그리드 */}
          <div className="flex-1 min-w-0">
            {isLoading && allProducts.length === 0 ? (
              /* 아직 아무 결과도 없으면 스켈레톤 */
              <div className={`grid ${cardSize === 'small' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'} gap-3`}>
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : !isLoading && filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-5xl mb-4">🔍</p>
                <p className="font-medium">검색 결과가 없습니다</p>
                <p className="text-sm mt-1">필터를 변경하거나 다른 키워드로 검색해보세요</p>
              </div>
            ) : (
              /* 하나라도 결과가 있으면 즉시 표시 (로딩 중에도) */
              <ResultGrid products={filtered} size={cardSize} />
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}
