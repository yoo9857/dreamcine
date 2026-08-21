# T13 — PWA 마감 + Phase 2 앱 전환 대비

## 진행 상태
- [ ] S1 Spec 확인
- [ ] S2 Skeleton
- [ ] S3 구현

---

## 1. 목적

웹을 PWA 로 마감해 모바일 설치 경험을 제공하고,
**Phase 2 의 Expo 네이티브 앱이 코드 변경 없이 붙을 수 있도록 API 를 고정**한다.

> 이 태스크의 절반은 "지금 만드는 것" 이고 절반은 "나중을 위해 잠그는 것" 이다.

## 2. 참조 스펙

- `../00_SPEC/08_UIUX_SPEC.md` §9 PWA
- `../00_SPEC/05_API_CONTRACT.md` §1 (버저닝), §11
- `../00_SPEC/07_AUTH_SECURITY.md` §1 (Phase 2 앱 대비)
- `../00_SPEC/10_NFR.md` §1 성능, §9 브라우저
- `../00_SPEC/00_PRODUCT.md` §3 비범위 (네이티브 앱은 Phase 2)

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `apps/web/public/manifest.json` | PWA 매니페스트 | S2→S3 |
| `apps/web/public/icons/**` | 192/512/maskable/apple-touch | S3 |
| `apps/web/public/sw.js` | 서비스워커 (직접 작성) | S2→S3 |
| `apps/web/src/lib/sw-register.ts` | 등록 + 업데이트 감지 | S3 |
| `apps/web/src/components/InstallPrompt.tsx` | 설치 유도 배너 | S3 |
| `apps/web/src/components/UpdateToast.tsx` | 새 버전 안내 | S3 |
| `apps/web/app/offline/page.tsx` | 오프라인 안내 | S3 |
| `scripts/contract/gen-openapi.ts` | ★ zod → openapi.json | S2→S3 |
| `scripts/contract/check-openapi.ts` | ★ 계약 하네스 (T00 골격) | S3 |
| `openapi.json` | 생성물 (커밋함) | S3 |
| `packages/api-client/src/generated/**` | OpenAPI → 타입 (자동생성) | S3 |
| `packages/api-client/src/client.ts` | fetch 래퍼 · 인증 · 에러 정규화 | S2→S3 |
| `packages/api-client/src/endpoints/*.ts` | 도메인별 함수 | S3 |
| `apps/web/src/auth/session.ts` | Bearer 지원 추가 (미사용, 준비만) | S3 |
| `docs/20_OPS/O07_ONBOARDING.md` 갱신 | 앱 개발 시작 절차 추가 | S3 |

## 4. S2 Skeleton

```ts
// packages/api-client/src/client.ts
// ★ 이 클라이언트가 Phase 2 Expo 앱에서 그대로 재사용된다.
//   따라서 웹 전용 API(document, window, localStorage)를 절대 참조하지 않는다.
export interface ApiClientConfig {
  baseUrl: string
  /** 웹: 쿠키 자동 전송(credentials). 앱: Bearer 토큰 공급자 */
  getAuthHeader?: () => Promise<Record<string, string>>
  onUnauthorized?: () => void
  fetchImpl?: typeof fetch          // 앱에서 커스텀 fetch 주입 가능
}

export interface ApiError {
  code: string
  message: string
  fields: Record<string, string> | null
  requestId: string
  httpStatus: number
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  throw new NotImplementedError('T13:createApiClient')
}
```

```js
// apps/web/public/sw.js — 캐시 전략을 명시적으로 고정
const CACHE_VERSION = 'v1'            // 배포 시 갱신 (빌드가 주입)
const APP_SHELL = ['/', '/offline', '/manifest.json']

// 전략:
//   /_next/static/**  → cache-first (immutable)
//   앱 셸 라우트       → network-first, 실패 시 캐시
//   /api/**           → 캐시 안 함 (network-only)
//   CDN 미디어         → ★ 캐시 절대 금지 (용량 폭발)
```

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T13:genOpenapi` | zod 스키마 → OpenAPI 3.1 JSON 생성 |
| 2 | `T13:checkOpenapi` | 라우트 실제 스키마 ↔ 생성물 대조 (계약 하네스 완성) |
| 3 | `T13:apiClientTypes` | `openapi-typescript` 로 타입 생성 |
| 4 | `T13:createApiClient` | fetch 래퍼 (아래 요구사항) |
| 5 | `T13:apiEndpoints` | 도메인별 함수 (feed/episode/upload/social/auth) |
| 6 | `T13:bearerSupport` | `getSessionFromRequest` 에 Bearer 분기 추가 (비활성 상태로) |
| 7 | `T13:manifest` | 매니페스트 + 아이콘 |
| 8 | `T13:serviceWorker` | 캐시 전략 (아래) |
| 9 | `T13:swRegister` | 등록 + 새 버전 감지 |
| 10 | `T13:installPrompt` | 3회 방문 후 1회 |
| 11 | `T13:offlinePage` | 오프라인 안내 |
| 12 | `T13:apiVersionFreeze` | `/api/v1` 별칭 추가 (아래) |

### `api-client` 요구사항 (Phase 2 재사용의 핵심)

| 요구 | 이유 |
|---|---|
| **웹 전용 전역 참조 금지** (`window`, `document`, `localStorage`) | React Native 에 그 API 가 없다 |
| 인증은 주입식 (`getAuthHeader`) | 웹은 쿠키, 앱은 Bearer |
| `fetchImpl` 주입 가능 | 앱에서 재시도/오프라인 큐 래핑 |
| 에러를 `ApiError` 로 정규화 | 호출자가 `code` 로만 분기 |
| 401 → `onUnauthorized` 콜백 | 웹은 리다이렉트, 앱은 로그인 모달 |
| 타입은 OpenAPI 에서 자동생성 | 손으로 쓰면 반드시 어긋난다 |
| 커서 페이지네이션 헬퍼 제공 | 무한스크롤 로직 공유 |

**depcruise 규칙 추가**: `packages/api-client` 가 `window`/`document` 를 참조하면 실패.

```js
// .dependency-cruiser.cjs 에 추가
{
  name: 'api-client-is-platform-agnostic',
  severity: 'error',
  from: { path: '^packages/api-client' },
  to: { dependencyTypes: ['core'], path: '^(dom|jsdom)' },
}
```

DOM 전역 참조는 `tsconfig` 의 `lib` 에서 `DOM` 을 제외해 **컴파일 단계에서** 막는다.
이것이 가장 확실한 하네스다.

### API 버전 고정

```
현재: /api/feed
추가: /api/v1/feed   ← 같은 핸들러를 가리키는 별칭

방법: Next.js rewrites 로 /api/v1/* → /api/*

이유:
- 웹은 계속 /api/* 를 쓴다 (변경 비용 0)
- Phase 2 앱은 처음부터 /api/v1/* 를 쓴다
- 나중에 앱을 깨지 않고 /api/* 를 바꿀 수 있다
  (앱은 스토어 심사 때문에 즉시 업데이트가 불가능하다)
```

**이 조치가 없으면** 앱 출시 후 API 를 고칠 때마다 구버전 앱 사용자가 깨진다.
지금 rewrite 한 줄로 미래의 큰 문제를 막는다.

### 서비스워커 캐시 전략 (엄격히 지킨다)

| 대상 | 전략 | 이유 |
|---|---|---|
| `/_next/static/**` | cache-first, 영구 | 해시 파일명이라 안전 |
| 앱 셸 (`/`, `/offline`) | network-first, 폴백 캐시 | 최신 우선, 오프라인 대비 |
| `/api/**` | **network-only** | 인증/개인화 데이터. 캐시 시 심각한 유출 위험 |
| CDN 미디어 (`.ts`, `.m3u8`) | **캐시 금지** ★ | 영상 세그먼트를 캐시하면 수 GB가 쌓인다 |
| 이미지 (썸네일) | stale-while-revalidate, 최대 100개 LRU | 개수 제한 필수 |

```js
// sw.js — 미디어 제외를 명시적으로
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // ★ 미디어와 API 는 서비스워커가 아예 손대지 않는다
  if (url.pathname.includes('/hls/') ||
      url.pathname.endsWith('.ts') ||
      url.pathname.endsWith('.m3u8') ||
      url.pathname.startsWith('/api/')) {
    return            // respondWith 호출 안 함 → 브라우저 기본 동작
  }
  // ... 나머지 전략
})
```

### 서비스워커 업데이트 처리

```
1. 새 SW 감지 (registration.waiting)
2. UpdateToast 표시: "새 버전이 있습니다 [새로고침]"
3. 사용자가 클릭 → postMessage('SKIP_WAITING') → controllerchange → reload

★ 자동으로 skipWaiting 하지 않는다. 재생 중 강제 새로고침은 최악의 UX 다.
```

## 6. 예외처리

| 상황 | 처리 |
|---|---|
| 서비스워커 미지원 브라우저 | 등록 건너뜀. 앱은 정상 동작 (기능 저하만) |
| SW 등록 실패 | warn 로그. 앱 동작에 영향 없음 |
| 캐시 용량 초과 (`QuotaExceededError`) | 오래된 캐시 삭제 후 재시도. 실패 시 캐시 포기 |
| 오프라인 상태에서 페이지 요청 | `/offline` 표시 |
| 오프라인 상태에서 API 호출 | `ApiError { code: 'E_OFFLINE' }` 로 정규화 + "인터넷 연결 확인" |
| SW 버전 불일치 (구 SW 가 신 앱 서빙) | `CACHE_VERSION` 이 다르면 전체 캐시 삭제 |
| 설치 프롬프트 지원 안 함 (iOS) | 배너 숨김. iOS 는 수동 안내 문구 |
| OpenAPI 생성물이 라우트와 불일치 | `contract:openapi` 실패 → CI 차단 |
| `api-client` 가 DOM 참조 | tsconfig lib 에서 컴파일 실패 |
| `/api/v1/*` rewrite 누락 | 통합 테스트로 검증 |

## 7. 테스트

| 케이스 | 방식 |
|---|---|
| `gen-openapi` 가 유효한 OpenAPI 3.1 생성 | 단위 (스키마 검증) |
| `check-openapi` 가 불일치를 검출 | 단위 (일부러 어긋낸 픽스처) |
| `api-client` — 성공 응답 파싱 | 단위 (msw) |
| `api-client` — 에러 응답 → `ApiError` 정규화 | 단위 ★ |
| `api-client` — 401 → `onUnauthorized` 호출 | 단위 |
| `api-client` — 네트워크 실패 → `E_OFFLINE` | 단위 |
| `api-client` — `getAuthHeader` 주입 동작 | 단위 |
| `api-client` — **DOM 전역 참조 0건** | 컴파일 (lib 제외) ★ |
| `api-client` — Node 환경에서 동작 (RN 대용) | 단위 (jsdom 없이 실행) ★ |
| `/api/v1/feed` == `/api/feed` 응답 동일 | 통합 ★ |
| SW — `/api/**` 를 가로채지 않음 | 단위 (fetch 이벤트 모킹) ★ |
| SW — `.m3u8`/`.ts` 를 가로채지 않음 | 단위 ★ |
| SW — 정적 자산 cache-first | 단위 |
| SW — 앱 셸 network-first + 오프라인 폴백 | 단위 |
| SW — 이미지 캐시 100개 초과 시 LRU 삭제 | 단위 |
| 매니페스트 유효성 | Lighthouse PWA 감사 |
| 오프라인에서 `/offline` 표시 | E2E (오프라인 모드) |
| 설치 프롬프트 3회 방문 후 1회만 | E2E |
| SW 업데이트 시 자동 새로고침 안 함 | E2E |

## 8. 완료 조건 (DoD)

- [ ] `pnpm gate` 통과 (`contract:openapi` 포함 — **하네스 완성**)
- [ ] 잔존 `NotImplementedError('T13:...')` = 0
- [ ] Lighthouse PWA 감사 통과 (설치 가능)
- [ ] `packages/api-client` 가 `lib: ["ES2022"]` (DOM 제외) 로 컴파일됨
- [ ] `api-client` 테스트가 jsdom 없이 통과 (RN 호환 증명)
- [ ] `/api/v1/*` 별칭 동작 확인
- [ ] **실제 모바일에서 설치 → 실행 → 재생 확인** (수동, Android + iOS)
- [ ] 영상 재생 후 캐시 저장량 확인: 미디어 0 바이트 (개발자도구 Application)
- [ ] 오프라인 전환 시 안내 페이지 표시
- [ ] `openapi.json` 이 커밋되어 있고 라우트와 일치

---

## 부록 — Phase 2 (Expo 앱) 시작 절차

이 태스크가 끝나면 앱 개발은 다음 순서로 시작한다. **지금 실행하지 않는다.**

```
1. apps/mobile 생성 (Expo SDK, expo-router)
2. packages/api-client 를 의존성으로 추가 → 그대로 사용
3. 인증만 새로 구현:
   - Bearer 토큰 발급 엔드포인트 추가 (/api/v1/auth/token)
   - expo-secure-store 에 토큰 저장
   - getAuthHeader 로 주입
4. 재생: expo-video (HLS 네이티브 지원)
5. 업로드: expo-file-system 의 업로드 API + 같은 서명 URL 흐름
6. packages/ui 는 재사용 불가 (웹 DOM) → 별도 RN 컴포넌트 작성
   단 packages/core (도메인 규칙/스키마/상태기계) 는 100% 재사용

★ 이 순서가 가능한 이유가 T13 에서 한 작업들이다:
  - api-client 가 플랫폼 무지 (DOM 미참조)
  - /api/v1 버전 고정
  - 세션 해석이 단일 함수 (Bearer 분기 지점 확보)
  - core 가 순수 (외부 의존 0)
```
