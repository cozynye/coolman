'use client';

import { useState, useEffect } from 'react';

interface Props {
  isLoading: boolean;
  bunjangDone: boolean;
  joongnaDone: boolean;
}

// sticky 헤더 하단에 absolute로 붙는 얇은 진행바.
// 레이아웃 흐름을 차지하지 않아(absolute) 검색 시작/종료 시 레이아웃 시프트가 없다.
export default function SearchProgressBar({ isLoading, bunjangDone, joongnaDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      return;
    }
    // 완료 후 잠깐 100%를 보여주고 페이드아웃
    const t = setTimeout(() => setVisible(false), 450);
    return () => clearTimeout(t);
  }, [isLoading]);

  const doneCount = (bunjangDone ? 1 : 0) + (joongnaDone ? 1 : 0);
  const progress = isLoading ? Math.max(10, doneCount * 50) : 100;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-[width] duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
