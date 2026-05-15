const express = require('express');
const compression = require('compression');
const path = require('path');
const Scraper = require('./src/scraper');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3010;

// === 미들웨어 (순서 중요) ===
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public', {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

const scraper = new Scraper();

// 초기화 상태 추적
let isInitialized = false;
let initPromise = null;

async function initialize() {
    await scraper.initialize();
    console.log('서버 초기화 완료');
}

// 초기화 함수 (race condition 방지)
async function ensureInitialized() {
    if (isInitialized) return;
    if (!initPromise) {
        initPromise = initialize().then(() => {
            isInitialized = true;
        }).catch(err => {
            initPromise = null;
            throw err;
        });
    }
    await initPromise;
}

// 초기화 미들웨어 (라우트 핸들러 전에 등록)
app.use(async (req, res, next) => {
    try {
        await ensureInitialized();
        next();
    } catch (error) {
        console.error('초기화 에러:', error);
        next();
    }
});

// === 검색 캐시 (인메모리, TTL 5분) ===
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 100;

function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key, data) {
    // 캐시 크기 제한
    if (cache.size >= CACHE_MAX_SIZE) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
    cache.set(key, { data, time: Date.now() });
}

// === 라우트 ===

// 루트 경로 처리 (Vercel serverless 환경 대응)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 검색 API 엔드포인트
app.post('/api/search', async (req, res) => {
    try {
        const rawKeyword = req.body.keyword;

        if (!rawKeyword || typeof rawKeyword !== 'string') {
            return res.status(400).json({ error: '검색어를 입력해주세요.' });
        }

        const keyword = rawKeyword.trim().substring(0, 50);
        if (!keyword) {
            return res.status(400).json({ error: '검색어를 입력해주세요.' });
        }

        // 캐시 확인
        const cacheKey = keyword.toLowerCase();
        const cached = getCached(cacheKey);
        if (cached) {
            console.log(`캐시 히트: ${keyword}`);
            return res.json(cached);
        }

        console.log(`검색 시작: ${keyword}`);

        // 번개장터와 중고나라 병렬 검색 (플랫폼별 상태 추적)
        const meta = { bunjang: 'success', joonggo: 'success' };

        const [bunjangResults, joonggoResults] = await Promise.all([
            scraper.searchBunjang(keyword).catch(err => {
                console.error('번개장터 검색 실패:', err.message);
                meta.bunjang = 'failed';
                return [];
            }),
            scraper.searchJoonggo(keyword).catch(err => {
                console.error('중고나라 검색 실패:', err.message);
                meta.joonggo = 'failed';
                return [];
            })
        ]);

        // 결과 합치기 및 최신순 정렬 (timestamp 내림차순)
        const allResults = [...bunjangResults, ...joonggoResults]
            .sort((a, b) => b.timestamp - a.timestamp);

        console.log(`검색 완료: 번개장터 ${bunjangResults.length}개, 중고나라 ${joonggoResults.length}개, 총 ${allResults.length}개`);

        const responseData = {
            keyword,
            timestamp: new Date().toISOString(),
            results: allResults,
            meta
        };

        // 캐시 저장
        setCache(cacheKey, responseData);

        res.json(responseData);
    } catch (error) {
        console.error('검색 중 에러:', error);
        res.status(500).json({ error: '검색 중 오류가 발생했습니다.' });
    }
});

// 테스트용 엔드포인트 (개발 환경에서만 접근 가능)
if (process.env.NODE_ENV !== 'production') {
app.get('/api/test-raw', async (req, res) => {
    try {
        const keyword = req.query.keyword || '에파';
        console.log(`테스트 검색 시작 (키워드: ${keyword})`);

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

        const axiosConfig = {
            method: 'get',
            url: 'https://api.bunjang.co.kr/api/1/find_v2.json',
            params,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://m.bunjang.co.kr/search/products?q=' + encodeURIComponent(keyword),
            },
            timeout: 30000
        };

        const response = await axios(axiosConfig);
        res.json({
            success: true,
            status: response.status,
            data: response.data
        });
    } catch (error) {
        console.error('테스트 API 호출 실패:', error.message);
        res.status(500).json({
            success: false,
            error: { name: error.name, message: error.message }
        });
    }
});
} // end if (NODE_ENV !== 'production')

// Vercel을 위한 export (serverless function)
module.exports = app;

// 로컬 개발 환경에서는 직접 서버 실행
if (require.main === module) {
    require('dotenv').config();
    const localPort = process.env.PORT || 3010;
    app.listen(localPort, () => {
        console.log(`로컬 서버 실행: http://localhost:${localPort}`);
    });
}
