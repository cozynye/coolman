import { formatKRW } from '@/lib/format';
import type { PriceStats } from '@/lib/types';

interface Props {
  bunjang: PriceStats | null;
  joongna: PriceStats | null;
  compact?: boolean;
}

// 핵심 value prop: "어느 플랫폼이 평균 얼마 더 싼지" 비교. 두 플랫폼 모두 가격이 있어야 의미.
export default function PlatformPriceCompare({ bunjang, joongna, compact }: Props) {
  if (!bunjang || !joongna) return null;

  const diff = Math.abs(bunjang.avg - joongna.avg);
  const same = diff < 10_000; // 1만원 미만 차이는 "비슷"
  const cheaper = bunjang.avg <= joongna.avg ? '번개장터' : '중고나라';
  const cheaperColor = cheaper === '번개장터' ? 'text-red-500' : 'text-teal-600';

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-600">
        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
        {same ? (
          <span>두 플랫폼 평균가 비슷</span>
        ) : (
          <span>
            평균 <span className={`font-semibold ${cheaperColor}`}>{cheaper}</span>가 {formatKRW(diff)} 저렴
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-3.5 space-y-2.5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">플랫폼 평균가 비교</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400" />번개장터
          </span>
          <span className="text-xs font-semibold text-gray-800">{formatKRW(bunjang.avg)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-400" />중고나라
          </span>
          <span className="text-xs font-semibold text-gray-800">{formatKRW(joongna.avg)}</span>
        </div>
      </div>
      <p className="text-xs text-gray-600 pt-2 border-t border-gray-200">
        {same ? (
          '두 플랫폼 평균가가 비슷해요'
        ) : (
          <>
            <span className={`font-semibold ${cheaperColor}`}>{cheaper}</span>가 평균{' '}
            <span className="font-semibold">{formatKRW(diff)}</span> 저렴해요
          </>
        )}
      </p>
    </div>
  );
}
