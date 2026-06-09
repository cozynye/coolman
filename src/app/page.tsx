'use client';

import { useState, Suspense } from 'react';
import Logo from '@/components/Logo';
import SearchBar from '@/components/SearchBar';
import SearchProgressBar from '@/components/SearchProgressBar';
import FilterSidebar from '@/components/FilterSidebar';
import MobileFilterBar from '@/components/MobileFilterBar';
import PlatformStatusBar from '@/components/PlatformStatusBar';
import PlatformPriceCompare from '@/components/PlatformPriceCompare';
import ResultGrid from '@/components/ResultGrid';
import SkeletonCard from '@/components/SkeletonCard';
import ScrollToTop from '@/components/ScrollToTop';
import Hero from '@/components/Hero';
import { TRENDING_KEYWORDS } from '@/lib/popularKeywords';
import { formatKRW } from '@/lib/format';
import { useSearchResults } from '@/hooks/useSearchResults';

const GRID_COLS = {
  large: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5',
  small: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-7',
} as const;

function Spinner({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin text-teal-400`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function HomePageInner() {
  const r = useSearchResults();
  const [copied, setCopied] = useState(false);

  // 검색 전 홈 화면
  if (!r.keyword) return <Hero onSearch={r.handleSearch} />;

  const hasActiveFilter =
    r.filter.platform !== 'all' || r.filter.sort !== 'latest' || r.filter.priceMin > 0 || r.filter.priceMax > 0;
  const bothFailed = r.bunjangFailed && r.joongnaFailed;
  const onePlatformFailed = r.bunjangFailed !== r.joongnaFailed;
  // 부분 결과가 도착했는지(한쪽이라도) → 헤더에 '검색 중'이 아니라 카운트 노출
  const hasAnyResult = r.allProducts.length > 0;

  function copyLink() {
    navigator.clipboard
      .writeText(`${location.origin}/?q=${encodeURIComponent(r.keyword)}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <div className="min-h-screen bg-gray-50 animate-fadeIn">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-3 sm:px-4 py-[13px] sm:py-3 flex items-center gap-2 sm:gap-3">
          <button
            onClick={r.goHome}
            aria-label="중고모아 홈으로"
            className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <Logo size={28} />
            <span className="hidden sm:block text-gray-900 font-bold text-sm sm:text-base">중고모아</span>
          </button>
          <div className="flex-1 min-w-0">
            {/* key={keyword} → 검색어 변경 시 리마운트해 현재 검색어를 input에 채움 */}
            <SearchBar key={r.keyword} onSearch={r.handleSearch} isLoading={r.isLoading} compact initialValue={r.keyword} />
          </div>
        </div>
        {/* 진행바 — 헤더 하단 absolute(레이아웃 시프트 없음) */}
        <SearchProgressBar isLoading={r.isLoading} bunjangDone={r.bunjangDone} joongnaDone={r.joongnaDone} />
      </header>

      {/* 본문 */}
      <main id="main-content" className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 py-6">
        {/* 결과 요약 + 공유/뷰토글 */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              &ldquo;{r.keyword}&rdquo;
              {r.isLoading && !hasAnyResult ? (
                <span className="text-sm font-normal text-gray-500 flex items-center gap-1.5">
                  <Spinner />
                  검색 중...
                </span>
              ) : (
                <span className="text-base font-normal text-gray-500 flex items-center gap-1.5">
                  {r.filtered.length.toLocaleString()}개
                  {r.isLoading && <Spinner />}
                </span>
              )}
            </h2>
            {/* 결과 상태 스크린리더 안내 */}
            <span className="sr-only" aria-live="polite">
              {r.isLoading ? `${r.keyword} 검색 중` : `${r.keyword} 검색 결과 ${r.filtered.length}개`}
            </span>
            <PlatformStatusBar
              bunjangCount={r.bunjangCount}
              joongnaCount={r.joongnaCount}
              bunjangDone={r.bunjangDone}
              joongnaDone={r.joongnaDone}
              bunjangFailed={r.bunjangFailed}
              joongnaFailed={r.joongnaFailed}
            />
          </div>

          {/* 공유 + 뷰 사이즈 토글 */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={copyLink}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label="검색결과 링크 복사"
                title="링크 복사"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              {copied && (
                <span className="absolute top-full right-0 mt-1 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap shadow-lg z-40" role="status">
                  링크 복사됨!
                </span>
              )}
            </div>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              {(['large', 'small'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => r.setCardSize(s)}
                  aria-pressed={r.cardSize === s}
                  className={`p-2 transition-colors ${
                    r.cardSize === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
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

        {/* 한쪽 플랫폼만 실패 → 비교의 절반이 누락됐음을 명시 */}
        {!r.isLoading && onePlatformFailed && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" role="alert">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="flex-1 text-sm text-amber-800">
              <span className="font-semibold">{r.bunjangFailed ? '번개장터' : '중고나라'}</span> 결과를 불러오지 못했어요.{' '}
              <span className="text-amber-700">{r.bunjangFailed ? '중고나라' : '번개장터'} 결과만 표시 중입니다.</span>
            </p>
            <button
              onClick={() => r.handleSearch(r.keyword)}
              className="shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 모바일 필터 칩 바 + 가격 인사이트 */}
        <div className="md:hidden mb-4 space-y-2.5">
          <MobileFilterBar
            filter={r.filter}
            onChange={r.onFilterChange}
            totalCount={r.allProducts.length}
            bunjangCount={r.bunjangCount}
            joongnaCount={r.joongnaCount}
          />
          {r.stats && (
            <div className="space-y-1.5 bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>최저 <span className="font-semibold text-blue-600">{formatKRW(r.stats.min)}</span></span>
                <span className="text-gray-300">·</span>
                <span>평균 <span className="font-semibold text-teal-600">{formatKRW(r.stats.avg)}</span></span>
                <span className="text-gray-300">·</span>
                <span>최고 <span className="font-semibold text-gray-700">{formatKRW(r.stats.max)}</span></span>
              </div>
              <PlatformPriceCompare bunjang={r.bunjangStats} joongna={r.joongnaStats} compact />
            </div>
          )}
        </div>

        {/* 사이드바 + 그리드 */}
        <div className="flex gap-8">
          <div className="hidden md:block">
            <FilterSidebar
              filter={r.filter}
              onChange={r.onFilterChange}
              totalCount={r.allProducts.length}
              bunjangCount={r.bunjangCount}
              joongnaCount={r.joongnaCount}
              stats={r.stats}
              bunjangStats={r.bunjangStats}
              joongnaStats={r.joongnaStats}
              isLoading={r.isLoading}
            />
          </div>

          <div className="flex-1 min-w-0">
            {r.isLoading && !hasAnyResult ? (
              <div className={`grid ${GRID_COLS[r.cardSize]} gap-3 lg:gap-4`}>
                {Array.from({ length: r.cardSize === 'small' ? 18 : 12 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : !r.isLoading && bothFailed ? (
              <div className="text-center py-16">
                <p className="text-5xl mb-4">😵</p>
                <p className="font-medium text-gray-700">검색에 실패했습니다</p>
                <p className="text-sm mt-1 text-gray-500 mb-6">네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요</p>
                <button
                  onClick={() => r.handleSearch(r.keyword)}
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  다시 검색
                </button>
              </div>
            ) : !r.isLoading && r.filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-5xl mb-4">🔍</p>
                <p className="font-medium text-gray-700">검색 결과가 없습니다</p>
                <p className="text-sm mt-1 mb-6">
                  {hasActiveFilter
                    ? '필터를 바꾸거나 다른 키워드로 검색해보세요'
                    : '다른 키워드로 검색하거나 아래 인기 검색어를 눌러보세요'}
                </p>
                {hasActiveFilter && (
                  <button
                    onClick={() => r.onFilterChange({ platform: 'all', sort: 'latest', priceMin: 0, priceMax: 0 })}
                    className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 transition-colors mb-6"
                  >
                    필터 초기화
                  </button>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
                  {TRENDING_KEYWORDS.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => r.handleSearch(kw)}
                      className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // key={keyword} → 새 검색 시 페이지네이션 초기화
              <ResultGrid key={r.keyword} products={r.filtered} size={r.cardSize} />
            )}
          </div>
        </div>
      </main>

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
