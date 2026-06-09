# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 코드 작업 시 참고하는 가이드입니다.

## 프로젝트 개요

**중고모아** — 중고나라와 번개장터를 **하나의 검색창**에서 동시에 검색해 **한 화면에서 비교**하는 통합 검색 서비스.

- **프레임워크**: Next.js 15 (App Router) + React 19
- **언어**: TypeScript
- **스타일**: Tailwind CSS v4 (`@theme`, CSS-first)
- **폰트**: Pretendard (CDN, `<head>`에서 preconnect)
- **배포**: Vercel (서버리스)

### 핵심 가치
- **시간 절약**: 두 사이트를 따로 방문할 필요 없음
- **비교 용이**: 같은 키워드 결과를 나란히 비교 (가격 인사이트·교차 병합)
- **모바일 우선**: 주 사용처가 모바일

## 개발 명령어

```bash
npm run dev     # 개발 서버 (next dev -p 3010)
npm run build   # 프로덕션 빌드
npm start       # 프로덕션 서버 (-p 3010)
npx tsc --noEmit  # 타입 체크 (품질 게이트)
```

### ⚠️ 포트
개발 서버는 **3010번**을 사용합니다 (`.env`의 `PORT`, package.json 스크립트에 고정). 사용자 로컬 환경과 충돌 방지.

> 참고: `next lint`는 ESLint 미설정 상태이며 deprecated입니다. 품질 게이트는 **`npx tsc --noEmit`** 을 사용하세요.

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx              # 루트 레이아웃 (메타데이터, JSON-LD, 폰트 preconnect)
│   ├── page.tsx                # 메인 (검색 UI + 결과/필터) — 'use client'
│   ├── globals.css             # Tailwind v4 @theme 토큰 + 전역 스타일 + reduced-motion
│   ├── sitemap.ts              # 인기검색어 기반 사이트맵 (SEO)
│   └── api/search/
│       ├── route.ts            # 통합 검색(레거시/서버 캐시) — 클라에선 미사용
│       ├── bunjang/route.ts    # 번개장터 단독 (progressive용)
│       └── joongna/route.ts    # 중고나라 단독 (progressive용)
├── components/
│   ├── SearchBar.tsx           # 검색창 + 최근/인기검색어 드롭다운
│   ├── ProductCard.tsx         # 상품 카드 (memo)
│   ├── FilterSidebar.tsx       # 데스크탑 필터 사이드바
│   ├── SearchProgressBanner.tsx# 검색 진행률 배너
│   ├── SkeletonCard.tsx        # 로딩 스켈레톤
│   └── Logo.tsx                # SVG 로고
├── hooks/
│   └── usePlatformSearch.ts    # 플랫폼 스토어 구독 훅 (useSyncExternalStore)
└── lib/
    ├── platformStore.ts        # 플랫폼별 검색 데이터 외부 스토어 (L1 메모리 + L2 localStorage)
    ├── recentStore.ts          # 최근검색어 외부 스토어
    ├── popularKeywords.ts      # 인기검색어 (sitemap + UI 공용)
    ├── scrapers/bunjang.ts     # 번개장터 JSON API 스크래퍼
    ├── scrapers/joongna.ts     # 중고나라 HTML 스크래퍼 (cheerio)
    ├── config.ts               # 스크래퍼/캐시 설정 상수
    └── types.ts                # 공용 타입 (Product, FilterState 등)
```

> `index.js`, `src/scraper.js`, `src/cli.js`, `src/types.js`, `config/`, `public/script.js` 등은 구(舊) Express 버전 잔재입니다. 신규 작업은 모두 `src/app`·`src/components`·`src/lib`·`src/hooks` 기준으로 합니다.

## 아키텍처 — 데이터 흐름

### URL이 검색어의 단일 진실원천(SSOT)
`page.tsx`는 `currentKeyword` 같은 상태를 두지 않고 **URL의 `?q=`에서 keyword를 파생**합니다.

```
검색  → handleSearch가 window.history.pushState('/?q=kw')
URL   → Next 라우터가 pushState/popstate를 useSearchParams와 동기화 (공식 동작)
keyword(파생) 변경 → 단일 useEffect가 store.ensure() 호출
fetch → 각 플랫폼 응답 도착 즉시 store가 emit → 해당 플랫폼만 리렌더 (progressive)
```

- **검색·뒤로가기·앞으로가기·공유링크**가 모두 이 한 경로로 수렴 → popstate 수동 처리 불필요.
- 동일 키워드 재검색은 URL이 안 바뀌므로 `store.ensure(kw, /*force*/true)`로 강제.

### 플랫폼 스토어 (`lib/platformStore.ts`)
`bunjangStore` / `joongnaStore` — `useSyncExternalStore`용 무의존성 외부 스토어.
- 키워드별 엔트리 보관 → 늦게 온 응답이 현재 화면을 덮는 레이스 구조적 차단.
- **L1**: 메모리 Map(세션). **L2**: localStorage 30분 TTL, 플랫폼별 10개 LRU.
- **SWR**: 캐시 히트 시 stale 즉시 표시 → 백그라운드 리페치. 실패해도 stale 유지.
- `status`: `idle | loading | success | failed`. 라우트는 실패해도 HTTP 200 + `{status:'failed'}`를 주므로 **`data.status`로 실패 판별**.

### 최근검색어 스토어 (`lib/recentStore.ts`)
- `useSyncExternalStore`로 모든 `SearchBar` 인스턴스(Hero/헤더)가 자동 동기화.
- localStorage `junggo_recent_v2`, 최대 **30개**. 저장은 `page.tsx`의 keyword effect에서 `recentStore.save`.

### useEffect 정책 (최소화)
TanStack Query 등 데이터 라이브러리는 **미채택** (엔드포인트 2개 소규모, 자체 SWR 캐시로 충분, 번들 0 증가). 대신:
- 데이터 패칭은 외부 스토어 + `useSyncExternalStore`로 캡슐화.
- 남기는 effect는 정당한 것만: keyword→fetch 트리거(1개), `document.title`, 스크롤 리스너, 타이머 정리.
- props→state 동기화 effect는 금지 — `key` 리마운트(FilterSidebar 가격입력)나 파생값으로 대체.

## API / 스크래핑

- **번개장터** (`scrapers/bunjang.ts`): 공개 JSON API(`find_v2.json`) 3페이지 병렬, `status==='0'`(판매중)만. `update_time`이 실제 등록일.
- **중고나라** (`scrapers/joongna.ts`): `web.joongna.com` HTML을 cheerio로 파싱, 3페이지. 가격은 제목/날짜 오염 제거 후 추출.
  - **등록일**: 중고나라는 날짜 필드를 노출하지 않으므로 **이미지 CDN 경로(`/media/.../YYYY/MM/DD/`)에서 실제 업로드(등록)일을 추출**한다. 못 찾으면 `update_time=''`(미상) → 카드에서 날짜 숨김 (가짜 "오늘" 표시 방지).
- 각 API 라우트는 자체 서버 인메모리 캐시(`CONFIG.CACHE_TTL`)를 가짐. Vercel 인스턴스마다 독립적.

## 응답 형식

```ts
// /api/search/{bunjang|joongna}
{ results: Product[], status: 'success' | 'failed' }

// Product (lib/types.ts)
{ platform: '번개장터'|'중고나라', title, price, priceNum, link,
  update_time: string /* 'YY-MM-DD' 또는 '' */, timestamp: number, status, image }
```

## 코드 컨벤션

- **네이밍**: 컴포넌트 PascalCase, 함수/변수 camelCase, 상수 UPPER_SNAKE_CASE.
- **비동기**: `async/await` + try/catch, 실패 시 빈 배열/실패 status 반환해 서비스 지속.
- **styled 대신 Tailwind**; 자식 요소는 부모 클래스 내 중첩 표현, 임의값(`py-[13px]`)은 지양하고 스케일 사용.
- **접근성**: 아이콘 전용 버튼에 `aria-label`, 포커스 `focus-visible:ring`, 비동기 결과 `aria-live`, 터치 타깃 ≥44px.
- **이미지**: `next/image`, 첫 줄 카드는 `priority`.

## 테스트 (E2E 필수)

기능/UI 수정 후 **Playwright로 실제 브라우저 검증**:
1. `npm run dev` (3010) 확인
2. 모바일(390×844)·데스크탑 뷰포트에서 사용자 플로우 실행
3. 검색 / 뒤로·앞으로가기 / 최근검색 드롭다운(포커스·삭제) / 필터 / progressive 렌더링 확인
4. **콘솔 에러 0** 확인 (단, dev의 next-font-manifest 일시 경합 로그는 무해)
5. 스크린샷 캡처

## 알려진 제약 / 주의

- 스크래핑은 대상 사이트 HTML/구조 변경에 취약 → 실패 시 빈 결과로 폴백.
- 중고나라 등록일은 이미지 업로드일 근사값(실제 끌올일과 다를 수 있음).
- Rate limiting/User-Agent 등 스크래핑 에티켓 준수, 개인적 용도.

---

**스택**: Next.js 15 · React 19 · TypeScript · Tailwind v4 · Vercel
**마지막 업데이트**: 2026-06-09 (Express → Next.js 마이그레이션 및 데이터레이어 리팩토링 반영)
