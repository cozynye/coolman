'use client';

import { useState } from 'react';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/lib/types';

const PAGE_SIZE = 40;

interface Props {
  products: Product[];
  size: 'large' | 'small';
}

export default function ResultGrid({ products, size }: Props) {
  const [page, setPage] = useState(1);
  const visible = products.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < products.length;

  const cols =
    size === 'small'
      ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-7'
      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5';

  // 첫 줄 카드는 priority(LCP 개선)
  const eager = size === 'small' ? 6 : 4;

  return (
    <div>
      <div className={`grid ${cols} gap-3 lg:gap-4`}>
        {visible.map((p, i) => (
          // key는 안정 식별자(플랫폼+link)만 사용 → 정렬/필터 토글 시 memo·이미지 캐시 유지
          <ProductCard key={`${p.platform}-${p.link}`} product={p} size={size} priority={i < eager} />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setPage((n) => n + 1)}
          className="mt-6 w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          더 보기 ({(products.length - visible.length).toLocaleString()}개 남음)
        </button>
      )}
      {!hasMore && products.length > 0 && (
        <p className="mt-6 text-center text-xs text-gray-500">모든 결과를 불러왔습니다</p>
      )}
    </div>
  );
}
