import axios from 'axios';
import { CONFIG } from '@/lib/config';
import type { Product } from '@/lib/types';

interface BunjangItem {
  pid: string;
  name: string;
  price: number;
  type: string;
  status: string;
  update_time: number;
  product_image?: string;
  image?: string;
}

function formatDate(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatPrice(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원';
}

// product_image는 템플릿 URL로 온다: .../{pid}_{cnt}_{ts}_w{res}.jpg
// {cnt}=이미지 순번, {res}=해상도(px). 치환하지 않으면 CDN이 900×1200 원본(~77KB)을
// 반환하므로 첫 이미지·카드 표시폭에 맞는 webp 썸네일(~9KB)로 고정한다.
function resolveImageUrl(template: string): string {
  return template.replace('{cnt}', '1').replace('{res}', '430');
}

async function fetchPage(keyword: string, page: number): Promise<BunjangItem[]> {
  try {
    const { data } = await axios.get(CONFIG.BUNJANG_API_URL, {
      params: {
        q: keyword,
        order: 'score',
        page,
        request_id: Date.now() + page,
        stat_device: 'w',
        n: CONFIG.BUNJANG_RESULTS_LIMIT,
        stat_category_required: 1,
        req_ref: 'search',
        version: 5,
      },
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: `https://m.bunjang.co.kr/search/products?q=${encodeURIComponent(keyword)}`,
      },
      timeout: CONFIG.SEARCH_TIMEOUT,
    });
    return data?.list ?? [];
  } catch {
    return [];
  }
}

export async function searchBunjang(keyword: string): Promise<Product[]> {
  const pages = Array.from({ length: CONFIG.BUNJANG_PAGES }, (_, i) => i);
  const pageResults = await Promise.all(pages.map((p) => fetchPage(keyword, p)));

  const seen = new Set<string>();
  const items = pageResults.flat().filter((item) => {
    if (!item || seen.has(item.pid)) return false;
    seen.add(item.pid);
    return item.type === 'PRODUCT' && item.status === '0';
  });

  return items.map((item) => {
    const priceNum = Number(item.price) || 0;
    return {
    platform: '번개장터',
    title: item.name,
    price: formatPrice(priceNum),
    priceNum,
    link: `https://bunjang.co.kr/products/${item.pid}`,
    update_time: formatDate(item.update_time),
    timestamp: item.update_time,
    status: '판매중',
    image: resolveImageUrl(item.product_image || item.image || ''),
    };
  });
}
