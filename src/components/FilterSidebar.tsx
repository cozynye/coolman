'use client';

import type { FilterState, SortOption } from '@/lib/types';

interface Props {
  filter: FilterState;
  onChange: (f: Partial<FilterState>) => void;
  totalCount: number;
  bunjangCount: number;
  joongnaCount: number;
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

export default function FilterSidebar({
  filter,
  onChange,
  totalCount,
  bunjangCount,
  joongnaCount,
}: Props) {
  const activePreset = PRICE_PRESETS.find(
    (p) => p.min === filter.priceMin && p.max === filter.priceMax
  );

  return (
    <aside className="w-52 shrink-0 space-y-6">
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
        {/* 직접 입력 */}
        <div className="mt-3 flex items-center gap-1.5">
          <input
            type="number"
            placeholder="최소"
            value={filter.priceMin || ''}
            onChange={(e) => onChange({ priceMin: Number(e.target.value) || 0 })}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400"
          />
          <span className="text-gray-300 text-xs shrink-0">~</span>
          <input
            type="number"
            placeholder="최대"
            value={filter.priceMax || ''}
            onChange={(e) => onChange({ priceMax: Number(e.target.value) || 0 })}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400"
          />
        </div>
      </div>
    </aside>
  );
}
