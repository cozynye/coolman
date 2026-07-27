'use client';

import { useState, useEffect } from 'react';
import { SORTS } from '@/lib/productFilter';
import PriceRangeSelect from '@/components/PriceRangeSelect';
import type { FilterState } from '@/lib/types';

interface Props {
  filter: FilterState;
  onChange: (f: Partial<FilterState>) => void;
  totalCount: number;
  bunjangCount: number;
  joongnaCount: number;
}

export default function MobileFilterBar({
  filter,
  onChange,
  totalCount,
  bunjangCount,
  joongnaCount,
}: Props) {
  const [open, setOpen] = useState(false);

  // 시트 열림 동안 배경 스크롤 잠금 + Escape 닫기 (a11y)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const sortActive = filter.sort !== 'latest';
  const platformActive = filter.platform !== 'all';
  const priceActive = filter.priceMin > 0 || filter.priceMax > 0;
  const anyActive = sortActive || platformActive || priceActive;

  const sortLabel = SORTS.find((s) => s.value === filter.sort)?.label ?? '혼합순';
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
        className={`flex items-center gap-1 shrink-0 px-3 py-2 rounded-full border text-xs font-medium transition-colors ${
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
            className="flex items-center shrink-0 px-3 py-2 rounded-full border border-gray-200 text-xs text-gray-500 bg-white"
          >
            초기화
          </button>
        )}
      </div>

      {/* 바텀 시트 */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="검색 필터">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className="relative bg-white rounded-t-3xl px-5 pt-4 space-y-5 animate-slideUp max-h-[85dvh] overflow-y-auto"
            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="필터 닫기"
              className="block w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-2"
            />

            {/* 플랫폼 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">플랫폼</p>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">정렬</p>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">가격대</p>
              <PriceRangeSelect min={filter.priceMin} max={filter.priceMax} onChange={onChange} size="md" />
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
