'use client';

import { formatKRW } from '@/lib/format';
import { SORTS } from '@/lib/productFilter';
import PlatformPriceCompare from '@/components/PlatformPriceCompare';
import PriceRangeSelect from '@/components/PriceRangeSelect';
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
        <PriceRangeSelect min={filter.priceMin} max={filter.priceMax} onChange={onChange} />
      </div>
    </aside>
  );
}
