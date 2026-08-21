# 06 — 미디어 파이프라인 (Storage → Transcode → Serve)

> 상태: **불변 계약**. CODEX 수정 금지.
> 이 문서는 서비스의 심장이다. 여기서 실수하면 스토리지 비용과 재생 품질이 동시에 망가진다.

---

## 1. 버킷 · 키 규칙

| 버킷 | 공개 | 내용 | 라이프사이클 |
|---|---|---|---|
| `aidream-originals` | **비공개** | 업로드 원본 | 90일 후 콜드 → 1년 후 삭제 검토 |
| `aidream-hls` | 공개 (CDN 오리진) | HLS 플레이리스트 + 세그먼트 | 영구 (에피소드 삭제 시 함께 삭제) |
| `aidream-thumbs` | 공개 (CDN 오리진) | 썸네일 · 포스터 · 아바타 | 영구 |

### 키 구조 (변경 금지)

```
originals/{userId}/{uploadSessionId}/{원본파일명}

hls/{assetId}/master.m3u8
hls/{assetId}/1080p/index.m3u8
hls/{assetId}/1080p/seg_00001.ts
hls/{assetId}/720p/index.m3u8
hls/{assetId}/720p/seg_00001.ts
...

thumbs/{assetId}/thumb.jpg          에피소드 카드용 (16:9, 1280x720)
thumbs/{assetId}/thumb.webp
thumbs/{assetId}/poster.jpg         시리즈 포스터용 (2:3, 800x1200)
thumbs/{assetId}/sprite.jpg         시크바 프리뷰 스프라이트
thumbs/{assetId}/sprite.vtt
thumbs/avatars/{userId}.webp
thumbs/posters/series/{seriesId}.webp
```

### 불변성 철칙

**같은 키에 다른 내용을 쓰지 않는다.**
재트랜스코드는 **새 `assetId`** 를 만들고, 에피소드가 새 자산을 가리키게 한다.
이유:

1. CDN 무효화가 아예 필요 없어진다 (`immutable` 캐시 헤더 사용 가능)
2. 재생 중인 사용자가 깨지지 않는다
3. 롤백이 자산 포인터 변경 한 줄이다

구 자산은 `storage.cleanup` 잡이 7일 후 삭제한다.

## 2. 업로드 (T05)

### 파트 크기 결정 규칙 (순수 함수)

```ts
// packages/core/src/rules/upload-policy.ts
const MIN_PART = 5  * 1024 * 1024        // S3 규격 최소
const DEF_PART = 32 * 1024 * 1024
const MAX_PARTS = 10_000                 // S3 규격 최대

export function decidePartSize(fileSize: number): { partSize: number; totalParts: number } {
  let partSize = DEF_PART
  while (Math.ceil(fileSize / partSize) > MAX_PARTS) partSize *= 2
  if (partSize < MIN_PART) partSize = MIN_PART
  return { partSize, totalParts: Math.ceil(fileSize / partSize) }
}
```

### 검증 순서 (실패는 빠르게)

```
1. 권한       : role 이 CREATOR 이상인가?                    → E_PERM_DENIED
2. 레이트리밋 : capacity.uploadHourlyCount 이내인가?          → E_RATE_LIMITED
3. 일일총량   : capacity.uploadDailyBytes 이내인가?           → E_UPLOAD_QUOTA_EXCEEDED
4. 용량       : LIMITS.UPLOAD_MIN_BYTES ~ capacity.uploadMaxBytes → E_UPLOAD_TOO_LARGE
5. MIME       : 허용 목록인가?                               → E_UPLOAD_UNSUPPORTED_TYPE
6. 확장자     : MIME 과 일치하는가?                           → E_UPLOAD_UNSUPPORTED_TYPE
```

**모든 상한은 `capacity` 객체에서 읽는다.** 리터럴 금지 —
T0→T1 승급 시 코드가 바뀌면 안 된다.

**주의**: 클라이언트가 보낸 MIME/크기는 **신고값**이다. 진짜 검증은 트랜스코드 전
ffprobe 에서 한다(§4). 업로드 단계 검증은 명백한 낭비를 막기 위한 1차 필터일 뿐이다.

### 서명 URL 정책

| 항목 | 값 |
|---|---|
| 파트 PUT URL 유효기간 | 6시간 |
| 최초 발급 파트 수 | 최대 100개 (그 이상은 `/parts` 로 추가 발급) |
| 세션 TTL | 24시간 |
| 만료 세션 정리 | `storage.cleanup` 잡이 AbortMultipartUpload 호출 |

**중요**: 미완료 멀티파트 업로드는 **스토리지 비용을 계속 발생시킨다.**
`upload_session(status, expiresAt)` 인덱스로 매시간 스캔하여 반드시 abort 한다.
이걸 빼먹으면 몇 달 뒤 원인 불명의 요금이 쌓인다.

## 3. 렌디션 래더 (트랜스코드 프리셋)

**원칙 2개**

1. **원본보다 큰 해상도를 만들지 않는다** (업스케일 금지 — 용량만 늘고 화질 이득 0)
2. **현재 티어가 허용한 렌디션만 만든다** (`11_CAPACITY_TIERS.md` §3 `ladder`)

| 이름 | 해상도(가로 기준) | 비디오 비트레이트 | 오디오 | 생성 조건 | T0 | T1/T2 |
|---|---|---|---|---|---|---|
| `1080p` | 1920×1080 | 5000 kbps | AAC 128k | 원본 긴 변 ≥ 1920 | ✗ | ○ |
| `720p` | 1280×720 | 2800 kbps | AAC 128k | 원본 긴 변 ≥ 1280 | ○ | ○ |
| `480p` | 854×480 | 1400 kbps | AAC 96k | 원본 긴 변 ≥ 854 | ✗ | ○ |
| `360p` | 640×360 | 800 kbps | AAC 96k | 항상 (최저 보장) | ○ | ○ |

**최종 래더 = (티어 허용 목록) ∩ (원본 크기가 허용하는 목록)**

T0 에서 2단으로 줄이는 것은 비용 절약이 아니라 **OOM 방지**다.
1080p 4단 래더의 ffmpeg 는 800MB 를 쓰고, 2GB RAM 노드에서는 죽는다.
(`11_CAPACITY_TIERS.md` §7 RAM 계산)

### 세로 영상 처리

세로 영상(높이 > 너비)은 **긴 변을 기준**으로 맞춘다.
가로 고정 스케일을 쓰면 세로가 규격을 벗어난다.

```ts
// packages/core/src/rules/... → packages/media/src/ladder.ts
// 판정: 긴 변(max(w,h)) 이 목표 해상도의 긴 변 이상일 때만 해당 렌디션 생성
// 스케일: 종횡비 조건부. 짝수 보정(-2) 필수 (H.264 는 홀수 크기 불가)
export function buildLadder(w: number, h: number): Rendition[]
```

ffmpeg 스케일 표현식 (가로/세로 자동 판정):

```
-vf scale='if(gte(iw,ih),min(1280,iw),-2)':'if(gte(iw,ih),-2,min(1280,ih))'
```

`packages/media/src/ffmpeg-args.ts` 는 **순수 함수**로 인자 배열을 만들고,
`tests/` 에 스냅샷 테스트를 둔다. → ffmpeg 인자 실수를 테스트가 잡는다.

## 4. 트랜스코드 잡 (T06)

### 단계별 동작

```
[0] 멱등성 검사
    asset.status !== 'PENDING' → 즉시 성공 처리하고 종료 (중복 잡 무해화)

[1] 임시 작업공간 생성
    {TMP_DIR}/{assetId}/  — try/finally 로 삭제 보장 (실패해도 반드시 삭제)
    사전 확인: 디스크 여유 > 원본크기 × 3  → 부족하면 E_MEDIA_DISK_FULL

[2] 원본 다운로드
    originals/... → 로컬. 스트리밍 다운로드 (메모리에 전체 적재 금지)

[3] status = PROBING → ffprobe
    검증:
      비디오 스트림 없음        → E_MEDIA_NO_VIDEO_STREAM
      오디오 스트림 없음        → E_MEDIA_NO_AUDIO_STREAM
      코덱 미허용              → E_MEDIA_UNSUPPORTED_CODEC
      긴 변 < 640 또는 짧은 변 < 360 → E_MEDIA_RESOLUTION_TOO_LOW
      길이 > capacity.videoMaxDurationSec → E_MEDIA_DURATION_TOO_LONG  (T0: 1200초)
      probe 자체 실패           → E_MEDIA_PROBE_FAILED
    ※ 위 5개는 모두 재시도 무의미(✗). 즉시 FAILED 로 확정하고 크리에이터에게 알림.

[4] status = TRANSCODING → ffmpeg 1회 실행
    ★ 렌디션마다 프로세스를 띄우지 않는다. 단일 ffmpeg 호출로 전체 래더 생성.
      (원본 디코딩을 1번만 하므로 CPU 시간이 렌디션 수만큼 절약됨)
    타임아웃: 영상 길이 × 4  (최소 10분)  → 초과 시 E_MEDIA_TRANSCODE_TIMEOUT
    진행률: stderr 의 out_time 파싱 → 5% 단위로 Redis 갱신 (TTL 24h)

[5] 썸네일 · 포스터 · 스프라이트
    thumb  : 길이의 10% 지점 프레임 → 1280x720 (letterbox 없이 crop)
    poster : 사용자가 업로드했으면 그것, 없으면 thumb 를 2:3 crop
    sprite : 10초 간격 프레임 → 타일 이미지 + VTT (시크바 프리뷰)

[6] Object Storage 업로드
    hls/{assetId}/**    Cache-Control: public, max-age=31536000, immutable
    thumbs/{assetId}/** Cache-Control: public, max-age=31536000, immutable
    m3u8 Content-Type   : application/vnd.apple.mpegurl
    ts   Content-Type   : video/mp2t
    ★ 업로드 순서: 세그먼트 전부 → 각 렌디션 index.m3u8 → 마지막에 master.m3u8
      (master 가 먼저 올라가면 아직 없는 세그먼트를 플레이어가 요청해 404 가 난다)

[7] DB 확정 (단일 트랜잭션)
    Rendition 행 삽입 · VideoAsset 갱신(status=READY, 메타데이터, readyAt)

[8] 후속
    크리에이터에게 TRANSCODE_DONE 알림
    임시 디렉터리 삭제 (finally 에서)
```

### ffmpeg 명령 형태 (단일 호출 다중 출력)

```
ffmpeg -hide_banner -nostdin -y -progress pipe:2 \
  -i input.mp4 \
  -filter_complex "[0:v]split=3[v1][v2][v3]; \
     [v1]scale=...:...[v1out];[v2]scale=...:...[v2out];[v3]scale=...:...[v3out]" \
  -map "[v1out]" -c:v:0 libx264 -b:v:0 2800k -maxrate:v:0 3080k -bufsize:v:0 5600k \
  -map "[v2out]" -c:v:1 libx264 -b:v:1 1400k -maxrate:v:1 1540k -bufsize:v:1 2800k \
  -map "[v3out]" -c:v:2 libx264 -b:v:2  800k -maxrate:v:2  880k -bufsize:v:2 1600k \
  -map a:0 -map a:0 -map a:0 -c:a aac -b:a 128k -ac 2 \
  -preset veryfast -profile:v main -level 4.0 -pix_fmt yuv420p \
  -g 48 -keyint_min 48 -sc_threshold 0 \
  -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_type mpegts \
  -hls_flags independent_segments \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0,name:720p v:1,a:1,name:480p v:2,a:2,name:360p" \
  -hls_segment_filename "out/%v/seg_%05d.ts" \
  "out/%v/index.m3u8"
```

| 옵션 | 이유 (임의 변경 금지) |
|---|---|
| `-g 48 -keyint_min 48 -sc_threshold 0` | 모든 렌디션의 키프레임 위치를 동일하게 → 화질 전환 시 끊김 없음 |
| `-hls_time 6` | 6초 세그먼트. 시작 지연과 요청 수의 균형점 |
| `independent_segments` | 세그먼트 단위 독립 디코딩 → 탐색/전환 안정 |
| `-preset veryfast` | CPU 트랜스코드. medium 은 3배 느리고 용량 이득은 10% 미만 |
| `-pix_fmt yuv420p` | 브라우저 호환 필수 (yuv444/10bit 는 재생 실패) |
| `-ac 2` | 5.1 채널 원본을 스테레오로 강제 (모바일 재생 문제 방지) |
| `-nostdin` | 워커에서 stdin 대기로 멈추는 것 방지 |

### 재시도 정책

| 시도 | 대기 | 조건 |
|---|---|---|
| 1차 실패 | 30초 | 재시도 가능(○) 코드만 |
| 2차 실패 | 2분 | 동일 |
| 3차 실패 | — | DLQ 이동 + 알럿 + `status=FAILED` + 크리에이터 알림 |

`attemptCount` 는 `VideoAsset` 에 저장한다 (BullMQ 내부 카운터만 믿지 않는다 —
Redis 가 날아가도 이력이 남아야 한다).

**재시도 무의미(✗) 코드는 1회에 즉시 FAILED 확정.** 손상 파일을 3번 돌리는 건 낭비다.

## 5. 재생 (T07)

### 플레이어 규칙

| 항목 | 규칙 |
|---|---|
| Safari (iOS/macOS) | `<video src="master.m3u8">` 네이티브 HLS 사용 (hls.js 미사용) |
| 그 외 브라우저 | hls.js + MSE |
| 초기 화질 | `startLevel: -1` (hls.js 자동 추정) |
| 화질 전환 | 자동(ABR) 기본 + 수동 선택 제공 |
| 이어보기 | `startAtSec` 이 있고 `duration - startAt > 30` 일 때만 적용 |
| 진행률 저장 | 15초 간격 + 일시정지/이탈 시 (`navigator.sendBeacon`) |
| 조회수 | 누적 30초 시청 시 1회. 중복 방지 키 `view:{episodeId}:{userId|ip}:{YYYYMMDD}` (TTL 24h) |
| 자동재생 | 음소거 상태에서만 (브라우저 정책) |

### CDN URL 조립 — 단일 지점

```ts
// packages/storage/src/cdn.ts — 오직 이 파일에서만 CDN URL 을 만든다
export function cdnUrl(key: string): string
export function masterUrl(assetId: string): string   // {CDN}/hls/{assetId}/master.m3u8
export function thumbUrl(assetId: string): string
```

앱 코드에서 문자열로 CDN 도메인을 이어붙이는 것은 **린트로 금지** 한다.
(CDN 도메인 교체 시 한 파일만 고치면 되게 하려는 목적)

## 6. 저장 용량 추정 (비용 가드레일)

30분 에피소드 1개 기준:

| 항목 | 용량 |
|---|---|
| 원본 (1080p, 8Mbps) | ~1.8 GB |
| 1080p HLS | ~1.1 GB |
| 720p HLS | ~0.63 GB |
| 480p HLS | ~0.32 GB |
| 360p HLS | ~0.18 GB |
| 썸네일 등 | ~2 MB |
| **에피소드당 합계 (T1, 4단)** | **~4.0 GB** (원본 포함) / **~2.2 GB** (HLS만) |

**T0 기준 (20분, 720p+360p 2단)**

| 항목 | 용량 |
|---|---|
| 원본 (최대 2GB 상한) | ~1.0 GB (실측 평균) |
| 720p HLS (20분, 2.8Mbps) | ~0.42 GB |
| 360p HLS (20분, 0.8Mbps) | ~0.12 GB |
| **에피소드당 합계** | **~1.5 GB** (원본 포함) / **~0.54 GB** (HLS만) |

T0 에서 에피소드 100편 ≈ 150 GB (Object Storage). 로컬 디스크와 무관하다 —
미디어는 전부 Object Storage 에 있고, VPS 50GB 는 임시 작업공간에만 쓰인다.

| 규모 | 총 용량 | 판단 |
|---|---|---|
| 에피소드 100개 | ~400 GB | 초기. 문제없음 |
| 에피소드 1,000개 | ~4 TB | 원본 콜드 이전 검토 시점 |
| 에피소드 10,000개 | ~40 TB | 원본 삭제 정책 필수, 1080p 조건부 생성 검토 |

**비용 트리거**: 총 저장량이 5TB 를 넘으면 `_ISSUES.md` 에 자동 알림.
(90일 초과 원본을 삭제하는 정책 도입 판단 시점)

## 7. 트랜스코드 처리량 추정 (워커 사이징)

`veryfast` 프리셋, 단일 ffmpeg 다중 출력 기준:

| 티어 | 코어 | 래더 | 처리 시간 |
|---|---|---|---|
| **T0 (현재)** | 1 vCPU (`cpus 0.7`) | 720p+360p | **20분 영상 ≈ 20~35분** |
| T1 | 4 vCPU | 1080p 4단 | 30분 영상 ≈ 12~18분 |
| T1 | 4 vCPU | 720p 3단 | 30분 영상 ≈ 7~10분 |

| 동시성 | 근거 |
|---|---|
| `workerConcurrency` = 티어 프로필 값 | ffmpeg 자체가 멀티스레드. 과도한 동시성은 오히려 느려짐 |
| T0 → **1** | 2건 동시 인코딩은 RAM·디스크·CPU 를 동시에 고갈시킨다 |
| T1 → 2 | 4 vCPU 기준 |

**T0 에서 큐 대기가 30분을 넘는 일이 주 3회 이상이면** 티어를 올린다.
(워커 컨테이너를 늘리는 것은 T0 에서 효과가 없다 — 코어가 하나다)
승급 판단: `11_CAPACITY_TIERS.md` §5
