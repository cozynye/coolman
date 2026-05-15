'use client';

import { useState, useEffect } from 'react';
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
  const [compact, setCompact] = useState(false);

  // 새 검색 시작 시 컴팩트 해제
  useEffect(() => {
    if (isLoading) setCompact(false);
  }, [isLoading]);

  // 완료 1.5초 후 컴팩트 전환
  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setCompact(true), 1500);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  const doneCount = (bunjangDone ? 1 : 0) + (joongnaDone ? 1 : 0);
  const progress = isLoading ? doneCount * 50 : 100;
  const totalCount = bunjangCount + joongnaCount;
  const isDone = { bunjang: bunjangDone, joongna: joongnaDone };
  const counts = { bunjang: bunjangCount, joongna: joongnaCount };

  // ── 컴팩트 바 (완료 후 축소 상태) ─────────────────────────────
  if (compact) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-3 text-sm animate-fadeIn">
        <span className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="flex items-center gap-2 text-gray-600 shrink-0">
          <span className="text-red-400 font-medium">번 {bunjangCount.toLocaleString()}</span>
          <span className="text-gray-300">·</span>
          <span className="text-teal-500 font-medium">중 {joongnaCount.toLocaleString()}</span>
        </span>
        {stats && (
          <>
            <span className="text-gray-200 shrink-0">|</span>
            <span className="text-gray-400 text-xs truncate">
              최저 {fmt(stats.min)} · 평균 {fmt(stats.avg)} · 최고 {fmt(stats.max)}
            </span>
          </>
        )}
      </div>
    );
  }

  // ── 풀 배너 (로딩 중 및 완료 직후) ──────────────────────────────
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 space-y-4 mb-5">
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
            <span className="text-xs sm:text-sm font-normal text-gray-400 ml-1">개 수집</span>
          </div>
        )}
      </div>

      {/* 프로그레스 바 */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-400">진행률</span>
          <span className={`font-semibold tabular-nums ${!isLoading ? 'text-teal-600' : 'text-teal-500'}`}>{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 가격 통계 (완료 후) */}
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

      {/* 플랫폼 카드 — 태블릿 이상 */}
      <div className="hidden sm:grid grid-cols-2 gap-3">
        {platforms.map((p) => {
          const done = isDone[p.key];
          const count = counts[p.key];
          return (
            <div key={p.name} className={`border rounded-xl p-3.5 flex items-center gap-3 transition-colors duration-300 ${done ? 'border-gray-200 bg-gray-50/60' : 'border-gray-100'}`}>
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

      {/* 모바일 인라인 플랫폼 요약 */}
      <div className="sm:hidden flex items-center gap-4 text-xs text-gray-500 pt-1 border-t border-gray-50">
        {platforms.map((p) => {
          const done = isDone[p.key];
          const count = counts[p.key];
          return (
            <span key={p.name} className={`flex items-center gap-1 ${done ? p.color : 'text-gray-400'}`}>
              {p.icon} {done ? `${count.toLocaleString()}개` : '검색 중...'}
            </span>
          );
        })}
      </div>
    </div>
  );
}
