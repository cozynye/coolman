'use client';

import { memo } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/types';

interface Props {
  product: Product;
  size?: 'large' | 'small';
  priority?: boolean;
}

const PLATFORM_STYLE = {
  번개장터: { bg: 'bg-red-500', label: '번개' },
  중고나라: { bg: 'bg-teal-500', label: '중고' },
} as const;

const FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext fill="%23aaa" font-size="60" font-family="sans-serif" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3E?%3C/text%3E%3C/svg%3E';

function formatCardDate(timestampSec: number): string {
  const d = new Date(timestampSec * 1000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

function ProductCard({ product, size = 'large', priority = false }: Props) {
  const { platform, title, price, priceNum, link, timestamp, update_time, image, status } = product;
  const badge = PLATFORM_STYLE[platform];
  // update_time이 있을 때만 실제 등록일 표시('' = 등록일 미상 → 날짜 숨김)
  const dateLabel = update_time ? formatCardDate(timestamp) : null;
  const soldOut = status !== '판매중';

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-gray-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1"
    >
      {/* 이미지 영역 */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={image || FALLBACK}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes={size === 'large' ? '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw' : '(max-width: 640px) 33vw, 16vw'}
          priority={priority}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
          unoptimized={!image || image.startsWith('data:')}
        />
        {/* 플랫폼 뱃지 — 색 + 2자 라벨로 식별성 강화 */}
        <span
          className={`absolute top-2 left-2 ${badge.bg} text-white text-[10px] font-bold leading-none px-1.5 py-1 rounded-md shadow-sm`}
          aria-label={platform}
          title={platform}
        >
          {badge.label}
        </span>
        {/* 판매완료 오버레이 */}
        {soldOut && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-md">{status}</span>
          </div>
        )}
      </div>

      {/* 정보 영역 */}
      <div className={size === 'small' ? 'p-2' : 'p-3'}>
        <p className={`text-gray-800 font-medium leading-snug mb-1.5 line-clamp-2 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
          {title}
        </p>
        <p className={`font-bold text-gray-900 ${size === 'small' ? 'text-base' : 'text-lg'}`}>
          {priceNum === 0 ? '가격 문의' : price}
        </p>
        <p className="text-gray-500 text-xs mt-1">{dateLabel ? `${dateLabel} · ${platform}` : platform}</p>
      </div>
    </a>
  );
}

export default memo(ProductCard);
