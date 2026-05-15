'use client';

import { useState, useEffect } from 'react';
import type { FilterState, SortOption, PriceStats } from '@/lib/types';

interface Props {
  filter: FilterState;
  onChange: (f: Partial<FilterState>) => void;
  totalCount: number;
  bunjangCount: number;
  joongnaCount: number;
  stats: PriceStats | null;
  isLoading?: boolean;
}

const PRICE_PRESETS = [
  { label: '전체', min: 0, max: 0 },
  { label: '~10만', min: 0, max: 100_000 },
  { label: '10~100만', min: 100_000, max: 1_000_000 },
  { label: '100~300만', min: 1_000_000, max: 3_000_000 },
  { label: '300만+', min: 3_000_000, max: 0 },
];

const SORTS: { value: SortOption; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'price-asc', label: '낮은가격순' },
  { value: 'price-desc', label: '높은가격순' },
];

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

export default function FilterSidebar({
  filter,
  onChange,
  totalCount,
  bunjangCount,
  joongnaCount,
  stats,
  isLoading,
}: Props) {
  const [localMin, setLocalMin] = useState(filter.priceMin ? String(filter.priceMin) : '');
  const [localMax, setLocalMax] = useState(filter.priceMax ? String(filter.priceMax) : '');

  // 프리셋 클릭 시 입력 필드 초기화
  useEffect(() => {
    setLocalMin(filter.priceMin ? String(filter.priceMin) : '');
    setLocalMax(filter.priceMax ? String(filter.priceMax) : '');
  }, [filter.priceMin, filter.priceMax]);

  function applyPriceInput() {
    onChange({
      priceMin: Number(localMin) || 0,
      priceMax: Number(localMax) || 0,
    });
  }

  const activePreset = PRICE_PRESETS.find(
    (p) => p.min === filter.priceMin && p.max === filter.priceMax
  );

  return (
    <aside className="w-52 shrink-0 space-y-5">
      {/* 가격 인사이트 */}
      {(stats || isLoading) && (
        <div className="bg-gray-50 rounded-xl p-3.5 space-y-2.5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            가격 인사이트
          </h3>
          {isLoading && !stats ? (
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
            </div>
          ) : stats ? (
            <div className="space-y-2">
              {[
                { label: '최저가', value: fmt(stats.min), color: 'text-blue-500' },
                { label: '평균가', value: fmt(stats.avg), color: 'text-teal-600' },
                { label: '최고가', value: fmt(stats.max), color: 'text-gray-700' },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{s.label}</span>
                  <span className={`text-xs font-semibold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* 플랫폼 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          플랫폼
        </h3>
        <div className="space-y-1.5">
          {[
            { value: 'all' as const, label: '전체', count: totalCount },
            { value: '번개장터' as const, label: '번개장터', count: bunjangCount },
            { value: '중고나라' as const, label: '중고나라', count: joongnaCount },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ platform: opt.value })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                filter.platform === opt.value
                  ? 'bg-teal-50 text-teal-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{opt.label}</span>
              <span
                className={`text-xs ${
                  filter.platform === opt.value ? 'text-teal-500' : 'text-gray-400'
                }`}
              >
                {opt.count.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 정렬 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          정렬
        </h3>
        <div className="space-y-1.5">
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => onChange({ sort: s.value })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                filter.sort === s.value
                  ? 'bg-teal-50 text-teal-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 가격 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          가격
        </h3>
        <div className="space-y-1.5">
          {PRICE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => onChange({ priceMin: p.min, priceMax: p.max })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activePreset?.label === p.label
                  ? 'bg-teal-50 text-teal-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="최소"
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyPriceInput()}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400"
            />
            <span className="text-gray-300 text-xs shrink-0">~</span>
            <input
              type="number"
              placeholder="최대"
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyPriceInput()}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400"
            />
          </div>
          <button
            onClick={applyPriceInput}
            className="w-full py-1.5 text-xs font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            적용
          </button>
        </div>
      </div>
    </aside>
  );
}
