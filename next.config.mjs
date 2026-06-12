import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    // next/image는 현재 미사용(상품 썸네일은 순수 img + 플랫폼 CDN 자체 리사이즈 사용).
    // Vercel Hobby 이미지 변환 한도 초과 시 402(OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED)로
    // 이미지가 깨졌던 이력이 있어, 향후 next/image를 다시 쓰더라도 옵티마이저는 타지 않도록 가드.
    unoptimized: true,
  },
};

export default nextConfig;
