'use client';

import { useState, useEffect } from 'react';

interface Props {
  isLoading: boolean;
  bunjangDone: boolean;
  joongnaDone: boolean;
  bunjangCount: number;
  joongnaCount: number;
}

export default function SearchProgressBanner({
  isLoading,
  bunjangDone,
  joongnaDone,
  bunjangCount,
  joongnaCount,
}: Props) {
  const [visible, setVisible] = useState(true);

  // 로딩 시작 → 표시, 로딩 종료 → 1.2초 후 collapse (단일 effect)
  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(t);
  }, [isLoading]);

  const doneCount = (bunjangDone ? 1 : 0) + (joongnaDone ? 1 : 0);
  const progress = isLoading ? doneCount * 50 : 100;

  return (
    <div
      className={`overflow-hidden transition-all duration-500 ease-in-out ${
        visible ? 'max-h-24 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'
      }`}
    >
      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-gray-500">
            {isLoading ? (
              <svg className="w-3.5 h-3.5 animate-spin text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <span className="w-3.5 h-3.5 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            <span className="font-medium">{isLoading ? '검색 중...' : '검색 완료!'}</span>
          </span>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1 transition-colors ${bunjangDone ? 'text-red-400 font-medium' : 'text-gray-300'}`}>
              ⚡ {bunjangDone ? `${bunjangCount.toLocaleString()}개` : '···'}
            </span>
            <span className={`flex items-center gap-1 transition-colors ${joongnaDone ? 'text-teal-500 font-medium' : 'text-gray-300'}`}>
              🛒 {joongnaDone ? `${joongnaCount.toLocaleString()}개` : '···'}
            </span>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
