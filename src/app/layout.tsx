import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#14b8a6',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: '중고모아 - 중고나라 × 번개장터 통합 검색',
  description: '중고나라와 번개장터를 한 번에 검색하세요. 중고 물품을 쉽고 빠르게 비교할 수 있는 통합 검색 서비스입니다.',
  keywords: '중고모아, 중고나라, 번개장터, 중고거래, 통합검색',
  authors: [{ name: '중고모아' }],
  openGraph: {
    type: 'website',
    title: '중고모아 - 중고나라 × 번개장터 통합 검색',
    description: '중고나라와 번개장터를 한 번에 검색하는 통합 검색 서비스',
    url: 'https://coolman-junggo.vercel.app/',
    siteName: '중고모아',
  },
  icons: {
    icon: '/images/junggo-icon.png',
    apple: '/images/junggo-icon.png',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '중고모아',
  url: 'https://coolman-junggo.vercel.app',
  description: '중고나라와 번개장터를 한 번에 검색하는 중고거래 통합 검색 서비스',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://coolman-junggo.vercel.app/?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 폰트 CDN preconnect → 렌더 블로킹 완화 + 폰트 도착 단축(LCP/FOUT 개선) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.min.css"
        />
        <meta name="naver-site-verification" content="95999fdf14487df03a3504bd75303740c3d1fb2b" />
        <meta name="google-site-verification" content="mJkJTBBd_7dbU9mLZXwirvRk_8r34RENokY5OZPTz4A" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-gray-900 focus:text-white focus:rounded-lg focus:text-sm"
        >
          본문 바로가기
        </a>
        {children}
      </body>
    </html>
  );
}
