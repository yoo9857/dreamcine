# O01 — 배포 · 무중단 전환 · 롤백

> 대상: Akamai(Linode) VPS, Ubuntu 24.04, Docker Compose v2

---

## 1. 배포 원칙

| 원칙 | 내용 |
|---|---|
| 게이트 통과가 배포 조건 | CI 에서 `pnpm gate` 초록이 아니면 배포 불가 |
| 이미지는 CI 가 빌드 | 서버에서 소스 빌드 금지 (재현성 + 서버 자원 보호) |
| 태그는 커밋 SHA | `aidream/web:{sha}`. `latest` 금지 |
| 마이그레이션은 배포 전 별도 단계 | 앱 시작 시 자동 마이그레이션 금지 |
| 롤백은 이미지 태그 교체 | 5분 이내 복구 가능해야 함 |
| 워커는 그레이스풀 | 진행 중인 트랜스코드를 죽이지 않는다 |

## 2. 배포 파이프라인

```
[개발]  git push → 브랜치
          │
[CI]    pnpm gate (lint/typecheck/depcruise/contract/test/e2e)
          │ 초록
        docker build web + worker → 레지스트리 push (태그: {sha})
          │
[승인]  main 병합
          │
[배포]  scripts/ops/deploy.sh {sha}
          ├─ 1. 이미지 pull
          ├─ 2. 마이그레이션 실행 (별도 컨테이너, 1회성)
          ├─ 3. worker 순차 교체 (그레이스풀)
          ├─ 4. web 무중단 교체
          ├─ 5. scheduler 교체
          └─ 6. 헬스 확인 → 실패 시 자동 롤백
```

## 2-1. 실제 구현 (2026-08-22)

§2 의 파이프라인이 코드로 존재한다.

| 단계 | 어디에 |
|---|---|
| 게이트 | `.github/workflows/gate.yml` 의 `gate` 잡 |
| 이미지 빌드·push | 같은 파일의 `image` 잡. `needs: gate` 가 "게이트 통과가 배포 조건" 을 구조로 만든다. 태그는 커밋 SHA, `latest` 없음 |
| 서버 적용 | `.github/workflows/deploy.yml` — **수동 실행**(`workflow_dispatch`) |
| 절차 | `scripts/ops/deploy.sh {sha}` |

### 왜 자동 배포가 아닌가

§3-0 이 "정상이 아닌 상태에서 배포하지 않는다" 고 못박고 있고, 그 판단은
사람이 한다. main 에 푸시할 때마다 배포하면 그 판단이 사라진다.

### 필요한 저장소 시크릿

| 이름 | 값 |
|---|---|
| `DEPLOY_HOST` | 서버 주소 |
| `DEPLOY_USER` | 배포 계정 (`deploy` 권장, root 아님) |
| `DEPLOY_SSH_KEY` | 개인키 전문 (ed25519). **비밀번호가 아니다** |
| `DEPLOY_KNOWN_HOSTS` | `ssh-keyscan -t ed25519 <host>` 결과 한 줄 |
| `DEPLOY_PATH` | 서버의 저장소 경로 |
| `DEPLOY_DOMAIN` | 외부 확인용 도메인 (선택) |

**비밀번호 인증을 쓰지 않는다.** 비밀번호를 CI 시크릿에 넣어도 원격에서
`sshpass` 로 넘기는 순간 프로세스 목록에 평문으로 노출된다. 키는 그 문제가
없고, 서버에서 언제든 회수할 수 있다.

**호스트 키를 고정한다.** `StrictHostKeyChecking=no` 로 두면 중간자가 끼어들어도
배포가 그대로 진행된다. 배포는 서버에 코드를 넣는 행위라 그 대가가 크다.

### 서버 준비 (한 번)

```bash
# 서버에서 — 배포 전용 키를 만들고 공개키만 authorized_keys 에 넣는다
sudo -u deploy ssh-keygen -t ed25519 -N '' -f /home/deploy/.ssh/id_deploy
sudo -u deploy sh -c 'cat /home/deploy/.ssh/id_deploy.pub >> /home/deploy/.ssh/authorized_keys'
sudo -u deploy cat /home/deploy/.ssh/id_deploy      # → DEPLOY_SSH_KEY 시크릿
ssh-keyscan -t ed25519 "$(hostname -f)"             # → DEPLOY_KNOWN_HOSTS 시크릿

# deploy 계정이 docker 를 쓸 수 있어야 한다
sudo usermod -aG docker deploy

# 첫 배포 전에 부트스트랩을 끈다 — 켜져 있으면 Caddy 가 /api/* 를 뺀 전부를
# 정적 페이지로 가로채 앱이 보이지 않는다
sed -i 's/^BOOTSTRAP_MODE=.*/BOOTSTRAP_MODE=false/' .env
```

## 3. 배포 절차 (상세)

### 3-0. 사전 확인

```bash
# 배포 전 반드시 확인
docker compose -f infra/compose/docker-compose.prod.yml ps    # 현재 상태
curl -fsS https://{도메인}/api/ready | jq                      # 현재 정상인가
df -h                                                          # 디스크 여유
scripts/ops/verify-backup.sh                                   # 최근 백업 유효한가
```

**정상이 아닌 상태에서 배포하지 않는다.** 장애 중 배포는 원인을 두 배로 만든다.

### 3-1. 마이그레이션 (앱 교체 전)

```bash
docker run --rm --env-file .env --network aidream_default \
  aidream/web:{sha} pnpm prisma migrate deploy
```

| 규칙 | 이유 |
|---|---|
| `migrate deploy` 사용 (`dev` 아님) | 프로덕션은 새 마이그레이션을 생성하지 않는다 |
| 앱 시작 시 자동 실행 금지 | 컨테이너 여러 개가 동시에 마이그레이션하면 충돌 |
| 파괴적 변경은 2단계 배포 | `04_DOMAIN_MODEL.md` §7 |
| 실패 시 배포 중단 | 구 코드는 구 스키마로 계속 동작 |

**하위 호환 규칙**: 마이그레이션은 항상 **구 버전 코드가 계속 동작할 수 있게** 만든다.
컬럼 추가는 안전, 컬럼 삭제/이름변경은 2단계로 나눈다.

### 3-2. 워커 교체 (그레이스풀 — 트랜스코드 보호)

```bash
# 워커는 한 번에 하나씩. 진행 중 잡을 죽이지 않는다.
docker compose -f ...prod.yml up -d --no-deps --scale worker=2 worker  # 새 것 추가
# 구 컨테이너에 SIGTERM → 최대 30초 대기 (T06 §5 그레이스풀 셧다운)
docker stop --time 30 {구_worker_컨테이너}
docker compose -f ...prod.yml up -d --no-deps --scale worker=1 worker
```

**트랜스코드가 30초 안에 끝나지 않으면?** BullMQ 가 `stalled` 로 감지해
새 워커에 재할당한다. T06 의 멱등성 게이트가 중복 처리를 막는다.
즉 **진행 중 잡은 유실되지 않고 재시작된다** (진행률은 0으로 되돌아감).

긴 트랜스코드 중 배포를 피하려면:

```bash
scripts/ops/queue-status.sh          # 진행 중 잡 확인
# 진행 중 잡이 있으면 배포를 미루거나, 큐를 일시 정지 후 소진 대기
```

### 3-3. web 무중단 교체

```bash
# Caddy 가 health_uri 로 판단하므로 새 컨테이너가 healthy 가 될 때까지 구 것이 서빙
docker compose -f ...prod.yml up -d --no-deps --wait web
```

| 요구 | 값 |
|---|---|
| `HEALTHCHECK` | `/api/health` (T01) |
| Caddy `health_uri` | `/api/health` |
| 새 컨테이너 준비 대기 | `--wait` (헬스체크 통과까지) |
| 세션 유지 | DB 세션이므로 무상태 → 교체해도 로그아웃 안 됨 |

**`web` 이 무상태여야 하는 이유가 여기 있다** (`01_ARCHITECTURE.md` §7).
로컬 디스크에 무엇이라도 쓰면 교체 시 그것이 사라진다.

### 3-4. 배포 후 검증 (자동)

```bash
scripts/ops/post-deploy-check.sh
# 1. /api/health 200
# 2. /api/ready 200 + 모든 checks ok
# 3. 주요 페이지 5개 200 (홈/시리즈/재생/로그인/스튜디오)
# 4. 큐 소비가 재개됨 (worker 가 잡을 받는가)
# 5. 메트릭 엔드포인트 응답
# 6. 5분간 5xx 비율 < 1%
# 하나라도 실패 → 즉시 롤백
```

## 4. 롤백

```bash
scripts/ops/rollback.sh {이전_sha}
```

| 단계 | 동작 |
|---|---|
| 1 | 이전 이미지 태그로 web/worker/scheduler 교체 |
| 2 | 헬스 확인 |
| 3 | **DB 마이그레이션은 되돌리지 않는다** ← 중요 |

### 마이그레이션을 되돌리지 않는 이유

되돌리는 마이그레이션은 데이터 손실을 일으킨다.
그래서 **마이그레이션은 항상 하위 호환**으로 만든다(§3-1).
구 코드가 새 스키마에서도 동작하므로 코드만 되돌리면 충분하다.

되돌릴 수 없는 마이그레이션(컬럼 삭제)을 배포했다면,
그 배포는 **롤백 불가**다. 그래서 2단계로 나눈다.

```
안전한 순서:
  배포 N   : 새 컬럼 추가 + 양쪽 쓰기 (롤백 가능)
  배포 N+1 : 새 컬럼만 읽기        (롤백 가능)
  배포 N+2 : 구 컬럼 삭제          (여기부터 N 으로 롤백 불가)
```

## 5. 환경변수 변경

```bash
# 1. .env 백업
cp .env .env.$(date +%Y%m%d%H%M)
# 2. 수정
# 3. 검증 — 앱을 띄우기 전에 스키마 검사
docker run --rm --env-file .env aidream/web:{sha} pnpm tsx scripts/ops/check-env.ts
# 4. 재시작 (환경변수는 재시작 없이 반영되지 않는다)
docker compose -f ...prod.yml up -d --force-recreate web worker scheduler
```

`AUTH_SECRET` 을 바꾸면 **전 사용자 로그아웃**된다. 공지 후 수행한다.

## 6. 첫 배포 (초기 구축) 체크리스트

> 대상: **dreamcinema** (Linode jp-osa, 1vCPU/2GB/50GB, 티어 **T0**)
> 상세 실행은 `10_TASKS/T01_INFRA_DOCKER.md` §0 · §8.

- [ ] Ubuntu 24.04, SSH 키 인증만 (**root 로그인 차단**, 비밀번호 인증 비활성)
- [ ] 방화벽 `web-basic-firewall`: 22(제한 IP 권장), 80, 443 만 개방.
      **5432/6379/9000/9090 은 절대 개방 금지** — 외부에서 실제로 확인
- [ ] `deploy` 사용자 생성, docker 그룹 추가, sudo 최소화
- [ ] Docker + Compose v2 설치
- [ ] **swap 4 GB + `vm.swappiness=10`** ← T0 필수. 없으면 첫 인코딩에서 OOM
- [ ] 티어 오버레이 확인: `-f prod.yml -f t0.yml` 로 기동, `.env` 에 `CAPACITY_TIER=T0`
- [ ] 도메인 A 레코드 → VPS IP
- [ ] Object Storage 버킷 3개 생성 + 정책 (originals 비공개!) + CORS(ExposeHeaders: ETag)
- [ ] Akamai CDN 오리진 설정 + 캐시 규칙 적용 (`infra/akamai/cache-rules.json`)
- [ ] `.env` 작성 (권한 600, 소유자 deploy)
- [ ] Caddy TLS 발급 — **먼저 ACME 스테이징으로 검증** 후 프로덕션
- [ ] 마이그레이션 실행
- [ ] 관리자 계정 생성 (`scripts/ops/create-admin.ts`)
- [ ] 모니터링 스택 기동 + 알럿 수신 테스트
- [ ] 백업 cron 등록 + **복구 훈련 1회 성공**
- [ ] logrotate 설정
- [ ] `unattended-upgrades` (보안 패치 자동)
- [ ] 스모크 테스트: 가입 → 업로드 → 재생 → 댓글

**ACME 스테이징을 먼저 쓰는 이유**: Let's Encrypt 는 실패 횟수 제한이 있다.
설정 실수로 한도를 소진하면 몇 시간 인증서를 못 받는다.

## 7. 배포 시 흔한 사고와 대응

| 사고 | 증상 | 대응 |
|---|---|---|
| 마이그레이션 중 타임아웃 | 큰 테이블에 인덱스 추가 | `CONCURRENTLY` 사용, 또는 점검 시간에 |
| 새 환경변수 누락 | 컨테이너가 부팅 즉시 종료 | env 스키마 검증(§5 3단계)이 미리 잡는다 |
| 이미지 pull 실패 | 배포 중단 | 레지스트리 인증 확인. 이전 이미지로 계속 동작 중 |
| 디스크 가득 (이미지 누적) | 빌드/pull 실패 | `docker image prune -a --filter until=168h` (주간 cron) |
| Caddy 인증서 갱신 실패 | HTTPS 오류 | 80 포트 개방 확인. 로그 확인. 수동 갱신 |
| 워커가 잡을 안 받음 | 큐 적체 | Redis 연결 확인. 워커 로그. 재시작 |
| scheduler 2개 실행 | 예약공개 중복 | 리더 락이 막지만, `replicas` 설정 확인 |
| 배포 후 5xx 급증 | 알럿 발화 | **즉시 롤백.** 원인 분석은 롤백 후에 |

## 8. 배포 금지 시각

| 시간 | 이유 |
|---|---|
| 금요일 오후 이후 | 문제 발생 시 대응 인력 부재 |
| 트래픽 피크 (저녁 8~11시) | 영향 범위 최대 |
| 백업 실행 중 | I/O 경합 |
| 트랜스코드 큐 적체 중 | 워커 교체가 적체를 악화 |

긴급 보안 패치는 예외. 단 롤백 준비를 먼저 확인한다.

## 9. 스크립트 목록 (`scripts/ops/`)

| 스크립트 | 역할 |
|---|---|
| `deploy.sh {sha}` | 전체 배포 (§3) |
| `rollback.sh {sha}` | 롤백 (§4) |
| `post-deploy-check.sh` | 배포 후 검증 |
| `check-env.ts` | 환경변수 스키마 검증 |
| `queue-status.sh` | 큐 깊이/진행 중 잡 |
| `verify-infra.sh` | 인프라 접속·정책·헤더 확인 |
| `create-admin.ts` | 관리자 계정 생성 |
| `docker-prune.sh` | 이미지/볼륨 정리 (주간 cron) |

모든 스크립트는 **실패 시 0 이 아닌 종료코드**를 반환한다 (`set -euo pipefail`).
