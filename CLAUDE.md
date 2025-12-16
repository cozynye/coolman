# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 코드 작업 시 참고하는 가이드입니다.

## 프로젝트 개요

**중고 물품 통합 검색 서비스**입니다.
하나의 웹 페이지에서 중고나라와 번개장터를 동시에 검색하여 비교할 수 있습니다.

- **타입**: Node.js Express 웹 애플리케이션
- **프레임워크**: Express.js
- **런타임**: Node.js
- **배포**: Vercel

## 프로젝트 목표 🎯

사용자가 **하나의 검색창**에서 키워드를 입력하면, **중고나라**와 **번개장터** 두 플랫폼의 검색 결과를 **동시에** 가져와서 **한 화면**에서 비교할 수 있게 하는 것입니다.

### 핵심 가치
- **시간 절약**: 두 사이트를 따로 방문할 필요 없음
- **비교 용이**: 같은 키워드로 검색한 결과를 나란히 비교
- **편의성**: 단일 인터페이스로 모든 중고 매물 확인

## 개발 명령어

```bash
npm start              # 서버 시작
npm install           # 패키지 설치
```

### ⚠️ Claude Code 실행 시 포트 번호

**중요**: Claude Code에서 개발 서버를 실행할 때는 **포트 3010번**을 사용합니다.

```bash
node src/index.js
```

**이유**:
- 사용자의 로컬 개발 환경과 충돌 방지
- 포트 3010이 기본값으로 설정됨 (.env에서 변경 가능)

## 프로젝트 구조

```
test1/
├── src/
│   ├── index.js           # Express 서버 및 메인 로직
│   ├── scraper.js         # 웹 스크래핑 (번개장터, 중고나라)
│   └── cli.js             # CLI 도구 (미사용 예정)
│
├── public/
│   └── index.html         # 웹 UI (검색 인터페이스)
│
├── data/
│   └── keywords.json      # 키워드 저장 (미사용 예정)
│
├── config/
│   └── config.js          # 설정 파일
│
├── .env                   # 환경 변수
├── vercel.json            # Vercel 배포 설정
├── package.json           # 의존성 및 스크립트
└── README.md              # 프로젝트 문서
```

### 핵심 파일 설명

#### `src/index.js` - Express 서버
- Express 웹 서버 설정
- **핵심 API**: `POST /api/search` - 중고나라 + 번개장터 동시 검색
- 정적 파일 서빙 (`public/index.html`)

#### `src/scraper.js` - 웹 스크래핑
- **번개장터 API 검색** (구현 완료)
- **중고나라 스크래핑** (구현 필요 ⚠️)

#### `public/index.html` - 웹 UI
- 검색창 + 검색 버튼
- 검색 결과를 카드 형태로 표시
- 반응형 그리드 레이아웃

## 현재 구현 상태

### ✅ 구현 완료
- [x] 번개장터 API 검색
- [x] 웹 UI (검색창 + 결과 표시)
- [x] Express 서버
- [x] Vercel 배포 설정

### ⚠️ 구현 필요 (최우선 과제!)
- [ ] **중고나라 검색 기능** - 핵심 기능!
  - `src/scraper.js`에 `searchJoonggo()` 메서드 추가
  - Cheerio를 사용한 HTML 파싱 구현
  - 중고나라는 네이버 카페이므로 로그인 없이 접근 가능한 방법 필요

### 🗑️ 제거 예정
- [ ] Slack 관련 코드 모두 삭제
- [ ] 자동 검색 스케줄링 제거
- [ ] 키워드 관리 기능 제거

## 코드 컨벤션

### Import 순서

```javascript
// 1. Node.js 내장 모듈
const { exec } = require('child_process');
const { promisify } = require('util');

// 2. 외부 라이브러리
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

// 3. 내부 모듈
const Scraper = require('./scraper');
```

### 네이밍 규칙

- **클래스**: PascalCase (`Scraper`)
- **함수/변수**: camelCase (`searchBunjang`, `keyword`)
- **상수**: UPPER_SNAKE_CASE (`API_URL`, `PORT`)
- **파일**: camelCase (`scraper.js`, `index.js`)

### 비동기 처리

```javascript
// ✅ GOOD - async/await 사용
async function searchProducts(keyword) {
  try {
    const results = await scraper.searchBunjang(keyword);
    return results;
  } catch (error) {
    console.error('검색 중 에러:', error);
    throw error;
  }
}
```

## API 엔드포인트 설계

### 핵심 API: POST /api/search

```javascript
// 요청
POST /api/search
Content-Type: application/json

{
  "keyword": "그랜드 세이코"
}

// 응답
{
  "keyword": "그랜드 세이코",
  "timestamp": "2025-03-21T07:30:00.000Z",
  "results": [
    {
      "platform": "번개장터",
      "title": "그랜드 세이코 SBGX263",
      "price": "2,500,000원",
      "link": "https://bunjang.co.kr/products/123456",
      "timestamp": "2025-03-21T07:30:00.000Z"
    },
    {
      "platform": "중고나라",
      "title": "그랜드세이코 판매합니다",
      "price": "2,300,000원",
      "link": "https://cafe.naver.com/joonggonara/...",
      "timestamp": "2025-03-21T07:30:00.000Z"
    }
  ]
}
```

### 응답 형식 통일

```javascript
// ✅ GOOD - 일관된 응답 구조
{
  "keyword": "검색어",
  "timestamp": "ISO 8601 형식",
  "results": [
    {
      "platform": "번개장터" | "중고나라",
      "title": "상품명",
      "price": "가격",
      "link": "URL",
      "timestamp": "등록시간"
    }
  ]
}
```

## 스크래핑 가이드라인

### 중고나라 스크래핑 구현 방법 (TODO)

중고나라는 네이버 카페로 공식 API가 없으므로 HTML 파싱이 필요합니다.

```javascript
// src/scraper.js에 추가 필요
async searchJoonggo(keyword) {
  try {
    // 1. 검색 URL 구성
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://cafe.naver.com/joonggonara?iframe_url=/ArticleSearchList.nhn%3Fsearch.clubid=10050146%26search.searchBy=0%26search.query=${encodedKeyword}`;

    // 2. curl로 HTML 가져오기
    const curlCommand = `curl '${url}' \
      -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' \
      --compressed`;

    const { stdout } = await execAsync(curlCommand);

    // 3. Cheerio로 파싱
    const $ = cheerio.load(stdout);

    // 4. 상품 정보 추출
    const products = [];
    $('.article-board tr').each((i, elem) => {
      const title = $(elem).find('.article').text().trim();
      const priceText = $(elem).find('.price').text().trim();
      const link = $(elem).find('a').attr('href');

      if (title && link) {
        products.push({
          platform: '중고나라',
          title,
          price: priceText || '가격 문의',
          link: `https://cafe.naver.com${link}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    return products;
  } catch (error) {
    console.error('중고나라 검색 중 에러:', error);
    return []; // 에러 시 빈 배열 반환
  }
}
```

**주의사항**:
- 중고나라는 네이버 카페이므로 HTML 구조가 변경될 수 있음
- iframe 내부 콘텐츠 접근 필요 (구조 분석 필요)
- 로그인 없이 검색 결과 접근 가능한지 확인 필요
- Rate limiting 적용하여 과도한 요청 방지

### 번개장터 API 사용법 (구현 완료)

```javascript
async searchBunjang(keyword) {
  const url = `https://api.bunjang.co.kr/api/1/find_v2.json?q=${keyword}`;

  // curl로 API 호출
  const curlCommand = `curl '${url}' -H 'User-Agent: Mozilla/5.0...'`;
  const { stdout } = await execAsync(curlCommand);
  const response = JSON.parse(stdout);

  // 24시간 이내, 판매중 상품만 필터링
  const results = response.list
    .filter(item =>
      item.type === 'PRODUCT' &&
      item.status === '0' &&
      item.update_time > (Date.now() / 1000 - 86400)
    )
    .map(item => ({
      platform: '번개장터',
      title: item.name,
      price: item.price.toLocaleString() + '원',
      link: `https://bunjang.co.kr/products/${item.pid}`,
      timestamp: new Date(item.update_time * 1000).toISOString()
    }));

  return results;
}
```

## 환경 변수 관리

### `.env` 파일 구조

```env
# 서버 설정
PORT=3010
```

**참고**: Slack 관련 환경 변수는 모두 제거 예정

### 환경 변수 사용

```javascript
// ✅ GOOD - dotenv 사용
require('dotenv').config();

const port = process.env.PORT || 3010;

// ❌ BAD - 하드코딩
const port = 3010;
```

## 에러 처리 패턴

### 일관된 에러 처리

```javascript
// ✅ GOOD - 상세한 에러 로깅
try {
  const results = await scraper.searchBunjang(keyword);
  return results;
} catch (error) {
  console.error('번개장터 검색 중 에러:', {
    키워드: keyword,
    에러_메시지: error.message,
    에러_스택: error.stack
  });

  // 빈 배열 반환하여 서비스 계속 동작
  return [];
}

// ❌ BAD - 에러 무시
try {
  await scraper.searchBunjang(keyword);
} catch (error) {
  // 아무것도 하지 않음
}
```

## 웹 UI 개발 가이드

### HTML 구조

```html
<!-- ✅ GOOD - 시맨틱 HTML -->
<div class="search-container">
  <h1>중고 물품 검색</h1>
  <input type="text" id="searchInput" placeholder="검색어를 입력하세요" />
  <button id="searchButton">검색</button>
</div>

<div class="results-container" id="results">
  <!-- 검색 결과 카드들 -->
</div>
```

### 반응형 디자인

```css
/* ✅ GOOD - 모바일 우선 + 그리드 */
.results-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

/* 모바일 */
@media (max-width: 768px) {
  .results-container {
    grid-template-columns: 1fr;
  }
}
```

### JavaScript 비동기 처리

```javascript
// ✅ GOOD - async/await + 에러 처리
async function searchProducts() {
  const keyword = searchInput.value.trim();
  if (!keyword) return;

  loadingElement.style.display = 'block';
  resultsContainer.innerHTML = '';

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword })
    });

    if (!response.ok) {
      throw new Error('검색 실패');
    }

    const data = await response.json();
    displayResults(data.results);
  } catch (error) {
    alert(error.message);
  } finally {
    loadingElement.style.display = 'none';
  }
}
```

### 검색 결과 표시

```javascript
function displayResults(products) {
  resultsContainer.innerHTML = products
    .map(product => `
      <div class="product-card">
        <span class="platform">${product.platform}</span>
        <h3><a href="${product.link}" target="_blank">${product.title}</a></h3>
        <p class="price">${product.price}</p>
        <p>${new Date(product.timestamp).toLocaleString()}</p>
      </div>
    `)
    .join('');
}
```

## 보안 가이드라인

### 1. 환경 변수 보호

```bash
# .gitignore에 반드시 추가
.env
node_modules/
.vercel/
```

### 2. XSS 방지

```javascript
// ✅ GOOD - 사용자 입력 검증
function sanitizeKeyword(keyword) {
  return keyword.trim().replace(/[<>]/g, '');
}

const keyword = sanitizeKeyword(req.body.keyword);
```

### 3. Rate Limiting (TODO)

```javascript
// TODO: Rate Limiting 구현
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 100 요청
});

app.use('/api/', limiter);
```

## 배포 가이드

### Vercel 배포

1. **환경 변수 설정** (Vercel 대시보드)
   - `PORT=3010`

2. **빌드 설정** (`vercel.json`)
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/index.js",
         "use": "@vercel/node",
         "config": {
           "maxDuration": 10,
           "memory": 1024
         }
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/index.js"
       }
     ]
   }
   ```

3. **배포 명령어**
   ```bash
   vercel --prod
   ```

## 테스트 가이드

### API 테스트

```bash
# 검색 API
curl -X POST http://localhost:3010/api/search \
  -H "Content-Type: application/json" \
  -d '{"keyword": "그랜드 세이코"}'

# 예상 응답
{
  "keyword": "그랜드 세이코",
  "timestamp": "2025-03-21T...",
  "results": [...]
}
```

## 다음 단계 (우선순위 순)

### 1. 중고나라 검색 구현 🔥 최우선!

```javascript
// src/scraper.js
class Scraper {
  async searchJoonggo(keyword) {
    // Cheerio를 사용한 HTML 파싱 구현
  }
}

// src/index.js
app.post('/api/search', async (req, res) => {
  const keyword = req.body.keyword;

  // 두 플랫폼 동시 검색
  const [bunjangResults, joonggoResults] = await Promise.all([
    scraper.searchBunjang(keyword),
    scraper.searchJoonggo(keyword)
  ]);

  res.json({
    keyword,
    timestamp: new Date(),
    results: [...bunjangResults, ...joonggoResults]
  });
});
```

### 2. Slack 관련 코드 제거

```bash
# 제거할 파일/코드
- src/keywordManager.js (전체)
- src/test-slack.js (전체)
- src/cli.js (전체)
- src/index.js의 Slack 관련 함수들
- .env의 SLACK_* 환경 변수
```

### 3. UI 개선

- 로딩 인디케이터 개선
- 검색 결과 정렬 옵션 (가격순, 최신순)
- 플랫폼별 필터링 (번개장터만, 중고나라만)

### 4. 성능 최적화

- 검색 결과 캐싱 (동일 키워드 반복 검색 시)
- 이미지 lazy loading
- 페이지네이션 (결과가 많을 경우)

## 주의사항

### 웹 스크래핑 에티켓
- **Rate Limiting**: 과도한 요청 자제 (1-2초 간격 권장)
- **User-Agent**: 적절한 User-Agent 설정
- **robots.txt**: 사이트의 크롤링 정책 준수
- **캐싱**: 동일한 요청 반복 방지

### 법적 고려사항
- 스크래핑한 데이터는 개인적 용도로만 사용
- 상업적 목적으로 재배포 금지
- 저작권 및 이용약관 준수

---

**마지막 업데이트**: 2025-03-21
**프로젝트 버전**: 1.0.0
