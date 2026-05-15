'use client';

import type { PriceStats } from '@/lib/types';

interface Props {
  isLoading: boolean;
  bunjangDone: boolean;
  joongnaDone: boolean;
  bunjangCount: number;
  joongnaCount: number;
  stats: PriceStats | null;
}

function fmt(n: number) {
  return n >= 10000
    ? (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + '만원'
    : n.toLocaleString() + '원';
}

const platforms = [
  { key: 'bunjang' as const, name: '번개장터', icon: '⚡', color: 'text-red-400' },
  { key: 'joongna' as const, name: '중고나라', icon: '🛒', color: 'text-teal-500' },
];

export default function SearchProgressBanner({
  isLoading,
  bunjangDone,
  joongnaDone,
  bunjangCount,
  joongnaCount,
  stats,
}: Props) {
  const doneCount = (bunjangDone ? 1 : 0) + (joongnaDone ? 1 : 0);
  // 로딩 중이면 실제 진행률, 완료면 항상 100%
  const progress = isLoading ? doneCount * 50 : 100;
  const totalCount = bunjangCount + joongnaCount;

  const isDone = { bunjang: bunjangDone, joongna: joongnaDone };
  const counts = { bunjang: bunjangCount, joongna: joongnaCount };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 space-y-4 mb-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            {!isLoading ? (
              <span className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            ) : (
              <svg className="w-4 h-4 animate-spin text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {!isLoading ? '검색 완료!' : '검색 중...'}
          </h3>
          <p className="text-sm text-gray-400 mt-0.5 ml-6">번개장터 · 중고나라 동시 검색</p>
        </div>
        {!isLoading && (
          <div className="text-right shrink-0">
            <span className="text-lg sm:text-2xl font-bold text-gray-900 tabular-nums">{totalCount.toLocaleString()}</span>
            <span className="text-xs sm:text-sm font-normal text-gray-400 ml-1">개 발견</span>
          </div>
        )}
      </div>

      {/* 프로그레스 바 */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-400">진행률</span>
          <span className={`font-semibold tabular-nums ${!isLoading ? 'text-teal-600' : 'text-teal-500'}`}>
            {progress}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 가격 통계 — 완료 후 프로그레스 바 자리에 흡수 (레이아웃 시프트 제거) */}
      {!isLoading && stats && (
        <div className="flex gap-2 pt-1 border-t border-gray-50">
          {[
            { label: '최저가', value: fmt(stats.min) },
            { label: '평균가', value: fmt(stats.avg) },
            { label: '최고가', value: fmt(stats.max) },
          ].map((s) => (
            <div key={s.label} className="flex-1 text-center">
              <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
              <p className="font-bold text-gray-900 text-sm">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 플랫폼 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {platforms.map((p) => {
          const done = isDone[p.key];
          const count = counts[p.key];
          return (
            <div
              key={p.name}
              className={`border rounded-xl p-3.5 flex items-center gap-3 transition-colors duration-300 ${
                done ? 'border-gray-200 bg-gray-50/60' : 'border-gray-100'
              }`}
            >
              <span className="text-xl leading-none">{p.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-700">{p.name}</p>
                <p className={`text-xs mt-0.5 flex items-center gap-1 ${done ? p.color : 'text-gray-400'}`}>
                  {done ? (
                    <>
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {count.toLocaleString()}개
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      검색 중
                    </>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
