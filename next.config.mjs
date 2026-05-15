import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.bunjang.co.kr' },
      { protocol: 'https', hostname: '**.joongna.com' },
      { protocol: 'https', hostname: 's3-ap-northeast-1.amazonaws.com' },
      { protocol: 'https', hostname: 'media.bunjang.co.kr' },
    ],
  },
};

export default nextConfig;
