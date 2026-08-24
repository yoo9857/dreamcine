# 05 — REST API 계약

> 상태: **불변 계약**. CODEX 수정 금지.
> `pnpm contract:openapi` 가 실제 라우트의 zod 스키마와 이 문서를 대조한다.

---

## 1. 공통 규약

| 항목 | 규칙 |
|---|---|
| 베이스 경로 | `/api` (버전 없음 — Phase 2 앱 출시 시 `/api/v1` 로 고정 전환, T13) |
| 인증 | 쿠키 세션 (Auth.js). Phase 2 앱은 동일 쿠키 또는 Bearer (T13에서 확정) |
| 요청 본문 | `application/json` (업로드 파트만 예외: Object Storage 직행) |
| 시간 | ISO 8601 UTC 문자열. 서버는 항상 UTC 저장. |
| ID | cuid 문자열 |
| BigInt | **문자열로 직렬화** (`viewCount: "12345"`). JSON 정밀도 손실 방지. |
| 성공 응답 | 리소스 객체 또는 `{ items, nextCursor }` |
| 에러 응답 | `09_ERROR_CATALOG.md` §4 형태 |
| 상관관계 ID | 모든 응답에 `X-Request-Id` 헤더 |
| 캐시 | 전부 `no-store` |

### 페이지네이션 (커서 방식만. offset 금지)

```
GET /api/feed?limit=20&cursor=eyJzIjo...

응답:
{
  "items": [ ... ],
  "nextCursor": "eyJzIjo..." | null
}
```

커서는 정렬키+id 를 base64url 로 인코딩한 **불투명 문자열**이다.
클라이언트가 해석하지 않는다. 서버는 서명하여 위조를 막는다.
복호화 실패 → `E_FEED_INVALID_CURSOR`.

| 파라미터 | 기본 | 최대 |
|---|---|---|
| `limit` | 20 | 50 |

## 2. 인증

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/auth/signup` | — | 이메일 회원가입 → 인증메일 발송 |
| POST | `/api/auth/verify` | — | 이메일 인증 토큰 확인 |
| * | `/api/auth/[...nextauth]` | — | Auth.js 위임 (로그인/로그아웃/OAuth) |
| POST | `/api/auth/password/forgot` | — | 재설정 메일 |
| POST | `/api/auth/password/reset` | — | 토큰으로 비밀번호 변경 |
| GET | `/api/me` | 필수 | 내 프로필 + 역할 |
| PATCH | `/api/me` | 필수 | 표시이름/소개/아바타 |

```ts
// POST /api/auth/signup
Request:  { email: string(email), password: string(min 10), handle: string(3-20, /^[a-z0-9_]+$/), displayName: string(1-40) }
Response: 201 { id, handle, email, emailVerified: null }
Errors:   E_USER_EMAIL_TAKEN, E_USER_HANDLE_TAKEN, E_VALIDATION, E_RATE_LIMITED
```

## 3. 업로드 (T05)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/uploads` | CREATOR | 업로드 세션 생성 + 파트 서명 URL 발급 |
| GET | `/api/uploads/:id` | 소유자 | 세션 상태 조회 (재개용) |
| POST | `/api/uploads/:id/parts` | 소유자 | 만료된 파트 URL 재발급 |
| POST | `/api/uploads/:id/complete` | 소유자 | 멀티파트 완료 → 트랜스코드 큐 발행 |
| POST | `/api/uploads/:id/abort` | 소유자 | 중단 + 파트 정리 |

```ts
// POST /api/uploads
Request: {
  fileName: string(1-255),
  fileSize: number(int, LIMITS.UPLOAD_MIN_BYTES .. capacity.uploadMaxBytes),
            // ★ 상한은 티어에서. 현재 T0 = 2 GiB. 리터럴 금지.
  mimeType: enum('video/mp4','video/quicktime','video/x-matroska','video/webm'),
  checksum?: string                             // 참고용
}
Response: 201 {
  uploadId: string,
  partSize: number,          // 서버 결정. 기본 32MiB, 파트수 10000 초과 시 확대
  totalParts: number,
  parts: [{ partNumber: number, url: string, expiresAt: string }],
  expiresAt: string          // 세션 만료 (24h)
}
Errors: E_UPLOAD_TOO_LARGE, E_UPLOAD_UNSUPPORTED_TYPE, E_UPLOAD_QUOTA_EXCEEDED,
        E_PERM_DENIED, E_STORAGE_UNAVAILABLE
```

```ts
// POST /api/uploads/:id/complete
Request:  { parts: [{ partNumber: number, etag: string }] }   // 순서 무관, 서버가 정렬
Response: 202 { assetId: string, status: 'PENDING' }
Errors:   E_UPLOAD_SESSION_NOT_FOUND, E_UPLOAD_SESSION_EXPIRED, E_UPLOAD_PART_MISSING,
          E_UPLOAD_ALREADY_COMPLETED, E_UPLOAD_ABORTED, E_STORAGE_UNAVAILABLE

멱등성: 같은 uploadId 로 두 번 호출하면 두 번째는 첫 결과의 assetId 를 그대로 200 으로 반환.
        (E_UPLOAD_ALREADY_COMPLETED 는 상태가 ABORTED/FAILED 인 경우에만)
```

## 4. 자산 (T06)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/assets/:id` | 소유자 | 상태 + 진행률 + 실패 원인 |
| POST | `/api/assets/:id/retry` | 소유자 | 실패 자산 재시도 (attemptCount < 3) |

```ts
// GET /api/assets/:id
Response: 200 {
  id, status: AssetStatus,
  progress: number,             // 0-100. TRANSCODING 일 때만 유효
  durationSec?: number, width?: number, height?: number,
  renditions: [{ name, width, height, bitrateKbps }],
  errorCode?: string,           // FAILED 일 때
  attemptCount: number
}
```

## 5. 시리즈 · 에피소드 (T08)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/series` | — | 목록 (커서) |
| POST | `/api/series` | CREATOR | 생성 |
| GET | `/api/series/:id` | — | 상세 + 에피소드 목록 |
| PATCH | `/api/series/:id` | 소유자 | 수정 |
| DELETE | `/api/series/:id` | 소유자 | 소프트 삭제 |
| POST | `/api/episodes` | CREATOR | 에피소드 생성 (assetId 연결) |
| GET | `/api/episodes/:id` | — | 상세 |
| PATCH | `/api/episodes/:id` | 소유자 | 수정 |
| DELETE | `/api/episodes/:id` | 소유자 | REMOVED 전이 |
| POST | `/api/episodes/:id/publish` | 소유자 | 상태 전이 |
| GET | `/api/episodes/:id/playback` | — | 재생 정보 발급 |
| POST | `/api/episodes/:id/age-confirm` | 선택 | 연령 확인 증명 쿠키 발급 |
| POST | `/api/episodes/:id/progress` | 필수 | 이어보기 좌표 저장 |
| POST | `/api/episodes/:id/views` | 선택 | 누적 30초 시청 조회수 집계 |

```ts
// POST /api/episodes
Request: {
  seriesId: string, seasonNumber?: number(int, >=1), number: number(int, >=1),
  title: string(1-160), description?: string(max 2000),
  assetId: string, ageRating: AgeRating,
  aiDisclosure: string(1-500),          // 필수 — 사용 도구/모델
  tags?: string[](max 10, 각 1-24자)
}
Response: 201 { id, status: 'DRAFT', ... }
Errors: E_SERIES_NOT_FOUND, E_PERM_NOT_OWNER, E_ASSET_NOT_FOUND,
        E_EPISODE_NUMBER_DUPLICATE, E_VALIDATION
```

```ts
// POST /api/episodes/:id/publish
Request:  { action: 'PUBLISH' | 'SCHEDULE' | 'HIDE' | 'UNHIDE', publishAt?: string }
Response: 200 { id, status, publishAt, publishedAt }
Errors:   E_EPISODE_INVALID_TRANSITION, E_EPISODE_ASSET_NOT_READY,
          E_EPISODE_AI_DISCLOSURE_REQUIRED, E_EPISODE_SCHEDULE_IN_PAST, E_PERM_NOT_OWNER
```

```ts
// GET /api/episodes/:id/playback
Response: 200 {
  episodeId: string,
  masterUrl: string,            // CDN 절대 URL
  posterUrl?: string,
  durationSec: number,
  startAtSec: number,           // 이어보기 위치 (로그인 시)
  renditions: [{ name, width, height }]
}
Errors: E_EPISODE_NOT_FOUND, E_EPISODE_NOT_PUBLISHED, E_ASSET_NOT_READY,
        E_PERM_AGE_RESTRICTED, E_SOCIAL_BLOCKED
```

```ts
// POST /api/episodes/:id/age-confirm
Request:  { confirmed: true, birthYear?: number(int, 1900..현재연도) }
Response: 204 (본문 없음) + 서명된 HttpOnly 연령확인 쿠키 (1시간)
규칙:
- ALL 은 확인 없이 playback 가능하다.
- A12/A15 는 confirmed=true 를 요구한다.
- A19 는 인증과 birthYear 를 모두 요구하고, 현재연도-birthYear >= 19 여야 한다.
- 쿠키는 episodeId·ageRating·만료시각을 AUTH_SECRET 으로 서명하고
  Path=/api/episodes/{episodeId}/playback, HttpOnly, Secure(프로덕션), SameSite=Lax 로 발급한다.
Errors: E_EPISODE_NOT_FOUND, E_AUTH_REQUIRED, E_PERM_AGE_RESTRICTED
```

```ts
// POST /api/episodes/:id/progress
Request:  { positionSec: number(int, >=0), completed?: boolean }
Response: 204 (본문 없음)
규칙: 클라이언트는 15초 간격 또는 일시정지/이탈 시에만 호출. 그보다 잦으면 429.
```

```ts
// POST /api/episodes/:id/views
Request:  본문 없음
Response: 204 (본문 없음)
규칙: 클라이언트는 실제 재생 누적 30초 후 세션당 1회 호출한다.
      서버는 인증 시 userId, 미인증 시 서버가 HMAC 처리한 ipHash 를 사용한다.
      클라이언트가 보낸 사용자·IP 식별자는 받지 않는다.
```

## 6. 피드 · 검색 (T09)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/feed?type=popular\|latest\|following` | following 은 인증 필수 | 피드 |
| GET | `/api/search?q=&type=series\|episode\|user` | — | 검색 |
| GET | `/api/tags/:tag/episodes` | — | 태그 피드 |
| GET | `/api/tags/trending` | — | 인기 태그 20개 |

```ts
// GET /api/feed
Query: { type: 'popular'|'latest'|'following', limit?: 1-50, cursor?: string }
Response: 200 {
  items: [{
    episodeId, title, thumbUrl, durationSec, ageRating,
    viewCount: string, likeCount: number, publishedAt,
    series: { id, title, slug },
    creator: { handle, displayName, avatarUrl },
    isLiked: boolean            // 로그인 시. 미로그인 시 false
  }],
  nextCursor: string | null
}
Errors: E_AUTH_REQUIRED (type=following 미로그인), E_FEED_INVALID_CURSOR
```

**차단·숨김 필터링은 서버 책임.** 응답에 이미 제외된 상태로 나온다.

## 7. 소셜 (T10)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| PUT | `/api/users/:handle/follow` | 필수 | 팔로우 (멱등) |
| DELETE | `/api/users/:handle/follow` | 필수 | 언팔로우 (멱등) |
| PUT | `/api/episodes/:id/likes` | 필수 | 좋아요 (멱등) |
| DELETE | `/api/episodes/:id/likes` | 필수 | 취소 (멱등) |
| GET | `/api/episodes/:id/comments` | — | 댓글 목록 (커서) |
| POST | `/api/episodes/:id/comments` | 필수 | 작성 |
| PATCH | `/api/comments/:id` | 작성자 | 수정 (15분 내) |
| DELETE | `/api/comments/:id` | 작성자/모더레이터 | 삭제 |
| GET | `/api/notifications` | 필수 | 알림 목록 |
| POST | `/api/notifications/read` | 필수 | 읽음 처리 |
| PUT | `/api/users/:handle/block` | 필수 | 차단 |
| DELETE | `/api/users/:handle/block` | 필수 | 차단 해제 |

**멱등 규칙**: `PUT`/`DELETE` 좋아요·팔로우는 이미 그 상태여도 **200** 을 반환한다.
`E_SOCIAL_ALREADY_FOLLOWING` 은 카탈로그에 있지만 이 엔드포인트에서는 쓰지 않는다
(내부 서비스 계층에서만 사용).

```ts
// POST /api/episodes/:id/comments
Request:  { body: string(1-1000), parentId?: string }
Response: 201 { id, body, createdAt, user: {...}, parentId }
Errors:   E_COMMENT_TOO_LONG, E_COMMENT_DEPTH_EXCEEDED, E_COMMENT_DISABLED,
          E_EPISODE_NOT_FOUND, E_SOCIAL_BLOCKED, E_RATE_LIMITED
```

## 8. 신고 · 심사 (T12)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/reports` | 필수 | 신고 접수 |
| GET | `/api/admin/reports` | MODERATOR | 심사큐 (커서) |
| POST | `/api/admin/reports/:id/action` | MODERATOR | 조치 |
| GET | `/api/admin/users` | ADMIN | 사용자 검색 |
| POST | `/api/admin/users/:id/status` | ADMIN | 정지/해제 |

```ts
// POST /api/reports
Request:  { target: ReportTarget, targetId: string, reason: ReportReason, detail?: string(max 1000) }
Response: 201 { id, status: 'OPEN' }
Errors:   E_REPORT_DUPLICATE, E_USER_SELF_ACTION, E_NOT_FOUND, E_RATE_LIMITED
```

```ts
// POST /api/admin/reports/:id/action
Request:  { action: 'HIDE_CONTENT'|'REMOVE_CONTENT'|'SUSPEND_USER'|'REJECT', note?: string }
Response: 200 { id, status, handledAt }
Errors:   E_REPORT_ALREADY_RESOLVED, E_PERM_DENIED
```

## 9. 시스템

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/health` | — | 라이브니스. 항상 200 (프로세스 살아있음) |
| GET | `/api/ready` | — | 레디니스. DB/Redis/S3 확인. 실패 시 503 |
| GET | `/api/metrics` | 내부망만 | Prometheus 텍스트 |

```ts
// GET /api/ready
Response 200: { status: 'ok',  checks: { db: 'ok', redis: 'ok', storage: 'ok' } }
Response 503: { status: 'degraded', checks: { db: 'ok', redis: 'fail', storage: 'ok' } }
```

`/api/ready` 는 배포 시 트래픽 전환 판단에 쓰인다. (`O01_DEPLOY.md`)

## 10. 레이트리밋

| 대상 | 한도 | 키 |
|---|---|---|
| `POST /api/auth/*` | 10회 / 10분 | IP |
| `POST /api/uploads` | 20회 / 1시간 | userId |
| 업로드 총량 | 50GB / 1일 | userId |
| `POST /api/episodes/*/comments` | 30회 / 10분 | userId |
| `POST /api/reports` | 20회 / 1일 | userId |
| `POST /api/episodes/*/age-confirm` | 10회 / 10분 | userId 또는 IP |
| `POST /api/episodes/*/progress` | 10회 / 1분 | userId+episodeId |
| `POST /api/episodes/*/views` | 10회 / 1분 | userId 또는 IP |
| 기타 인증 API | 300회 / 1분 | userId |
| 기타 공개 API | 100회 / 1분 | IP |

초과 시 `429` + `E_RATE_LIMITED` + `Retry-After` 헤더(초).

## 11. 라우트 핸들러 표준 형태 (모든 라우트가 이 모양)

```ts
// apps/web/app/api/episodes/[id]/publish/route.ts
import { withRoute } from '@/src/http/handler'
import { PublishEpisodeSchema } from '@aidream/core'
import { publishEpisode } from '@/src/services/episode/publish-episode'

export const POST = withRoute(async ({ params, body, session }) => {
  const input = PublishEpisodeSchema.parse(body)          // 검증은 여기서만
  const result = await publishEpisode({                    // 로직은 서비스에서만
    episodeId: params.id,
    actorId: session.userId,
    ...input,
  })
  return { status: 200, body: result }                     // 직렬화는 withRoute 가
}, { auth: 'required' })
```

**`withRoute` 가 담당하는 것** (핸들러가 직접 하지 않는다):

- 세션 확인 및 `E_AUTH_REQUIRED` 발생
- `X-Request-Id` 생성/전파
- 레이트리밋 적용
- `AppError` → HTTP 상태코드 변환 (`status-map.ts`)
- `ZodError` → `E_VALIDATION` + `fields` 변환
- 미분류 예외 → `E_INTERNAL` + 스택 로깅
- 구조적 로그 1줄 (경로, 상태, 소요시간, userId, requestId)

이 단일 지점 덕분에 **모든 라우트의 에러 처리가 자동으로 동일**해진다.
`app/api/**` 안에서 `try/catch` 를 쓰면 린트가 막는다.
