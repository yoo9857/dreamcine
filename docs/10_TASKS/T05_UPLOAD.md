# T05 — 업로드: 멀티파트 · 재개 · 검증

## 진행 상태
- [x] S1 Spec 확인 — 2026-08-22 / 산출물 20 + 추가 6 확정 · 참조 스펙 6개 정독 · 발견 3건
- [x] S2 Skeleton — 2026-08-22 / `pnpm gate:s2` PASS · 잔존 NIE 19개 · core 규칙·큐·서비스·업로드 엔진 시그니처 확정
- [x] S3 구현 — 2026-08-24 / CI gate PASS · 잔존 NIE 0 · US-02/US-09 및 멱등 완료 검증

### S3 진행 중 발견

**검증 순서를 뒤집었다 (§5 `createUploadSession` 1·2단계)**

문서는 `can()` → `emailVerified` 순서로 적고 있다. 그런데 `can()` 자체가
미인증을 `E_PERM_DENIED` 로 거부한다 (`07_AUTH_SECURITY` §3). 그 순서면 두 번째
검사에 **영원히 도달하지 못하고**, 메일만 인증하면 되는 사용자가 "권한이
없습니다" 를 본다 — 할 수 있는 일이 없는 문구다. `08_UIUX_SPEC` §10 이
"다음 행동을 제시한다" 를 요구하므로 두 문구 모두 도달 가능해야 한다.
순서를 뒤집고 테스트로 고정했다.

**세션 id 를 서비스가 만든다**

키가 `originals/{userId}/{sessionId}/…` 라서(06 §1, 변경 금지) INSERT 전에
id 가 있어야 한다. cuid 생성기가 의존성에 없고 `check-deps` 허용 목록에도
없으므로 `randomUUID()` 를 쓴다 — **UploadSession 만 id 가 UUID** 다.
`CreateUploadSessionData` 에 `id`·`s3UploadId` 를 추가했다 (T02 산출물 수정).

**일일 총량은 최근 24시간 창이다**

자정 기준이면 23:59 에 하루치를 다 쓰고 00:01 에 또 쓸 수 있다.
중단·실패 세션은 세지 않는다(취소 한 번에 하루를 못 쓰면 안 된다).
진행 중인 것은 센다(동시에 여러 개로 상한을 우회할 수 있다).
`sumUploadBytesSince` 를 `upload.repo.ts` 에 추가했다.

### S1 추가 산출물 (문서 표 밖 — 다른 파일을 건드린다)

| 경로 | 이유 | 상태 |
|---|---|---|
| `apps/web/app/(studio)/layout.tsx` | 스튜디오 화면의 권한 경계. 화면마다 확인하면 새 화면에서 빠뜨린다 | 완료 |
| `apps/web/src/auth/server-session.ts` (+test) | 서버 컴포넌트에는 `Request` 가 없다. 판정을 두 벌로 만들지 않으려고 `getSessionByToken` 을 갈라냈다 | 완료 |
| `apps/web/src/components/QueryProvider.tsx` | `03_TECH_STACK` §3 이 지정한 react-query. T05 폴링과 T09 무한스크롤이 공유하는 기본값을 여기서 정한다 | 완료 |
| `apps/web/src/http/handler.ts` | **티어 의존 레이트리밋 지원** — 아래 발견 참조 | S3 |
| `packages/queue/package.json` | `bullmq` 추가 (`03_TECH_STACK` §3, check-deps 허용 목록에 이미 있음) | S2 |
| `packages/storage/src/storage.integration.test.ts` | CORS `ExposeHeaders: ETag` 검증 3건 (OBS-017) | 완료 |

### S1 발견

**1. 레이트리밋 한도가 두 스펙에서 다르다 (ISS-009 — 사람 결정 대기)**

| 항목 | `11_CAPACITY_TIERS` (T0) | `05_API_CONTRACT` §10 |
|---|---|---|
| 시간당 업로드 세션 | **5회** | 20회 / 1시간 |
| 일일 업로드 총량 | **10GiB** | 50GB / 1일 |

`06_MEDIA_PIPELINE` §2 가 "모든 상한은 `capacity` 객체에서 읽는다. 리터럴 금지"
라고 명시하므로 **capacity 를 따른다.** §10 표의 값은 T1/T2 와 일치하므로
티어 표의 스냅샷으로 읽는다. 안전한 방향이기도 하다 — T0 쪽이 더 엄격하다.

**2. `withRoute` 가 티어 의존 한도를 표현할 수 없다**

`RouteRateLimit.limit` 이 고정 `number` 다. 업로드 한도는 티어에 따라 달라지므로
`limit: number | ((capacity: Capacity) => number)` 로 넓힌다. 라우트 파일이
`CAPACITY_TIER` 를 직접 읽게 두면 env 참조가 흩어진다 — `handler.ts` 의
`currentCapacity()` 가 이미 그 단일 지점이다.

**3. CORS `ExposeHeaders: ETag` (문서가 S1 에서 확인하라고 지목한 항목)**

`scripts/ops/verify-infra.sh` 에 단정이 있었으나 **CI 에서 실행되지 않았다.**
게이트가 도는 자리(storage 통합 테스트)로 옮겼다. 범위는 개발/CI(MinIO) 까지다 —
프로덕션(Linode) 버킷 CORS 는 `O01_DEPLOY` 런북의 수동 항목이며 자동화되어
있지 않다. DoD 의 해당 항목은 배포 파이프라인(ISS-008)이 생겨야 닫을 수 있다.

**의존성** — `bullmq`(`/BullMQ 5/`)와 `@tanstack/react-query` 모두 `check-deps`
증거 테이블에 이미 있다. 새 DEP 결정이 필요하지 않다.

**에러코드·모델** — `UploadSession`(completedParts Json, s3UploadId, expiresAt)과
`VideoAsset`(attemptCount, errorCode)이 T02 에서 이미 완성되어 있다. §6 표의
모든 에러코드가 `codes.ts` 에 존재한다. 새로 만들 것이 없다.

---

## 1. 목적

크리에이터가 **현재 티어 상한까지의** 영상을 브라우저에서 Object Storage 로
직접 올리고, 네트워크가 끊겨도 이어서 올릴 수 있게 한다.
완료 시 트랜스코드 잡을 발행한다. (T0 = 2GB / 20분, `11_CAPACITY_TIERS.md` §3)

> **원본 바이트는 앱 서버를 절대 통과하지 않는다.** 이 원칙을 어기면 서버가 죽는다.

## 2. 참조 스펙

- `../00_SPEC/06_MEDIA_PIPELINE.md` §2 (전체)
- `../00_SPEC/05_API_CONTRACT.md` §3, §10
- `../00_SPEC/08_UIUX_SPEC.md` §4 업로드 상태기계
- `../00_SPEC/09_ERROR_CATALOG.md` (UPLOAD 절)
- `../00_SPEC/10_NFR.md` §4 `LIMITS`
- `../00_SPEC/04_DOMAIN_MODEL.md` (UploadSession, VideoAsset)

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/core/src/rules/upload-policy.ts` | `decidePartSize`, 형식/용량 검증 (순수) | S2→S3 |
| `packages/core/src/state/upload-state.ts` | 업로드 상태 전이 판정 (순수) | S2→S3 |
| `packages/core/src/schemas/upload.schema.ts` | 요청/응답 zod | S2→S3 |
| `packages/queue/src/queues.ts` | 큐 이름 상수 | S2→S3 |
| `packages/queue/src/jobs.ts` | 잡 페이로드 zod | S2→S3 |
| `packages/queue/src/enqueue.ts` | 타입 안전 발행 | S2→S3 |
| `apps/web/src/services/upload/create-upload-session.ts` | 세션 생성 유스케이스 | S2→S3 |
| `apps/web/src/services/upload/sign-more-parts.ts` | 파트 URL 재발급 | S2→S3 |
| `apps/web/src/services/upload/complete-upload.ts` | 완료 + 큐 발행 (멱등) | S2→S3 |
| `apps/web/src/services/upload/abort-upload.ts` | 중단 + 정리 | S2→S3 |
| `apps/web/app/api/uploads/route.ts` | POST | S3 |
| `apps/web/app/api/uploads/[id]/route.ts` | GET (재개용 상태) | S3 |
| `apps/web/app/api/uploads/[id]/parts/route.ts` | POST 재발급 | S3 |
| `apps/web/app/api/uploads/[id]/complete/route.ts` | POST | S3 |
| `apps/web/app/api/uploads/[id]/abort/route.ts` | POST | S3 |
| `apps/web/src/hooks/use-upload.ts` | ★ 클라이언트 업로드 엔진 | S2→S3 |
| `apps/web/src/components/upload/Uploader.tsx` | 업로드 UI (상태기계) | S3 |
| `apps/web/src/components/upload/UploadProgress.tsx` | 진행률 표시 (순수 표현) | S3 |
| `apps/web/app/(studio)/studio/upload/page.tsx` | 업로드 화면 | S3 |
| `apps/web/e2e/upload-flow.e2e.ts` | US-02, US-09 | S3 |

## 4. S2 Skeleton

```ts
// packages/core/src/rules/upload-policy.ts
export interface PartPlan { partSize: number; totalParts: number }
export function decidePartSize(fileSize: number): PartPlan

export interface UploadRequest { fileName: string; fileSize: number; mimeType: string }
/**
 * 위반 시 AppError 를 던진다. 통과하면 void.
 * ★ 상한은 인자로 받는다. LIMITS 나 리터럴에서 읽지 않는다.
 *   (티어 승급 시 코드가 바뀌지 않게 하려는 것 — 11_CAPACITY_TIERS §1)
 */
export function assertUploadAllowed(req: UploadRequest, cap: Capacity): void
```

```ts
// apps/web/src/hooks/use-upload.ts — 클라이언트 업로드 엔진
export type UploadPhase =
  | 'idle' | 'validating' | 'creating' | 'uploading' | 'paused'
  | 'resumable' | 'completing' | 'transcoding' | 'ready' | 'error'

export interface UploadState {
  phase: UploadPhase
  uploadId: string | null
  assetId: string | null
  bytesSent: number
  bytesTotal: number
  progress: number              // 0-100
  etaSec: number | null
  transcodeProgress: number     // 0-100
  errorCode: string | null
}

export interface UploadApi {
  state: UploadState
  start(file: File): Promise<void>
  pause(): void
  resume(): Promise<void>
  abort(): Promise<void>
  retry(): Promise<void>
}

export function useUpload(): UploadApi {
  throw new NotImplementedError('T05:useUpload')
}
```

```ts
// packages/queue/src/queues.ts
export const QUEUE = {
  VIDEO_TRANSCODE:  'video.transcode',
  VIDEO_THUMBNAIL:  'video.thumbnail',
  EPISODE_PUBLISH:  'episode.publishScheduled',
  FEED_RANK:        'feed.rankRecompute',
  COUNTER_FLUSH:    'counter.flush',
  COUNTER_RECONCILE:'counter.reconcile',
  NOTIFY_FANOUT:    'notification.fanout',
  STORAGE_CLEANUP:  'storage.cleanup',
  DB_PURGE:         'db.purge',
  RECOVER_STUCK:    'asset.recoverStuck',
} as const
```

## 5. S3 구현 순서

### 서버 측

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T05:decidePartSize` | `06_MEDIA_PIPELINE.md` §2 알고리즘 |
| 2 | `T05:assertUploadAllowed` | 검증 순서 5단계 (06 §2) |
| 3 | `T05:uploadState` | 상태 전이 판정 |
| 4 | `T05:enqueue` | BullMQ 발행. **jobId 를 assetId 로 고정** (중복 발행 방지) |
| 5 | `T05:createUploadSession` | 아래 순서 |
| 6 | `T05:signMoreParts` | 소유자 확인 → 요청 파트 번호 유효성 → 서명 |
| 7 | `T05:completeUpload` | 아래 순서 (멱등성이 핵심) |
| 8 | `T05:abortUpload` | S3 abort → 세션 ABORTED |
| 9 | `T05:getUploadSession` | 재개용: 상태 + 완료된 파트 번호 목록 |

#### `createUploadSession` 순서

```
1. can(actor, 'upload.create')                → E_PERM_DENIED
2. actor.emailVerified                        → E_AUTH_EMAIL_NOT_VERIFIED
3. 레이트리밋: 시간당 20회                      → E_RATE_LIMITED
4. 일일 업로드 총량 확인 (당일 세션 합계)         → E_UPLOAD_QUOTA_EXCEEDED
5. assertUploadAllowed()                      → E_UPLOAD_TOO_LARGE / _UNSUPPORTED_TYPE
6. decidePartSize()
7. originalKey(userId, sessionId, fileName)   ← 새니타이즈 포함
8. createMultipart()                          → S3
9. UploadSession INSERT (status=CREATED, expiresAt=+24h)
10. signParts(1..min(totalParts,100))
11. 201 응답

★ 8번(S3)이 성공하고 9번(DB)이 실패하면 고아 멀티파트가 남는다.
  → 순서를 9 → 8 로 하면 DB 에 s3UploadId 가 없는 세션이 남는다.
  → 결론: 현재 순서(S3 먼저)를 유지하고, 고아는 storage.cleanup 잡이 회수한다.
    (DB 고아는 회수 대상을 식별할 수 없으므로 더 나쁘다)
```

#### `completeUpload` 순서 (멱등성 필수)

```
1. 세션 조회 (소유자 확인)                      → E_UPLOAD_SESSION_NOT_FOUND / E_PERM_NOT_OWNER
2. ★ 이미 UPLOADED 인가?
     → 연결된 VideoAsset 을 찾아 200 으로 동일 결과 반환. 재처리하지 않는다.
3. status 가 ABORTED/FAILED 인가?             → E_UPLOAD_ALREADY_COMPLETED / E_UPLOAD_ABORTED
4. expiresAt 경과?                            → E_UPLOAD_SESSION_EXPIRED
5. 파트 개수 == totalParts 확인                → E_UPLOAD_PART_MISSING (누락 번호를 detail 에)
6. completeMultipart()                        → S3
7. 트랜잭션:
     UploadSession.status = UPLOADED
     VideoAsset INSERT (status=PENDING, originalKey, uploadId)
8. enqueue(VIDEO_TRANSCODE, { assetId }, { jobId: assetId })
9. 202 { assetId, status: 'PENDING' }

★ 7번 후 8번이 실패하면 자산이 PENDING 으로 영원히 남는다.
  → scheduler 의 복구 잡이 "PENDING 상태로 10분 이상 방치된 자산"을 재발행한다. (T06)
```

### 클라이언트 측 (`use-upload.ts`)

| # | 마커 | 내용 |
|---|---|---|
| 10 | `T05:useUpload` | 상태기계 + 병렬 업로드 |
| 11 | `T05:uploadPart` | 단일 파트 PUT (XHR — fetch 는 업로드 진행률을 못 준다) |
| 12 | `T05:resumeUpload` | localStorage 세션 복원 + 서버 상태 대조 |
| 13 | `T05:pollTranscode` | 자산 상태 폴링 |

#### 업로드 엔진 요구사항

| 요구 | 값 / 방법 |
|---|---|
| 병렬 파트 수 | 3 (모바일 회선 고려. 너무 높이면 오히려 느려짐) |
| 진행률 | `XMLHttpRequest.upload.onprogress`. **fetch 는 업로드 진행률 미지원** |
| 파트 재시도 | 파트별 3회, 지수 백오프 (1s/4s/16s) |
| 일시정지 | 진행 중 파트는 완료시키고 다음 파트를 시작하지 않음 |
| 재개 | `GET /api/uploads/:id` 로 완료 파트 확인 → 누락분만 업로드 |
| 세션 저장 | `localStorage['aidream:upload'] = { uploadId, fileName, fileSize, lastModified }` |
| 파일 재선택 | 재개 시 브라우저가 File 객체를 복원 못 하므로 **같은 파일 재선택을 요청**. `fileName + fileSize + lastModified` 로 동일성 검증 |
| ETag 수집 | 각 PUT 응답의 `ETag` 헤더. **CORS 에서 `ETag` 노출 필수** |
| 서명 만료 | 파트 URL 만료 시 `/parts` 로 재발급 후 계속 |
| ETA | 최근 10개 파트의 이동평균 속도 기반 |
| 이탈 경고 | `uploading` 단계에서만 `beforeunload`. `transcoding` 에서는 경고 안 함 |

**CORS 설정이 필수다.** Linode Object Storage 버킷에
`ExposeHeaders: ['ETag']` 가 없으면 브라우저가 ETag 를 읽을 수 없어
멀티파트 완료가 **영구히 불가능**하다. T01 의 버킷 설정에 포함되어야 하며,
이 태스크의 S1 에서 반드시 확인한다.

```json
{
  "CORSRules": [{
    "AllowedOrigins": ["https://{도메인}"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}
```

## 6. 예외처리

| 상황 | 에러코드 | 클라이언트 동작 |
|---|---|---|
| 티어 상한 초과 (T0: 2GB) | `E_UPLOAD_TOO_LARGE` | 즉시 표시(상한값 포함), 파일 선택 취소 |
| 미지원 형식 | `E_UPLOAD_UNSUPPORTED_TYPE` | 허용 형식 목록 표시 |
| 일일 한도 초과 | `E_UPLOAD_QUOTA_EXCEEDED` | 남은 한도와 초기화 시각 표시 |
| 시간당 횟수 초과 | `E_RATE_LIMITED` | `Retry-After` 만큼 카운트다운 |
| 이메일 미인증 | `E_AUTH_EMAIL_NOT_VERIFIED` | 인증메일 재발송 버튼 |
| 세션 만료 (24h) | `E_UPLOAD_SESSION_EXPIRED` | 처음부터 다시 안내. localStorage 정리 |
| 파트 PUT 실패 (5xx) | — | 3회 재시도 → 실패 시 `resumable` 로 전이 |
| 파트 PUT 403 (서명 만료) | — | 재발급 후 자동 계속 (사용자에게 표시 안 함) |
| 네트워크 완전 단절 | — | `resumable` 상태. "이어서 올리기" 버튼 |
| 파트 누락 상태로 complete | `E_UPLOAD_PART_MISSING` | 누락 파트만 재업로드 후 재시도 |
| 중복 complete | — | **200 + 동일 assetId** (멱등) |
| 중단된 세션에 complete | `E_UPLOAD_ABORTED` | 새 업로드 안내 |
| Object Storage 장애 | `E_STORAGE_UNAVAILABLE` | 재시도 버튼 + "잠시 후 다시" |
| 큐 발행 실패 | — | **complete 는 성공 처리.** scheduler 복구 잡에 위임 |
| 재개 시 다른 파일 선택 | — | "선택한 파일이 다릅니다" + 새로 시작 옵션 |
| 브라우저 탭 종료 | — | 서버 세션은 24h 유지. 재진입 시 재개 제안 |

### 정리(cleanup) 책임

| 대상 | 주체 | 시점 |
|---|---|---|
| 만료된 미완료 멀티파트 | `storage.cleanup` 잡 | 매시간 |
| `expiresAt` 지난 `CREATED`/`UPLOADING` 세션 | 동일 | 매시간, S3 abort 후 `ABORTED` 로 |
| 에피소드에 연결되지 않은 `READY` 자산 | 동일 | 7일 후 삭제 |
| 실패한 자산의 원본 | 동일 | 30일 후 (재시도 여유) |

**이 잡이 없으면 스토리지 요금이 조용히 늘어난다.** T06 에서 함께 구현한다.

## 7. 테스트

| 케이스 | 방식 |
|---|---|
| `decidePartSize` — 1MB/100MB/8GB 경계 | 단위 |
| `decidePartSize` — 파트수 10000 초과 시 크기 배증 | 단위 |
| `assertUploadAllowed` — 각 위반별 정확한 에러코드 | 단위 |
| 상태 전이 — 허용/금지 전조합 | 단위 |
| `createUploadSession` 정상 | 통합 |
| 한도 초과 각각 | 통합 |
| `completeUpload` 정상 → 자산 생성 + 큐 발행 | 통합 |
| **`completeUpload` 2회 호출 → 동일 assetId, 큐 발행 1회** | 통합 ★ |
| 파트 누락 → `E_UPLOAD_PART_MISSING` + 누락 번호 | 통합 |
| 만료 세션 → `E_UPLOAD_SESSION_EXPIRED` | 통합 |
| 남의 세션 접근 → `E_PERM_NOT_OWNER` | 통합 |
| 업로드 엔진 — 파트 3개 병렬, 전부 성공 | 컴포넌트 (msw) |
| 업로드 엔진 — 파트 1개 실패 후 재시도 성공 | 컴포넌트 |
| 업로드 엔진 — 서명 만료(403) → 재발급 후 계속 | 컴포넌트 |
| 업로드 엔진 — 일시정지/재개 | 컴포넌트 |
| 재개 — 완료 파트 건너뛰기 | 컴포넌트 |
| 재개 — 다른 파일 선택 시 거부 | 컴포넌트 |
| 소용량 파일 업로드 → 재생까지 | E2E (US-02) |
| 업로드 중단 → 재개 → 완료 | E2E (US-09) |

**멱등성 테스트(★)가 가장 중요하다.** 네트워크 재시도로 complete 가 두 번
호출되는 일은 실제로 자주 일어나고, 이때 자산이 2개 생기면 트랜스코드 비용이 2배가 된다.

## 8. 완료 조건 (DoD)

- [x] `pnpm gate` 통과
- [x] 잔존 `NotImplementedError('T05:...')` = 0
- [x] `upload-flow.e2e.ts` (US-02, US-09) 통과
- [x] 멱등성 테스트 통과 (complete 2회 → 자산 1개, 잡 1개)
- [ ] 버킷 CORS 에 `ExposeHeaders: ETag` 확인 (실제 브라우저에서 ETag 읽힘)
- [ ] **500MB 이상 실제 파일**로 수동 업로드 성공 (파트 다수 경로 검증)
- [ ] 업로드 중 개발자도구에서 네트워크 차단 → 복구 → 재개 성공 (수동)
- [ ] 앱 서버 로그에 원본 바이트가 통과한 흔적 없음 (요청 본문 크기 확인)
- [ ] Caddy `max_size 2MB` 상태에서 업로드가 정상 동작 (서버 경유가 아님을 증명)
