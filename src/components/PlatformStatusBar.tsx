interface Props {
  bunjangCount: number;
  joongnaCount: number;
  bunjangDone: boolean;
  joongnaDone: boolean;
  bunjangFailed: boolean;
  joongnaFailed: boolean;
}

// 플랫폼별 결과 수/상태 표시 (항상 렌더 → 레이아웃 시프트 방지)
export default function PlatformStatusBar({
  bunjangCount,
  joongnaCount,
  bunjangDone,
  joongnaDone,
  bunjangFailed,
  joongnaFailed,
}: Props) {
  return (
    <div className="flex items-center gap-4 text-sm text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
        번개장터{' '}
        {!bunjangDone ? (
          <span className="text-gray-300 tracking-widest">···</span>
        ) : bunjangFailed ? (
          <span className="text-red-500">실패</span>
        ) : (
          `${bunjangCount.toLocaleString()}개`
        )}
      </span>
      <span className="text-gray-200">|</span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-teal-400" />
        중고나라{' '}
        {!joongnaDone ? (
          <span className="text-gray-300 tracking-widest">···</span>
        ) : joongnaFailed ? (
          <span className="text-red-500">실패</span>
        ) : (
          `${joongnaCount.toLocaleString()}개`
        )}
      </span>
    </div>
  );
}
