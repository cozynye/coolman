const cheerio = require('cheerio');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const axios = require('axios');

class Scraper {
    constructor() {
        // 더 이상 browser가 필요하지 않음
    }

    async initialize() {
        // API 기반 검색이므로 특별한 초기화가 필요 없음
        console.log('Scraper 초기화 완료');
        return Promise.resolve();
    }

    async searchBunjang(keyword) {
        try {
            const params = {
                q: keyword,
                order: 'score',
                page: 0,
                request_id: new Date().getTime(),
                stat_device: 'w',
                n: 100,
                stat_category_required: 1,
                req_ref: 'search',
                version: 5
            };

            // URL 파라미터 생성
            const queryString = Object.entries(params)
                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                .join('&');

            const url = `https://api.bunjang.co.kr/api/1/find_v2.json?${queryString}`;
            
            console.log('API 요청 URL:', url);
            
            // curl 명령어 구성
            const curlCommand = `curl '${url}' \
              -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' \
              -H 'Accept: application/json, text/plain, */*' \
              -H 'Accept-Language: ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7' \
              -H 'Origin: https://m.bunjang.co.kr' \
              -H 'Referer: https://m.bunjang.co.kr/search/products?q=${encodeURIComponent(keyword)}' \
              --compressed`;

            console.log('실행할 curl 명령어:', curlCommand);

            // curl 명령어 실행
            const { stdout, stderr } = await execAsync(curlCommand);
            
            if (stderr) {
                console.error('curl 에러:', stderr);
            }

            const response = JSON.parse(stdout);
            
            console.log('API 응답 받음');

            // 현재 시간 기준 24시간 전 Unix timestamp
            const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
            console.log('현재 시간:', new Date().toLocaleString());
            console.log('24시간 전 timestamp:', oneDayAgo);

            if (!response) {
                console.log('API 응답에 데이터가 없음');
                return [];
            }

            if (!response.list) {
                console.log('API 응답에 list가 없음');
                return [];
            }

            console.log('API 응답 요약:', {
                키워드: keyword,
                전체_결과_수: response.list.length,
                응답_성공: true,
                첫_아이템: response.list[0] ? {
                    이름: response.list[0].name,
                    상태: response.list[0].status,
                    타입: response.list[0].type,
                    업데이트_시간: new Date(response.list[0].update_time * 1000).toLocaleString()
                } : '결과 없음'
            });

            const filteredResults = response.list
                .filter(item => {
                    const isProduct = item.type === 'PRODUCT';
                    const isOnSale = item.status === '0';
                    const isRecent = item.update_time > oneDayAgo;
                    
                    if (!isProduct || !isOnSale || !isRecent) {
                        console.log('필터링된 아이템:', {
                            이름: item.name,
                            타입: item.type,
                            상태: item.status,
                            업데이트_시간: new Date(item.update_time * 1000).toLocaleString(),
                            필터링_이유: {
                                '광고여부': !isProduct ? '광고라서 제외' : '상품',
                                '판매상태': !isOnSale ? '판매중 아님' : '판매중',
                                '최신여부': !isRecent ? '24시간 이전 상품' : '최신 상품'
                            }
                        });
                    }
                    
                    return isProduct && isOnSale && isRecent;
                })
                .map(item => {
                    const date = new Date(item.update_time * 1000);
                    const year = String(date.getFullYear()).slice(-2); // 2025 -> 25
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');

                    return {
                        platform: '번개장터',
                        title: item.name,
                        price: item.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원",
                        link: `https://bunjang.co.kr/products/${item.pid}`,
                        update_time: `${year}-${month}-${day}`,
                        timestamp: item.update_time, // Unix timestamp for sorting
                        status: this.getStatusText(item.status),
                        image: item.product_image || item.image || 'https://via.placeholder.com/300x300?text=No+Image'
                    };
                });

            console.log(`검색된 총 상품 수: ${response.list.length}`);
            console.log(`필터링된 상품 수: ${filteredResults.length}`);
            return filteredResults;
        } catch (error) {
            console.error('번개장터 API 호출 중 에러:', {
                키워드: keyword,
                에러_메시지: error.message,
                에러_종류: error.name,
                에러_스택: error.stack
            });
            throw error;
        }
    }

    /**
     * 중고나라 API 검색
     * @param {string} keyword - 검색 키워드
     * @returns {Promise<Array>} 검색 결과 배열
     */
    async searchJoonggo(keyword) {
        try {
            const pageUrl = `https://web.joongna.com/search/${encodeURIComponent(keyword)}?keywordSource=INPUT_KEYWORD`;

            console.log('중고나라 페이지 요청:', pageUrl);
            console.log('검색어:', keyword);

            // HTML 페이지 가져오기
            const response = await axios.get(pageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br'
                },
                timeout: 15000
            });

            console.log('중고나라 페이지 응답 상태:', response.status);

            // Cheerio로 HTML 파싱
            const $ = cheerio.load(response.data);

            // __NEXT_DATA__ 스크립트 태그 찾기
            const nextDataScript = $('#__NEXT_DATA__').html();

            if (!nextDataScript) {
                console.log('중고나라: __NEXT_DATA__ 스크립트를 찾을 수 없음');
                return [];
            }

            // JSON 파싱
            const nextData = JSON.parse(nextDataScript);

            // 경로: props.pageProps.dehydratedState.queries[2].state.data.data.items
            const queries = nextData?.props?.pageProps?.dehydratedState?.queries;

            if (!queries || queries.length < 3) {
                console.log('중고나라: queries 데이터 구조가 예상과 다름');
                return [];
            }

            // queries 배열에서 상품 데이터 찾기 (보통 index 2)
            let items = null;
            for (let i = 0; i < queries.length; i++) {
                const queryData = queries[i]?.state?.data?.data?.items;
                if (queryData && Array.isArray(queryData) && queryData.length > 0) {
                    items = queryData;
                    break;
                }
            }

            if (!items || items.length === 0) {
                console.log('중고나라 검색 결과 없음');
                return [];
            }

            console.log(`중고나라 검색 결과: ${items.length}개`);

            const results = items.map(item => {
                // sortDate를 timestamp로 변환
                const updateDate = new Date(item.sortDate);
                const timestamp = Math.floor(updateDate.getTime() / 1000);

                // 날짜 포맷 변경: 25-12-17
                const year = String(updateDate.getFullYear()).slice(-2);
                const month = String(updateDate.getMonth() + 1).padStart(2, '0');
                const day = String(updateDate.getDate()).padStart(2, '0');

                return {
                    platform: '중고나라',
                    title: item.title,
                    price: item.price ? item.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원" : '가격문의',
                    link: `https://web.joongna.com/product/${item.seq}`,
                    update_time: `${year}-${month}-${day}`,
                    timestamp: timestamp,
                    status: this.getJoongnaStatusText(item.state),
                    location: item.mainLocationName || '지역 미표시',
                    image: item.url || 'https://via.placeholder.com/300x300?text=No+Image'
                };
            });

            return results;
        } catch (error) {
            console.error('중고나라 페이지 파싱 중 에러:', {
                키워드: keyword,
                에러_메시지: error.message,
                에러_종류: error.name,
                응답_상태: error.response?.status
            });
            // 중고나라 검색 실패해도 빈 배열 반환 (번개장터 결과는 보여주기 위해)
            return [];
        }
    }

    /**
     * 중고나라 상품 상태 텍스트 변환
     * @param {number} state - 상품 상태 코드
     * @returns {string} 상태 텍스트
     */
    getJoongnaStatusText(state) {
        const statusMap = {
            0: '판매중',
            1: '예약중',
            2: '판매완료'
        };
        return statusMap[state] || '알 수 없음';
    }

    // 상품 상태 텍스트 변환
    getStatusText(status) {
        const statusMap = {
            '0': '판매중',
            '1': '예약중',
            '2': '판매완료',
            '3': '삭제됨'
        };
        return statusMap[status] || '알 수 없음';
    }

    async close() {
        // API 기반 검색이므로 특별한 정리가 필요 없음
        console.log('Scraper 정리 완료');
        return Promise.resolve();
    }
}

module.exports = Scraper;
