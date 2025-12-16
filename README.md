# 번개장터 자동 검색 알림 봇 🔍

번개장터의 중고 물품을 자동으로 검색하고 Slack으로 알림을 전송하는 Node.js 기반 스크래퍼입니다.

## 📋 주요 기능

### 🔄 자동 검색 시스템
- **30분 주기 자동 검색**: 등록된 키워드로 번개장터 API를 자동 검색
- **최신 매물만 필터링**: 최근 24시간 이내 등록된 판매중 상품만 알림
- **중복 방지**: 광고(AD) 및 판매완료 상품 자동 제외

### 💬 Slack 통합
- **실시간 알림**: 새로운 매물 발견 시 즉시 Slack 채널로 전송
- **Slash Command 지원**: Slack에서 바로 키워드 관리 및 검색 실행
- **상세 정보 제공**: 상품명, 가격, 업데이트 시간, 링크 포함

### 🏷️ 키워드 관리
- **동적 키워드 추가/삭제**: Slack 명령어로 실시간 키워드 관리
- **다중 키워드 지원**: 여러 키워드 동시 검색 가능
- **키워드 목록 조회**: 현재 등록된 키워드 확인

## 🛠️ 기술 스택

```json
{
  "runtime": "Node.js",
  "framework": "Express.js",
  "dependencies": {
    "@slack/web-api": "Slack 봇 통합",
    "axios": "HTTP 요청",
    "cheerio": "HTML 파싱 (예비)",
    "dotenv": "환경 변수 관리",
    "mongoose": "MongoDB 연결 (예비)"
  },
  "deployment": "Vercel"
}
```

## 📂 프로젝트 구조

```
test1/
├── src/
│   ├── index.js           # Express 서버 및 메인 로직
│   ├── scraper.js         # 번개장터 API 스크래핑
│   ├── keywordManager.js  # 키워드 관리 및 Slack 통신
│   ├── cli.js             # CLI 키워드 관리 도구
│   └── test-slack.js      # Slack 봇 연결 테스트
├── config/
│   └── config.js          # 설정 파일 (현재 비어있음)
├── data/
│   └── keywords.json      # 키워드 저장
├── public/
│   └── index.html         # 웹 인터페이스
├── .env                   # 환경 변수 (Slack 토큰 등)
├── vercel.json            # Vercel 배포 설정
└── package.json           # 프로젝트 메타데이터
```

## 🚀 설치 및 실행

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력:

```env
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=C08J8R0AD4P
PORT=3010
```

**환경 변수 설명:**
- `SLACK_BOT_TOKEN`: Slack App의 Bot User OAuth Token
- `SLACK_CHANNEL_ID`: 알림을 받을 Slack 채널 ID
- `PORT`: Express 서버 포트 (기본값: 3010)

### 3. 서버 실행

```bash
npm start
```

서버는 `http://localhost:3010`에서 실행됩니다.

### 4. Slack 봇 테스트

```bash
npm run test-slack
```

Slack 채널에 테스트 메시지가 전송되는지 확인합니다.

## 📱 Slack 명령어

### `/키워드추가 [키워드]`
검색할 키워드를 추가합니다.

```
/키워드추가 그랜드 세이코
```

**응답:**
```
✅ 키워드 `그랜드 세이코`가 추가되었습니다.
현재 키워드 목록:
• 그랜드 세이코
• 아쿠아테라
```

### `/키워드삭제 [키워드]`
등록된 키워드를 삭제합니다.

```
/키워드삭제 아쿠아테라
```

### `/키워드목록`
현재 등록된 모든 키워드를 조회합니다.

```
/키워드목록
```

**응답:**
```
📝 등록된 키워드 목록
• 그랜드 세이코 sbgx 263
• 아쿠아테라
```

### `/검색`
즉시 검색을 실행합니다 (30분 주기를 기다리지 않고).

```
/검색
```

**응답:**
```
🔄 등록된 키워드로 검색을 시작합니다...
현재 등록된 키워드:
• 그랜드 세이코 sbgx 263
• 아쿠아테라
```

## 🔌 API 엔드포인트

### POST /api/keywords
키워드를 추가하거나 제거합니다.

**요청:**
```bash
curl -X POST http://localhost:3010/api/keywords \
  -H "Content-Type: application/json" \
  -d '{"keyword": "그랜드 세이코", "action": "add"}'
```

**응답:**
```json
{
  "message": "키워드가 추가되었습니다."
}
```

### GET /api/keywords
등록된 키워드 목록을 조회합니다.

**요청:**
```bash
curl http://localhost:3010/api/keywords
```

**응답:**
```json
{
  "keywords": ["그랜드 세이코 sbgx 263", "아쿠아테라"]
}
```

### POST /api/search
특정 키워드로 즉시 검색합니다.

**요청:**
```bash
curl -X POST http://localhost:3010/api/search \
  -H "Content-Type: application/json" \
  -d '{"keyword": "그랜드 세이코"}'
```

**응답:**
```json
{
  "keyword": "그랜드 세이코",
  "timestamp": "2025-03-21T07:30:00.000Z",
  "results": [
    {
      "title": "그랜드 세이코 SBGX263",
      "price": "2,500,000원",
      "link": "https://bunjang.co.kr/products/123456",
      "update_time": "2025. 3. 21. 오후 4:15:30",
      "status": "판매중"
    }
  ]
}
```

### GET /api/test-search
등록된 모든 키워드로 즉시 검색을 실행합니다 (테스트용).

**요청:**
```bash
curl http://localhost:3010/api/test-search
```

### POST /api/slack/message
Slack Slash Command를 처리합니다 (Slack에서 자동 호출).

## 🧪 CLI 도구

터미널에서 직접 키워드를 관리할 수 있는 CLI 도구를 제공합니다.

```bash
npm run cli
```

**메뉴:**
```
=== 키워드 관리 메뉴 ===
1. 키워드 추가
2. 키워드 제거
3. 키워드 목록 보기
4. 종료
```

## ⚙️ 주요 동작 원리

### 1. 자동 검색 사이클

```
서버 시작
    ↓
초기화 (Slack 알림)
    ↓
즉시 첫 검색 실행
    ↓
30분 주기로 자동 검색
    ↓
필터링 (24시간 이내 + 판매중)
    ↓
Slack 알림 전송
```

### 2. 번개장터 API 검색

```javascript
// src/scraper.js
// curl을 사용하여 번개장터 API 호출
const url = `https://api.bunjang.co.kr/api/1/find_v2.json?q=${keyword}`;

// 필터링 조건
- type === 'PRODUCT' (광고 제외)
- status === '0' (판매중)
- update_time > 24시간 전
```

### 3. Slack 알림 포맷

```
*그랜드 세이코* 검색 결과 (2025. 3. 21. 오후 4:30:00)
==============================

📌 *그랜드 세이코 SBGX263*
💰 2,500,000원
⏰ 2025. 3. 21. 오후 4:15:30
🏷 판매중
🔗 https://bunjang.co.kr/products/123456
==============================
```

## 🚨 에러 처리

### 검색 실패 시
```
⚠️ *그랜드 세이코* 검색 중 에러 발생
```
API 연결 실패, 타임아웃 등의 에러 발생 시 Slack으로 알림

### 키워드 없을 시
```
❌ 등록된 키워드가 없습니다. `/키워드추가` 명령어로 키워드를 추가해주세요.
```

### 검색 결과 없을 시
```
ℹ️ 검색이 완료되었습니다. 새로운 매물이 없습니다.
```

## 📊 로그 시스템

서버는 상세한 로그를 콘솔에 출력합니다:

```
검색 주기가 30분으로 설정되었습니다.
초기 검색 시작...
runSearch 시작
검색할 키워드: [ '그랜드 세이코 sbgx 263', '아쿠아테라' ]
그랜드 세이코 sbgx 263 검색 시작...
API 요청 URL: https://api.bunjang.co.kr/api/1/find_v2.json?q=...
API 응답 받음
검색된 총 상품 수: 45
필터링된 상품 수: 3
그랜드 세이코 sbgx 263 검색 결과 전송 완료
```

## 🔒 보안 주의사항

**중요:** 다음 파일들은 절대 Git에 커밋하지 마세요:

```
.env              # Slack 토큰 포함
data/keywords.json # 개인 검색 키워드
```

`.gitignore`에 다음 내용 추가:
```
.env
data/keywords.json
node_modules/
.vercel/
```

## 🌐 Vercel 배포

### 1. Vercel 프로젝트 생성

```bash
vercel
```

### 2. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정:

- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL_ID`
- `PORT` (3010)

### 3. 배포 설정

`vercel.json`에 이미 설정되어 있음:

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
  ]
}
```

### 4. Slack Slash Command 설정

Slack App 설정에서 Request URL을 Vercel 배포 URL로 변경:

```
https://your-app.vercel.app/api/slack/message
```

## 🐛 트러블슈팅

### Slack 메시지가 전송되지 않을 때

1. `.env` 파일의 `SLACK_BOT_TOKEN` 확인
2. Slack App의 OAuth 권한 확인 (`chat:write`, `commands`)
3. 채널에 봇 초대 여부 확인 (`/invite @your-bot`)

```bash
npm run test-slack
```

### API 검색이 실패할 때

1. 번개장터 API URL 변경 여부 확인
2. curl 명령어 실행 가능 여부 확인 (Windows의 경우)
3. 네트워크 연결 상태 확인

### 키워드가 저장되지 않을 때

현재 키워드는 메모리에만 저장됩니다 (서버 재시작 시 초기화).

**해결 방법:**
- `data/keywords.json` 파일을 읽고 쓰도록 수정 필요
- 또는 MongoDB 연결 (`mongoose` 이미 설치됨)

## 📈 향후 개선 사항

### 1. 영구 키워드 저장
```javascript
// data/keywords.json 파일 읽기/쓰기 구현
// 또는 MongoDB 연결
```

### 2. 중복 매물 필터링
```javascript
// 이미 알림 보낸 매물은 제외
const seenProducts = new Set();
```

### 3. 가격 필터링
```javascript
// 최대/최소 가격 설정
const maxPrice = 3000000;
```

### 4. 지역 필터링
```javascript
// 특정 지역 상품만 알림
const preferredRegions = ['서울', '경기'];
```

### 5. 웹 대시보드
```html
<!-- public/index.html 확장 -->
<!-- 키워드 관리 UI 구현 -->
```

## 📝 라이선스

ISC

## 👨‍💻 개발자

- **프로젝트명**: test1
- **버전**: 1.0.0
- **설명**: 중고 물품 검색 스크래퍼

## 🔗 관련 링크

- [번개장터 API](https://api.bunjang.co.kr)
- [Slack API 문서](https://api.slack.com)
- [Vercel 배포 가이드](https://vercel.com/docs)

---

**마지막 업데이트**: 2025-03-21
