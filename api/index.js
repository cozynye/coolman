const express = require('express');
const path = require('path');
const Scraper = require('../src/scraper');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3010;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

const scraper = new Scraper();

// 서버 시작 시 초기화
async function initialize() {
    await scraper.initialize();
    console.log('서버 초기화 완료');
}

// 루트 경로 처리 (Vercel serverless 환경 대응)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// 검색 API 엔드포인트
app.post('/api/search', async (req, res) => {
    try {
        const { keyword } = req.body;

        if (!keyword) {
            return res.status(400).json({ error: '검색어를 입력해주세요.' });
        }

        console.log(`검색 시작: ${keyword}`);

        // 번개장터와 중고나라 병렬 검색
        const [bunjangResults, joonggoResults] = await Promise.all([
            scraper.searchBunjang(keyword).catch(err => {
                console.error('번개장터 검색 실패:', err.message);
                return [];
            }),
            scraper.searchJoonggo(keyword).catch(err => {
                console.error('중고나라 검색 실패:', err.message);
                return [];
            })
        ]);

        // 결과 합치기 및 최신순 정렬 (timestamp 내림차순)
        const allResults = [...bunjangResults, ...joonggoResults]
            .sort((a, b) => b.timestamp - a.timestamp);

        console.log(`검색 완료: 번개장터 ${bunjangResults.length}개, 중고나라 ${joonggoResults.length}개, 총 ${allResults.length}개 (최신순 정렬)`);

        res.json({
            keyword,
            timestamp: new Date().toISOString(),
            results: allResults
        });
    } catch (error) {
        console.error('검색 중 에러:', error);
        res.status(500).json({ error: '검색 중 오류가 발생했습니다.' });
    }
});

// 테스트용 엔드포인트
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
                'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site'
            },
            timeout: 30000
        };

        console.log('API 요청 설정:', JSON.stringify(axiosConfig, null, 2));
        const response = await axios(axiosConfig);
        console.log('API 응답 상태:', response.status);

        res.json({
            success: true,
            config: axiosConfig,
            status: response.status,
            headers: response.headers,
            data: response.data
        });
    } catch (error) {
        console.error('테스트 API 호출 실패:', {
            name: error.name,
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status
        });

        res.status(500).json({
            success: false,
            error: {
                name: error.name,
                message: error.message,
                code: error.code,
                response: error.response?.data,
                status: error.response?.status
            }
        });
    }
});

// 서버 종료 시 정리
process.on('SIGINT', async () => {
    await scraper.close();
    process.exit();
});

// 서버 시작 - Vercel에서는 자동으로 초기화됨
initialize().catch(error => {
    console.error('초기화 중 에러:', error);
});

// 로컬 개발 환경에서만 listen
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
    });
}

// Vercel을 위한 export
module.exports = app;
