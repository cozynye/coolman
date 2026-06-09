'use client';

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import Logo from '@/components/Logo';
import { recentStore } from '@/lib/recentStore';
import { bunjangStore, joongnaStore } from '@/lib/platformStore';
import { usePlatformSearch } from '@/hooks/usePlatformSearch';
import { TRENDING_KEYWORDS } from '@/lib/popularKeywords';
import ProductCard from '@/components/ProductCard';
import SkeletonCard from '@/components/SkeletonCard';
import SearchProgressBar from '@/components/SearchProgressBar';
import FilterSidebar from '@/components/FilterSidebar';
import type { Product, FilterState, PriceStats } from '@/lib/types';

// ─── 필터·정렬 로직 ────────────────────────────────────────────────
function applyFilter(products: Product[], filter: FilterState): Product[] {
  const filtered = products.filter((p) => {
    if (filter.platform !== 'all' && p.platform !== filter.platform) return false;
    if (filter.priceMin > 0 && p.priceNum < filter.priceMin) return false;
    if (filter.priceMax > 0 && p.priceNum > filter.priceMax) return false;
    return true;
  });

  if (filter.sort === 'price-asc') return [...filtered].sort((a, b) => a.priceNum - b.priceNum);
  if (filter.sort === 'price-desc') return [...filtered].sort((a, b) => b.priceNum - a.priceNum);

  // 기본(혼합순): 특정 플랫폼 선택 시 API 순서 그대로, 전체일 때 교차 병합
  if (filter.platform !== 'all') return filtered;

  // 교차 병합: 번개1 중고1 번개2 중고2 … (각 플랫폼 API 관련도순 유지)
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
  if (n >= 100_000_000) {
    const eok = Math.floor(n / 100_000_000);
    const man = Math.round((n % 100_000_000) / 10_000);
    return man > 0 ? `${eok}억 ${man}만원` : `${eok}억원`;
  }
  if (n >= 10_000) {
    const man = n / 10_000;
    return (Number.isInteger(man) ? man : man.toFixed(1)) + '만원';
  }
  return n.toLocaleString() + '원';
}

// ─── 플랫폼 상태 표시 (항상 렌더링 — 레이아웃 시프트 방지) ──────
function PlatformStatusBar({
  meta,
  bunjangCount,
  joongnaCount,
  bunjangDone,
  joongnaDone,
}: {
  meta: { bunjang: 'success' | 'failed'; joonggo: 'success' | 'failed' };
  bunjangCount: number;
  joongnaCount: number;
  bunjangDone: boolean;
  joongnaDone: boolean;
}) {
  return (
    <div className="flex items-center gap-4 text-sm text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
        번개장터{' '}
        {!bunjangDone
          ? <span className="text-gray-300 tracking-widest">···</span>
          : meta.bunjang === 'failed' ? '실패' : `${bunjangCount.toLocaleString()}개`}
      </span>
      <span className="text-gray-200">|</span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-teal-400" />
        중고나라{' '}
        {!joongnaDone
          ? <span className="text-gray-300 tracking-widest">···</span>
          : meta.joonggo === 'failed' ? '실패' : `${joongnaCount.toLocaleString()}개`}
      </span>
    </div>
  );
}

// ─── 스크롤 투 탑 버튼 ───────────────────────────────────────────
function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handle = () => setShow(window.scrollY > 500);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-4 z-40 w-10 h-10 bg-white border border-gray-200 shadow-lg rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
      aria-label="맨 위로"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}

// ─── 모바일 인라인 필터 칩 바 ────────────────────────────────────
const MOBILE_PRICE_PRESETS = [
  { label: '전체', min: 0, max: 0 },
  { label: '~10만', min: 0, max: 100_000 },
  { label: '10~100만', min: 100_000, max: 1_000_000 },
  { label: '100~300만', min: 1_000_000, max: 3_000_000 },
  { label: '300만+', min: 3_000_000, max: 0 },
];

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
    { value: 'latest' as const, label: '혼합순' },
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
          <div
            className="relative bg-white rounded-t-3xl px-5 pt-4 space-y-5 animate-slideUp"
            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
          >
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

            {/* 가격대 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">가격대</p>
              <div className="grid grid-cols-3 gap-2">
                {MOBILE_PRICE_PRESETS.map((p) => {
                  const active = filter.priceMin === p.min && filter.priceMax === p.max;
                  return (
                    <button
                      key={p.label}
                      onClick={() => onChange({ priceMin: p.min, priceMax: p.max })}
                      className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                        active
                          ? 'bg-teal-500 text-white border-teal-500'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
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
        <div className="flex flex-col items-center gap-3">
          <Logo size={56} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">중고모아</h1>
            <p className="text-gray-500 text-base">번개장터와 중고나라, 한 번에 비교하세요</p>
          </div>
        </div>
        <SearchBar onSearch={onSearch} isLoading={isLoading} />
        {/* 인기 검색어 — 신규 사용자 진입점 */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {TRENDING_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => onSearch(kw)}
              className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>
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
      ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-7'
      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5';

  // 첫 줄 카드는 priority(LCP 개선)
  const eager = size === 'small' ? 6 : 4;

  return (
    <div>
      <div className={`grid ${cols} gap-3 lg:gap-4`}>
        {visible.map((p, i) => (
          <ProductCard key={`${p.platform}-${p.link}-${i}`} product={p} size={size} priority={i < eager} />
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
  // URL(?q=)이 검색어의 단일 진실원천(SSOT). 검색·뒤로가기·앞으로가기·공유링크가
  // 모두 useSearchParams로 수렴한다(Next 라우터가 pushState/popstate를 동기화).
  const keyword = searchParams.get('q') ?? '';

  const [cardSize, setCardSize] = useState<'large' | 'small'>('large');
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    platform: 'all',
    sort: 'latest',
    priceMin: 0,
    priceMax: 0,
  });

  // 플랫폼별 데이터는 외부 스토어 구독으로 파생(progressive rendering: 먼저 온 쪽이 즉시 갱신)
  const bunjang = usePlatformSearch(bunjangStore, keyword);
  const joongna = usePlatformSearch(joongnaStore, keyword);

  // keyword 변경 → fetch 트리거 + 최근검색 저장 + 필터 초기화 (유일한 데이터 effect)
  useEffect(() => {
    if (!keyword) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    setFilter({ platform: 'all', sort: 'latest', priceMin: 0, priceMax: 0 });
    recentStore.save(keyword);
    bunjangStore.ensure(keyword);
    joongnaStore.ensure(keyword);
  }, [keyword]);

  // 동적 document.title (검색어 반영 → Google 검색 결과 title 개선)
  useEffect(() => {
    document.title = keyword
      ? `${keyword} 중고 | 번개장터·중고나라 통합검색 - 중고모아`
      : '중고모아 - 중고나라 × 번개장터 통합 검색';
  }, [keyword]);

  const handleSearch = useCallback((kw: string) => {
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
  }, [keyword]);

  const goHome = useCallback(() => {
    window.history.pushState({}, '', '/');
  }, []);

  const handleFilterChange = useCallback((partial: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...partial }));
  }, []);

  // 스토어 상태에서 파생 (idle = effect 실행 전 → 로딩으로 취급해 '결과 없음' 깜빡임 방지)
  const bunjangProducts = bunjang.data;
  const joongnaProducts = joongna.data;
  const bunjangPending = !!keyword && (bunjang.status === 'idle' || bunjang.status === 'loading');
  const joongnaPending = !!keyword && (joongna.status === 'idle' || joongna.status === 'loading');
  const bunjangDone = bunjang.status === 'success' || bunjang.status === 'failed';
  const joongnaDone = joongna.status === 'success' || joongna.status === 'failed';
  const bunjangFailed = bunjang.status === 'failed';
  const joongnaFailed = joongna.status === 'failed';
  const isLoading = bunjangPending || joongnaPending;

  const allProducts = useMemo(
    () => [...bunjangProducts, ...joongnaProducts],
    [bunjangProducts, joongnaProducts]
  );
  const filtered = useMemo(() => applyFilter(allProducts, filter), [allProducts, filter]);
  const stats = useMemo(() => calcStats(filtered), [filtered]);

  const bunjangCount = bunjangProducts.length;
  const joongnaCount = joongnaProducts.length;

  // 검색 전 홈 화면 (keyword 없음)
  if (!keyword) {
    return <Hero onSearch={handleSearch} isLoading={false} />;
  }

  // 검색 중 또는 결과 화면 (레이아웃 공유)
  return (
    <div className="min-h-screen bg-gray-50 animate-fadeIn">
      {/* 헤더 — 모바일: 더 작고 컴팩트, 데스크탑: 여유 있는 높이 */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-3 sm:px-4 py-[13px] sm:py-3 flex items-center gap-2 sm:gap-3">
          <button
            onClick={goHome}
            aria-label="중고모아 홈으로"
            className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <Logo size={28} />
            {/* 모바일(< 640px)에서 텍스트 숨김 → 로고만 표시해서 검색바 공간 확보 */}
            <span className="hidden sm:block text-gray-900 font-bold text-sm sm:text-base">중고모아</span>
          </button>
          <div className="flex-1 min-w-0">
            {/* key={keyword} → 검색어 변경 시 리마운트해 현재 검색어를 input에 채움(모바일 재검색 편의) */}
            <SearchBar key={keyword} onSearch={handleSearch} isLoading={isLoading} compact initialValue={keyword} />
          </div>
        </div>
        {/* 검색 진행바 — 헤더 하단 absolute(레이아웃 시프트 없음) */}
        <SearchProgressBar isLoading={isLoading} bunjangDone={bunjangDone} joongnaDone={joongnaDone} />
      </header>

      {/* 본문 */}
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 py-6">
        {/* 결과 요약 */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2" aria-live="polite" aria-atomic="true">
              &ldquo;{keyword}&rdquo;
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
            <PlatformStatusBar
              meta={{
                bunjang: bunjangFailed ? 'failed' : 'success',
                joonggo: joongnaFailed ? 'failed' : 'success',
              }}
              bunjangCount={bunjangCount}
              joongnaCount={joongnaCount}
              bunjangDone={bunjangDone}
              joongnaDone={joongnaDone}
            />
          </div>

          {/* 뷰 사이즈 토글 + 공유 */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={async () => {
                  const url = `${location.origin}/?q=${encodeURIComponent(keyword)}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    /* ignore */
                  }
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label="검색결과 링크 복사"
                title="링크 복사"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              {copied && (
                <span className="absolute top-full right-0 mt-1 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap shadow-lg z-40">
                  링크 복사됨!
                </span>
              )}
            </div>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
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

        {/* 한쪽 플랫폼만 실패 → 비교의 절반이 누락됐음을 명시(핵심 가치 보호) */}
        {!isLoading && bunjangFailed !== joongnaFailed && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" role="alert">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="flex-1 text-sm text-amber-800">
              <span className="font-semibold">{bunjangFailed ? '번개장터' : '중고나라'}</span> 결과를 불러오지 못했어요.{' '}
              <span className="text-amber-600">{bunjangFailed ? '중고나라' : '번개장터'} 결과만 표시 중입니다.</span>
            </p>
            <button
              onClick={() => handleSearch(keyword)}
              className="shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 모바일 필터 칩 바 */}
        <div className="md:hidden mb-4 space-y-2.5">
          <MobileFilterBar
            filter={filter}
            onChange={handleFilterChange}
            totalCount={allProducts.length}
            bunjangCount={bunjangCount}
            joongnaCount={joongnaCount}
          />
          {/* 모바일 가격 인사이트 strip */}
          {stats && (
            <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span>최저 <span className="font-semibold text-blue-500">{fmt(stats.min)}</span></span>
              <span className="text-gray-200">·</span>
              <span>평균 <span className="font-semibold text-teal-600">{fmt(stats.avg)}</span></span>
              <span className="text-gray-200">·</span>
              <span>최고 <span className="font-semibold text-gray-700">{fmt(stats.max)}</span></span>
            </div>
          )}
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
              stats={stats}
              isLoading={isLoading}
            />
          </div>

          {/* 결과 그리드 */}
          <div className="flex-1 min-w-0">
            {isLoading && allProducts.length === 0 ? (
              /* 아직 결과 없음 → 스켈레톤 */
              <div className={`grid ${cardSize === 'small' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-7' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5'} gap-3 lg:gap-4`}>
                {Array.from({ length: cardSize === 'small' ? 18 : 12 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : !isLoading && bunjangFailed && joongnaFailed ? (
              /* 양쪽 플랫폼 모두 실패 → 에러 상태 */
              <div className="text-center py-16">
                <p className="text-5xl mb-4">😵</p>
                <p className="font-medium text-gray-700">검색에 실패했습니다</p>
                <p className="text-sm mt-1 text-gray-400 mb-6">
                  네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요
                </p>
                <button
                  onClick={() => handleSearch(keyword)}
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  다시 검색
                </button>
              </div>
            ) : !isLoading && filtered.length === 0 ? (
              /* 결과 없음 → 회복 경로(인기검색어/필터초기화) */
              <div className="text-center py-16 text-gray-400">
                <p className="text-5xl mb-4">🔍</p>
                <p className="font-medium text-gray-600">검색 결과가 없습니다</p>
                <p className="text-sm mt-1 mb-6">
                  {(filter.platform !== 'all' || filter.sort !== 'latest' || filter.priceMin > 0 || filter.priceMax > 0)
                    ? '필터를 바꾸거나 다른 키워드로 검색해보세요'
                    : '다른 키워드로 검색하거나 아래 인기 검색어를 눌러보세요'}
                </p>
                {(filter.platform !== 'all' || filter.sort !== 'latest' || filter.priceMin > 0 || filter.priceMax > 0) && (
                  <button
                    onClick={() => handleFilterChange({ platform: 'all', sort: 'latest', priceMin: 0, priceMax: 0 })}
                    className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 transition-colors mb-6"
                  >
                    필터 초기화
                  </button>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
                  {TRENDING_KEYWORDS.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => handleSearch(kw)}
                      className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* 결과 표시 (로딩 중 partial 포함). key={keyword} → 새 검색 시 페이지네이션 초기화 */
              <ResultGrid key={keyword} products={filtered} size={cardSize} />
            )}
          </div>
        </div>
      </div>

      <ScrollToTop />
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
