# T01 — 로컬/운영 인프라: Docker Compose · Caddy

## 진행 상태
- [x] S1 Spec 확인 — 2026-08-21 / 산출물 목록 자기검증 완료
- [x] S2 Skeleton — 2026-08-21 / `pnpm gate:s2` PASS
- [ ] S3 구현

---

## 0. 대상 서버 (실제 값)

```
호스트명 : dreamcinema
공급자   : Linode (Akamai) / 리전 jp-osa (오사카)
사양     : 1 vCPU / 2 GB RAM / 50 GB SSD      ← 티어 T0
IPv4     : 172.233.81.32
IPv6     : 2400:8905::2000:23ff:feee:8792
방화벽   : web-basic-firewall (ID 60923198)
접속     : ssh root@172.233.81.32
LISH     : ssh -t hanbin9857@lish-jp-osa.linode.com dreamcinema
```

> **T0 은 여유가 없는 사양이다.** `11_CAPACITY_TIERS.md` §4 의 방어책 10개는
> 선택이 아니라 필수다. 하나라도 빠지면 첫 인코딩에서 OOM 으로 Postgres 가 죽는다.
> 사양을 키울 때 이 파일을 다시 고치지 않도록, 자원 제한값은
> **compose 파일을 티어별로 분리**해서 표현한다.

## 1. 목적

`docker compose up -d` 한 번으로 로컬 개발환경(Postgres/Redis/MinIO)이 뜨고,
티어별 운영 Compose 로 dreamcinema 에 동일 구조를 배포할 수 있게 한다.
**로컬과 운영의 구조 차이는 MinIO ↔ Object Storage 뿐**이어야 한다.

## 2. 참조 스펙

- `../00_SPEC/11_CAPACITY_TIERS.md` **(전체 — 이 태스크의 핵심 근거)**
- `../00_SPEC/01_ARCHITECTURE.md` §1, §2, §6
- `../00_SPEC/03_TECH_STACK.md` §1, §5, §6
- `../00_SPEC/07_AUTH_SECURITY.md` §6 보안 헤더
- `../00_SPEC/02_REPO_LAYOUT.md` §6
- `../20_OPS/O01_DEPLOY.md` §6 첫 배포 체크리스트

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `infra/compose/docker-compose.dev.yml` | postgres, redis, minio, minio-init (로컬) | S2 |
| `infra/compose/docker-compose.prod.yml` | 서비스 정의 **베이스** (자원 제한 없음) | S2 |
| `infra/compose/docker-compose.t0.yml` | ★ T0 오버레이 — `cpus`/`mem_limit`/튜닝 | S2→S3 |
| `infra/compose/docker-compose.t1.yml` | T1 오버레이 (승급 시 교체만) | S2→S3 |
| `infra/compose/docker-compose.worker.yml` | 워커 노드 분리용 (T2) | S2 |
| `scripts/ops/provision-server.sh` | ★ swap · sysctl · 사용자 · docker 설치 (멱등) | S3 |
| `scripts/ops/harden-ssh.sh` | root 로그인 차단 · 키 전용 · deploy 사용자 | S3 |
| `infra/caddy/Caddyfile` | TLS · 프록시 · 보안헤더 · 캐시헤더 | S3 |
| `infra/docker/web.Dockerfile` | 멀티스테이지, Next standalone | S3 |
| `infra/docker/worker.Dockerfile` | Node + **ffmpeg 버전 고정** | S3 |
| `infra/docker/.dockerignore` | 빌드 컨텍스트 축소 | S2 |
| `infra/akamai/cache-rules.md` | CDN 규칙 설명 | S3 |
| `infra/akamai/cache-rules.json` | 적용값 | S3 |
| `scripts/ops/minio-init.sh` | 로컬 버킷 3개 생성 + 정책 | S3 |
| `Makefile` 또는 `scripts/dev.sh` | `dev`, `dev:down`, `logs`, `psql`, `redis-cli` | S3 |

## 4. S2 Skeleton

`docker-compose.dev.yml` 서비스 목록과 포트만 확정 (이미지 태그 정확히 고정):

```yaml
services:
  postgres:  { image: postgres:16-alpine,  ports: ['5432:5432'] }
  redis:     { image: redis:7-alpine,      ports: ['6379:6379'] }
  minio:     { image: minio/minio:RELEASE.2024-XX-XX, ports: ['9000:9000','9001:9001'] }
  minio-init:{ image: minio/mc:RELEASE.2024-XX-XX }   # 버킷 생성 후 종료
```

`docker-compose.prod.yml` 은 서비스 이름·의존관계·헬스체크 자리만 (자원 제한 없음):

```yaml
services:
  caddy:     { depends_on: [web] }
  web:       { depends_on: { postgres: {condition: service_healthy},
                             redis:    {condition: service_healthy} } }
  worker:    { depends_on: { redis: {condition: service_healthy} }, deploy: { replicas: 1 } }
  scheduler: { depends_on: { redis: {condition: service_healthy} }, deploy: { replicas: 1 } }  # ★ 반드시 1
  postgres:  { healthcheck: pg_isready }
  redis:     { healthcheck: redis-cli ping }
```

### 오버레이 분리 규칙 (승급을 환경변수 수준으로 만드는 장치)

```
기동:  docker compose -f docker-compose.prod.yml -f docker-compose.t0.yml up -d
승급:  마지막 -f 를 docker-compose.t1.yml 로 바꾸고 재기동. 그것으로 끝.
```

`prod.yml` 에는 `cpus`·`mem_limit`·`command`(DB 튜닝)·`WORKER_CONCURRENCY` 를
**절대 넣지 않는다.** 전부 티어 오버레이에만 둔다.
`contract:capacity` 가 오버레이 값 ↔ `11_CAPACITY_TIERS.md` §3 표를 대조한다.

`docker-compose.t0.yml` 의 값은 `11_CAPACITY_TIERS.md` §4 코드 블록 그대로다.

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 0 | `T01:provisionServer` | ★ **swap 4GB + swappiness 10 + deploy 사용자 + docker 설치.** 멱등. (`11_CAPACITY_TIERS.md` §4) |
| 0b | `T01:hardenSsh` | root 로그인 차단, 비밀번호 인증 차단, deploy 키 등록 |
| 0c | `T01:t0Overlay` | T0 오버레이 (cpus 0.7 / mem_limit / DB·Redis 튜닝 / nice) |
| 1 | `T01:devCompose` | dev compose 완성 + 볼륨 (named volume, bind mount 금지 — 윈도우 성능) |
| 2 | `T01:minioInit` | 버킷 3개 생성, `aidream-hls`/`aidream-thumbs` 는 익명 읽기 허용, `aidream-originals` 는 비공개 |
| 3 | `T01:webDockerfile` | 멀티스테이지 (deps → build → runner), `output: 'standalone'`, non-root 유저 |
| 4 | `T01:workerDockerfile` | ffmpeg 7.x 고정 설치, `ffmpeg -version` 을 빌드 단계에서 검증 |
| 5 | `T01:caddyfile` | TLS 자동, `/api/*` no-store, `/_next/static/*` immutable, 보안헤더 전부 |
| 6 | `T01:prodCompose` | 헬스체크 + `restart: unless-stopped` + 로그 드라이버(json-file, max-size 50m, max-file 5) |
| 7 | `T01:workerCompose` | 워커 분리 배포용. 환경변수만 다르고 이미지는 동일 |
| 8 | `T01:cacheRules` | Akamai 캐시 규칙 (`01_ARCHITECTURE.md` §6 표 그대로) |
| 9 | `T01:devScripts` | 개발자 편의 명령 |

### Dockerfile 요구사항 (양쪽 공통)

| 요구 | 이유 |
|---|---|
| 멀티스테이지 | 최종 이미지에 devDependencies·소스 미포함 |
| non-root 유저 (`node`) | 컨테이너 탈출 피해 축소 |
| `NODE_ENV=production` | |
| 레이어 순서: lockfile 먼저 복사 → install → 소스 복사 | 캐시 히트율 |
| `HEALTHCHECK` | web 은 `/api/health`, worker 는 프로세스 존재 확인 |
| 이미지 태그 `latest` 금지 | 재현 가능한 빌드 |
| `.dockerignore` 에 `node_modules`, `.next`, `docs`, `.git` | 컨텍스트 크기 |

### Caddyfile 핵심

```
{$DOMAIN} {
  encode zstd gzip

  header {
    # 07_AUTH_SECURITY.md §6 전부
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options    "nosniff"
    X-Frame-Options           "DENY"
    Referrer-Policy           "strict-origin-when-cross-origin"
    -Server                                   # 서버 정보 노출 제거
  }

  @api      path /api/*
  header @api Cache-Control "no-store"

  @static   path /_next/static/*
  header @static Cache-Control "public, max-age=31536000, immutable"

  # 업로드는 서명 URL 로 Object Storage 직행하므로 본문 크기 제한을 크게 둘 필요 없음
  request_body { max_size 2MB }

  reverse_proxy web:3000 {
    header_up X-Real-IP {remote_host}
    health_uri /api/health
  }

  log { output file /var/log/caddy/access.log { roll_size 100mb roll_keep 5 } }
}
```

**`request_body max_size 2MB` 가 중요한 이유**: 영상은 앱 서버를 통과하지 않는다
(`06_MEDIA_PIPELINE.md` §2). 작은 제한을 걸어두면 실수로 서버 경유 업로드를
구현했을 때 **즉시 실패해서 드러난다.** 이것도 일종의 하네스다.

## 6. 예외처리

| 상황 | 처리 |
|---|---|
| Postgres 헬스체크 실패 | web/worker 가 시작하지 않음 (`depends_on: condition: service_healthy`) |
| Redis 미준비 | 워커는 재시도하며 대기, `E_QUEUE_UNAVAILABLE` 로그. **크래시 루프 금지** |
| MinIO 버킷 이미 존재 | `minio-init` 은 멱등. `mc mb --ignore-existing` |
| 포트 충돌 (로컬) | compose 실패 메시지에 어떤 포트인지 나오게. `dev.sh` 가 사전 점검 |
| 디스크 부족 | 로그 드라이버 크기 제한으로 로그 폭주 방지 |
| Caddy 인증서 발급 실패 | 스테이징 ACME 로 먼저 검증하는 절차를 `O01_DEPLOY.md` 에 기록 |
| 컨테이너 OOM | worker 에 `mem_limit` 설정. ffmpeg 가 호스트를 먹어치우지 못하게. |
| `scheduler` 2개 실행 | compose `replicas: 1` + 코드의 Redis 리더 락 (T08) 이중 방어 |

## 7. 테스트

이 태스크는 **수동 검증 중심**이다. 자동 테스트로 대체할 수 없다.

| 검증 | 방법 | 기대 |
|---|---|---|
| dev 스택 기동 | `docker compose -f infra/compose/docker-compose.dev.yml up -d` | 3개 서비스 healthy |
| Postgres 접속 | `psql $DATABASE_URL -c 'select 1'` | `1` |
| Redis 접속 | `redis-cli ping` | `PONG` |
| MinIO 버킷 | `mc ls local/` | 3개 버킷 |
| 버킷 정책 | `originals` 익명 GET | **403** |
| 버킷 정책 | `hls` 익명 GET | 200 (또는 404, 403 이면 안 됨) |
| web 이미지 빌드 | `docker build -f infra/docker/web.Dockerfile .` | 성공, 이미지 < 400MB |
| worker 이미지 | 동일 + `docker run … ffmpeg -version` | ffmpeg 7.x 출력 |
| 재기동 후 데이터 유지 | `down` → `up` | 볼륨 데이터 유지 |
| 보안 헤더 | `curl -I https://{도메인}` | HSTS/nosniff/DENY 존재 |

**자동화 가능한 것 1개는 반드시 자동화한다**:
`scripts/ops/verify-infra.sh` — 위 검증 중 접속·버킷정책·헤더를 스크립트로 확인.

## 8. 완료 조건 (DoD)

### 공통

- [ ] `pnpm gate` 통과 (설정 파일 lint/포맷 포함)
- [ ] §7 검증 표 전부 통과 (수동 항목은 실행 로그를 커밋 메시지에 요약)
- [ ] `scripts/ops/verify-infra.sh` 가 초록
- [ ] `originals` 버킷이 **익명 접근 403** 임을 확인 (가장 중요한 보안 검증)
- [ ] 버킷 CORS 에 `ExposeHeaders: ["ETag"]` 존재 (없으면 T05 가 영구히 막힌다)
- [ ] Object Storage 리전이 **jp-osa** (교차 리전 전송비 회피)
- [ ] 이미지 태그에 `latest` 가 하나도 없음 (`grep -r 'latest' infra/` 로 확인)
- [ ] `.env.example` 로만 dev 스택이 뜬다 (숨은 수동 설정 없음)
- [ ] `prod.yml` 에 `cpus`/`mem_limit`/`WORKER_CONCURRENCY` 가 **없음** (오버레이 전용)

### T0 서버 (dreamcinema) — 하나도 건너뛰지 않는다

- [ ] **swap 4 GB 활성** — `free -h` 에 4Gi, `/etc/fstab` 에 영속 등록
- [ ] `vm.swappiness=10` 적용 + `/etc/sysctl.conf` 영속
- [ ] `deploy` 사용자 생성, docker 그룹, 키 인증
- [ ] **root SSH 로그인 차단** (`PermitRootLogin no`) + 비밀번호 인증 차단
- [ ] 방화벽 `web-basic-firewall` 인바운드가 **22 / 80 / 443 만** —
      `5432`·`6379`·`9000`·`9090`·`3000` 이 열려 있지 않음을 **외부에서** 확인
      (`nmap -Pn 172.233.81.32` 또는 다른 호스트에서 `nc -zv`)
- [ ] Postgres 가 `shared_buffers=128MB`, `max_connections=20` 으로 기동
      (`SHOW shared_buffers;` 로 확인)
- [ ] Redis 가 `maxmemory 96mb`, `allkeys-lru` 로 기동 (`CONFIG GET maxmemory`)
- [ ] worker 컨테이너가 `cpus 0.7` / `mem_limit 700m` (`docker inspect` 확인)
- [ ] 로그 드라이버 `max-size=20m, max-file=3`
- [ ] **부하 실측**: 20분 720p 영상 1건 인코딩 중
      `free -h` 로 여유 RAM > 100 MB 유지, OOM kill 0건 (`dmesg | grep -i oom`)
- [ ] **인코딩 중 웹 응답 확인** — 홈 페이지가 3초 안에 열린다 (cpus 상한 효과 검증)
- [ ] `df -h` 인코딩 완료 후 임시공간 반환 확인 (잔존 0)
- [ ] `next build` 를 서버에서 시도하지 않았음 (CI 이미지 사용)

**부하 실측 2개가 이 태스크의 진짜 DoD 다.** 설정을 넣은 것과
2GB 노드가 실제로 버티는 것은 다르다. 여기서 실패하면 T1 로 올려야 한다는
근거가 생기고, 그것도 유용한 결과다 — `_ISSUES.md` 에 `[OBS-001]` 로 기록한다.
