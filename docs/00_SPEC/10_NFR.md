# 10 — 비기능 요구 (성능 · 한도 · SLO · 비용)

> 상태: **불변 계약**. CODEX 수정 금지.
> 여기 숫자는 **테스트와 알럿의 근거**다. 감이 아니라 측정으로 판정한다.

---

## 1. 성능 목표

| 지표 | 목표 | 측정 방법 |
|---|---|---|
| 피드 첫 화면 LCP | ≤ 2.5s (모바일 4G) | Lighthouse CI, 실측 RUM |
| 피드 API p95 | ≤ 300ms | `/api/metrics` 히스토그램 |
| 재생 시작 시간 (TTFF) | ≤ 2.0s | 플레이어 계측 → 이벤트 전송 |
| 상세 페이지 TTFB | ≤ 500ms | Caddy 로그 |
| 인증 API p95 | ≤ 400ms (argon2 포함) | 메트릭 |
| 업로드 API p95 | ≤ 500ms (서명 발급만) | 메트릭 |
| CLS | ≤ 0.05 | Lighthouse CI |
| INP | ≤ 200ms | RUM |

**게이트 연동**: Lighthouse CI 를 CI 에 넣고 LCP/CLS 예산 초과 시 실패시킨다.
성능은 나중에 고치는 것이 가장 비싸므로 **처음부터 하네스에 넣는다.**

## 2. 처리량 목표 (티어별)

| 항목 | **T0 (현재)** | T1 | T2 |
|---|---|---|---|
| 동시 접속 | **50명** | 500명 | 2,000명 |
| 피드 요청 | **10 req/s** | 50 req/s | 200 req/s |
| 동시 재생 스트림 | **50** (대부분 CDN 흡수) | 200 | 1,000 |
| 트랜스코드 동시 처리 | **1** | 2 | 2×노드 |
| 일일 업로드 | **10~15편** | 60~100편 | 노드 비례 |
| DB 커넥션 풀 (web/worker) | **6 / 3** | 10 / 5 | 10 / 5 |

§1 성능 목표는 **인코딩이 돌지 않는 상태 기준**이다.
T0 에서 인코딩 중에는 p95 가 목표를 초과할 수 있다 —
이를 완화하기 위해 워커에 `cpus 0.7` 상한을 둔다 (`11_CAPACITY_TIERS.md` §4).

## 3. SLO 및 알럿 임계값

| SLO | 목표 | 경고 | 심각 |
|---|---|---|---|
| API 가용성 (5xx 비율) | 99.5% | 1% / 5분 | 5% / 5분 |
| `/api/ready` 성공률 | 99.9% | 1회 실패 | 3회 연속 실패 |
| 트랜스코드 성공률 | ≥ 97% | < 95% / 1시간 | < 90% / 1시간 |
| 트랜스코드 큐 대기 | ≤ 5분 | > 10분 | > 30분 |
| DLQ 적재 | 0 | ≥ 1 | ≥ 10 |
| DB 커넥션 사용률 | ≤ 70% | > 80% | > 95% |
| 디스크 사용률 (워커 임시) | ≤ 60% | > 75% | > 90% |
| Redis 메모리 | ≤ 60% | > 80% | > 95% |
| 백업 성공 | 매일 | 1일 누락 | 2일 누락 |

알럿 전달·대응 절차: `20_OPS/O05_INCIDENT.md`

## 4. 한도 (하드 리밋 — 코드에 상수로 존재)

> **여기에는 서버 사양과 무관한 제품 불변 숫자만 둔다.**
> 업로드 상한·영상 길이·래더·워커 동시성처럼 **사양에 따라 바뀌는 값은
> `11_CAPACITY_TIERS.md` §3** 에 있다. 두 곳에 같은 값을 두지 않는다.

```ts
// packages/core/src/limits.ts — 제품 불변 한도 (서버 사양과 무관)
export const LIMITS = {
  UPLOAD_MIN_BYTES:        1024,
  UPLOAD_SESSION_TTL_H:    24,
  PART_URL_TTL_H:          6,
  PART_SIZE_DEFAULT:       32 * 1024 ** 2,
  PART_SIZE_MIN:           5 * 1024 ** 2,   // S3 규격
  PART_COUNT_MAX:          10_000,          // S3 규격

  VIDEO_MIN_LONG_EDGE:     640,
  VIDEO_MIN_SHORT_EDGE:    360,
  TRANSCODE_MAX_ATTEMPTS:  3,
  TRANSCODE_TIMEOUT_MULT:  4,               // 영상길이 × 4
  TRANSCODE_TIMEOUT_MIN_S: 600,

  SERIES_PER_USER:         200,
  EPISODES_PER_SERIES:     500,
  TAGS_PER_EPISODE:        10,

  COMMENT_MAX_LEN:         1000,
  COMMENT_MAX_DEPTH:       1,
  COMMENT_EDIT_WINDOW_MIN: 15,
  BIO_MAX_LEN:             500,
  SYNOPSIS_MAX_LEN:        2000,

  FEED_PAGE_DEFAULT:       20,
  FEED_PAGE_MAX:           50,

  PROGRESS_MIN_INTERVAL_S: 15,
  VIEW_COUNT_MIN_WATCH_S:  30,

  REPORT_DAILY_COUNT:      20,
  COMMENT_PER_10MIN:       30,

  SOFT_DELETE_PURGE_DAYS:  90,
  ORPHAN_ASSET_PURGE_DAYS: 7,
  FAILED_ASSET_PURGE_DAYS: 30,
} as const
```

### 사양 의존 값은 여기에 없다 (`11_CAPACITY_TIERS.md` 로 이동)

`uploadMaxBytes` · `uploadDailyBytes` · `uploadHourlyCount` ·
`videoMaxDurationSec` · `ladder` · `workerConcurrency` · `tmpDirMaxBytes` ·
`feedCacheTtlSec`

**철칙**: 이 숫자를 코드 곳곳에 리터럴로 쓰지 않는다.
불변 한도는 `LIMITS`, 사양 의존 값은 `Capacity` 객체를 import 한다.
문서와 코드가 어긋나면 `contract:limits` / `contract:capacity` 게이트가 실패한다.

## 5. 데이터 보존 정책

| 데이터 | 보존 | 근거 |
|---|---|---|
| 원본 영상 | 90일 후 콜드 이전, 1년 후 삭제 검토 | 재트랜스코드 대비 vs 비용 |
| HLS / 썸네일 | 에피소드 존재 기간 | |
| 소프트 삭제 행 | 90일 후 물리 삭제 | 복구 요청 대응 여유 |
| 고아 자산 (에피소드 미연결) | 7일 후 삭제 | 업로드 후 방치된 것 |
| 애플리케이션 로그 | 30일 (로테이션) | 디스크 |
| 접근 로그 (Caddy) | 14일 | 디스크 |
| DB 백업 | 일간 30일 + 월간 12개월 | |
| 세션 | 만료 후 7일 뒤 삭제 | |
| 알림 | 90일 | |
| 시청 기록 | 무기한 (사용자 삭제 요청 시 삭제) | 이어보기 기능 |

## 6. 확장 트리거 (숫자로 판단)

| 신호 | 임계 | 조치 |
|---|---|---|
| 트랜스코드 큐 대기 | > 10분 (1시간 지속) | `WORKER_CONCURRENCY` 증가 → 부족하면 워커 노드 추가 |
| web CPU | > 60% (10분 지속) | web 컨테이너 복제 + Caddy LB |
| DB CPU | > 70% (10분 지속) | 인덱스 재검토 → 읽기 복제본 |
| DB 크기 | > 50 GB | 파티셔닝 검토 (`watch_progress`, `notification` 우선) |
| Object Storage | > 5 TB | 원본 보존 정책 강화 |
| CDN 오리진 히트율 | 캐시 히트 < 90% | 캐시 헤더 점검 |
| p95 응답 | 목표의 2배 | 프로파일링 후 조치 |

## 7. 비용 가드레일 (월 기준, 초기)

| 항목 | 예상 |
|---|---|
| VPS — **현재 T0**: 1vCPU/2GB/50GB | 1대 (dreamcinema) |
| VPS — T1 승급 시 4vCPU/8GB | 1대 (리사이즈) |
| VPS — T2 워커 노드 | +1대 |
| Object Storage | 사용량 (에피소드 100편 ≈ 400GB) |
| CDN 전송 | 트래픽 비례 — **가장 변동이 큰 항목** |

**경보 규칙**: 월 CDN 전송량이 전월의 3배를 넘으면 즉시 확인한다.
어뷰징(핫링킹, 스크래핑)일 가능성이 크다.
→ Akamai 에서 Referer 기반 차단 규칙을 준비해 둔다 (`infra/akamai/cache-rules.md`).

## 8. 테스트 커버리지 기준 (게이트)

| 대상 | 최소 커버리지 | 이유 |
|---|---|---|
| `packages/core` | **90%** | 순수 함수. 안 될 이유가 없다. |
| `packages/media` (인자 조립) | 85% | ffmpeg 실수가 가장 비싸다 |
| `packages/db` 리포지토리 | 70% | testcontainers 통합 |
| `packages/storage` | 70% | MinIO 통합 |
| `packages/queue` | 70% | |
| `apps/web/src/http` | 85% | `withRoute` 는 모든 라우트의 기반 |
| `apps/web/src/services` | 75% | 유스케이스 |
| `apps/worker/src/jobs` | 70% | |
| `apps/web/app` (라우트) | — | E2E 로 대체 |
| 컴포넌트 | — | 주요 상태만 선별 |
| **전체** | **70%** | |

커버리지 미달 시 `pnpm gate:test` 실패. 상세: `20_OPS/O06_TESTING_QA.md`

## 9. 브라우저 지원

| 브라우저 | 최소 버전 | 재생 방식 |
|---|---|---|
| Chrome / Edge | 최신 2개 버전 | hls.js |
| Safari (macOS) | 16+ | 네이티브 HLS |
| Safari (iOS) | 16+ | 네이티브 HLS |
| Firefox | 최신 2개 버전 | hls.js |
| Samsung Internet | 최신 2개 | hls.js |
| IE | **미지원** | — |

## 10. 접근성 기준

| 항목 | 기준 |
|---|---|
| 준수 목표 | WCAG 2.1 AA |
| 색 대비 | 본문 4.5:1, 큰 텍스트 3:1 |
| 키보드 | 모든 기능 키보드 조작 가능 (플레이어 포함) |
| 포커스 | 가시적 포커스 링 제거 금지 |
| 대체 텍스트 | 모든 이미지. 장식 이미지는 `alt=""` |
| 폼 | 모든 입력에 연결된 `<label>` |
| 동작 감소 | `prefers-reduced-motion` 존중 |
| 자동재생 | 음소거 + 사용자가 끌 수 있음 |

CI 에서 `axe-core` 로 주요 화면 5개(홈/시리즈/재생/로그인/업로드)를 검사한다.
위반 발견 시 실패.
