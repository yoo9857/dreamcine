# 01 — 시스템 아키텍처

> 상태: **불변 계약**. CODEX 수정 금지.

---

## 1. 배치도 (Akamai / Linode)

```
                          ┌─────────────────────────────┐
        시청자 / 크리에이터 │      Akamai CDN (엣지)       │
              │            │  - /hls/**    장기 캐시       │
              │            │  - /thumbs/** 장기 캐시       │
              └───────────▶│  - /_next/static/** 캐시     │
                           │  - /api/** 캐시 금지          │
                           └──────┬──────────┬────────────┘
                                  │          │
                    (동적 요청)     │          │  (미디어 세그먼트)
                                  ▼          ▼
                 ┌────────────────────┐   ┌──────────────────────────┐
                 │  Linode VPS #1     │   │ Linode Object Storage    │
                 │  ── node-app ──    │   │  (S3 호환)               │
                 │  caddy   :443      │   │  aidream-originals  (비공개)│
                 │  web(next) :3000   │   │  aidream-hls        (공개-CDN)│
                 │  api routes        │   │  aidream-thumbs     (공개-CDN)│
                 │  postgres  :5432   │   └──────────────────────────┘
                 │  redis     :6379   │              ▲
                 └─────────┬──────────┘              │
                           │ 프라이빗 네트워크         │ 업/다운로드
                           ▼                         │
                 ┌────────────────────┐              │
                 │  Linode VPS #2     │──────────────┘
                 │  ── node-worker ── │
                 │  worker × N        │
                 │  ffmpeg            │
                 └────────────────────┘
```

### 현재 실제 구성 (티어 T0)

```
dreamcinema  (Linode, jp-osa / 오사카)
  1 vCPU / 2 GB RAM / 50 GB SSD
  단일 노드에 caddy + web + worker + scheduler + postgres + redis 전부
  방화벽: web-basic-firewall  (인바운드 22/80/443 만)
```

**T0 은 위 배치도의 VPS #1 과 #2 를 한 노드에 합친 형태다.**
단 **worker 는 반드시 별도 컨테이너**로 둔다 — 나중에 노드를 분리할 때
코드 변경이 0이 되게 하려는 것이다. (T01 참조)

| 노드 | 티어별 사양 | 승급 신호 |
|---|---|---|
| node-app | T0 1vCPU·2GB → T1 4vCPU·8GB | swap 상시 사용, OOM 1회, p95 > 1s |
| node-worker | T0 없음(합침) → T2 4vCPU·8GB | 큐 대기 > 10분 지속 |
| Object Storage | 사용량 과금. **jp-osa 리전 사용** (교차 리전 전송비 회피) | — |

**사양 의존 숫자(업로드 상한·래더·동시성)는 이 문서에 적지 않는다.**
전부 `11_CAPACITY_TIERS.md` §3 프로필 표에만 있다.

## 2. 프로세스 구성 (컨테이너 단위)

| 컨테이너 | 역할 | 재시작 정책 | 스케일 | T0 자원 제한 |
|---|---|---|---|---|
| `caddy` | TLS 종료, 리버스 프록시, 정적 캐시 헤더 | always | 1 | — |
| `web` | Next.js 15 (SSR + Route Handler = API) | always | 1~N | `mem_limit 700m` |
| `worker` | BullMQ 컨슈머 + ffmpeg | always | 1~N (핵심 확장 지점) | **`cpus 0.7` / `mem_limit 700m`** |
| `scheduler` | 반복 작업(공개예약, 랭킹 재계산, 정리) | always | **정확히 1** | `mem_limit 200m` |
| `postgres` | 주 데이터베이스 | always | 1 | `shared_buffers 128MB` |
| `redis` | 큐 + 캐시 + 레이트리밋 카운터 | always | 1 | `maxmemory 96mb` |
| `minio` | **로컬 개발 전용** S3 호환 스토리지 | 개발만 | 1 | — |

T0 의 자원 제한 근거와 전체 목록: `11_CAPACITY_TIERS.md` §4.
**워커에 CPU 상한을 두는 것이 T0 의 핵심**이다 — ffmpeg 가 단일 코어를
전부 먹으면 웹이 응답하지 못한다.

**`scheduler` 는 반드시 1개.** 2개 이상 뜨면 공개예약이 중복 실행된다.
잠금은 Redis `SET NX EX` 기반 리더 락으로 이중 방어한다. (T08)

## 3. 요청 흐름 3가지

### 3-1. 업로드 (T05)

```
브라우저                    web(Next.js)              Object Storage        Redis/큐
   │                            │                          │                  │
   │─ POST /api/uploads ───────▶│                          │                  │
   │   (파일명,크기,mime)         │─ 검증(형식/용량/권한)      │                  │
   │                            │─ UploadSession INSERT     │                  │
   │◀── uploadId + partUrls[] ──│─ 파트별 서명 PUT URL 발급 ─▶│                  │
   │                            │                          │                  │
   │═══ PUT part 1..N ═════════════════════════════════════▶│  (서버 경유 안 함) │
   │                            │                          │                  │
   │─ POST /api/uploads/:id/complete ▶                     │                  │
   │                            │─ CompleteMultipartUpload ▶│                  │
   │                            │─ VideoAsset INSERT(PENDING)                  │
   │◀── 202 Accepted ───────────│─ enqueue video.transcode ───────────────────▶│
```

**핵심**: 원본 파일 바이트는 **절대 앱 서버를 통과하지 않는다.**
브라우저 → Object Storage 직행. 서버는 서명 URL만 발급한다.

### 3-2. 트랜스코드 (T06)

```
worker
  │─ BRPOP video.transcode
  │─ 멱등성 검사: VideoAsset.status 가 PENDING 인가? (아니면 즉시 ack, 스킵)
  │─ status = PROBING     → ffprobe (해상도/길이/코덱/비트레이트)
  │─ 정책 검증 실패 → status=FAILED + 에러코드 저장 + 크리에이터 알림
  │─ status = TRANSCODING → ffmpeg (원본 해상도 이하의 래더만)
  │      ├─ 1080p / 720p / 480p / 360p  (06_MEDIA_PIPELINE.md §3)
  │      ├─ master.m3u8 생성
  │      └─ 진행률 5% 단위로 Redis 갱신 (UI 폴링용)
  │─ 썸네일 추출 (10% 지점) + 포스터 (사용자 지정 또는 자동)
  │─ Object Storage 업로드 (hls/{assetId}/…, thumbs/{assetId}/…)
  │─ status = READY, duration/width/height 확정
  │─ 크리에이터 알림 + Episode 를 공개 가능 상태로
  └─ 실패 시: 지수 백오프 3회 → DLQ + 알럿  (O02_EXCEPTION_POLICY.md)
```

### 3-3. 재생 (T07)

```
브라우저 ─ GET /api/episodes/:id/playback ─▶ web
                                            │─ 권한/공개상태/연령등급 확인
                                            │─ WatchProgress 조회
             ◀── { masterUrl, startAt } ────│
브라우저 ─ GET {CDN}/hls/{assetId}/master.m3u8 ─▶ Akamai CDN ──(miss)──▶ Object Storage
브라우저 ─ GET {CDN}/hls/{assetId}/720p/seg_0001.ts ─▶ (대부분 엣지 캐시 히트)

재생 중 15초마다: POST /api/episodes/:id/progress  (좌표 저장, 배치 처리)
30초 이상 시청 시 1회: 조회수 카운트 (중복 방지 키: userId+episodeId+일자)
```

## 4. 계층 구조 (코드 아키텍처)

```
┌────────────────────────────────────────────────────────────┐
│ 표현 계층   apps/web/app/**                                  │
│            Server Component / Client Component / Route      │
│            책임: 입력 파싱(zod), 인증 확인, 서비스 호출, 직렬화  │
│            금지: 비즈니스 규칙, SQL, ffmpeg                   │
├────────────────────────────────────────────────────────────┤
│ 서비스 계층 apps/web/src/services/**  ·  apps/worker/src/**   │
│            책임: 유스케이스 조립, 트랜잭션 경계, 큐 발행        │
│            금지: HTTP/Request 객체 의존, React 의존           │
├────────────────────────────────────────────────────────────┤
│ 도메인 계층 packages/core/**                                 │
│            책임: 엔티티 규칙, 상태기계, 순수 계산(랭킹 점수),   │
│                  zod 스키마, 에러 정의                        │
│            금지: 모든 외부 의존 (Prisma/React/Next/fs/네트워크) │
├────────────────────────────────────────────────────────────┤
│ 인프라 계층 packages/db · packages/storage · packages/media   │
│            · packages/queue                                  │
│            책임: Prisma, S3 SDK, ffmpeg, BullMQ 실제 호출     │
│            규칙: 도메인이 정의한 인터페이스를 구현한다           │
└────────────────────────────────────────────────────────────┘
```

**의존 방향은 위 → 아래만.** 역방향은 `depcruise` 가 차단한다. (`HARNESS.md` §4)

## 5. 데이터 저장 위치 결정표

| 데이터 | 저장소 | 이유 |
|---|---|---|
| 사용자/시리즈/에피소드/댓글 | Postgres | 관계·트랜잭션 필요 |
| 세션 | Postgres (Auth.js DB 세션) | 강제 로그아웃·기기 관리 |
| 원본 영상 | Object Storage `aidream-originals` (비공개) | 대용량, 재트랜스코드용 보존 |
| HLS 세그먼트/플레이리스트 | Object Storage `aidream-hls` (CDN 공개) | 엣지 캐시 대상 |
| 썸네일/포스터 | Object Storage `aidream-thumbs` (CDN 공개) | 엣지 캐시 대상 |
| 큐 잡 | Redis (BullMQ) | 저지연 |
| 트랜스코드 진행률 | Redis (TTL 24h) | 휘발성, 고빈도 갱신 |
| 레이트리밋 카운터 | Redis (TTL) | 휘발성 |
| 피드 랭킹 캐시 | Redis (TTL 60s) | 재계산 가능 |
| 조회수 증분 버퍼 | Redis → 1분마다 Postgres flush | 쓰기 폭주 흡수 |
| 로그 | 파일 (JSON lines) + 로테이션 | 외부 SaaS 미사용 |
| 메트릭 | Prometheus 텍스트 엔드포인트 | 자체 수집 |

## 6. 캐시 정책 (CDN)

| 경로 | Cache-Control | 무효화 방법 |
|---|---|---|
| `/hls/{assetId}/**` | `public, max-age=31536000, immutable` | assetId 가 불변이므로 무효화 불필요 |
| `/thumbs/{assetId}/**` | `public, max-age=31536000, immutable` | 동일 |
| `/_next/static/**` | `public, max-age=31536000, immutable` | 빌드 해시 |
| `/api/**` | `no-store` | — |
| 페이지(SSR) | `private, no-cache` | — |
| 공개 시리즈 페이지 | `public, s-maxage=60, stale-while-revalidate=300` | 태그 기반 재검증 |

**규칙**: 미디어 URL은 **절대 재사용하지 않는다.** 같은 assetId 아래 파일을
덮어쓰지 않고, 재트랜스코드는 새 `assetId` 를 만든다. → CDN 무효화가 아예 필요 없어진다.

## 7. 확장 시나리오 (지금 대비, 나중 실행)

| 신호 | 조치 | 코드 변경 |
|---|---|---|
| 큐 대기 > 10분 | worker 컨테이너 수 증가 → VPS #2 분리 | 없음 (환경변수만) |
| DB CPU > 70% | 읽기 복제본 추가, 피드는 복제본으로 | `packages/db` 에 read/write 분리 지점 사전 확보 |
| 트래픽 급증 | web 컨테이너 수평 확장 + Caddy 로드밸런싱 | 없음 (세션이 DB에 있어 무상태) |
| 스토리지 급증 | 원본을 콜드 스토리지로 이동 (90일 후) | 라이프사이클 규칙만 |
| 앱 출시 (Phase 2) | 같은 REST API 재사용 | `packages/api-client` 그대로 (T13) |

**사전 확보 규칙**: web 컨테이너는 **완전 무상태**여야 한다.
로컬 디스크에 아무것도 쓰지 않는다(임시 파일 포함). 임시 파일은 worker만 쓴다.
