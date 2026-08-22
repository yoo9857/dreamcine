# T03 — 인증 · 권한 · 라우트 하네스

## 진행 상태
- [x] S1 Spec 확인 — 2026-08-21 / 인증·라우트·웹 부트스트랩·DB/CI 연동 산출물 67개 확정
- [x] S2 Skeleton — 2026-08-21 / `pnpm gate:s2` PASS · 산출물 67개 · 잔존 NIE 58개
- [x] S3 구현 — 2026-08-21 / 잔존 NIE 0 · 로컬 359 tests PASS · core 100% / http 98.7% · 통합·E2E 는 CI 검증 (ISS-005)
- [x] E2E 실검증 — CI 런 32538124862 (2026-08-22) 에서 E2E 가 **처음 실제 실행**되어 7 통과 / 5 실패. 세 개의 실제 결함을 찾았다 (ISS-006 로그인 전면 불능, ISS-007 로그아웃 미취소, OBS-011 브라우저 기본 검증이 접근성 오류 경로를 가로챔). 수정 후 **런 32540282862 에서 14/14 통과** — `pnpm gate` 3층 전부 초록.

### 검증 이력 — 왜 게이트가 초록인데 로그인이 죽어 있었나

S3 를 닫을 때 `pnpm gate` 는 통과했지만 E2E 는 한 번도 실행되지 않았다
(로컬 Docker 없음 → CI 위임, ISS-005). 그 사이 `vitest && playwright` 의
`&&` 가 앞 단계 실패로 계속 끊겨 Playwright 가 아예 돌지 않았다.

E2E 가 처음 도는 순간 드러난 것:

| 결함 | 왜 단위 테스트를 통과했나 |
|---|---|
| ISS-006 로그인 전면 불능 | `config.test.ts` 가 스펙의 **문구**(`strategy: 'database'`)를 그대로 단정했다. 확인해야 할 것은 "Auth.js 가 이 설정을 받아들이는가" 였다. |
| ISS-007 로그아웃 미취소 | 로그아웃 경로에 테스트가 아예 없었다. 계약상 Auth.js 위임이라 "라이브러리가 알아서 한다" 고 가정했다. |
| OBS-006 레이트리밋 우회 | 앱 동작은 계약대로였고 테스트도 그것을 확인했다. 빠진 것은 프록시가 그 전제를 세워주는지였다 — 코드 밖의 계약. |

공통점은 하나다 — **가정을 검증으로 착각했다.** 그래서 각 수정마다 되돌리면
실제로 실패하는지 확인한 가드를 함께 남겼다.

### S1 확정 산출물

#### 웹 패키지·게이트 연결

- `apps/web/package.json` — Next/Auth/argon2/pino/nodemailer/AWS SDK 및 workspace 의존성·명령 고정.
- `apps/web/tsconfig.json` — Next strict 타입체크와 경로 별칭 설정.
- `apps/web/next-env.d.ts` — Next 타입 선언 진입점.
- `apps/web/next.config.mjs` — standalone 출력과 보안 빌드 설정.
- `apps/web/app/layout.tsx` — 실행 가능한 루트 HTML 레이아웃.
- `apps/web/app/globals.css` — 인증 화면 기본 전역 스타일.
- `apps/web/app/error.tsx` — 전역 오류 상태와 재시도 UI.
- `apps/web/app/not-found.tsx` — 전역 404 UI.
- `tsconfig.json` — `apps/web` project reference 연결.
- `vitest.config.ts` — web 서비스·HTTP 계층 커버리지 포함.
- `playwright.config.ts` — 인증 E2E용 Next webServer와 실행 환경 연결.
- `.github/workflows/gate.yml` — Playwright용 PostgreSQL/Redis/MinIO 서비스와 환경 연결.
- `openapi.json` — T03 인증·내 프로필·시스템 라우트 계약 문서.

#### core 계약

- `packages/core/src/rules/permission.ts` — 역할·상태·소유관계의 유일한 `can()` 판정.
- `packages/core/src/schemas/auth.schema.ts` — 가입·로그인·인증·재설정·프로필 zod 스키마.
- `packages/core/src/index.ts` — 권한 타입과 인증 스키마 공개 배럴.
- `packages/core/tests/permission.test.ts` — 역할×동작×소유관계 전조합 검사.
- `packages/core/tests/auth-schema.test.ts` — 인증 입력 정상·실패·정규화 검사.

#### DB 인증 관문

- `packages/db/src/repositories/auth.repo.ts` — User/Account/Session/VerificationToken 인증 전용 쿼리.
- `packages/db/src/health.ts` — 외부에 PrismaClient를 노출하지 않는 DB readiness probe.
- `packages/db/src/index.ts` — 인증 저장소와 DB probe만 공개.
- `packages/db/tests/auth-repo.integration.test.ts` — 세션·계정·일회용 토큰·비밀번호 갱신 통합 검사.

#### 인증·HTTP 기반

- `apps/web/src/auth/types.ts` — 라우트가 공유하는 세션 사용자 계약.
- `apps/web/src/auth/adapter.ts` — DB 저장소 위에 Auth.js Adapter 계약 조립.
- `apps/web/src/auth/config.ts` — DB 세션, Credentials, Google, rolling 30일 설정.
- `apps/web/src/auth/session.ts` — Cookie 세션 해석 단일 지점과 Bearer 확장 경계.
- `apps/web/src/auth/password.ts` — argon2id 해시·검증·더미 해시 타이밍 방어.
- `apps/web/src/http/handler.ts` — 인증·CSRF·레이트리밋·파싱·직렬화·오류·로그를 묶는 `withRoute()`.
- `apps/web/src/http/parse.ts` — JSON body와 query zod 파싱.
- `apps/web/src/http/response.ts` — `ok`/`created`/`noContent`/`paginated` 결과 생성.
- `apps/web/src/http/status-map.ts` — 모든 ErrorCode의 HTTP 상태 완전 매핑.
- `apps/web/src/http/rate-limit.ts` — Redis 고정 윈도우와 장애 fail-open.
- `apps/web/src/http/request-id.ts` — 외부 패키지 없이 ULID request ID 생성.
- `apps/web/src/lib/request-context.ts` — AsyncLocalStorage 로그 상관관계 컨텍스트.
- `apps/web/src/lib/error-messages.ts` — 모든 ErrorCode의 한국어 사용자 문구 완전 매핑.
- `apps/web/src/lib/logger.ts` — pino JSON 로그와 필수 redact 정책.
- `apps/web/src/lib/redis.ts` — REDIS_URL 기반 최소 명령 관문(INCR/EXPIRE/PING).
- `apps/web/src/lib/mail.ts` — SMTP 인증·재설정 메일 발송과 테스트 전송 경계.

#### 유스케이스·라우트

- `apps/web/src/services/auth/signup.ts` — 예약어·중복·해시·인증메일 가입 유스케이스.
- `apps/web/src/services/auth/verify-email.ts` — 일회용 인증 토큰 소비와 emailVerified 갱신.
- `apps/web/src/services/auth/request-password-reset.ts` — 계정 존재를 숨기는 재설정 요청.
- `apps/web/src/services/auth/reset-password.ts` — 1시간 일회용 토큰과 비밀번호 변경.
- `apps/web/src/services/auth/get-me.ts` — 현재 사용자 프로필 조회.
- `apps/web/src/services/auth/update-me.ts` — 표시이름·소개·아바타 갱신.
- `apps/web/src/services/system/ready.ts` — DB/Redis/S3 2초 병렬 readiness 검사.
- `apps/web/middleware.ts` — 인증 경로 리다이렉트, CSP nonce, 이중 보안 헤더.
- `apps/web/app/api/auth/[...nextauth]/route.ts` — Auth.js GET/POST 위임.
- `apps/web/app/api/auth/signup/route.ts` — 가입 API.
- `apps/web/app/api/auth/verify/route.ts` — 이메일 인증 API.
- `apps/web/app/api/auth/password/forgot/route.ts` — 재설정 요청 API.
- `apps/web/app/api/auth/password/reset/route.ts` — 재설정 실행 API.
- `apps/web/app/api/me/route.ts` — 내 프로필 GET/PATCH API.
- `apps/web/app/api/health/route.ts` — 무의존 라이브니스 API.
- `apps/web/app/api/ready/route.ts` — 의존 서비스 레디니스 API.

#### 인증 UI·행위 하네스

- `apps/web/app/(auth)/login/page.tsx` — 로그인 화면 진입점.
- `apps/web/app/(auth)/signup/page.tsx` — 가입 화면 진입점.
- `apps/web/app/(auth)/verify/page.tsx` — 인증 결과 화면 진입점.
- `apps/web/src/components/auth/LoginForm.tsx` — 로그인 로딩·오류·정상 상태 UI.
- `apps/web/src/components/auth/SignupForm.tsx` — 가입 로딩·오류·정상 상태 UI.
- `apps/web/src/components/auth/VerifyStatus.tsx` — 인증 로딩·성공·만료·오류 상태 UI.
- `apps/web/src/auth/password.test.ts` — argon2 정상·실패·손상 해시 검사.
- `apps/web/src/http/handler.test.ts` — withRoute 인증·CSRF·오류·BigInt·requestId 검사.
- `apps/web/src/http/rate-limit.integration.test.ts` — Redis 초과·TTL·fail-open 통합 검사.
- `apps/web/src/lib/logger.test.ts` — 비밀번호·토큰·쿠키 redact 실검증.
- `apps/web/src/services/auth/auth.integration.test.ts` — 가입·인증·로그인·재설정 통합 검사.
- `apps/web/src/services/system/ready.integration.test.ts` — DB/Redis/S3 실패별 503 검사.
- `apps/web/e2e/auth.e2e.ts` — US-01 가입→메일 토큰→인증→로그인 E2E와 CSP 검사.

---

## 1. 목적

로그인·회원가입·이메일 인증을 완성하고, **모든 API 가 공유하는 `withRoute` 하네스**를
세운다. 이 태스크 이후 만들어지는 모든 라우트는 에러 처리·인증·레이트리밋·로깅을
**공짜로** 얻는다.

> `withRoute` 는 이 프로젝트에서 가장 많이 재사용되는 코드다. 여기에 시간을 써라.

## 2. 참조 스펙

- `../00_SPEC/07_AUTH_SECURITY.md` (전체)
- `../00_SPEC/05_API_CONTRACT.md` §1, §2, §10, §11
- `../00_SPEC/09_ERROR_CATALOG.md` (인증·권한 절, §4 응답형태)
- `../00_SPEC/08_UIUX_SPEC.md` §1 라우트, §3 상태
- `../00_SPEC/04_DOMAIN_MODEL.md` (User/Session/Account)

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/core/src/rules/permission.ts` | `can()` 순수 판정 함수 | S2→S3 |
| `packages/core/src/schemas/auth.schema.ts` | 회원가입/로그인/재설정 zod | S2→S3 |
| `apps/web/src/auth/config.ts` | Auth.js 설정 (DB 세션, argon2, Google) | S2→S3 |
| `apps/web/src/auth/session.ts` | `getSessionFromRequest()` **단일 지점** | S2→S3 |
| `apps/web/src/auth/password.ts` | argon2 해시/검증 | S3 |
| `apps/web/src/http/handler.ts` | ★ `withRoute()` | S2→S3 |
| `apps/web/src/http/parse.ts` | body/query 파싱 | S3 |
| `apps/web/src/http/response.ts` | `ok`/`created`/`noContent`/`paginated` | S3 |
| `apps/web/src/http/status-map.ts` | 에러코드 → HTTP 상태 (전 코드 망라) | S3 |
| `apps/web/src/http/rate-limit.ts` | Redis 고정 윈도우 | S3 |
| `apps/web/src/lib/error-messages.ts` | `Record<ErrorCode, string>` | S3 |
| `apps/web/src/lib/logger.ts` | pino + redact | S3 |
| `apps/web/middleware.ts` | 리다이렉트 + 보안헤더 + CSP nonce | S3 |
| `apps/web/app/api/auth/[...nextauth]/route.ts` | Auth.js 위임 | S3 |
| `apps/web/app/api/auth/signup/route.ts` | 회원가입 | S3 |
| `apps/web/app/api/auth/verify/route.ts` | 이메일 인증 | S3 |
| `apps/web/app/api/auth/password/forgot/route.ts` | 재설정 요청 | S3 |
| `apps/web/app/api/auth/password/reset/route.ts` | 재설정 실행 | S3 |
| `apps/web/app/api/me/route.ts` | 내 프로필 GET/PATCH | S3 |
| `apps/web/app/api/health/route.ts` | 라이브니스 | S3 |
| `apps/web/app/api/ready/route.ts` | 레디니스 (DB/Redis/S3) | S3 |
| `apps/web/src/services/auth/*.ts` | 회원가입·인증 유스케이스 | S3 |
| `apps/web/app/(auth)/login/page.tsx` | 로그인 화면 | S3 |
| `apps/web/app/(auth)/signup/page.tsx` | 회원가입 화면 | S3 |
| `apps/web/app/(auth)/verify/page.tsx` | 인증 결과 화면 | S3 |
| `apps/web/src/lib/mail.ts` | nodemailer 발송 | S3 |
| `apps/web/e2e/auth.e2e.ts` | US-01 | S3 |

## 4. S2 Skeleton

### `withRoute` 계약 (이 시그니처가 이후 모든 라우트를 규정한다)

```ts
// apps/web/src/http/handler.ts
export interface RouteContext<TSession> {
  req: Request
  params: Record<string, string>
  query: URLSearchParams
  body: unknown                      // ★ unknown. 라우트가 zod 로 파싱한다.
  session: TSession
  requestId: string
  ip: string
}

export interface RouteResult {
  status: number
  body?: unknown
  headers?: Record<string, string>
}

export interface RouteOptions {
  auth: 'required' | 'optional' | 'none'
  rateLimit?: { bucket: string; limit: number; windowSec: number; by: 'ip' | 'user' }
  csrf?: boolean                     // 기본 true (상태변경 메서드)
}

// auth: 'required' → session 은 Session (non-null)
// auth: 'optional' → session 은 Session | null
// auth: 'none'     → session 은 null
export function withRoute<O extends RouteOptions>(
  handler: (ctx: RouteContext<SessionFor<O>>) => Promise<RouteResult>,
  options: O,
): (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response> {
  throw new NotImplementedError('T03:withRoute')
}
```

**타입 수준 요구**: `auth: 'required'` 를 주면 `ctx.session` 이 non-null 로 좁혀져야 한다.
그래야 라우트에서 `session!` 이나 null 체크를 반복하지 않는다. 조건부 타입으로 구현한다.

```ts
// packages/core/src/rules/permission.ts
export type Action =
  | 'episode.create' | 'episode.update' | 'episode.publish' | 'episode.hide'
  | 'episode.remove' | 'series.create'  | 'series.update'   | 'series.remove'
  | 'upload.create'  | 'comment.create' | 'comment.delete'
  | 'report.create'  | 'report.review'  | 'user.suspend'    | 'user.setRole'

export interface Actor {
  id: string; role: UserRole; status: UserStatus; emailVerified: boolean
}

export function can(actor: Actor, action: Action, resource?: { ownerId?: string }): boolean {
  throw new NotImplementedError('T03:can')
}
```

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T03:can` | 권한 매트릭스(`07` §2) 전부. `status !== 'ACTIVE'` 는 무조건 false. |
| 2 | `T03:statusMap` | 에러코드 → HTTP. **`Record<ErrorCode, number>` 타입**으로 누락을 컴파일 에러로 |
| 3 | `T03:errorMessages` | 동일하게 `Record<ErrorCode, string>` |
| 4 | `T03:logger` | pino + `redact` (07 §9 목록 그대로) |
| 5 | `T03:rateLimit` | Redis INCR/EXPIRE. **Redis 장애 시 통과(fail-open)** |
| 6 | `T03:withRoute` | 아래 순서 그대로 |
| 7 | `T03:password` | argon2id, 파라미터는 `07` §1 표 |
| 8 | `T03:authConfig` | Auth.js: DB 세션 30일 rolling, Credentials + Google |
| 9 | `T03:getSession` | 쿠키 → 세션. **Bearer 확장 지점을 주석으로 표시** |
| 10 | `T03:signup` | 핸들 예약어 차단 → 중복 검사 → argon2 → 인증메일 |
| 11 | `T03:verifyEmail` | 토큰 검증 → `emailVerified` 설정 → 토큰 삭제 |
| 12 | `T03:passwordReset` | 요청은 계정 없어도 200, 토큰 TTL 1시간, 1회용 |
| 13 | `T03:middleware` | 리다이렉트 + CSP nonce 생성 + 보안헤더 |
| 14 | `T03:readyCheck` | DB `select 1` / Redis `ping` / S3 `headBucket` 병렬, 타임아웃 2초 |
| 15 | `T03:authPages` | 로그인/가입/인증 화면 (상태 4종) |

### `withRoute` 내부 실행 순서 (이 순서를 바꾸지 않는다)

```
1.  requestId 생성 (ULID) → AsyncLocalStorage 에 저장 (로그 상관관계)
2.  ip 추출 (X-Forwarded-For 첫 값)
3.  CSRF: 상태변경 메서드면 Origin 검증 → 불일치 시 E_PERM_DENIED
4.  세션 조회 (auth !== 'none' 일 때)
5.  auth === 'required' && !session → E_AUTH_REQUIRED
6.  session.user.status !== 'ACTIVE' → E_AUTH_ACCOUNT_SUSPENDED
7.  레이트리밋 확인 → 초과 시 E_RATE_LIMITED + Retry-After
8.  body 파싱 (JSON. 파싱 실패 → E_VALIDATION)
9.  params 해석 (Next 15: await ctx.params)
10. 핸들러 실행
11. 결과 직렬화 (BigInt → string 커스텀 replacer)
12. 로그 1줄: {requestId, method, path, status, durationMs, userId?}
13. X-Request-Id 헤더 부착

에러 발생 시:
  ZodError        → 422 E_VALIDATION + fields
  AppError        → statusMap[code] + 메시지 사전
  NotImplemented  → 501 (개발 중에만 존재해야 함)
  그 외           → 500 E_INTERNAL + 스택을 error 레벨로 로깅
                     ★ 클라이언트에는 스택/detail 을 절대 보내지 않는다
```

**7번(레이트리밋)이 4~6번(인증) 뒤에 오는 이유**: 사용자별 한도를 적용하려면
신원을 먼저 알아야 한다. 다만 인증 엔드포인트는 IP 기준이므로 순서와 무관하다.

## 6. 예외처리

| 상황 | 에러코드 | 처리 |
|---|---|---|
| 미로그인이 인증 필요 API 호출 | `E_AUTH_REQUIRED` | 401 |
| 세션 만료/무효 | `E_AUTH_SESSION_EXPIRED` | 401 + 쿠키 삭제 |
| 정지 계정 | `E_AUTH_ACCOUNT_SUSPENDED` | 403 + 즉시 세션 무효화 |
| 이메일 미인증이 업로드/댓글 시도 | `E_AUTH_EMAIL_NOT_VERIFIED` | 403 + 재발송 안내 |
| 비밀번호/이메일 불일치 | `E_AUTH_INVALID_CREDENTIALS` | 401. **동일 메시지** (계정 존재 노출 금지) |
| 존재하지 않는 이메일로 로그인 | `E_AUTH_INVALID_CREDENTIALS` | 위와 동일 |
| 이메일 중복 가입 | `E_USER_EMAIL_TAKEN` | 409 (의도적으로 노출 — `07` §11) |
| 핸들 중복 / 예약어 | `E_USER_HANDLE_TAKEN` | 409 |
| Google OAuth 실패 | `E_AUTH_OAUTH_FAILED` | 502 + 재시도 안내 |
| 인증 토큰 만료 | `E_VALIDATION` | 422 + 재발송 버튼 |
| 재설정 요청 (없는 계정) | — | **200 반환** (존재 여부 노출 금지) |
| 권한 부족 | `E_PERM_DENIED` | 403 |
| 남의 리소스 | `E_PERM_NOT_OWNER` | 403 |
| Origin 불일치 | `E_PERM_DENIED` | 403 + 로그 (공격 가능성) |
| 레이트리밋 초과 | `E_RATE_LIMITED` | 429 + `Retry-After` |
| Redis 장애 (레이트리밋) | — | **통과.** warn 로그 + 알럿. 서비스 중단시키지 않는다 |
| 메일 발송 실패 | — | 가입 자체는 성공 처리. 재발송 버튼 제공. error 로그 |
| argon2 검증 예외 | `E_INTERNAL` | 500. 해시 형식 손상 가능성 → 알럿 |

### 타이밍 공격 방어

존재하지 않는 이메일로 로그인 시도 시 argon2 검증을 건너뛰면 응답이 빨라져
**계정 존재 여부가 드러난다.** 반드시 더미 해시로 검증을 수행해 시간을 맞춘다.

```ts
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$...'  // 부팅 시 1회 생성
const hash = user?.passwordHash ?? DUMMY_HASH
const valid = await verify(hash, password)
if (!user || !valid) throw new AppError('E_AUTH_INVALID_CREDENTIALS')
```

## 7. 테스트

| 케이스 | 방식 |
|---|---|
| `can()` — 역할 × 동작 × 소유관계 **전조합** | 단위 (표 기반 반복) |
| `can()` — `status='SUSPENDED'` 는 모든 동작 false | 단위 |
| `statusMap` 에 모든 `ErrorCode` 존재 | 타입 + `contract:errors` |
| `error-messages` 에 모든 코드 존재 | 타입 + 게이트 |
| `withRoute` — `auth:'required'` 미로그인 → 401 `E_AUTH_REQUIRED` | 단위 |
| `withRoute` — `AppError` → 매핑된 상태코드 | 단위 |
| `withRoute` — `ZodError` → 422 + `fields` | 단위 |
| `withRoute` — 미분류 예외 → 500, **응답에 스택 없음** | 단위 |
| `withRoute` — 응답에 `X-Request-Id` 존재 | 단위 |
| `withRoute` — Origin 불일치 POST → 403 | 단위 |
| `withRoute` — BigInt 가 string 으로 직렬화 | 단위 |
| 레이트리밋 — 한도 초과 시 429 + `Retry-After` | 통합 |
| 레이트리밋 — Redis 다운 시 통과 | 통합 (Redis 중단 후) |
| 가입 → 인증메일 → 인증 → 로그인 | E2E (US-01) |
| 로그인 실패 응답 시간이 성공/미존재에서 유사 | 단위 (타이밍, 허용 편차 내) |
| 정지 계정은 즉시 접근 차단 | 통합 |
| 재설정 요청이 없는 계정에도 200 | 통합 |
| CSP 헤더에 `unsafe-inline`/`unsafe-eval` 없음 (script-src) | E2E |

## 8. 완료 조건 (DoD)

- [x] `pnpm gate` 통과 — CI 런 32540282862 에서 L1·L2·L3 전부 통과 (단위+통합+E2E). 이어 런 32540805435 에서 **프로덕션과 동일한 standalone 서버**로 14/14 재통과 (OBS-010) — Prisma·argon2 네이티브 바인딩 포함 런타임이 실물 검증됐다. 로컬은 Docker 부재로 단위까지만 (ISS-005)
- [x] 잔존 `NotImplementedError('T03:...')` = 0 — `pnpm sss:remaining` → `TOTAL=0`
- [x] `auth.e2e.ts` (US-01) **실행 통과** — 가입→토큰→인증→로그인 + CSP·보안헤더·리다이렉트. CI 런 32540282862 / 14 tests. DB 세션 브리지(`jwt.encode`)가 실물로 검증된 첫 지점이다.
- [x] `can()` 전조합 테스트 통과 — 역할 4 × 동작 15 × 소유 2 = 120 조합 + 상태·인증 축
- [x] `/api/ready` 가 Redis 를 끄면 실제로 503 을 반환 — `ready.integration.test.ts` (CI)
- [x] `app/api/**` 에 `try/catch` 0건
- [x] `app/api/**` 에 `new Response(` 직접 호출 0건
- [x] 로그에 비밀번호/토큰/쿠키가 남지 않음 — `logger.test.ts` 에서 redact 실검증
- [x] 권한 판정이 `can()` 밖에 존재하지 않음 — `role ===` grep 0건 (`permission.ts` 제외)

### S1 목록 외 추가 산출물 (테스트 전용)

기존 산출물의 1:1 대응 테스트다. 스펙 밖 기능을 추가한 것은 없다.

- `apps/web/src/http/{status-map,request-id,parse,response,rate-limit}.test.ts`
- `apps/web/src/lib/{error-messages,request-context,redis}.test.ts`
- `apps/web/src/auth/config.test.ts`, `apps/web/src/auth/session.integration.test.ts`
- `packages/db/src/health.ts` 의 `disconnectDb()` — 테스트·워커 종료 경로용
- `packages/db/src/repositories/auth.repo.ts` 의 `findVerificationTokensFor()` — 재발송·E2E 조회용
