import type { MetadataRoute } from 'next';
import { POPULAR_KEYWORDS } from '@/lib/popularKeywords';

const BASE_URL = 'https://coolman-junggo.vercel.app';

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
