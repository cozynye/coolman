const cheerio = require('cheerio');
const axios = require('axios');
const config = require('../config/config');

const LOG_LEVEL = config.LOG_LEVEL;
const log = {
    debug: (...args) => LOG_LEVEL === 'debug' && console.log('[DEBUG]', ...args),
    info: (...args) => ['debug', 'info'].includes(LOG_LEVEL) && console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
};

class Scraper {
    constructor() {}

    async initialize() {
        log.info('Scraper 초기화 완료');
    }

    // === 번개장터: 멀티페이지 병렬 호출 ===

    async searchBunjang(keyword) {
        try {
            const pages = Array.from({ length: config.BUNJANG_PAGES }, (_, i) => i);

            log.info(`번개장터 API 요청: "${keyword}" (${pages.length}페이지 병렬)`);

            const pageResults = await Promise.all(
                pages.map(page => this._fetchBunjangPage(keyword, page))
            );

            // 합치기 + pid 중복 제거
            const seenPids = new Set();
            const allItems = pageResults.flat().filter(item => {
                if (!item || seenPids.has(item.pid)) return false;
                seenPids.add(item.pid);
                return true;
            });

            const filteredResults = allItems
                .filter(item => {
                    const isProduct = item.type === 'PRODUCT';
                    const isOnSale = item.status === '0';

                    if (!isProduct || !isOnSale) {
                        log.debug('필터링:', item.name, { isProduct, isOnSale });
                    }

                    return isProduct && isOnSale;
                })
                .map(item => {
                    const date = new Date(item.update_time * 1000);
                    const year = String(date.getFullYear()).slice(-2);
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');

                    return {
                        platform: '번개장터',
                        title: item.name,
                        price: item.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원",
                        link: `https://bunjang.co.kr/products/${item.pid}`,
                        update_time: `${year}-${month}-${day}`,
                        timestamp: item.update_time,
                        status: this.getStatusText(item.status),
                        image: item.product_image || item.image || ''
                    };
                });

            log.info(`번개장터: 전체 ${allItems.length}개 → 필터링 ${filteredResults.length}개`);
            return filteredResults;
        } catch (error) {
            log.error('번개장터 에러:', error.message);
            throw error;
        }
    }

    async _fetchBunjangPage(keyword, page) {
        try {
            const { data: response } = await axios.get(config.BUNJANG_API_URL, {
                params: {
                    q: keyword,
                    order: 'score',
                    page,
                    request_id: new Date().getTime() + page,
                    stat_device: 'w',
                    n: config.BUNJANG_RESULTS_LIMIT,
                    stat_category_required: 1,
                    req_ref: 'search',
                    version: 5
                },
                headers: {
                    'User-Agent': config.USER_AGENT,
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': `https://m.bunjang.co.kr/search/products?q=${encodeURIComponent(keyword)}`
                },
                timeout: config.SEARCH_TIMEOUT
            });

            if (!response || !response.list) return [];
            log.debug(`번개장터 page ${page}: ${response.list.length}개`);
            return response.list;
        } catch (error) {
            log.error(`번개장터 page ${page} 실패:`, error.message);
            return [];
        }
    }

    // === 중고나라: 멀티페이지 병렬 호출 ===

    async searchJoonggo(keyword) {
        try {
            const pages = Array.from({ length: config.JOONGNA_PAGES }, (_, i) => i + 1);

            log.info(`중고나라 요청: "${keyword}" (${pages.length}페이지 병렬)`);

            const pageResults = await Promise.all(
                pages.map(page => this._fetchJoongnaPage(keyword, page))
            );

            // 합치기 + seq 중복 제거
            const seenSeqs = new Set();
            const results = pageResults.flat().filter(item => {
                if (seenSeqs.has(item._seq)) return false;
                seenSeqs.add(item._seq);
                return true;
            });

            // _seq 필드 제거 (내부용)
            results.forEach(r => delete r._seq);

            log.info(`중고나라: ${results.length}개`);
            return results;
        } catch (error) {
            log.error('중고나라 에러:', error.message);
            return [];
        }
    }

    async _fetchJoongnaPage(keyword, page) {
        try {
            const pageUrl = `${config.JOONGNA_BASE_URL}/search/${encodeURIComponent(keyword)}?keywordSource=INPUT_KEYWORD&page=${page}`;

            const response = await axios.get(pageUrl, {
                headers: {
                    'User-Agent': config.USER_AGENT,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br'
                },
                timeout: config.SEARCH_TIMEOUT
            });

            const $ = cheerio.load(response.data);
            const results = [];

            const baseTimestamp = Math.floor(Date.now() / 1000);

            $('a[href^="/product/"]').each((i, elem) => {
                const $el = $(elem);
                const href = $el.attr('href');

                if (!href || href.includes('/product/form')) return;

                const seq = href.replace('/product/', '').split('?')[0].split('/')[0];
                if (!seq || isNaN(seq)) return;

                const $img = $el.find('img');
                let title = $img.attr('alt') || '';
                title = title.replace(/ 이미지$/, '').trim();
                if (!title) return;

                const image = $img.attr('src') || '';
                const textContent = $el.text();
                const priceMatch = textContent.match(/([\d,]+)원/);
                const price = priceMatch ? priceMatch[1] + '원' : '가격문의';

                // 페이지 순서 + 인덱스로 상대 타임스탬프 부여
                // 페이지 1의 첫 아이템이 가장 최신, 페이지가 높을수록 오래된 것
                const itemTimestamp = baseTimestamp - ((page - 1) * 100 + i);
                const itemDate = new Date(itemTimestamp * 1000);
                const year = String(itemDate.getFullYear()).slice(-2);
                const month = String(itemDate.getMonth() + 1).padStart(2, '0');
                const day = String(itemDate.getDate()).padStart(2, '0');

                results.push({
                    _seq: seq,
                    platform: '중고나라',
                    title,
                    price,
                    link: `${config.JOONGNA_BASE_URL}/product/${seq}`,
                    update_time: `${year}-${month}-${day}`,
                    timestamp: itemTimestamp,
                    status: '판매중',
                    image
                });
            });

            log.debug(`중고나라 page ${page}: ${results.length}개`);
            return results;
        } catch (error) {
            log.error(`중고나라 page ${page} 실패:`, error.message);
            return [];
        }
    }

    getJoongnaStatusText(state) {
        const statusMap = { 0: '판매중', 1: '예약중', 2: '판매완료' };
        return statusMap[state] || '알 수 없음';
    }

    getStatusText(status) {
        const statusMap = { '0': '판매중', '1': '예약중', '2': '판매완료', '3': '삭제됨' };
        return statusMap[status] || '알 수 없음';
    }

    async close() {
        log.info('Scraper 정리 완료');
    }
}

module.exports = Scraper;
