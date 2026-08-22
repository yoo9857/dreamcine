# T04 — Object Storage 어댑터 · 서명 URL · CDN URL

## 진행 상태
- [x] S1 Spec 확인 — 2026-08-22 / 산출물 16개 확정 · 참조 스펙 4개 정독 · 발견 2건 기록
- [x] S2 Skeleton — 2026-08-22 / `pnpm gate:s2` PASS · 산출물 11개 생성 · 잔존 NIE 26개
- [ ] S3 구현

### S1 확정 산출물 (16)

| # | 경로 | 비고 |
|---|---|---|
| 1 | `packages/storage/package.json` | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` 추가 |
| 2 | `packages/storage/src/client.ts` | 일반용 + **스트리밍용 별도 인스턴스** (§6 주의) |
| 3 | `packages/storage/src/buckets.ts` | 키 조립 전부 + 파일명 새니타이즈 |
| 4 | `packages/storage/src/buckets.test.ts` | 키 문자열 · 경로 탈출 · 유니코드 · 절단 |
| 5 | `packages/storage/src/cache-presets.ts` | `IMMUTABLE_1Y`, `NO_STORE` (§5 가 요구) |
| 6 | `packages/storage/src/cache-presets.test.ts` | |
| 7 | `packages/storage/src/cdn.ts` | ★ CDN URL 유일 지점 |
| 8 | `packages/storage/src/cdn.test.ts` | 슬래시 중복/누락 |
| 9 | `packages/storage/src/errors.ts` | S3 에러 → `AppError` |
| 10 | `packages/storage/src/errors.test.ts` | §6 표의 매핑 전부 |
| 11 | `packages/storage/src/presign.ts` | GET 15분 (워커 전용) · PUT 6시간 |
| 12 | `packages/storage/src/multipart.ts` | create/sign/complete/abort/listStale |
| 13 | `packages/storage/src/put-object.ts` | `cacheControl` **필수 인자** |
| 14 | `packages/storage/src/get-object.ts` | Node stream. 메모리 적재 금지 |
| 15 | `packages/storage/src/delete.ts` | 단일 + 프리픽스 배치 |
| 16 | `packages/storage/src/index.ts` | 공개 배럴. `S3Client` export 금지 |

추가 산출물 2개 (표 밖 — 다른 패키지를 건드린다):

| 경로 | 이유 |
|---|---|
| `packages/storage/src/storage.integration.test.ts` | §7 통합 케이스. MinIO 대상, 모킹 금지 |
| `packages/config/eslint/base.cjs` | **스펙이 린트를 요구한다** — `06_MEDIA_PIPELINE.md` §5: "앱 코드에서 문자열로 CDN 도메인을 이어붙이는 것은 린트로 금지한다". DoD 의 `grep 확인` 을 사람 눈이 아니라 기계가 하게 만든다 |

### S1 발견

**의존성** — `@aws-sdk/client-s3` 와 `@aws-sdk/s3-request-presigner` 는
`03_TECH_STACK.md` §3 이 명시하고 `check-deps.ts` 증거 테이블에도 이미 있다.
새 DEP 결정이 필요하지 않다. 현재 `client-s3` 는 `apps/web` 에만 있고
presigner 는 미설치다 — 둘 다 `packages/storage` 로 들여온다.

**에러코드** — §6 표의 모든 코드가 `packages/core/src/errors/codes.ts` 에 이미
존재한다. 새로 추가할 것이 없다.

**CDN 경로 라우팅** — OBS-013 으로 기록. 아래.

---

## 1. 목적

Linode Object Storage(S3 호환)와 대화하는 **유일한 계층**을 만든다.
버킷 이름·키 조립·서명 URL·CDN URL 이 전부 이 패키지 안에만 존재하게 한다.
Object Storage 공급자를 바꾸더라도 이 패키지 밖은 손대지 않는다.

## 2. 참조 스펙

- `../00_SPEC/06_MEDIA_PIPELINE.md` §1 버킷/키, §2 서명 URL, §5 CDN URL
- `../00_SPEC/07_AUTH_SECURITY.md` §4 서명 URL 정책
- `../00_SPEC/03_TECH_STACK.md` §3 (AWS SDK), §6 환경변수
- `../00_SPEC/09_ERROR_CATALOG.md` (STORAGE 절)

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/storage/src/client.ts` | S3Client (Linode 엔드포인트, path-style 여부) | S2→S3 |
| `packages/storage/src/buckets.ts` | 버킷 상수 + **키 조립 함수 전부** | S2→S3 |
| `packages/storage/src/presign.ts` | GET/PUT 서명 URL | S2→S3 |
| `packages/storage/src/multipart.ts` | create/sign/complete/abort/list | S2→S3 |
| `packages/storage/src/put-object.ts` | 워커용 업로드 (Cache-Control 포함) | S2→S3 |
| `packages/storage/src/get-object.ts` | 워커용 스트리밍 다운로드 | S2→S3 |
| `packages/storage/src/delete.ts` | 단일/프리픽스 일괄 삭제 | S2→S3 |
| `packages/storage/src/cdn.ts` | ★ CDN URL 조립 **유일 지점** | S2→S3 |
| `packages/storage/src/cache-presets.ts` | `IMMUTABLE_1Y`, `NO_STORE` (§5 가 요구) | S2→S3 |
| `packages/storage/src/errors.ts` | S3 에러 → `AppError` | S3 |
| `packages/storage/src/index.ts` | 공개 배럴 (`S3Client` 는 export 금지) | S2 |
| `packages/storage/tests/**` | MinIO 대상 통합 테스트 | S3 |

## 4. S2 Skeleton

```ts
// packages/storage/src/buckets.ts
export const BUCKET = {
  ORIGINALS: 'originals',   // 실제 이름은 env 에서. 여기는 논리 이름
  HLS:       'hls',
  THUMBS:    'thumbs',
} as const
export type BucketKind = (typeof BUCKET)[keyof typeof BUCKET]

// ★ 키 조립은 반드시 이 함수들을 통한다. 문자열 concat 금지.
export function originalKey(userId: string, sessionId: string, fileName: string): string
export function hlsPrefix(assetId: string): string                  // hls/{assetId}/
export function hlsMasterKey(assetId: string): string               // hls/{assetId}/master.m3u8
export function hlsRenditionKey(assetId: string, name: string, file: string): string
export function thumbKey(assetId: string, file: string): string     // thumbs/{assetId}/{file}
export function avatarKey(userId: string): string
export function seriesPosterKey(seriesId: string): string
```

```ts
// packages/storage/src/multipart.ts
export interface CreateMultipartResult { uploadId: string; key: string }
export interface SignedPart { partNumber: number; url: string; expiresAt: Date }
export interface CompletedPart { partNumber: number; etag: string }

export function createMultipart(
  bucket: BucketKind, key: string, contentType: string,
): Promise<CreateMultipartResult> { throw new NotImplementedError('T04:createMultipart') }

export function signParts(
  bucket: BucketKind, key: string, uploadId: string,
  partNumbers: number[], ttlSec: number,
): Promise<SignedPart[]> { throw new NotImplementedError('T04:signParts') }

export function completeMultipart(
  bucket: BucketKind, key: string, uploadId: string, parts: CompletedPart[],
): Promise<{ etag: string; sizeBytes: number }> { throw new NotImplementedError('T04:completeMultipart') }

export function abortMultipart(
  bucket: BucketKind, key: string, uploadId: string,
): Promise<void> { throw new NotImplementedError('T04:abortMultipart') }

/** 정리 잡이 사용: 만료된 미완료 업로드 열거 */
export function listStaleMultipartUploads(
  bucket: BucketKind, olderThan: Date,
): Promise<Array<{ key: string; uploadId: string; initiated: Date }>> {
  throw new NotImplementedError('T04:listStaleMultipartUploads')
}
```

```ts
// packages/storage/src/cdn.ts
/** 오직 이 파일에서만 CDN_BASE_URL 을 참조한다. */
export function cdnUrl(key: string): string
export function masterUrl(assetId: string): string
export function thumbUrl(assetId: string, file?: string): string
export function avatarUrl(userId: string | null): string      // null → 기본 아바타
```

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T04:client` | S3Client. Linode 는 `forcePathStyle` 확인 필요 — 실제 테스트로 결정 |
| 2 | `T04:keys` | 키 조립 함수 전부. **파일명 새니타이즈** (§아래) |
| 3 | `T04:cdn` | CDN URL. 키 앞 슬래시 중복 방지 |
| 4 | `T04:presignGet` | 원본 다운로드용 (워커 전용, 15분) |
| 5 | `T04:createMultipart` | |
| 6 | `T04:signParts` | 배치 서명. 최대 100개/호출 |
| 7 | `T04:completeMultipart` | 파트 정렬 후 호출. ETag 인용부호 처리 주의 |
| 8 | `T04:abortMultipart` | |
| 9 | `T04:listStaleMultipartUploads` | 페이지네이션 (`KeyMarker`/`UploadIdMarker`) |
| 10 | `T04:putObject` | Cache-Control + Content-Type 필수 인자로 |
| 11 | `T04:getObjectStream` | Node stream 반환. 메모리 적재 금지 |
| 12 | `T04:deletePrefix` | 1000개 단위 배치 삭제 + 페이지네이션 |
| 13 | `T04:storageErrors` | 에러 매핑 |

### 파일명 새니타이즈 (보안상 필수)

```
원본 파일명은 사용자 입력이다. 다음을 반드시 처리한다:
1. 경로 구분자 제거: '/' '\' → 제거 (디렉터리 탈출 방지)
2. '..' 시퀀스 제거
3. 제어문자 · null 바이트 제거
4. 유니코드 NFC 정규화
5. 길이 200자로 절단 (확장자 보존)
6. 결과가 빈 문자열이면 'upload' 로 대체
```

키에 사용자 입력이 그대로 들어가면 **다른 사용자 영역에 쓰는 것이 가능**해진다.
`originalKey()` 는 반드시 새니타이즈를 내부에서 수행한다 (호출자가 잊어도 안전하게).

### ETag 처리 함정

S3 의 `ETag` 는 큰따옴표로 감싸여 온다: `"abc123"`.
클라이언트가 브라우저에서 받은 값을 그대로 보내면 인용부호가 포함되어 있다.
`completeMultipart` 는 **인용부호를 정규화**해야 한다 (있으면 유지, 없으면 추가 —
SDK 버전에 따라 다르므로 통합 테스트로 확정한다).

### Cache-Control 필수화

```ts
// put-object.ts — cacheControl 을 optional 로 두지 않는다
export interface PutObjectInput {
  bucket: BucketKind
  key: string
  body: Buffer | Readable
  contentType: string        // 필수
  cacheControl: string       // ★ 필수. 잊으면 CDN 캐시가 안 걸린다
}
```

**필수 인자로 만드는 것이 하네스다.** optional 이면 반드시 빠뜨리고,
빠뜨리면 CDN 이 캐시하지 않아 오리진 비용이 조용히 늘어난다.
`packages/storage/src/cache-presets.ts` 에 `IMMUTABLE_1Y`, `NO_STORE` 상수를 둔다.

## 6. 예외처리

| 상황 | 에러코드 | 처리 |
|---|---|---|
| 자격증명 오류 (403) | `E_STORAGE_UNAVAILABLE` | 503. **알럿 즉시** (설정 문제) |
| 버킷 없음 (`NoSuchBucket`) | `E_STORAGE_UNAVAILABLE` | 503 + 알럿 |
| 객체 없음 (`NoSuchKey`/404) | `E_STORAGE_OBJECT_NOT_FOUND` | 404 |
| 네트워크 타임아웃 | `E_STORAGE_UNAVAILABLE` | 재시도 가능(○). SDK 재시도 3회 |
| 5xx (서비스 오류) | `E_STORAGE_UNAVAILABLE` | SDK 지수 백오프 재시도 |
| 파트 번호 범위 초과 (>10000) | `E_UPLOAD_INVALID_PART` | 400 |
| `NoSuchUpload` (complete 시) | `E_UPLOAD_SESSION_EXPIRED` | 410. 세션 만료로 처리 |
| `InvalidPart` / ETag 불일치 | `E_UPLOAD_PART_MISSING` | 409 + 해당 파트 재업로드 안내 |
| `EntityTooSmall` (마지막 아닌 파트 <5MB) | `E_UPLOAD_INVALID_PART` | 400 |
| abort 대상이 이미 없음 | — | **성공 처리.** 멱등. |
| 삭제 대상이 이미 없음 | — | **성공 처리.** 멱등. |
| 프리픽스 삭제 부분 실패 | — | 실패 키 목록을 error 로그. 재시도 큐에 재발행 |

### SDK 재시도 설정

```ts
new S3Client({
  maxAttempts: 3,
  requestHandler: { requestTimeout: 30_000, connectionTimeout: 5_000 },
})
```

**주의**: 대용량 `getObject` 스트리밍에는 `requestTimeout` 이 적용되면 안 된다.
스트리밍 다운로드용 클라이언트는 별도 인스턴스(타임아웃 없음)로 분리한다.
이것을 놓치면 큰 원본 다운로드가 30초에 끊긴다.

## 7. 테스트

MinIO 를 대상으로 한 통합 테스트. **모킹하지 않는다** — S3 호환성 문제는 모킹으로 안 잡힌다.

| 케이스 | 방식 |
|---|---|
| 키 조립 함수 전부 (예상 문자열) | 단위 |
| 파일명 새니타이즈: `../../etc/passwd` → 안전한 이름 | 단위 |
| 파일명 새니타이즈: 한글·이모지·공백 처리 | 단위 |
| 파일명 새니타이즈: 200자 초과 절단 + 확장자 보존 | 단위 |
| `cdnUrl` — 슬래시 중복/누락 없음 | 단위 |
| 멀티파트 전체 왕복 (create→sign→PUT→complete) | 통합 (MinIO) |
| 파트 순서 뒤섞어 complete → 성공 | 통합 |
| 파트 1개 빠뜨리고 complete → `E_UPLOAD_PART_MISSING` | 통합 |
| 잘못된 ETag → 적절한 에러코드 | 통합 |
| abort 후 complete → `E_UPLOAD_SESSION_EXPIRED` | 통합 |
| abort 2회 → 두 번째도 성공 (멱등) | 통합 |
| `listStaleMultipartUploads` 가 미완료 업로드 발견 | 통합 |
| `putObject` 후 `Cache-Control` 헤더 확인 | 통합 |
| 프리픽스 삭제 — 1000개 초과 (페이지네이션) | 통합 |
| 서명 GET URL 로 실제 다운로드 가능 | 통합 |
| 만료된 서명 URL → 403 | 통합 (TTL 1초로 설정) |
| `originals` 익명 접근 → 403 | 통합 |

## 8. 완료 조건 (DoD)

- [ ] `pnpm gate` 통과
- [ ] 잔존 `NotImplementedError('T04:...')` = 0
- [ ] MinIO 통합 테스트 전부 통과
- [ ] `packages/storage/src/index.ts` 가 `S3Client` 를 export 하지 않음
- [ ] `CDN_BASE_URL` 참조가 `cdn.ts` 에만 존재 (grep 확인)
- [ ] `putObject` 호출부 전부에 `cacheControl` 지정 (타입이 강제하지만 확인)
- [ ] 새니타이즈 테스트에 경로 탈출 케이스 포함
- [ ] 스트리밍 다운로드가 500MB 파일에서 타임아웃 없이 완료
