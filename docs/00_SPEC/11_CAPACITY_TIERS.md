# 11 — 용량 티어 (서버 사양별 프로필)

> 상태: **불변 계약**. CODEX 수정 금지.
> **서버 사양에 따라 달라지는 모든 숫자는 오직 이 문서에만 있다.**
> 사양이 커질 때 코드를 고치지 않는다 — `CAPACITY_TIER` 환경변수만 바꾼다.

---

## 1. 왜 티어로 나누는가

이 서비스는 **작은 서버에서 시작해 점진적으로 키운다.**
사양 의존 숫자(업로드 상한, 렌디션 래더, 워커 동시성)를 코드에 박으면
서버를 키울 때마다 코드를 고치고 배포해야 한다. 그래서 프로필로 분리한다.

| 원칙 | 내용 |
|---|---|
| 사양 의존 숫자 | **이 문서 §3 프로필 표에만** 존재 |
| 제품 불변 숫자 | `10_NFR.md` §4 `LIMITS` (댓글 길이, 태그 개수 등 — 서버와 무관) |
| 티어 선택 | 환경변수 `CAPACITY_TIER=T0|T1|T2` |
| 티어 승급 | 코드 변경 0. 환경변수 + 재시작 (+ 노드 추가) |
| 강등 | 가능. 단 이미 업로드된 콘텐츠는 영향 없음 |

## 2. 현재 티어

```
CAPACITY_TIER = T0

노드: dreamcinema (Linode, jp-osa)
      1 vCPU / 2 GB RAM / 50 GB SSD
      단일 노드에 caddy + web + worker + scheduler + postgres + redis 전부
```

**T0 은 개발·소규모 검증 단계다.** 실사용자 유입이 시작되면 T1 로 올린다.
승급 조건은 §5.

## 3. 티어 프로필 표 (SSOT)

| 항목 | **T0** 단일 소형 | **T1** 단일 표준 | **T2** 노드 분리 |
|---|---|---|---|
| **노드 사양** | 1 vCPU / 2 GB / 50 GB | 4 vCPU / 8 GB / 160 GB | app 2vCPU·4GB + worker 4vCPU·8GB |
| **노드 수** | 1 | 1 | 2+ |
| 업로드 최대 용량 | **2 GB** | 8 GB | 8 GB |
| 영상 최대 길이 | **20분** (1200초) | 90분 (5400초) | 90분 |
| 사용자 일일 업로드 총량 | **10 GB** | 50 GB | 50 GB |
| 시간당 업로드 세션 | **5회** | 20회 | 20회 |
| 렌디션 래더 | **720p, 360p** (2단) | 1080p~360p (4단) | 1080p~360p (4단) |
| `WORKER_CONCURRENCY` | **1** | 2 | 2 (노드당) |
| 워커 CPU 할당 | **0.7 core** (web 보호) | 3 core | 노드 전체 |
| 워커 메모리 상한 | **700 MB** | 4 GB | 6 GB |
| 트랜스코드 임시공간 상한 | **8 GB** | 40 GB | 80 GB |
| swap | **4 GB (필수)** | 2 GB | 2 GB |
| Postgres `shared_buffers` | **128 MB** | 2 GB | 1 GB |
| Postgres `max_connections` | **20** | 100 | 100 |
| DB 커넥션 풀 (web / worker) | **6 / 3** | 10 / 5 | 10 / 5 |
| Redis `maxmemory` | **96 MB** | 512 MB | 512 MB |
| Next.js `--max-old-space-size` | **512** | 2048 | 1024 |
| 피드 캐시 TTL | **120초** | 60초 | 60초 |
| 동시 접속 목표 | **50명** | 500명 | 2,000명 |
| 예상 트랜스코드 처리량 | **20분 영상 ≈ 20~35분** | 30분 1080p ≈ 12~18분 | 병렬로 선형 확장 |
| 하루 처리 가능 편수 | **10~15편** | 60~100편 | 노드 수 비례 |

### 코드 표현

```ts
// packages/core/src/capacity.ts  ★ 이 파일이 위 표의 유일한 구현
export const CAPACITY_TIERS = {
  T0: {
    uploadMaxBytes:      2 * 1024 ** 3,
    uploadDailyBytes:    10 * 1024 ** 3,
    uploadHourlyCount:   5,
    videoMaxDurationSec: 1200,
    ladder:              ['720p', '360p'],
    workerConcurrency:   1,
    tmpDirMaxBytes:      8 * 1024 ** 3,
    feedCacheTtlSec:     120,
  },
  T1: {
    uploadMaxBytes:      8 * 1024 ** 3,
    uploadDailyBytes:    50 * 1024 ** 3,
    uploadHourlyCount:   20,
    videoMaxDurationSec: 5400,
    ladder:              ['1080p', '720p', '480p', '360p'],
    workerConcurrency:   2,
    tmpDirMaxBytes:      40 * 1024 ** 3,
    feedCacheTtlSec:     60,
  },
  T2: { /* T1 과 동일 + tmpDirMaxBytes: 80GiB */ },
} as const

export type CapacityTier = keyof typeof CAPACITY_TIERS
export type Capacity = (typeof CAPACITY_TIERS)[CapacityTier]

/** 부팅 시 1회 해석. 이후 이 객체만 참조한다. */
export function loadCapacity(tier: CapacityTier): Capacity
```

**규칙**: 업로드 검증·래더 결정·워커 설정은 **`Capacity` 객체만** 참조한다.
`LIMITS.UPLOAD_MAX_BYTES` 같은 사양 의존 상수는 `limits.ts` 에서 **삭제**하고
여기로 옮긴다. `contract:limits` 는 이 표와 `capacity.ts` 를 대조한다.

## 4. T0 에서 반드시 적용할 방어책

T0 은 여유가 없다. 아래는 **선택이 아니라 필수**다.

| # | 조치 | 없으면 무엇이 터지는가 |
|---|---|---|
| 1 | **swap 4 GB** | ffmpeg 실행 순간 OOM 킬러가 Postgres 를 죽인다 |
| 2 | **워커 `cpus: 0.7` + `nice -n 10`** | ffmpeg 가 단일 코어를 점유해 웹이 응답 불가 |
| 3 | **워커 `mem_limit: 700m`** | ffmpeg 메모리 폭주가 호스트 전체를 끌고 내려간다 |
| 4 | **`WORKER_CONCURRENCY=1`** | 2건 동시 인코딩 = 디스크·RAM·CPU 동시 고갈 |
| 5 | **Postgres 튜닝** (`shared_buffers=128MB`, `max_connections=20`) | 기본값이 2GB 환경에 과하다 |
| 6 | **Redis `maxmemory 96mb` + `volatile-lru`** | TTL 캐시가 RAM 을 먹고 OOM 되는 것을 막되 큐 영속 키는 보존 |
| 7 | **디스크 사전 검사** (원본×3 여유 없으면 잡 지연) | 인코딩 중 디스크 풀 → 잡 실패 + 잔존 파일 |
| 8 | **로그 상한** (`max-size=20m, max-file=3`) | 50GB 디스크를 로그가 잠식 |
| 9 | **`next build` 는 서버에서 하지 않는다** | 2GB 에서 모노레포 빌드는 OOM. CI 가 이미지를 만든다 (`O01` §1) |
| 10 | **모니터링 스택은 T0 에서 외부/생략** | Prometheus+Grafana 가 400MB+ 를 먹는다 (§6) |

```yaml
# infra/compose/docker-compose.t0.yml 발췌
services:
  worker:
    cpus: 0.7
    mem_limit: 700m
    environment:
      WORKER_CONCURRENCY: 1
      CAPACITY_TIER: T0
    entrypoint: ["nice", "-n", "10", "node", "dist/index.js"]
  postgres:
    command: >
      postgres -c shared_buffers=128MB -c max_connections=20
               -c effective_cache_size=512MB -c work_mem=4MB
               -c maintenance_work_mem=64MB
  redis:
    command: redis-server --appendonly yes --maxmemory 96mb --maxmemory-policy volatile-lru
  web:
    mem_limit: 700m
    environment:
      NODE_OPTIONS: "--max-old-space-size=512"
```

### swap 설정 (첫 배포 시 1회)

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10          # 꼭 필요할 때만 스왑
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

**`swappiness=10`**: 스왑을 자주 쓰면 디스크 I/O 로 더 느려진다.
OOM 을 막는 안전망으로만 쓴다.

## 5. 티어 승급 판단 (숫자로만)

`O03_MAINTENANCE.md` §2 주간 점검에서 확인한다.

### T0 → T1 (같은 노드 리사이즈)

**하나라도 해당되면 승급한다:**

| 신호 | 임계 |
|---|---|
| swap 사용량 | 상시 500 MB 초과 |
| OOM kill 발생 | **1회라도** (`dmesg | grep -i oom`) |
| 트랜스코드 큐 대기 | 30분 초과가 주 3회 이상 |
| 크리에이터의 20분/2GB 상한 불만 | 접수 3건 이상 |
| 웹 p95 응답 | 인코딩 중 1초 초과 |
| 디스크 사용률 | 70% 초과 |
| 동시 접속 | 50명 상시 초과 |

승급 절차:

```
1. Linode 콘솔에서 Resize (다운타임 수 분)
2. .env 의 CAPACITY_TIER=T0 → T1
3. compose 파일 t0 → t1 로 교체
4. docker compose up -d --force-recreate
5. swap 은 유지 (2GB 로 축소 가능)
6. 스모크 테스트 + 8GB 업로드 1건 실제 검증
```

**코드 변경은 0이다.** 이것이 티어 설계의 목적이다.

### T1 → T2 (워커 노드 분리)

| 신호 | 임계 |
|---|---|
| 트랜스코드 큐 대기 | 10분 초과가 지속 |
| 인코딩 중 웹 p95 | 목표(300ms)의 2배 초과 |
| 하루 업로드 | 60편 초과 |

절차는 `01_ARCHITECTURE.md` §7 + `infra/compose/docker-compose.worker.yml`.

## 6. T0 에서 미루는 것 (승급 시 켠다)

| 기능 | T0 | 이유 | 켜는 시점 |
|---|---|---|---|
| Prometheus + Grafana | **끔** | 400MB+ RAM. T0 에 여유 없음 | T1 |
| 관측 대체 수단 | `/api/metrics` 노출 + 로그 파일 + `scripts/ops/health-report.sh` | 최소 관측은 유지한다 | — |
| 알럿 | **파일 기반 간이 감시** (cron + 임계 확인 + 메일) | Alertmanager 미기동 | T1 |
| E2E 테스트 | 서버에서 실행 안 함 | CI 에서만 | — |
| 1080p 렌디션 | 끔 | CPU·용량 | T1 |
| 프리뷰 스프라이트 | 끔 | 추가 ffmpeg 패스 비용 | T1 |
| 읽기 복제본 | 끔 | — | 필요 시 |

**중요**: T0 에서 관측을 완전히 끄지 않는다.
`T11_OBSERVABILITY.md` 의 로깅·메트릭 엔드포인트·`withJob` 은 **T0 에서도 전부 구현한다.**
끄는 것은 **수집 스택(Prometheus/Grafana)** 뿐이다.
코드는 그대로 두고 인프라만 나중에 붙인다 — 그래야 승급이 환경변수 수준으로 끝난다.

## 7. T0 기준 실제 용량 계산 (근거)

### 디스크 50 GB

| 항목 | 용량 |
|---|---|
| OS + 패키지 | 4 GB |
| Docker 이미지 (5종) | 4 GB |
| Postgres 데이터 (초기 + 성장 여유) | 10 GB |
| 로그 (상한) | 2 GB |
| swap 파일 | 4 GB |
| **트랜스코드 임시공간** | **8 GB** ← 2GB 원본 × 3 + 산출물 |
| 예비 | 18 GB |

2GB 업로드 상한의 근거가 이것이다. 원본 8GB 를 받으면 임시공간만 24GB 가 필요하다.

### RAM 2 GB (T0 방어책 적용 후)

| 프로세스 | 실사용 |
|---|---|
| OS + dockerd | 300 MB |
| Caddy | 40 MB |
| Postgres (128MB 버퍼) | 280 MB |
| Redis (96MB 상한) | 120 MB |
| Next.js (512MB heap 상한) | 500 MB |
| worker + ffmpeg 720p 2단 | 450 MB |
| **합계** | **~1,690 MB** |
| 여유 + swap 안전망 | 360 MB + 4 GB |

1080p 4단 래더였다면 ffmpeg 만 800MB 를 써서 초과한다.
**T0 에서 래더를 2단으로 줄이는 것이 OOM 을 막는 핵심**이다.

### CPU 1 vCPU

```
720p + 360p, libx264 veryfast, 단일 ffmpeg 다중 출력, cpus=0.7 제한
→ 대략 실시간의 0.6~1.0배
→ 20분 영상 = 20~35분 인코딩
→ 하루 8시간을 인코딩에 쓴다고 보면 약 15편

인코딩 중 웹 응답: cpus=0.7 제한 + nice 10 덕분에
남은 0.3 core 로 T0 목표(동시 50명)는 감당 가능하다.
```

## 8. 티어 하네스

```ts
// scripts/contract/check-capacity.ts — gate:contract 에 포함
// 1. 이 문서 §3 표를 파싱
// 2. packages/core/src/capacity.ts 의 CAPACITY_TIERS 와 완전 일치 확인
// 3. 사양 의존 상수가 limits.ts 에 남아 있지 않은지 확인 (중복 정의 금지)
// 4. compose 파일의 cpus/mem_limit/WORKER_CONCURRENCY 가 티어와 일치하는지 확인
```

**4번이 중요하다.** 코드는 T0 프로필을 쓰는데 compose 는 T1 값이면
설정이 조용히 어긋난 채로 돌아간다. 기계가 대조해야 한다.
