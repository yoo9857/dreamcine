# 09 — 에러코드 카탈로그 (SSOT)

> 상태: **불변 계약**. CODEX 수정 금지.
> **여기 없는 에러코드를 코드에서 사용하면 `pnpm contract:errors` 가 실패한다.**
> 새 코드가 필요하면 `_ISSUES.md` 에 제안하고 멈춘다.

---

## 1. 에러의 유일한 형태

```ts
// packages/core/src/errors/app-error.ts
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,          // codes.ts 의 리터럴 유니온
    readonly detail?: Record<string, unknown>,  // 로그용. 클라이언트 노출 안 함.
    readonly cause?: unknown,
  ) {
    super(code)
    this.name = 'AppError'
  }
}
```

**규칙**

- 서비스/도메인 계층은 **`AppError` 만** 던진다. 문자열 `throw` 금지.
- HTTP 상태코드는 코드→상태 매핑표(§3)에서 **자동 결정**된다. 핸들러가 임의로 정하지 않는다.
- `message` 는 코드 문자열 자체다. 사용자 문구는 클라이언트가 코드로 조회한다(§5).
- `detail` 에 **개인정보·토큰·서명URL·파일 전체 경로를 담지 않는다.**

## 2. 코드 명명 규칙

```
E_{도메인}_{사유}
```

도메인: `AUTH` `PERM` `USER` `SERIES` `EPISODE` `UPLOAD` `ASSET` `MEDIA`
`FEED` `SOCIAL` `COMMENT` `REPORT` `RATE` `STORAGE` `QUEUE` `DB` `SYS`

## 3. 카탈로그

### 인증 · 권한

| 코드 | HTTP | 재시도 | 설명 |
|---|---|---|---|
| `E_AUTH_REQUIRED` | 401 | ✗ | 로그인 필요 |
| `E_AUTH_INVALID_CREDENTIALS` | 401 | ✗ | 이메일/비밀번호 불일치 |
| `E_AUTH_EMAIL_NOT_VERIFIED` | 403 | ✗ | 이메일 미인증 |
| `E_AUTH_SESSION_EXPIRED` | 401 | ✗ | 세션 만료 |
| `E_AUTH_ACCOUNT_SUSPENDED` | 403 | ✗ | 계정 정지 |
| `E_AUTH_OAUTH_FAILED` | 502 | ○ | 소셜 로그인 공급자 오류 |
| `E_PERM_DENIED` | 403 | ✗ | 권한 부족 |
| `E_PERM_NOT_OWNER` | 403 | ✗ | 소유자 아님 |
| `E_PERM_AGE_RESTRICTED` | 403 | ✗ | 연령등급 미달 |

### 사용자

| 코드 | HTTP | 재시도 | 설명 |
|---|---|---|---|
| `E_USER_NOT_FOUND` | 404 | ✗ | |
| `E_USER_HANDLE_TAKEN` | 409 | ✗ | 핸들 중복 |
| `E_USER_EMAIL_TAKEN` | 409 | ✗ | 이메일 중복 |
| `E_USER_SELF_ACTION` | 400 | ✗ | 자기 자신을 팔로우/신고 |

### 시리즈 · 에피소드

| 코드 | HTTP | 재시도 | 설명 |
|---|---|---|---|
| `E_SERIES_NOT_FOUND` | 404 | ✗ | |
| `E_SERIES_LIMIT_EXCEEDED` | 409 | ✗ | 계정당 시리즈 수 초과 |
| `E_EPISODE_NOT_FOUND` | 404 | ✗ | |
| `E_EPISODE_NOT_PUBLISHED` | 404 | ✗ | 비공개를 외부에 노출하지 않으려 404 사용 |
| `E_EPISODE_INVALID_TRANSITION` | 409 | ✗ | 상태기계가 금지한 전이 |
| `E_EPISODE_ASSET_NOT_READY` | 409 | ○ | 트랜스코드 미완료 상태에서 공개 시도 |
| `E_EPISODE_AI_DISCLOSURE_REQUIRED` | 422 | ✗ | AI 제작 표기 누락 (`00_PRODUCT.md` §6) |
| `E_EPISODE_NUMBER_DUPLICATE` | 409 | ✗ | 같은 시즌 내 화수 중복 |
| `E_EPISODE_SCHEDULE_IN_PAST` | 422 | ✗ | 공개예약 시각이 과거 |

### 업로드

| 코드 | HTTP | 재시도 | 설명 |
|---|---|---|---|
| `E_UPLOAD_SESSION_NOT_FOUND` | 404 | ✗ | |
| `E_UPLOAD_SESSION_EXPIRED` | 410 | ✗ | 세션 TTL(24h) 초과 |
| `E_UPLOAD_TOO_LARGE` | 413 | ✗ | 티어 업로드 상한 초과 (T0: 2GB) |
| `E_UPLOAD_UNSUPPORTED_TYPE` | 415 | ✗ | 허용 컨테이너 아님 |
| `E_UPLOAD_INVALID_PART` | 400 | ✗ | 파트 번호/크기 규격 위반 |
| `E_UPLOAD_PART_MISSING` | 409 | ○ | complete 시 빠진 파트 존재 |
| `E_UPLOAD_ALREADY_COMPLETED` | 409 | ✗ | 중복 complete (멱등 처리) |
| `E_UPLOAD_ABORTED` | 409 | ✗ | 중단된 세션 |
| `E_UPLOAD_QUOTA_EXCEEDED` | 429 | ✗ | 일일 업로드 한도 초과 |

### 자산 · 미디어 처리

| 코드 | HTTP | 재시도 | 설명 |
|---|---|---|---|
| `E_ASSET_NOT_FOUND` | 404 | ✗ | |
| `E_ASSET_NOT_READY` | 409 | ○ | 재생 요청 시 아직 변환 중 |
| `E_MEDIA_PROBE_FAILED` | 422 | ✗ | ffprobe 실패 = 손상 파일 |
| `E_MEDIA_NO_VIDEO_STREAM` | 422 | ✗ | 비디오 트랙 없음 |
| `E_MEDIA_NO_AUDIO_STREAM` | 422 | ✗ | 오디오 트랙 없음 (정책상 거부) |
| `E_MEDIA_UNSUPPORTED_CODEC` | 422 | ✗ | 허용 코덱 아님 |
| `E_MEDIA_RESOLUTION_TOO_LOW` | 422 | ✗ | 640×360 미달 |
| `E_MEDIA_DURATION_TOO_LONG` | 422 | ✗ | 티어 길이 상한 초과 (T0: 20분) |
| `E_MEDIA_TRANSCODE_FAILED` | 500 | ○ | ffmpeg 비정상 종료 (3회 재시도) |
| `E_MEDIA_TRANSCODE_TIMEOUT` | 500 | ○ | 시간 초과 (길이×4배) |
| `E_MEDIA_DISK_FULL` | 507 | ○ | 워커 임시공간 부족 → 알럿 |

### 피드 · 소셜

| 코드 | HTTP | 재시도 | 설명 |
|---|---|---|---|
| `E_FEED_INVALID_CURSOR` | 400 | ✗ | 커서 복호화/검증 실패 |
| `E_SOCIAL_ALREADY_FOLLOWING` | 409 | ✗ | 멱등 처리 대상 |
| `E_SOCIAL_NOT_FOLLOWING` | 409 | ✗ | |
| `E_SOCIAL_BLOCKED` | 403 | ✗ | 차단 관계 |
| `E_COMMENT_NOT_FOUND` | 404 | ✗ | |
| `E_COMMENT_TOO_LONG` | 422 | ✗ | 1000자 초과 |
| `E_COMMENT_DEPTH_EXCEEDED` | 422 | ✗ | 대댓글 1단까지만 |
| `E_COMMENT_DISABLED` | 403 | ✗ | 크리에이터가 댓글 차단 |

### 신고 · 심사

| 코드 | HTTP | 재시도 | 설명 |
|---|---|---|---|
| `E_REPORT_DUPLICATE` | 409 | ✗ | 동일 대상 중복 신고 |
| `E_REPORT_NOT_FOUND` | 404 | ✗ | |
| `E_REPORT_ALREADY_RESOLVED` | 409 | ✗ | |

### 레이트리밋 · 인프라 · 시스템

| 코드 | HTTP | 재시도 | 설명 |
|---|---|---|---|
| `E_RATE_LIMITED` | 429 | ○ | `Retry-After` 헤더 필수 |
| `E_STORAGE_UNAVAILABLE` | 503 | ○ | Object Storage 오류 |
| `E_STORAGE_OBJECT_NOT_FOUND` | 404 | ✗ | |
| `E_QUEUE_UNAVAILABLE` | 503 | ○ | Redis 장애 |
| `E_DB_UNAVAILABLE` | 503 | ○ | 커넥션 실패 |
| `E_DB_CONFLICT` | 409 | ○ | 유니크 위반 / 낙관적 락 충돌 |
| `E_VALIDATION` | 422 | ✗ | zod 파싱 실패 (필드 목록 동반) |
| `E_NOT_FOUND` | 404 | ✗ | 일반 미존재 |
| `E_INTERNAL` | 500 | ○ | 분류 불가. **로그에 스택 필수.** |
| `E_NOT_IMPLEMENTED` | 501 | ✗ | SSS S2 센티넬. **프로덕션 빌드에 존재하면 CI 실패.** |

### 클라이언트 전용 (서버가 던지지 않음)

이 코드들은 서버 응답에 등장하지 않지만, `error-messages.ts` 가
`Record<ErrorCode, string>` 이므로 **카탈로그에 등재되어야 문구를 가질 수 있다.**
`status-map.ts` 에서는 제외한다 (HTTP 상태가 없음).

| 코드 | 발생 위치 | 설명 |
|---|---|---|
| `E_OFFLINE` | `packages/api-client` | 네트워크 연결 실패 (T13) |
| `E_PLAYER_UNSUPPORTED` | `HlsPlayer` | hls.js 미지원 + 네이티브 HLS 불가 브라우저 (T07) |
| `E_PLAYER_MEDIA_ERROR` | `HlsPlayer` | 디코딩 실패, 복구 시도 소진 (T07) |
| `E_PLAYER_MANIFEST_ERROR` | `HlsPlayer` | 매니페스트 로드 실패 (T07) |

`contract:errors` 는 이 4개를 `status-map.ts` 검사에서 **제외**하고,
`error-messages.ts` 검사에는 **포함**한다.

## 4. HTTP 응답 형태 (모든 에러 동일)

```json
{
  "error": {
    "code": "E_UPLOAD_TOO_LARGE",
    "message": "업로드 가능한 최대 용량을 초과했습니다.",
    "fields": null,
    "requestId": "01J9X2K7YQ8ZP3M4N5R6S7T8V9"
  }
}
```

| 필드 | 규칙 |
|---|---|
| `code` | 카탈로그의 코드. **클라이언트 분기의 유일한 근거.** |
| `message` | ko 사용자 문구. §5 사전에서 조회. 없으면 일반 문구. |
| `fields` | `E_VALIDATION` 에서만 `{ 필드명: 사유 }`. 그 외 `null`. |
| `requestId` | 로그 상관관계 ID. 사용자 문의 시 추적 키. |

**`detail` 은 절대 응답에 넣지 않는다.** 로그에만 남긴다.

## 5. 사용자 문구 사전

`apps/web/src/lib/error-messages.ts` 에 정의한다.

```ts
type MessageEntry = string | ((cap: Capacity) => string)
export const MESSAGES: Record<ErrorCode, MessageEntry> = {
  E_AUTH_REQUIRED:     '로그인이 필요합니다.',
  E_UPLOAD_TOO_LARGE:  (c) => `업로드 가능한 최대 용량(${fmtBytes(c.uploadMaxBytes)})을 초과했습니다.`,
  E_MEDIA_DURATION_TOO_LONG: (c) => `영상이 ${c.videoMaxDurationSec / 60}분을 초과했습니다.`,
  // ...
}
```

**타입이 `Record<ErrorCode, MessageEntry>` 이므로 코드를 추가하면
문구 누락이 컴파일 에러가 된다.** 이것이 문구 누락을 막는 하네스다.

**티어 의존 숫자가 들어가는 문구는 반드시 함수형으로 둔다.**
문자열에 `2GB` 를 박으면 T1 승급 시 문구가 거짓이 된다.
`contract:capacity` 는 문구 안에 티어 의존 숫자 리터럴이 있는지 검사한다.

## 6. 재시도 정책

| 표시 | 의미 | 클라이언트 동작 | 워커 동작 |
|---|---|---|---|
| ✗ | 재시도 무의미 | 사용자에게 즉시 표시, 자동 재시도 금지 | 즉시 DLQ, 재시도 안 함 |
| ○ | 일시적 가능 | 지수 백오프 3회 (1s→4s→16s) | 지수 백오프 3회 후 DLQ + 알럿 |

상세 절차: `20_OPS/O02_EXCEPTION_POLICY.md`

## 7. 계약 하네스가 검사하는 것

`scripts/contract/check-error-catalog.ts`:

1. 이 문서의 표에서 모든 `E_*` 코드를 추출한다.
2. `packages/core/src/errors/codes.ts` 의 `as const` 배열과 **완전 일치**하는지 확인.
3. 소스 전체를 훑어 `new AppError('...')` 의 리터럴이 목록 안에 있는지 확인.
4. `error-messages.ts` 에 모든 코드의 문구가 있는지 확인.
5. HTTP 매핑표(`src/http/status-map.ts`)에 모든 코드가 있는지 확인.

하나라도 어긋나면 **실패**. 이것이 "에러코드를 발명하는" 드리프트를 막는다.
