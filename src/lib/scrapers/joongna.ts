import axios from 'axios';
import * as cheerio from 'cheerio';
import { CONFIG } from '@/lib/config';
import type { Product } from '@/lib/types';
import type { AlarmProduct } from '@/lib/alarm/types';

function formatDate(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// 중고나라는 등록일 API/필드를 노출하지 않는다. 다만 이미지 CDN 경로에
// 업로드(=등록) 날짜가 들어있다. 예: .../media/original/2026/06/06/xxxx.jpg
// 이를 파싱해 실제 등록일에 근접한 timestamp를 얻는다. 못 찾으면 null.
function parseListedDateFromImage(imageUrl: string): number | null {
  const m = imageUrl.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
  if (!m) return null;
  const [, y, mo, d] = m;
  const ts = Date.UTC(Number(y), Number(mo) - 1, Number(d)) / 1000;
  if (!isFinite(ts) || ts <= 0) return null;
  // 미래 날짜(오파싱/이상 데이터)는 신뢰 불가 → 미상 처리(카드에서 날짜 숨김)
  if (ts > Date.now() / 1000 + 86400) return null;
  return Math.floor(ts);
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

      // 목록 HTML은 150px 썸네일(?impolicy=thumb&size=150)을 준다. 옵티마이저 없이
      // 원본을 그대로 표시하므로 카드 폭(레티나 포함)에 맞춰 320px로 올린다.
      const image = ($img.attr('src') ?? '').replace(/([?&]size=)\d+/, '$1320');
      const rawText = $el.text();

      // 제목을 제거한 텍스트에서 가격 찾기 (제목 끝 모델번호/숫자 오염 방지)
      // 예: 제목 "브라이틀링 A23322" + 가격 "233만원" → "A23322233" 오파싱 방지
      // split/join으로 제목이 2회 이상 등장해도 모두 제거(replaceAll 효과)
      const textWithoutTitle = rawText.split(title).join(' ');

      // "YYYY/MM" 날짜 패턴도 제거 (가격 앞 날짜 오염 방지)
      const textForPrice = textWithoutTitle.replace(/\d{4}\/\d{1,2}/g, ' ');
      const priceMatch = textForPrice.match(/([\d,]+)원/);
      const priceNum = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;
      const priceStr = priceNum > 0 ? priceNum.toLocaleString('ko-KR') + '원' : '가격문의';

      // 실제 등록일(이미지 경로) 우선, 없으면 정렬용 순번 타임스탬프(표시는 안 함)
      const listedTs = parseListedDateFromImage(image);
      const ts = listedTs ?? baseTs - ((page - 1) * 100 + i);

      results.push({
        _seq: seq,
        platform: '중고나라',
        title,
        price: priceStr,
        priceNum,
        link: `${CONFIG.JOONGNA_BASE_URL}/product/${seq}`,
        // update_time: 실제 날짜를 알 때만 채운다('' = 미상 → 카드에서 날짜 숨김)
        update_time: listedTs ? formatDate(listedTs) : '',
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

// 알림(크론) 전용: 1페이지만 — 파싱 로직은 fetchPage 그대로 재사용.
// 중고나라 웹 검색은 신뢰 가능한 최신순 정렬 파라미터가 확인되지 않아 기본 정렬 사용.
// (seen-set diff + 등록일 필터가 오탐을 걸러주므로 정렬은 필수가 아님)
export async function fetchJoongnaLatest(keyword: string): Promise<AlarmProduct[]> {
  const items = await fetchPage(keyword, 1);
  const seen = new Set<string>();
  return items
    .filter((item) => {
      if (seen.has(item._seq)) return false;
      seen.add(item._seq);
      return true;
    })
    .map(({ _seq, ...rest }) => ({ ...rest, id: _seq }));
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
