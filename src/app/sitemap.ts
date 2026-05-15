import type { MetadataRoute } from 'next';

const BASE_URL = 'https://coolman-junggo.vercel.app';

// 인기 검색어 기반 정적 URL 사전 등록 → Google 인덱싱 유도
const POPULAR_KEYWORDS = [
  '아이폰', '갤럭시', '에어팟', '다이슨', '나이키', '아디다스',
  '오메가', '롤렉스', '샤넬', '루이비통', '구찌', '에르메스',
  '맥북', '아이패드', '플스5', '닌텐도', '레고', '미러리스',
  '자전거', '골프채', '캠핑', '텐트', '소파', '에어컨',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const keywordUrls: MetadataRoute.Sitemap = POPULAR_KEYWORDS.map((kw) => ({
    url: `${BASE_URL}/?q=${encodeURIComponent(kw)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...keywordUrls,
  ];
}
