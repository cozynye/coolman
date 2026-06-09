'use client';

import { useState } from 'react';
import { formatKRW } from '@/lib/format';
import { SORTS, PRICE_PRESETS } from '@/lib/productFilter';
import PlatformPriceCompare from '@/components/PlatformPriceCompare';
import type { FilterState, PriceStats } from '@/lib/types';

interface Props {
  filter: FilterState;
  onChange: (f: Partial<FilterState>) => void;
  totalCount: number;
  bunjangCount: number;
  joongnaCount: number;
  stats: PriceStats | null;
  bunjangStats: PriceStats | null;
  joongnaStats: PriceStats | null;
  isLoading?: boolean;
}

// 가격 직접입력 — draft 값을 자체 보유, '적용' 시에만 onApply.
// 프리셋 변경 시 부모가 key로 리마운트 → props→state 동기화 effect 불필요.
function PriceInputs({
  initialMin,
  initialMax,
  onApply,
}: {
  initialMin: number;
  initialMax: number;
  onApply: (min: number, max: number) => void;
}) {
  const [min, setMin] = useState(initialMin ? String(initialMin) : '');
  const [max, setMax] = useState(initialMax ? String(initialMax) : '');
  const apply = () => onApply(Number(min) || 0, Number(max) || 0);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          placeholder="최소"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          aria-label="최소 가격"
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400"
        />
        <span className="text-gray-400 text-xs shrink-0">~</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="최대"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          aria-label="최대 가격"
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400"
        />
      </div>
      <button
        onClick={apply}
        className="w-full py-1.5 text-xs font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
      >
        적용
      </button>
    </div>
  );
}

export default function FilterSidebar({
  filter,
  onChange,
  totalCount,
  bunjangCount,
  joongnaCount,
  stats,
  bunjangStats,
  joongnaStats,
  isLoading,
}: Props) {
  const activePreset = PRICE_PRESETS.find((p) => p.min === filter.priceMin && p.max === filter.priceMax);

  return (
    <aside className="w-52 shrink-0 space-y-5">
      {/* 가격 인사이트 */}
      {(stats || isLoading) && (
        <div className="bg-gray-50 rounded-xl p-3.5 space-y-2.5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">가격 인사이트</h3>
          {isLoading && !stats ? (
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
            </div>
          ) : stats ? (
            <div className="space-y-2">
              {[
                { label: '최저가', value: formatKRW(stats.min), color: 'text-blue-600' },
                { label: '평균가', value: formatKRW(stats.avg), color: 'text-teal-600' },
                { label: '최고가', value: formatKRW(stats.max), color: 'text-gray-700' },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <span className={`text-xs font-semibold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* 플랫폼 평균가 비교 — 핵심 value prop */}
      <PlatformPriceCompare bunjang={bunjangStats} joongna={joongnaStats} />

      {/* 플랫폼 필터 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">플랫폼</h3>
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
              <span className={`text-xs ${filter.platform === opt.value ? 'text-teal-600' : 'text-gray-500'}`}>
                {opt.count.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 정렬 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">정렬</h3>
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
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">가격</h3>
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
        {/* key로 리마운트 → 프리셋 변경 시 draft 초기화 */}
        <PriceInputs
          key={`${filter.priceMin}-${filter.priceMax}`}
          initialMin={filter.priceMin}
          initialMax={filter.priceMax}
          onApply={(min, max) => onChange({ priceMin: min, priceMax: max })}
        />
      </div>
    </aside>
  );
}
