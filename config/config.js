module.exports = {
    // 서버
    PORT: process.env.PORT || 3010,

    // 캐시
    CACHE_TTL: 5 * 60 * 1000,       // 5분
    CACHE_MAX_SIZE: 100,

    // 검색
    MAX_KEYWORD_LENGTH: 50,
    SEARCH_TIMEOUT: 15000,           // 15초
    BUNJANG_RESULTS_LIMIT: 100,
    FILTER_HOURS: 24,

    // API URL
    BUNJANG_API_URL: 'https://api.bunjang.co.kr/api/1/find_v2.json',
    JOONGNA_BASE_URL: 'https://web.joongna.com',

    // User Agent
    USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',

    // 로깅 레벨
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
