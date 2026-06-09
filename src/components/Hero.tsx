'use client';

import SearchBar from '@/components/SearchBar';
import Logo from '@/components/Logo';
import { TRENDING_KEYWORDS } from '@/lib/popularKeywords';

interface Props {
  onSearch: (kw: string) => void;
}

// 검색 전 홈 화면
export default function Hero({ onSearch }: Props) {
  return (
    <main id="main-content" className="flex flex-col items-center justify-center min-h-[80dvh] px-4">
      <div className="w-full max-w-xl space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Logo size={56} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">중고모아</h1>
            <p className="text-gray-600 text-base">번개장터와 중고나라, 한 번에 비교하세요</p>
          </div>
        </div>
        <SearchBar onSearch={onSearch} isLoading={false} />
        {/* 인기 검색어 — 신규 사용자 진입점 */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {TRENDING_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => onSearch(kw)}
              className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              {kw}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">번개장터 · 중고나라를 동시에 검색합니다</p>
      </div>
    </main>
  );
}
