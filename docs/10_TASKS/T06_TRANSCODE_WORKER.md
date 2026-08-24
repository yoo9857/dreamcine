# T06 — 트랜스코드 워커: BullMQ · ffmpeg · HLS

## 진행 상태
- [x] S1 Spec 확인   — 2026-08-24 / 산출물 22개 + 워크스페이스 연결 파일 확정
- [x] S2 Skeleton      — 2026-08-24 / gate:s2 PASS / 센티넬 22개
- [ ] S3 구현

---

## 1. 목적

업로드된 원본을 HLS 다중 화질로 변환하고, 썸네일·포스터·프리뷰 스프라이트를 만들어
Object Storage 에 올린 뒤 자산을 `READY` 로 만든다.
**실패해도 시스템이 망가지지 않게** 멱등성·타임아웃·정리·재시도를 갖춘다.

> 이 태스크가 이 프로젝트에서 가장 어렵다. 서두르지 말고 마커 하나씩 진행한다.

## 2. 참조 스펙

- `../00_SPEC/06_MEDIA_PIPELINE.md` (전체 — 이 문서가 곧 사양)
- `../00_SPEC/01_ARCHITECTURE.md` §3-2
- `../00_SPEC/09_ERROR_CATALOG.md` (MEDIA/ASSET 절, §6 재시도)
- `../00_SPEC/10_NFR.md` §3 SLO, §4 `LIMITS`, §7 처리량
- `../00_SPEC/04_DOMAIN_MODEL.md` (VideoAsset, Rendition, 상태기계)

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/core/src/state/asset-state.ts` | 자산 상태 전이 판정 (순수) | S2→S3 |
| `packages/media/src/ladder.ts` | ★ 해상도 → 렌디션 결정 (순수) | S2→S3 |
| `packages/media/src/ffmpeg-args.ts` | ★ 인자 배열 조립 (순수) | S2→S3 |
| `packages/media/src/probe.ts` | ffprobe 실행 + 파싱 | S2→S3 |
| `packages/media/src/transcode-hls.ts` | ffmpeg 실행 + 진행률 파싱 | S2→S3 |
| `packages/media/src/thumbnail.ts` | 썸네일/포스터/스프라이트 | S2→S3 |
| `packages/media/src/errors.ts` | ffmpeg stderr → 에러코드 분류 | S2→S3 |
| `packages/media/src/validate.ts` | probe 결과 정책 검증 (순수) | S2→S3 |
| `apps/worker/src/index.ts` | 워커 부트스트랩 + 그레이스풀 셧다운 | S2→S3 |
| `apps/worker/src/config.ts` | env zod 검증 | S3 |
| `apps/worker/src/lib/workspace.ts` | 임시 디렉터리 (삭제 보장) | S2→S3 |
| `apps/worker/src/lib/progress.ts` | Redis 진행률 보고 | S3 |
| `apps/worker/src/lib/idempotency.ts` | 멱등성 게이트 | S3 |
| `apps/worker/src/lib/disk.ts` | 여유 공간 확인 | S3 |
| `apps/worker/src/jobs/transcode.ts` | ★ 메인 잡 | S2→S3 |
| `apps/worker/src/jobs/cleanup-orphans.ts` | 정리 잡 (T05 §6 표) | S2→S3 |
| `apps/worker/src/jobs/recover-stuck.ts` | 방치된 PENDING 자산 재발행 | S2→S3 |
| `apps/worker/src/jobs/db-purge.ts` | 소프트 삭제 물리 삭제 (`O03` §6) | S2→S3 |
| `apps/worker/src/scheduler.ts` | 반복 잡 등록 (리더 락) | S3 |
| `apps/web/app/api/assets/[id]/route.ts` | 상태·진행률 조회 | S3 |
| `apps/web/app/api/assets/[id]/retry/route.ts` | 재시도 | S3 |
| `packages/media/tests/**` | 인자 스냅샷 + 실제 ffmpeg 통합 | S3 |

## 4. S2 Skeleton

```ts
// packages/media/src/probe.ts
export interface ProbeResult {
  durationSec: number
  width: number
  height: number
  videoCodec: string
  audioCodec: string | null
  bitrateKbps: number
  frameRate: number
  hasAudio: boolean
  rotation: number            // 0 | 90 | 180 | 270 — 메타데이터 회전
}
export function probe(filePath: string): Promise<ProbeResult> {
  throw new NotImplementedError('T06:probe')
}
```

```ts
// packages/media/src/ladder.ts — 순수 함수
export interface RenditionSpec {
  name: '1080p' | '720p' | '480p' | '360p'
  width: number
  height: number
  videoBitrateKbps: number
  audioBitrateKbps: number
}
/**
 * 생성할 렌디션 목록 = (티어 허용 목록) ∩ (원본 크기가 허용하는 목록)
 * 업스케일하지 않는다. allowed 는 capacity.ladder 를 그대로 받는다.
 * ★ 티어를 함수 안에서 읽지 않는다 — 순수 함수로 유지해야 테스트가 가능하다.
 */
export function buildLadder(
  width: number,
  height: number,
  allowed: readonly RenditionSpec['name'][],
): RenditionSpec[] {
  throw new NotImplementedError('T06:buildLadder')
}
```

```ts
// packages/media/src/ffmpeg-args.ts — 순수 함수
export interface HlsArgsInput {
  inputPath: string
  outDir: string
  ladder: RenditionSpec[]
  rotation: number
}
export function buildHlsArgs(input: HlsArgsInput): string[] {
  throw new NotImplementedError('T06:buildHlsArgs')
}
export function buildThumbArgs(inputPath: string, atSec: number, outPath: string): string[]
export function buildSpriteArgs(inputPath: string, durationSec: number, outPath: string): string[]
```

```ts
// packages/media/src/transcode-hls.ts
export interface TranscodeOptions {
  onProgress?: (percent: number) => void
  timeoutMs: number
  signal?: AbortSignal
}
export interface TranscodeResult {
  renditions: Array<{ spec: RenditionSpec; playlistPath: string; sizeBytes: number }>
  masterPath: string
  totalBytes: number
}
export function transcodeToHls(
  input: HlsArgsInput, opts: TranscodeOptions,
): Promise<TranscodeResult> {
  throw new NotImplementedError('T06:transcodeToHls')
}
```

```ts
// apps/worker/src/lib/workspace.ts
/** 임시 디렉터리를 만들고 fn 실행 후 반드시 삭제한다 (예외 발생해도). */
export function withWorkspace<T>(
  assetId: string, fn: (dir: string) => Promise<T>,
): Promise<T> {
  throw new NotImplementedError('T06:withWorkspace')
}
```

## 5. S3 구현 순서

**순수 함수를 먼저 완성한다.** 테스트 가능한 부분을 굳혀놓고 프로세스 실행으로 넘어간다.

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T06:buildLadder` | 06 §3 표. **긴 변 기준 판정**. 세로 영상 반영. **티어 허용목록과 교집합** |
| 2 | `T06:validateProbe` | 06 §4 [3] 검증 5종 → 각각 정확한 에러코드 |
| 3 | `T06:buildHlsArgs` | 06 §4 명령 형태 그대로. 회전 처리 포함 |
| 4 | `T06:buildThumbArgs` | 10% 지점, 1280×720 crop |
| 5 | `T06:buildSpriteArgs` | 10초 간격 타일 + VTT |
| 6 | `T06:classifyFfmpegError` | stderr 패턴 → 에러코드 (아래 표) |
| 7 | `T06:assetState` | 상태 전이 판정 |
| 8 | `T06:probe` | ffprobe `-print_format json` 실행 + 파싱 |
| 9 | `T06:withWorkspace` | `try/finally` 로 삭제 보장. 삭제 실패도 로그 남기고 진행 |
| 10 | `T06:checkDisk` | `statfs` 로 여유 공간. 원본×3 미달 시 `E_MEDIA_DISK_FULL` |
| 11 | `T06:transcodeToHls` | spawn + 진행률 파싱 + 타임아웃 + kill |
| 12 | `T06:makeThumbnails` | 썸네일/포스터/스프라이트 |
| 13 | `T06:progressReport` | Redis SET (TTL 24h), 5% 단위로만 갱신 |
| 14 | `T06:idempotencyGate` | 상태 확인 후 스킵 판정 |
| 15 | `T06:transcodeJob` | ★ 전체 조립 (06 §4 순서 그대로) |
| 16 | `T06:workerBootstrap` | BullMQ Worker + 그레이스풀 셧다운 |
| 17 | `T06:cleanupOrphans` | T05 §6 정리 표 4종 |
| 18 | `T06:recoverStuck` | PENDING 10분 초과 자산 재발행 |
| 19 | `T06:dbPurge` | 소프트 삭제 물리 삭제. **`DRY_RUN` 지원 + 1회 1000건 상한** (`O03` §6) |
| 20 | `T06:scheduler` | 반복 잡 등록 + Redis 리더 락 |
| 21 | `T06:assetStatusApi` | GET/retry 라우트 |

### ffmpeg 프로세스 실행 규칙

| 규칙 | 이유 |
|---|---|
| `spawn` 사용. `exec`/`shell: true` **금지** | 셸 인젝션 방지 + 인자 이스케이프 불필요 |
| `-nostdin` | stdin 대기로 영구 정지하는 것 방지 |
| `-progress pipe:2` + `-hide_banner` | 진행률 파싱을 안정화 |
| stderr 는 **링 버퍼로 마지막 100줄만** 보관 | 긴 로그가 메모리를 먹는 것 방지 |
| 타임아웃 시 `SIGTERM` → 5초 후 `SIGKILL` | 좀비 프로세스 방지 |
| `AbortSignal` 로 셧다운 전파 | 그레이스풀 종료 |
| 종료코드 0 이 아니면 실패 | 단, stderr 를 보고 분류 |

### 진행률 파싱

```
-progress pipe:2 출력 형식:
  out_time_us=12345678
  progress=continue
  ...
  progress=end

percent = (out_time_us / 1_000_000) / durationSec * 100
5% 단위로 변할 때만 Redis 갱신 (쓰기 폭주 방지)
```

### ffmpeg 에러 분류 (stderr 패턴 → 에러코드)

| stderr 패턴 | 에러코드 | 재시도 |
|---|---|---|
| `Invalid data found when processing input` | `E_MEDIA_PROBE_FAILED` | ✗ |
| `moov atom not found` | `E_MEDIA_PROBE_FAILED` | ✗ |
| `does not contain any stream` | `E_MEDIA_NO_VIDEO_STREAM` | ✗ |
| `Decoder (codec ...) not found` | `E_MEDIA_UNSUPPORTED_CODEC` | ✗ |
| `No space left on device` | `E_MEDIA_DISK_FULL` | ○ (공간 확보 후) |
| `Cannot allocate memory` | `E_MEDIA_TRANSCODE_FAILED` | ○ |
| 타임아웃 (신호로 종료) | `E_MEDIA_TRANSCODE_TIMEOUT` | ○ |
| 그 외 비정상 종료 | `E_MEDIA_TRANSCODE_FAILED` | ○ |

**분류는 순수 함수로.** stderr 문자열을 받아 에러코드를 반환한다 → 테스트 가능.

### 업로드 순서 (반드시 지킨다)

```
1. 모든 렌디션의 세그먼트(.ts) 전부 업로드
2. 각 렌디션의 index.m3u8 업로드
3. 마지막에 master.m3u8 업로드

★ master 를 먼저 올리면, 플레이어가 아직 없는 세그먼트를 요청해 404 가 난다.
  그리고 CDN 이 그 404 를 캐시하면 문제가 지속된다.
```

### 멱등성 (핵심)

```
잡 진입 시:
  asset = findAssetById(assetId)
  if (!asset)                      → 로그 + 성공 처리 (삭제된 자산)
  if (asset.status === 'READY')     → 성공 처리, 아무것도 하지 않음
  if (asset.status === 'PROBING' || 'TRANSCODING')
     → 다른 워커가 처리 중일 수 있다.
       updatedAt 이 30분 이상 지났으면 이어받고, 아니면 성공 처리(스킵).
  if (asset.status === 'FAILED' && attemptCount >= 3) → 성공 처리(스킵)
  else 진행
```

`enqueue` 시 `jobId: assetId` 로 고정했으므로(T05) BullMQ 자체도 중복을 막지만,
**DB 상태 검사를 이중으로 둔다** (Redis 초기화 시에도 안전하게).

### 그레이스풀 셧다운

```
SIGTERM 수신 시:
1. 새 잡 수신 중단 (worker.pause)
2. 진행 중인 ffmpeg 에 AbortSignal 전파 → SIGTERM
3. 임시 디렉터리 삭제
4. 잡을 실패 처리하지 않고 큐에 반환 (BullMQ 자동 — stalled 로 재할당)
5. 최대 30초 대기 후 종료

★ 배포 중 트랜스코드가 날아가지 않게 하는 장치다. (O01_DEPLOY.md)
```

## 6. 예외처리

| 상황 | 에러코드 | 처리 |
|---|---|---|
| 원본 객체 없음 | `E_STORAGE_OBJECT_NOT_FOUND` | `FAILED` 확정 (✗). 자산이 고아 |
| 디스크 여유 부족 (사전) | `E_MEDIA_DISK_FULL` | 잡 지연 후 재시도 + **알럿** |
| 다운로드 중 단절 | `E_STORAGE_UNAVAILABLE` | 재시도 (○) |
| ffprobe 실패 | `E_MEDIA_PROBE_FAILED` | `FAILED` 확정 (✗) + 크리에이터 알림 |
| 비디오 스트림 없음 | `E_MEDIA_NO_VIDEO_STREAM` | `FAILED` 확정 (✗) |
| 오디오 스트림 없음 | `E_MEDIA_NO_AUDIO_STREAM` | `FAILED` 확정 (✗) |
| 미지원 코덱 | `E_MEDIA_UNSUPPORTED_CODEC` | `FAILED` 확정 (✗) |
| 해상도 미달 | `E_MEDIA_RESOLUTION_TOO_LOW` | `FAILED` 확정 (✗) |
| 티어 길이 상한 초과 (T0: 20분) | `E_MEDIA_DURATION_TOO_LONG` | `FAILED` 확정 (✗) |
| ffmpeg 비정상 종료 | `E_MEDIA_TRANSCODE_FAILED` | 재시도 3회 (○) → DLQ + 알럿 |
| 타임아웃 (길이×4) | `E_MEDIA_TRANSCODE_TIMEOUT` | 재시도 3회 (○) |
| 업로드 중 실패 | `E_STORAGE_UNAVAILABLE` | 재시도. **부분 업로드된 세그먼트는 새 assetId 로 재시작하므로 무해** |
| DB 갱신 실패 | `E_DB_UNAVAILABLE` | 재시도. HLS 는 이미 올라갔으므로 재시도 시 덮어씀 (같은 assetId) |
| 워커 강제 종료 | — | BullMQ `stalled` 감지 → 재할당. 멱등성 게이트가 처리 |
| 임시 디렉터리 삭제 실패 | — | error 로그 + 알럿. 잡은 성공 처리. 디스크 감시로 인지 |
| 큐 유실 (Redis 초기화) | — | `recover-stuck` 잡이 PENDING 자산을 재발행 |
| 재시도 3회 소진 | — | `FAILED` + `errorCode` 저장 + 크리에이터 알림 + 운영 알럿 |

### 실패 시 크리에이터에게 보여줄 것

| 에러코드 | 사용자 문구 |
|---|---|
| `E_MEDIA_PROBE_FAILED` | "영상 파일이 손상되었거나 읽을 수 없습니다. 다시 내보낸 파일로 시도해 주세요." |
| `E_MEDIA_NO_AUDIO_STREAM` | "오디오 트랙이 없습니다. 음성이 포함된 영상을 올려주세요." |
| `E_MEDIA_UNSUPPORTED_CODEC` | "지원하지 않는 코덱입니다. H.264 로 내보낸 MP4 를 권장합니다." |
| `E_MEDIA_RESOLUTION_TOO_LOW` | "해상도가 너무 낮습니다. 최소 640×360 이상이 필요합니다." |
| `E_MEDIA_DURATION_TOO_LONG` | "영상이 {상한}분을 초과했습니다. 여러 편으로 나눠 올려주세요." (함수형 문구 — `09` §5) |
| `E_MEDIA_TRANSCODE_FAILED` | "변환에 실패했습니다. 재시도해 주세요. 반복되면 문의해 주세요." |

## 7. 테스트

### 순수 함수 (가장 촘촘하게 — 커버리지 85% 이상)

| 케이스 |
|---|
| `buildLadder(1920,1080, T1래더)` → 4개 렌디션 |
| `buildLadder(1280,720, T1래더)` → 3개 (1080p 없음) |
| `buildLadder(640,360, T1래더)` → 1개 (360p만) |
| `buildLadder(1080,1920, T1래더)` **세로** → 긴 변 1920 기준으로 4개 |
| `buildLadder(720,1280, T1래더)` 세로 → 3개 |
| **`buildLadder(1920,1080, T0래더)` → 2개 (720p,360p)** ★ 티어 제한 검증 |
| **`buildLadder(3840,2160, T0래더)` → 2개** (4K 원본도 T0 에서는 720p 까지) |
| `buildLadder(320,240)` → 검증 단계에서 거부되므로 빈 배열 또는 예외 |
| 업스케일이 발생하지 않음 (모든 케이스에서 출력 ≤ 입력) |
| 모든 출력 크기가 **짝수** (H.264 요구) |
| `buildHlsArgs` 스냅샷 — 가로/세로/렌디션 수별 |
| `buildHlsArgs` — 키프레임 정렬 옵션 존재 확인 |
| `validateProbe` — 5종 위반 각각 정확한 에러코드 |
| `classifyFfmpegError` — 표의 모든 패턴 |

### 통합 (실제 ffmpeg)

| 케이스 | 픽스처 |
|---|---|
| 정상 변환 → master.m3u8 + 세그먼트 생성 | 5초 720p 테스트 영상 (`ffmpeg lavfi` 로 생성) |
| 세로 영상 변환 성공 | 5초 720×1280 |
| 오디오 없는 영상 → `E_MEDIA_NO_AUDIO_STREAM` | `lavfi` 비디오만 |
| 손상 파일 → `E_MEDIA_PROBE_FAILED` | 랜덤 바이트를 .mp4 로 |
| 타임아웃 → `E_MEDIA_TRANSCODE_TIMEOUT` | 타임아웃 100ms 설정 |
| 생성된 m3u8 이 유효 (모든 세그먼트 존재) | 정상 케이스 |
| 모든 렌디션의 세그먼트 개수가 동일 (키프레임 정렬) | 정상 케이스 ★ |
| 임시 디렉터리가 성공/실패 모두에서 삭제됨 | 양쪽 |
| `withWorkspace` — 예외 발생 시에도 삭제 | 단위 |

**픽스처는 저장소에 커밋하지 않고 `ffmpeg -f lavfi` 로 테스트 시 생성한다.**
바이너리를 저장소에 넣지 않는다.

### 잡 레벨

| 케이스 |
|---|
| 잡 2회 실행 → 두 번째는 스킵, 렌디션 중복 생성 없음 ★ |
| `READY` 자산에 잡 → 즉시 스킵 |
| 삭제된 자산에 잡 → 에러 없이 성공 처리 |
| 실패 3회 → `FAILED` + `errorCode` 저장 + 알림 발생 |
| `attemptCount >= 3` 인 자산은 재시도 거부 |
| SIGTERM 시 ffmpeg 종료 + 잡이 큐로 반환 |
| `recover-stuck` 이 10분 방치 PENDING 을 재발행 |
| `cleanup-orphans` 가 7일 경과 고아 자산 삭제 |

## 8. 완료 조건 (DoD)

- [ ] `pnpm gate` 통과
- [ ] 잔존 `NotImplementedError('T06:...')` = 0
- [ ] `packages/media` 커버리지 ≥ 85%
- [ ] 순수 함수 테스트 전부 통과 (특히 세로 영상 + 짝수 크기)
- [ ] 실제 ffmpeg 통합 테스트 통과
- [ ] 멱등성 테스트 통과 (잡 2회 → 렌디션 중복 없음)
- [ ] **실제 30분 1080p 영상**을 변환해 브라우저에서 재생 확인 (수동)
- [ ] 변환 중 워커 재시작 → 잡이 재개되고 결과가 정상 (수동)
- [ ] 변환 후 임시 디렉터리가 남지 않음 (`ls $TMP_DIR` 비어있음)
- [ ] 진행률이 UI 에서 단조 증가 (역행 없음)
- [ ] `scheduler` 를 2개 띄워도 반복 잡이 1번만 실행 (리더 락 검증)
