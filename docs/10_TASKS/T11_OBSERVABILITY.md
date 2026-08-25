# T11 — 관측성: 로깅 · 메트릭 · 알럿 · 헬스체크

## 진행 상태
- [x] S1 Spec 확인 — 2026-08-25 / 산출물 35개 확정 / 기존 T03 로거·레디니스 확장
- [x] S2 Skeleton — 2026-08-25 / gate:s2 PASS / 마커 7개
- [ ] S3 구현

---

## 1. 목적

**장애를 사용자보다 먼저 안다.** 문제가 생겼을 때 로그 한 줄로 원인까지
따라갈 수 있게 만든다. 외부 SaaS 없이 자체 호스팅으로 완결한다.

> 관측성이 없는 서비스는 운영이 불가능하다. 이 태스크를 "나중에" 로 미루면
> 첫 장애에서 아무것도 못 한다.

## 2. 참조 스펙

- `../00_SPEC/10_NFR.md` §1 성능, §3 SLO/알럿 임계값
- `../00_SPEC/05_API_CONTRACT.md` §9 시스템 엔드포인트
- `../00_SPEC/07_AUTH_SECURITY.md` §9 시크릿 (로그 redact)
- `../00_SPEC/01_ARCHITECTURE.md` §5 (로그/메트릭 저장 위치)
- `../20_OPS/O05_INCIDENT.md` (알럿 대응)

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `apps/web/src/lib/logger.ts` | pino + redact (T03 에서 기본형 완료) | S3 |
| `apps/web/src/lib/request-context.ts` | AsyncLocalStorage (requestId 전파) | S2→S3 |
| `packages/core/src/observability/metrics.ts` | ★ 메트릭 정의 (중앙 레지스트리) | S2→S3 |
| `apps/web/src/lib/metrics-http.ts` | HTTP 메트릭 수집 (withRoute 연동) | S3 |
| `apps/web/app/api/metrics/route.ts` | Prometheus 텍스트 (내부망 제한) | S3 |
| `apps/web/app/api/health/route.ts` | 라이브니스 (T03 완료) | — |
| `apps/web/app/api/ready/route.ts` | 레디니스 (T03 완료, 확장) | S3 |
| `apps/worker/src/lib/logger.ts` | 워커 로거 (jobId 컨텍스트) | S3 |
| `apps/worker/src/lib/metrics-server.ts` | 워커 메트릭 HTTP 엔드포인트 | S3 |
| `apps/worker/src/lib/job-wrapper.ts` | ★ 잡 공통 래퍼 (로그+메트릭+에러) | S2→S3 |
| `infra/compose/monitoring.yml` | Prometheus + Alertmanager + Grafana | S3 |
| `infra/monitoring/prometheus.yml` | 스크레이프 설정 | S3 |
| `infra/monitoring/alerts.yml` | ★ 알럿 규칙 (10_NFR §3 표) | S3 |
| `infra/monitoring/alertmanager.yml` | 알림 전달 (이메일/웹훅) | S3 |
| `infra/monitoring/dashboards/*.json` | Grafana 대시보드 3개 | S3 |
| `scripts/ops/log-query.sh` | 로그 검색 헬퍼 (jq 기반) | S3 |

### S1 추가 산출물

기존 산출물만으로는 메트릭 계약, 접근 통제, 잡 래퍼, 인프라 설정을 자동 검증할 수
없으므로 아래 파일도 범위에 포함한다. 대시보드 3개는 각각 독립 JSON으로 관리한다.

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/core/src/observability/metrics.test.ts` | 메트릭 이름·라벨·라우트 정규화 계약 | S3 |
| `packages/core/src/index.ts` | 관측성 계약 export | S2 |
| `apps/web/package.json` | web 메트릭의 `prom-client` 런타임 의존성 | S2 |
| `apps/web/src/lib/logger.test.ts` | requestId 자동 바인딩·시크릿 redact | S3 |
| `apps/web/src/lib/metrics-http.test.ts` | HTTP 성공·실패·수집 장애 격리 | S3 |
| `apps/web/app/api/metrics/route.test.ts` | 내부망·토큰 접근 제어 | S3 |
| `apps/web/src/services/system/ready.test.ts` | DB·Redis·S3·큐 병렬 레디니스 | S3 |
| `apps/worker/src/lib/job-wrapper.test.ts` | 성공·실패·DLQ·메트릭 장애 격리 | S3 |
| `apps/worker/src/lib/metrics-server.test.ts` | 포트·응답·종료 검증 | S3 |
| `apps/worker/src/index.ts` | 모든 consumer를 `withJob`으로 등록 | S3 |
| `apps/worker/package.json` | 메트릭 런타임 의존성 | S2 |
| `infra/monitoring/dashboards/service-overview.json` | 서비스 개요 대시보드 | S3 |
| `infra/monitoring/dashboards/media-pipeline.json` | 미디어 파이프라인 대시보드 | S3 |
| `infra/monitoring/dashboards/infrastructure.json` | 인프라 대시보드 | S3 |
| `infra/monitoring/logrotate/aidream` | 일간·30일·압축 로그 로테이션 | S3 |
| `scripts/contract/check-observability.ts` | 알럿 runbook·대시보드·설정 계약 | S3 |
| `scripts/contract/check-observability.test.ts` | 관측성 계약 스크립트 단위 테스트 | S3 |
| `openapi.json` | `/metrics`와 확장 `/ready` 계약 | S3 |
| `.env.example` | 메트릭 토큰·포트 환경변수 문서화 | S3 |

## 4. S2 Skeleton

```ts
// packages/core/src/observability/metrics.ts
// ★ 모든 메트릭을 여기 한 곳에 정의한다. 흩어지면 이름 규칙이 깨진다.
export const METRICS = {
  HTTP_DURATION:      'aidream_http_request_duration_seconds',
  HTTP_TOTAL:         'aidream_http_requests_total',
  TRANSCODE_DURATION: 'aidream_transcode_duration_seconds',
  TRANSCODE_TOTAL:    'aidream_transcode_total',
  QUEUE_DEPTH:        'aidream_queue_depth',
  QUEUE_WAIT:         'aidream_queue_wait_seconds',
  QUEUE_DLQ:          'aidream_queue_dlq_total',
  UPLOAD_BYTES:       'aidream_upload_bytes_total',
  DB_QUERY_DURATION:  'aidream_db_query_duration_seconds',
  DB_POOL_USED:       'aidream_db_pool_used',
  STORAGE_ERRORS:     'aidream_storage_errors_total',
  COUNTER_DRIFT:      'aidream_counter_drift_total',
  APP_ERRORS:         'aidream_app_errors_total',
  PLAYBACK_TTFF:      'aidream_playback_ttff_seconds',
  BUSINESS_UPLOADS:   'aidream_uploads_completed_total',
  BUSINESS_VIEWS:     'aidream_views_total',
} as const
```

```ts
// apps/worker/src/lib/job-wrapper.ts
export interface JobMeta { queue: string; jobId: string; attempt: number }

/** 모든 잡 핸들러를 이것으로 감싼다. 로깅·메트릭·에러 분류가 자동으로 붙는다. */
export function withJob<TData, TResult>(
  name: string,
  handler: (data: TData, meta: JobMeta) => Promise<TResult>,
): (job: Job<TData>) => Promise<TResult> {
  throw new NotImplementedError('T11:withJob')
}
```

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T11:requestContext` | AsyncLocalStorage. 로거가 자동으로 requestId 포함 |
| 2 | `T11:metricsRegistry` | prom-client 레지스트리 + 라벨 규약 |
| 3 | `T11:httpMetrics` | `withRoute` 에 히스토그램/카운터 연동 |
| 4 | `T11:metricsEndpoint` | `/api/metrics` — **내부망/토큰 제한** |
| 5 | `T11:readyChecks` | DB/Redis/S3 + **큐 깊이**까지 확인 |
| 6 | `T11:withJob` | 잡 래퍼 (아래) |
| 7 | `T11:workerMetrics` | 워커에 별도 HTTP 서버 (포트 9100) |
| 8 | `T11:queueMetrics` | 큐 깊이·대기시간·DLQ 주기 수집 |
| 9 | `T11:prometheus` | 스크레이프 설정 (web, worker, node-exporter) |
| 10 | `T11:alertRules` | `10_NFR.md` §3 표를 규칙으로 |
| 11 | `T11:alertmanager` | 이메일 + 웹훅. 심각/경고 라우팅 분리 |
| 12 | `T11:dashboards` | 대시보드 3개 (아래) |
| 13 | `T11:logRotation` | pino → 파일 + logrotate |

### 로그 규약 (반드시 지킨다)

```
형식: JSON lines (한 줄 = 한 이벤트)
필수 필드: time, level, msg, service, requestId?, jobId?, userId?
금지: 여러 줄 로그, 사람용 정렬 출력, console.log
```

| 레벨 | 사용 기준 |
|---|---|
| `error` | 사람이 조치해야 함. 알럿 대상. **스택 포함** |
| `warn` | 비정상이지만 자동 회복됨 (재시도 성공, 카운터 보정, 레이트리밋) |
| `info` | 상태 변화 (요청 완료, 잡 완료, 상태 전이) |
| `debug` | 개발용. 프로덕션 기본 비활성 |
| `trace` | 문제 추적 시 일시적으로만 |

```ts
// 좋은 로그
logger.info({ episodeId, from: 'DRAFT', to: 'PUBLISHED' }, 'episode status changed')

// 나쁜 로그 (금지)
logger.info(`에피소드 ${episodeId} 를 공개했습니다`)   // 문자열 보간 → 검색 불가
console.log(episode)                                  // 구조 없음 + redact 안 됨
```

**구조화가 목적이다.** 나중에 `jq 'select(.episodeId=="xxx")'` 로 추적할 수 있어야 한다.

### `withJob` 이 하는 일

```
1. jobId/queue/attempt 를 컨텍스트에 넣음 (이후 모든 로그에 자동 포함)
2. 시작 로그 (info)
3. 타이머 시작
4. 핸들러 실행
5. 성공: duration 히스토그램 + total{status="success"} + 완료 로그
6. 실패:
     AppError            → total{status="failed", code} + warn/error (재시도 여부에 따라)
     그 외               → total{status="error"} + error + 스택
     마지막 시도였는가?   → DLQ 카운터 + error 레벨 (알럿 트리거)
7. 어떤 경우에도 duration 은 기록 (실패 시간도 정보다)
```

### 메트릭 라벨 규약 (카디널리티 폭발 방지)

| 라벨 | 허용 값 | 금지 |
|---|---|---|
| `route` | **패턴** (`/api/episodes/[id]`) | 실제 ID 값 ★ |
| `method` | GET/POST/… | |
| `status` | 2xx/3xx/4xx/5xx 또는 정확한 코드 | |
| `code` | 에러코드 (카탈로그 내 유한집합) | 자유 문자열 |
| `queue` | 큐 이름 (`packages/queue/src/queues.ts` 의 10개) | 자유 문자열 |

**`route` 라벨에 실제 ID 를 넣으면 시계열이 무한히 늘어나 Prometheus 가 죽는다.**
반드시 패턴으로 정규화한다. 이건 실제로 자주 발생하는 사고다.

### 대시보드 3개

| 대시보드 | 패널 |
|---|---|
| **서비스 개요** | 요청률, 에러율(4xx/5xx), p50/p95/p99 응답, 활성 세션, `/api/ready` 상태 |
| **미디어 파이프라인** | 큐 깊이, 대기 시간, 트랜스코드 성공/실패율, 처리 시간 분포, DLQ, 워커 디스크 |
| **인프라** | CPU/메모리/디스크(노드별), DB 커넥션 풀, DB 쿼리 p95, Redis 메모리, 스토리지 사용량 |

### 알럿 규칙 예시

```yaml
# infra/monitoring/alerts.yml
groups:
  - name: aidream-critical
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(aidream_http_requests_total{status=~"5.."}[5m]))
          / sum(rate(aidream_http_requests_total[5m])) > 0.05
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: "5xx 비율 5% 초과"
          runbook: "docs/20_OPS/O05_INCIDENT.md#고에러율"

      - alert: TranscodeQueueBacklog
        expr: aidream_queue_wait_seconds{queue="video.transcode"} > 1800
        for: 10m
        labels: { severity: critical }
        annotations:
          runbook: "docs/20_OPS/O05_INCIDENT.md#큐-적체"

      - alert: DlqNotEmpty
        expr: increase(aidream_queue_dlq_total[15m]) > 0
        labels: { severity: warning }
        annotations:
          runbook: "docs/20_OPS/O05_INCIDENT.md#dlq"
```

**모든 알럿에 `runbook` 주석을 붙인다.** 새벽 3시에 알럿을 받은 사람이
무엇을 해야 할지 즉시 알 수 있어야 한다. 런북 링크 없는 알럿은 만들지 않는다.

## 6. 예외처리

| 상황 | 처리 |
|---|---|
| 메트릭 수집 자체가 실패 | **애플리케이션 동작을 막지 않는다.** try/catch 로 감싸고 debug 로그 |
| `/api/metrics` 외부 접근 | 403. 내부망 IP 또는 토큰만 허용 |
| Prometheus 스크레이프 실패 | Prometheus 가 `up=0` 으로 기록 → `TargetDown` 알럿 |
| 로그 디스크 가득 | logrotate (일간, 30일, 압축) + 디스크 알럿 90% |
| 로그 쓰기 실패 | 프로세스를 죽이지 않는다. stderr 로 폴백 |
| Alertmanager 다운 | Prometheus 가 알럿을 보관. 복구 후 발송. **이중화하지 않음 (수용)** |
| 알럿 폭주 (플래핑) | `for:` 절 + Alertmanager 그룹화/억제 규칙 |
| 카디널리티 폭발 감지 | Prometheus `TooManySeries` 알럿 → 라벨 점검 |
| 시크릿이 로그에 유출 | redact 설정 (T03). **추가 위험 필드 발견 시 즉시 추가** |
| 워커 메트릭 포트 충돌 | 환경변수로 포트 지정 가능하게 |

## 7. 테스트

| 케이스 | 방식 |
|---|---|
| 로그에 `requestId` 가 자동 포함 | 단위 |
| redact — 비밀번호/토큰/쿠키/서명URL 이 `[REDACTED]` | 단위 ★ |
| `route` 라벨이 ID 를 패턴으로 정규화 | 단위 ★ |
| `withJob` — 성공 시 메트릭 3종 기록 | 단위 |
| `withJob` — 실패 시 에러코드 라벨 기록 | 단위 |
| `withJob` — 마지막 시도 실패 시 DLQ 카운터 | 단위 |
| `withJob` — 메트릭 수집 실패가 잡을 막지 않음 | 단위 |
| `/api/metrics` 가 유효한 Prometheus 형식 | 통합 |
| `/api/metrics` 외부 IP → 403 | 통합 |
| `/api/ready` — Redis 중단 시 503 + 어느 것이 실패인지 표시 | 통합 |
| `/api/health` — DB 중단에도 200 (라이브니스) | 통합 |
| 알럿 규칙 문법 검증 | `promtool check rules` (CI) |
| 알럿 규칙에 전부 `runbook` 주석 존재 | 스크립트 검증 (CI) ★ |
| 인위적 에러 유발 → 알럿 실제 발화 | 수동 (스테이징) |
| 로그 로테이션 동작 | 수동 |

## 8. 완료 조건 (DoD)

- [ ] `pnpm gate` 통과
- [ ] 잔존 `NotImplementedError('T11:...')` = 0
- [ ] `promtool check rules` 통과 + 모든 알럿에 runbook 존재
- [ ] 대시보드 3개가 실제 데이터를 표시
- [ ] **알럿 1개를 인위적으로 발화시켜 실제 수신 확인** (수동 — 가장 중요)
- [ ] 로그에서 시크릿 0건 (`grep -iE 'password|secret|token' 로그` 로 확인)
- [ ] `route` 라벨 카디널리티가 라우트 개수 이하
- [ ] 모든 잡이 `withJob` 으로 감싸짐 (grep 확인)
- [ ] `console.log` 0건 (lint 가 보장하지만 확인)
- [ ] 요청 1건의 requestId 로 web 로그 → worker 로그까지 추적 가능 (수동)
