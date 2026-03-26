const cheerio = require('cheerio');
const axios = require('axios');
const config = require('../config/config');

// 로그 레벨 기반 로깅
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

    async searchBunjang(keyword) {
        try {
            const params = {
                q: keyword,
                order: 'score',
                page: 0,
                request_id: new Date().getTime(),
                stat_device: 'w',
                n: config.BUNJANG_RESULTS_LIMIT,
                stat_category_required: 1,
                req_ref: 'search',
                version: 5
            };

            log.info('번개장터 API 요청:', keyword);

            const { data: response } = await axios.get(config.BUNJANG_API_URL, {
                params,
                headers: {
                    'User-Agent': config.USER_AGENT,
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': `https://m.bunjang.co.kr/search/products?q=${encodeURIComponent(keyword)}`
                },
                timeout: config.SEARCH_TIMEOUT
            });

            if (!response || !response.list) {
                log.info('번개장터 응답에 데이터 없음');
                return [];
            }

            const oneDayAgo = Math.floor(Date.now() / 1000) - (config.FILTER_HOURS * 60 * 60);

            const filteredResults = response.list
                .filter(item => {
                    const isProduct = item.type === 'PRODUCT';
                    const isOnSale = item.status === '0';
                    const isRecent = item.update_time > oneDayAgo;

                    if (!isProduct || !isOnSale || !isRecent) {
                        log.debug('필터링:', item.name, { isProduct, isOnSale, isRecent });
                    }

                    return isProduct && isOnSale && isRecent;
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

            log.info(`번개장터: 전체 ${response.list.length}개 → 필터링 ${filteredResults.length}개`);
            return filteredResults;
        } catch (error) {
            log.error('번개장터 API 에러:', error.message);
            throw error;
        }
    }

    async searchJoonggo(keyword) {
        try {
            const pageUrl = `${config.JOONGNA_BASE_URL}/search/${encodeURIComponent(keyword)}?keywordSource=INPUT_KEYWORD`;

            log.info('중고나라 요청:', keyword);

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
            const seenSeqs = new Set();

            const now = new Date();
            const timestamp = Math.floor(now.getTime() / 1000);
            const year = String(now.getFullYear()).slice(-2);
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');

            $('a[href^="/product/"]').each((i, elem) => {
                const $el = $(elem);
                const href = $el.attr('href');

                if (!href || href.includes('/product/form')) return;

                const seq = href.replace('/product/', '').split('?')[0].split('/')[0];
                if (!seq || isNaN(seq)) return;

                if (seenSeqs.has(seq)) return;
                seenSeqs.add(seq);

                const $img = $el.find('img');
                let title = $img.attr('alt') || '';
                title = title.replace(/ 이미지$/, '').trim();
                if (!title) return;

                const image = $img.attr('src') || '';

                const textContent = $el.text();
                const priceMatch = textContent.match(/([\d,]+)원/);
                const price = priceMatch ? priceMatch[1] + '원' : '가격문의';

                results.push({
                    platform: '중고나라',
                    title,
                    price,
                    link: `${config.JOONGNA_BASE_URL}/product/${seq}`,
                    update_time: `${year}-${month}-${day}`,
                    timestamp,
                    status: '판매중',
                    image
                });
            });

            log.info(`중고나라: ${results.length}개`);
            return results;
        } catch (error) {
            log.error('중고나라 에러:', error.message);
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
