'use client';

import Image from 'next/image';
import type { Product } from '@/lib/types';

interface Props {
  product: Product;
  size?: 'large' | 'small';
}

const PLATFORM_STYLE = {
  번개장터: { bg: 'bg-red-500', accent: 'bg-red-400', label: '번' },
  중고나라: { bg: 'bg-teal-500', accent: 'bg-teal-400', label: '중' },
} as const;

const FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext fill="%23aaa" font-size="60" font-family="sans-serif" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3E?%3C/text%3E%3C/svg%3E';

function relativeTime(timestampSec: number): string {
  const diff = Math.floor(Date.now() / 1000 - timestampSec);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}주 전`;
  return `${Math.floor(diff / 2592000)}달 전`;
}

export default function ProductCard({ product, size = 'large' }: Props) {
  const { platform, title, price, priceNum, link, timestamp, image, status } = product;
  const badge = PLATFORM_STYLE[platform];

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
    >
      {/* 플랫폼 색상 accent 라인 */}
      <div className={`h-0.5 w-full ${badge.accent}`} />

      {/* 이미지 영역 */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={image || FALLBACK}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes={size === 'large' ? '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw' : '(max-width: 640px) 33vw, 16vw'}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
          unoptimized={!image || image.startsWith('data:')}
        />
        {/* 플랫폼 뱃지 */}
        <span className={`absolute top-2 left-2 ${badge.bg} text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm`}>
          {badge.label}
        </span>
        {/* 판매완료 오버레이 */}
        {status !== '판매중' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded">{status}</span>
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
        {/* text-xs = 12px, WCAG AA 준수 */}
        <p className="text-gray-400 text-xs mt-1">{relativeTime(timestamp)} · {platform}</p>
      </div>
    </a>
  );
}
