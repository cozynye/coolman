export default function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* 이미지 영역 */}
      <div className="aspect-square skeleton" />

      {/* 정보 영역 */}
      <div className="p-3 space-y-2">
        {/* 제목 2줄 */}
        <div className="skeleton h-3.5 rounded-md w-full" />
        <div className="skeleton h-3.5 rounded-md w-3/4" />
        {/* 가격 */}
        <div className="skeleton h-4 rounded-md w-1/2 mt-1" />
        {/* 날짜 */}
        <div className="skeleton h-2.5 rounded-md w-2/5" />
      </div>
    </div>
  );
}
