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

| 동작 | VIEWER | CREATOR | MODERATOR | ADMIN |
|---|---|---|---|---|
| 공개 콘텐츠 시청 | ○ | ○ | ○ | ○ |
| 좋아요 / 댓글 / 팔로우 | ○(인증) | ○ | ○ | ○ |
| 신고 | ○(인증) | ○ | ○ | ○ |
| 시리즈/에피소드 생성 | ✗ | ○ | ✗ | ○ |
| 업로드 | ✗ | ○ | ✗ | ○ |
| 자기 콘텐츠 수정/삭제 | — | ○ | ✗ | ○ |
| 남의 콘텐츠 숨김 | ✗ | ✗ | ○ | ○ |
| 남의 콘텐츠 영구삭제 | ✗ | ✗ | ✗ | ○ |
| 신고 심사 | ✗ | ✗ | ○ | ○ |
| 계정 정지 | ✗ | ✗ | ✗ | ○ |
| 역할 부여 | ✗ | ✗ | ✗ | ○ |

### 판정은 순수 함수 하나로

```ts
// packages/core/src/rules/permission.ts
export type Action =
  | 'episode.create' | 'episode.update' | 'episode.publish' | 'episode.remove'
  | 'episode.hide'   | 'comment.create' | 'comment.delete'
  | 'report.review'  | 'user.suspend'   | 'user.setRole'

export function can(
  actor: { id: string; role: UserRole; status: UserStatus; emailVerified: boolean },
  action: Action,
  resource?: { ownerId?: string },
): boolean
```

**규칙**: 권한 판정 코드는 이 함수 **밖에 존재하지 않는다.**
라우트/서비스/컴포넌트가 각자 `if (role === 'ADMIN')` 하는 것을 금지한다.
(권한 로직이 흩어지면 반드시 구멍이 생긴다)

`can()` 은 순수 함수이므로 권한 조합 전수 테스트가 가능하다 —
`packages/core/tests/permission.test.ts` 에 **역할 × 동작 × 소유관계 전조합**을 테스트한다.

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
