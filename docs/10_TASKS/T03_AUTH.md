# T03 — 인증 · 권한 · 라우트 하네스

## 진행 상태
- [ ] S1 Spec 확인
- [ ] S2 Skeleton
- [ ] S3 구현

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

- [ ] `pnpm gate` 통과
- [ ] 잔존 `NotImplementedError('T03:...')` = 0
- [ ] `auth.e2e.ts` (US-01) 통과
- [ ] `can()` 전조합 테스트 통과
- [ ] `/api/ready` 가 Redis 를 끄면 실제로 503 을 반환
- [ ] `app/api/**` 에 `try/catch` 0건 (grep 확인 — 에러 처리는 `withRoute` 만)
- [ ] `app/api/**` 에 `new Response(` 직접 호출 0건 (`response.ts` 경유)
- [ ] 로그에 비밀번호/토큰/쿠키가 남지 않음 (redact 실제 확인)
- [ ] 권한 판정이 `can()` 밖에 존재하지 않음 (`role ===` grep 으로 확인)
