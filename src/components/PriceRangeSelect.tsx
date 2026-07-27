'use client';

import { PRICE_STEPS } from '@/lib/productFilter';
import type { FilterState } from '@/lib/types';

interface Props {
  min: number;
  max: number;
  onChange: (f: Partial<FilterState>) => void;
  size?: 'sm' | 'md';
}

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// 최소·최대 가격을 각각 독립 선택. value=0 은 '제한없음'.
// 모순 조합(최소 ≥ 최대)은 option을 disabled 처리해 원천 차단 → '100만 이상 전체'(최소 100만·최대 제한없음)도 자연스럽게 표현.
export default function PriceRangeSelect({ min, max, onChange, size = 'sm' }: Props) {
  const selectCls =
    size === 'sm'
      ? 'w-full appearance-none border border-gray-200 rounded-lg pl-2.5 pr-7 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-teal-400'
      : 'w-full appearance-none border border-gray-200 rounded-xl pl-3 pr-8 py-2.5 text-sm bg-white text-gray-700 focus:outline-none focus:border-teal-400';
  const labelCls = 'text-xs text-gray-400 w-7 shrink-0';
  const rows: { key: 'min' | 'max'; label: string; value: number }[] = [
    { key: 'min', label: '최소', value: min },
    { key: 'max', label: '최대', value: max },
  ];

  return (
    <div className={size === 'sm' ? 'space-y-2' : 'space-y-2.5'}>
      {rows.map((row) => (
        <label key={row.key} className="flex items-center gap-2">
          <span className={labelCls}>{row.label}</span>
          <div className="relative flex-1 min-w-0">
            <select
              aria-label={`${row.label} 가격`}
              value={row.value}
              onChange={(e) =>
                onChange(row.key === 'min' ? { priceMin: Number(e.target.value) } : { priceMax: Number(e.target.value) })
              }
              className={selectCls}
            >
              {PRICE_STEPS.map((s) => {
                // 최소는 현재 최대 이상 값 비활성, 최대는 현재 최소 이하 값 비활성 ('제한없음'=0 은 항상 허용)
                const disabled =
                  s.value !== 0 &&
                  (row.key === 'min' ? max !== 0 && s.value >= max : s.value <= min);
                return (
                  <option key={s.value} value={s.value} disabled={disabled}>
                    {s.label}
                  </option>
                );
              })}
            </select>
            <Chevron />
          </div>
        </label>
      ))}
    </div>
  );
}
