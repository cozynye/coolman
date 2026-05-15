import axios from 'axios';
import * as cheerio from 'cheerio';
import { CONFIG } from '@/lib/config';
import type { Product } from '@/lib/types';

function formatDate(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

async function fetchPage(keyword: string, page: number): Promise<(Product & { _seq: string })[]> {
  try {
    const url = `${CONFIG.JOONGNA_BASE_URL}/search/${encodeURIComponent(keyword)}?keywordSource=INPUT_KEYWORD&page=${page}`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: CONFIG.SEARCH_TIMEOUT,
    });

    const $ = cheerio.load(data);
    const results: (Product & { _seq: string })[] = [];
    const baseTs = Math.floor(Date.now() / 1000);

    $('a[href^="/product/"]').each((i, elem) => {
      const $el = $(elem);
      const href = $el.attr('href') ?? '';
      if (!href || href.includes('/product/form')) return;

      const seq = href.replace('/product/', '').split('?')[0].split('/')[0];
      if (!seq || isNaN(Number(seq))) return;

      const $img = $el.find('img');
      const title = ($img.attr('alt') ?? '').replace(/ 이미지$/, '').trim();
      if (!title) return;

      const image = $img.attr('src') ?? '';
      const text = $el.text();
      const priceMatch = text.match(/([\d,]+)원/);
      const priceNum = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;
      const priceStr = priceNum > 0 ? priceNum.toLocaleString('ko-KR') + '원' : '가격문의';

      const ts = baseTs - ((page - 1) * 100 + i);

      results.push({
        _seq: seq,
        platform: '중고나라',
        title,
        price: priceStr,
        priceNum,
        link: `${CONFIG.JOONGNA_BASE_URL}/product/${seq}`,
        update_time: formatDate(ts),
        timestamp: ts,
        status: '판매중',
        image,
      });
    });

    return results;
  } catch {
    return [];
  }
}

export async function searchJoongna(keyword: string): Promise<Product[]> {
  const pages = Array.from({ length: CONFIG.JOONGNA_PAGES }, (_, i) => i + 1);
  const pageResults = await Promise.all(pages.map((p) => fetchPage(keyword, p)));

  const seen = new Set<string>();
  return pageResults
    .flat()
    .filter((item) => {
      if (seen.has(item._seq)) return false;
      seen.add(item._seq);
      return true;
    })
    .map(({ _seq, ...rest }) => rest);
}
