# 07 — 인증 · 권한 · 보안

> 상태: **불변 계약**. CODEX 수정 금지.

---

## 1. 인증 방식

| 항목 | 결정 | 이유 |
|---|---|---|
| 라이브러리 | Auth.js v5 (`next-auth`) | Next.js 통합, 검증된 구현 |
| 세션 전략 | **DB 세션** (`strategy: 'database'`) | 강제 로그아웃·기기 관리·즉시 정지가 가능 |
| 쿠키 | `httpOnly`, `secure`, `sameSite: 'lax'` | |
| 세션 수명 | 30일, 접근 시 갱신(rolling) | |
| 비밀번호 해시 | **argon2id** (`@node-rs/argon2`) | bcrypt 대비 메모리 하드 |
| argon2 파라미터 | `memoryCost: 19456, timeCost: 2, parallelism: 1` | OWASP 권장값 |
| 소셜 로그인 | Google | |
| 이메일 인증 | 필수. 미인증 시 업로드/댓글 차단 | 스팸 방지 |

**JWT 세션을 쓰지 않는 이유**: 계정 정지가 즉시 반영되지 않는다.
영상 플랫폼은 신고→차단이 즉시 효력을 가져야 하므로 DB 세션이 맞다.

### Phase 2 앱 대비 (T13)

네이티브 앱은 쿠키를 쓰기 어렵다. 그래서 **지금은 구현하지 않되 자리만 비워둔다**:

- `Session` 모델에 `deviceName`, `lastSeenAt` 컬럼을 나중에 추가할 것을 전제
- `withRoute` 의 세션 해석은 `getSessionFromRequest()` 단일 함수를 경유 →
  Bearer 토큰 지원 추가 시 **이 함수 하나만** 수정하면 되게 한다

## 2. 권한 매트릭스

> 2026-08-27 `ISS-020` 승인으로 4단계 평면에서 **7단계 사다리**로 개정되었다.
> 사다리 정의와 유도 규칙은 `packages/core/src/rules/roles.ts` 가 소유한다.

### 역할 사다리

| 순위 | 역할 | 저장 | 뜻 |
|---|---|---|---|
| 0 | `GUEST` | **안 함** | 비로그인 방문자. 세션이 없을 때의 런타임 역할 |
| 1 | `VIEWER` | ○ | 가입 완료, **이메일 미인증** |
| 2 | `MEMBER` | ○ (유도) | 이메일 인증 완료 |
| 3 | `CREATOR` | ○ | 업로드·시리즈 운영 |
| 4 | `PARTNER` | ○ | CREATOR + 우대 한도, 정산 대상 |
| 5 | `MODERATOR` | ○ | 신고 심사·숨김·계정 제한 |
| 6 | `ADMIN` | ○ | 전관 + 역할 부여 |

**`GUEST` 는 DB 열거형에 없다.** 게스트는 행이 없다. 저장 가능한 값으로 만들면
"GUEST 로 저장된 계정" 이라는 불가능한 상태가 타입상 표현 가능해지고, 그런 행이
하나 생기는 순간 그 계정은 로그인은 되면서 아무 동작도 못 하는 유령이 된다.
`ActorRole = UserRole | 'GUEST'` 를 판정 계층에만 둔다.

**`MEMBER` 는 저장하지 않고 유도한다.** `emailVerified` 가 이미 진실의 단일
출처다. 역할 컬럼에 또 적으면 이메일 변경·인증 철회 시 두 값이 갈라질 수 있고,
갈라진 쪽이 판정에 쓰이면 인증 게이트가 무력화된다. `resolveActorRole()` 이 매
판정마다 유도하므로 갈라질 자리가 없다. 그래서 `MEMBER` 는 `GRANTABLE_ROLES` 에
없다 — ADMIN 도 직접 지정하지 못한다. 강등은 `VIEWER` 로 한다.

**사다리는 권한의 근사치일 뿐이다.** `MODERATOR` 는 `CREATOR` 보다 위에 있지만
업로드는 못 한다. 운영 권한과 제작 권한은 다른 축이다. 그래서 `can()` 은
`hasAtLeast()` 로 판정하지 않는다 — `hasAtLeast()` 는 "이 역할 이상에게만 보이는
화면" 같은 **표시 게이트** 전용이다.

### 매트릭스

`○` 가능 · `✗` 불가 · `자` 자기 것만 · `—` 해당 없음

| 동작 | GUEST | VIEWER | MEMBER | CREATOR | PARTNER | MODERATOR | ADMIN |
|---|---|---|---|---|---|---|---|
| 공개 콘텐츠 시청 `episode.watch` | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| 댓글 작성 `comment.create` | ✗ | ✗ | ○ | ○ | ○ | ○ | ○ |
| 좋아요 `social.like` | ✗ | ✗ | ○ | ○ | ○ | ○ | ○ |
| 팔로우 `social.follow` | ✗ | ✗ | ○ | ○ | ○ | ○ | ○ |
| 재생목록 생성 `playlist.create` | ✗ | ✗ | ○ | ○ | ○ | ○ | ○ |
| 신고 `report.create` | ✗ | ○ | ○ | ○ | ○ | ○ | ○ |
| 자기 프로필 수정 `profile.update` | ✗ | 자 | 자 | 자 | 자 | 자 | 자 |
| 시리즈 생성 `series.create` | ✗ | ✗ | ✗ | ○ | ○ | ✗ | ○ |
| 에피소드 생성 `episode.create` | ✗ | ✗ | ✗ | ○ | ○ | ✗ | ○ |
| 업로드 `upload.create` | ✗ | ✗ | ✗ | ○ | ○ | ✗ | ○ |
| 콘텐츠 수정 `series.update` `episode.update` | ✗ | ✗ | ✗ | 자 | 자 | ✗ | 자 |
| 공개 `episode.publish` | ✗ | ✗ | ✗ | 자 | 자 | ✗ | 자 |
| 숨김 `episode.hide` | ✗ | ✗ | ✗ | 자 | 자 | ○ | ○ |
| 영구삭제 `series.remove` `episode.remove` | ✗ | ✗ | ✗ | 자 | 자 | ✗ | ○ |
| 댓글 삭제 `comment.delete` | ✗ | 자 | 자 | 자 | 자 | ○ | ○ |
| 신고 심사 `report.review` | ✗ | ✗ | ✗ | ✗ | ✗ | ○ | ○ |
| 감사 로그 열람 `user.viewAudit` | ✗ | ✗ | ✗ | ✗ | ✗ | ○ | ○ |
| 정산 화면 `monetization.view` | ✗ | ✗ | ✗ | ✗ | 자 | ✗ | ○ |
| 계정 정지 `user.suspend` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ○ |
| 역할 부여 `user.setRole` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ○ |

`ADMIN` 이 "콘텐츠 수정" 에서 `자` 인 이유: 남의 작품을 **고치는** 권한은 어떤
역할에도 없다. 운영이 개입해야 하면 숨기거나 삭제한다. 남의 이름으로 남의 작품을
바꾸는 경로는 만들지 않는다.

`PARTNER` 가 정산에서 `자` 인 이유: 파트너는 자기 정산만 본다. 남의 수익을 보는
것은 ADMIN 의 권한이다.

읽기 예외 하나: **정지·삭제 계정은 `episode.watch` 도 false 다.** §2 철칙 1이
"정지 계정은 아무것도 못 한다" 이므로 시청도 포함한다. 결과적으로 정지 계정은
로그아웃한 방문자보다 볼 수 있는 것이 적다 — 의도된 것이며, 정지가 징계이기
때문이다.

### 판정은 순수 함수 하나로

```ts
// packages/core/src/rules/permission.ts
export type ActorRole = UserRole | 'GUEST'   // rules/roles.ts

export interface Actor {
  readonly id: string | null        // GUEST 는 null
  readonly role: ActorRole          // 저장된 역할이 아니라 실효 역할
  readonly status: UserStatus
  readonly emailVerified: boolean
}

/** 세션 없음 → GUEST, 인증된 VIEWER → MEMBER 를 여기서 한 번만 유도한다. */
export function actorFromAccount(account: ActorAccount | null): Actor
export function guestActor(): Actor

export function can(actor: Actor, action: Action, resource?: { ownerId?: string }): boolean
```

**규칙**: 권한 판정 코드는 이 함수 **밖에 존재하지 않는다.**
라우트/서비스/컴포넌트가 각자 `if (role === 'ADMIN')` 하는 것을 금지한다.
`session === null` 을 각자 해석하는 것도 같은 위반이다 — 그것이 GUEST 판정이
흩어져 있던 원래 경로였다. 웹 계층은 `apps/web/src/auth/actor.ts` 의
`actorFromSession()` 을 통과한다.

`can()` 은 순수 함수이므로 권한 조합 전수 테스트가 가능하다 —
`packages/core/tests/permission.test.ts` 에 **역할 × 동작 × 소유관계 전조합**
(7 × 22 × 2 = 308) 을 손으로 적은 표와 대조한다.

### 회원 등급은 권한이 아니다

`MemberTier`(`BRONZE`..`DIAMOND`) 는 **혜택**을 가른다. 권한 판정에 들어가지
않는다. 등급이 권한을 바꾸면 "활동을 많이 한 사람이 남의 콘텐츠를 지울 수 있다"
같은 조합이 생긴다.

한도 계산은 `resolveEntitlements({ capacity, role, tier })` 하나가 소유한다.
서버 용량(`11_CAPACITY_TIERS.md` §3)이 고정이고 등급은 그것을 **배분**한다 —
등급이 용량을 늘리는 구조로 만들면 등급 인플레가 그대로 서버 부하가 된다.

## 3. 라우트 보호 계층 (3중)

```
1층: middleware.ts
     - 미인증 사용자가 (studio)/(admin) 경로 접근 → 로그인으로 리다이렉트
     - 보안 헤더 부착
     - 목적: UX (빠른 리다이렉트). 보안의 근거로 삼지 않는다.

2층: 레이아웃 가드  app/(studio)/layout.tsx
     - 서버에서 세션 조회 → 역할 확인 → 부족하면 403 화면
     - 목적: 화면 단위 차단

3층: withRoute + can()   ★ 실제 보안 경계
     - 모든 API가 자기 권한을 스스로 검사
     - 목적: 진짜 방어. 1·2층이 뚫려도 여기서 막힌다.
```

**철칙**: 3층이 없으면 그 API 는 미완성이다. middleware 를 믿고 API 검사를 생략하는 것은
가장 흔한 취약점이다.

## 4. 서명 URL 정책

| 대상 | 방식 | 유효기간 | 이유 |
|---|---|---|---|
| 업로드 파트 PUT | 서명 URL (사용자별) | 6시간 | 대용량 업로드 시간 확보 |
| 원본 다운로드 | 서명 URL, **워커만** | 15분 | 원본은 사용자에게 절대 노출 금지 |
| HLS / 썸네일 | **서명 없음** (공개 + CDN) | — | 세그먼트마다 서명하면 CDN 캐시가 무의미해짐 |

### 비공개 콘텐츠를 어떻게 막는가

HLS 를 공개로 두므로, **URL 을 아는 사람은 볼 수 있다.** 이것을 전제로 설계한다.

| 층 | 방어 |
|---|---|
| `assetId` 는 cuid | 추측 불가 (열거 공격 불가) |
| 비공개 에피소드 | `assetId` 를 API 가 알려주지 않음 → URL 자체를 얻을 수 없음 |
| 연령제한 | `playback` API 에서 판정 → 통과해야 URL 을 받음 |
| 삭제된 에피소드 | HLS 객체를 **실제로 삭제** (URL 무효화) |

연령제한 확인은 `POST /api/episodes/:id/age-confirm` 이 발급하는 **서명된 HttpOnly
쿠키**로 증명한다. 쿠키에는 `episodeId`·`ageRating`·만료시각만 넣고
`AUTH_SECRET` 으로 서명하며 유효기간은 1시간이다. 사용자가 입력한 생년은 판정 즉시
폐기하고 DB·쿠키·로그에 저장하지 않는다. `A19` 는 인증 세션과 생년 입력을 모두
요구하고, `A12`/`A15` 는 명시적 확인을 요구한다. playback API 는 쿠키의 서명·만료·
episodeId·현재 등급을 모두 대조한 뒤에만 HLS URL 을 발급한다.

**한계 명시**: 한 번 URL 을 받은 사용자가 그것을 공유하면 우회가 가능하다.
유료 콘텐츠가 도입되는 Phase 3 에서는 Akamai 토큰 인증(Token Auth)을 도입한다.
지금은 **무료 서비스이므로 이 한계를 수용한다.** — 이 결정을 나중에 뒤집지 않도록 여기 기록.

## 5. 입력 검증 규칙

| 규칙 | 내용 |
|---|---|
| 유일한 관문 | 모든 외부 입력(body/query/params/header/env)은 **zod 를 통과**해야 한다 |
| 스키마 위치 | `packages/core/src/schemas/` — 서버와 클라이언트가 같은 스키마를 쓴다 |
| 파싱 지점 | 라우트 핸들러 첫 줄 (`Schema.parse(body)`) |
| 실패 처리 | `ZodError` → `withRoute` 가 `E_VALIDATION` + `fields` 로 변환 |
| 금지 | `req.body.someField` 를 파싱 없이 사용. `as` 캐스팅으로 타입 우회. |

### 사용자 생성 문자열 정책

| 필드 | 제약 | 처리 |
|---|---|---|
| `handle` | `/^[a-z0-9_]{3,20}$/` | 소문자 강제. 예약어 목록 차단 (`admin`, `api`, `studio`, `me`, `about`…) |
| `displayName` | 1~40자 | 제어문자·zero-width 문자 제거 |
| `bio`, `description`, `synopsis` | 길이 제한 | **HTML 저장 금지.** 평문만. 렌더링 시 React 자동 이스케이프 |
| `comment.body` | 1~1000자 | 동일. 링크는 렌더 시 텍스트로 표시 (자동 링크화 안 함) |
| `tag` | 1~24자, 소문자 정규화 | 공백→`-`, 특수문자 제거 |

**`dangerouslySetInnerHTML` 은 전 코드베이스에서 금지.** 린트로 차단한다.

## 6. 보안 헤더 (middleware + Caddy 이중)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{요청별}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: {CDN_BASE_URL};
  media-src 'self' blob: {CDN_BASE_URL};
  connect-src 'self' {CDN_BASE_URL};
  font-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';

Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
```

**주의**: `media-src` 에 CDN 도메인이 없으면 영상이 재생되지 않는다.
`script-src` 에 `unsafe-eval` / `unsafe-inline` 을 추가하는 것은 금지 (hls.js 는 불필요).

## 7. CSRF

| 경로 | 방어 |
|---|---|
| Auth.js 엔드포인트 | 라이브러리 내장 CSRF 토큰 |
| 그 외 상태변경 API | `sameSite: 'lax'` 쿠키 + **Origin 헤더 검증** |

`withRoute` 는 `POST`/`PUT`/`PATCH`/`DELETE` 요청에서
`Origin` 이 `APP_URL` 과 일치하지 않으면 `E_PERM_DENIED` 로 거부한다.

## 8. 레이트리밋 구현

```ts
// apps/web/src/http/rate-limit.ts
// Redis 고정 윈도우 카운터. 알고리즘 단순함을 의도적으로 선택.
// key: rl:{bucket}:{identity}:{windowStart}
// INCR → 1 이면 EXPIRE 설정 → 한도 초과 시 E_RATE_LIMITED + Retry-After
```

| 항목 | 값 |
|---|---|
| 알고리즘 | 고정 윈도우 (슬라이딩 불필요 — 정밀도보다 단순함 우선) |
| 신원 | 인증 시 `userId`, 미인증 시 `X-Forwarded-For` 첫 IP |
| Redis 장애 시 | **통과시킨다** (fail-open). 레이트리밋 때문에 서비스가 죽는 것이 더 나쁘다. |
| 한도 표 | `05_API_CONTRACT.md` §10 |

**fail-open 결정을 기록**: 인증 엔드포인트만 예외적으로 fail-closed 로 하고 싶을 수 있으나,
Redis 장애 시 아무도 로그인 못 하는 상황이 더 심각하다. 전부 fail-open 으로 통일하고,
Redis 장애는 알럿으로 즉시 인지한다.

## 9. 시크릿 관리

| 항목 | 규칙 |
|---|---|
| 저장 | 서버의 `.env` 파일, 권한 `600`, 소유자 `deploy` |
| 저장소 커밋 | `.env*` 는 `.gitignore` (단 `.env.example` 은 커밋) |
| 로그 | 시크릿·토큰·서명URL 을 로그에 남기지 않는다. `pino` redact 설정으로 강제 |
| 회전 | `AUTH_SECRET` 회전 시 전 세션 무효화 → 점검 공지 후 수행 |
| CI | GitHub Actions Secrets. 워크플로 로그에 echo 금지 |

```ts
// pino redact 설정 (필수)
redact: {
  paths: ['req.headers.cookie','req.headers.authorization','*.password','*.passwordHash',
          '*.token','*.secret','*.accessKeyId','*.secretAccessKey','*.signedUrl','*.url'],
  censor: '[REDACTED]',
}
```

## 10. 위협 모델 (무엇을 막고, 무엇을 포기하는가)

| 위협 | 방어 | 상태 |
|---|---|---|
| 크리덴셜 스터핑 | 레이트리밋 + argon2 + 이메일 인증 | 방어 |
| 세션 탈취 | httpOnly + secure + HSTS + DB 세션 즉시 무효화 | 방어 |
| XSS | HTML 저장 금지 + CSP nonce + `dangerouslySetInnerHTML` 금지 | 방어 |
| CSRF | sameSite + Origin 검증 | 방어 |
| IDOR (남의 리소스 접근) | 모든 API 가 `can()` 으로 소유권 검사 | 방어 |
| SQL 인젝션 | Prisma 파라미터 바인딩. `$queryRaw` 사용 시 반드시 태그드 템플릿 | 방어 |
| SSRF | 외부 URL 을 서버가 fetch 하는 기능 자체를 만들지 않음 | 설계로 제거 |
| 업로드 악성파일 | 원본은 비공개 버킷, 브라우저에 직접 서빙 안 함. ffprobe 검증 | 방어 |
| 스토리지 고갈 | 사용자별 일일 한도 + 미완료 업로드 정리 | 방어 |
| 열거 공격 | cuid ID + 비공개는 404 (403 아님) | 방어 |
| 스팸 계정 | 이메일 인증 + 레이트리밋 | 부분 (CAPTCHA 는 Phase 3) |
| **콘텐츠 URL 재배포** | 없음 | **수용** (§4 참조, 무료 서비스) |
| DDoS | Akamai CDN 앞단 | CDN 의존 |
| 내부자 위협 | 없음 | 수용 (1인/소수팀) |

## 11. 로그인 관련 응답 규칙

| 상황 | 응답 |
|---|---|
| 존재하지 않는 이메일 | `E_AUTH_INVALID_CREDENTIALS` (계정 존재 여부 노출 금지) |
| 비밀번호 불일치 | `E_AUTH_INVALID_CREDENTIALS` (동일 메시지) |
| 회원가입 시 이메일 중복 | `E_USER_EMAIL_TAKEN` — 이건 노출한다 (UX상 필요, 이미 가입 안내) |
| 비밀번호 재설정 요청 | 계정이 없어도 **성공 응답** (존재 여부 노출 금지) |

가입 시 중복을 노출하는 것과 로그인 시 감추는 것의 비대칭은 **의도된 것**이다.
가입은 사용자가 이미 자기 이메일을 아는 상황이므로 정보 유출이 아니다.
