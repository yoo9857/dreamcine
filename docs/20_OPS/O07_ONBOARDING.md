# O07 — 온보딩 30분 코스

> 새로 합류한 사람 또는 CODEX 세션이 **30분 안에 첫 기여**를 할 수 있게 하는 것이 목표다.
> 30분을 넘기면 이 문서가 잘못된 것이다. 고쳐라.

---

## 1. 5분 — 이 프로젝트가 무엇인가

읽는다 (5분, 그 이상 쓰지 않는다):

1. `../../README.md` — 무엇을 만드는가
2. `../HARNESS.md` §1~2 — **SSS 하네스 규율** (이것만은 정독)
3. `../INDEX.md` §1~2 — 문서 지도와 태스크 순서

### 30초 요약

```
AIDREAM = AI 드라마 업로드·유통 SNS (Next.js 웹 우선, Akamai VPS 자체 호스팅)

작업 방식 = SSS 하네스
  S1 Spec     : 만들 파일 목록만 확정 (코드 0줄)
  S2 Skeleton : 타입·시그니처만. 본문은 throw new NotImplementedError('T06:xxx')
  S3 Stub     : NotImplementedError 를 하나씩 구현 + 테스트

각 단계는 `pnpm gate` 를 통과해야 다음으로 간다. 실패 2회면 멈추고 보고한다.
스펙(00_SPEC/)은 절대 수정하지 않는다. 틀렸으면 _ISSUES.md 에 쓰고 멈춘다.
```

## 2. 10분 — 환경 구축

```bash
# 1. 전제 확인
node -v          # v22.x
pnpm -v          # 9.x
docker -v        # 24+
ffmpeg -version  # 7.x (로컬 테스트용. 없으면 워커 테스트만 못 함)

# 2. 설치
git clone {저장소}
cd aidream
pnpm install

# 3. 환경변수
cp .env.example .env.local
# 로컬 개발은 .env.example 의 기본값으로 대부분 동작한다.
# 반드시 채울 것: AUTH_SECRET (openssl rand -base64 32)

# 4. 인프라 기동
docker compose -f infra/compose/docker-compose.dev.yml up -d
scripts/ops/verify-infra.sh        # 초록이어야 한다

# 5. DB
pnpm db:migrate
pnpm db:seed

# 6. 실행
pnpm dev                            # http://localhost:3000
pnpm dev:worker                     # 별 터미널

# 7. 게이트 확인 — ★ 이게 통과하지 않으면 여기서 멈추고 물어본다
pnpm gate
```

### 시드 계정

| 이메일 | 비밀번호 | 역할 |
|---|---|---|
| `creator@example.com` | `devpassword123` | CREATOR |
| `viewer@example.com` | `devpassword123` | VIEWER |
| `admin@example.com` | `devpassword123` | ADMIN |

### 자주 막히는 곳

| 증상 | 원인 / 해결 |
|---|---|
| `pnpm install` 실패 | Node 버전. `.nvmrc` 확인 |
| Postgres 연결 실패 | 5432 포트 충돌. 로컬 Postgres 종료 |
| MinIO 버킷 없음 | `minio-init` 컨테이너 로그 확인. 수동 재실행 |
| 업로드 시 ETag 오류 | MinIO CORS `ExposeHeaders: ETag` 누락 (T01) |
| 워커가 잡을 안 받음 | Redis URL 확인. `dev:worker` 를 띄웠는가 |
| ffmpeg 없음 | 미디어 테스트만 실패. 나머지는 진행 가능 |
| `pnpm gate` 의 e2e 실패 | dev 스택이 떠 있는가. `pnpm playwright install` 했는가 |

## 3. 10분 — 코드 지형 익히기

### 이 5개 파일만 읽는다

| 파일 | 왜 |
|---|---|
| `packages/core/src/errors/app-error.ts` | 모든 에러의 형태 |
| `apps/web/src/http/handler.ts` | **모든 API 가 이걸 통과한다** |
| `packages/core/src/state/episode-state.ts` | 상태기계의 모범 예 (순수 함수) |
| `apps/worker/src/jobs/transcode.ts` | 잡의 모범 예 |
| `packages/db/src/repositories/episode.repo.ts` | 리포지토리의 모범 예 |

### 계층 규칙 한 장 요약

```
app/api/**          파싱 + 호출 + 반환.  try/catch 금지. Prisma import 금지.
src/services/**     유스케이스 조립. 트랜잭션 경계. AppError 던짐.
packages/core       순수. 외부 의존 0. React/Prisma/Next 전부 금지.
packages/db         쿼리는 전부 여기. 다른 곳에서 Prisma 안 씀.
packages/storage    S3/CDN URL 은 전부 여기.
packages/media      ffmpeg 은 전부 여기.
apps/worker/jobs    잡 하나 = 파일 하나. 다른 잡 직접 호출 금지 (큐로).
```

**파일을 어디 둘지 모르면** `00_SPEC/02_REPO_LAYOUT.md` §7 플로차트를 본다.

### 하네스가 실제로 막는 것을 체험한다 (3분, 꼭 해볼 것)

```bash
# 1. any 를 넣어본다
echo "export const x: any = 1" >> packages/core/src/index.ts
pnpm lint          # ← 실패해야 정상
git checkout packages/core/src/index.ts

# 2. core 에서 React 를 import 해본다
echo "import 'react'" >> packages/core/src/index.ts
pnpm depcruise     # ← 실패해야 정상
git checkout packages/core/src/index.ts

# 3. 카탈로그 밖 에러코드를 써본다
# 아무 서비스 파일에 new AppError('E_MADE_UP') 추가
pnpm contract:errors   # ← 실패해야 정상

# 4. 커밋 메시지 규격을 어겨본다
git commit --allow-empty -m "fix stuff"   # ← husky 가 거부해야 정상
```

**이걸 해보면 하네스를 신뢰하게 된다.** 신뢰하지 않는 하네스는 우회된다.

## 4. 5분 — 첫 기여

```bash
# 1. 다음 할 일 확인
cat docs/INDEX.md          # §3 진행표에서 다음 태스크
pnpm sss:remaining         # 남은 NotImplementedError

# 2. 브랜치
git checkout -b t06/s3-probe

# 3. 태스크 문서를 읽는다 (그 문서가 지목한 스펙만 추가로 읽는다)
cat docs/10_TASKS/T06_TRANSCODE_WORKER.md

# 4. 마커 하나만 고른다 (§5 구현 순서의 다음 항목)
grep -rn "NotImplementedError('T06:" --include="*.ts" .

# 5. 그 함수 하나를 구현한다 + 테스트 2개(정상/실패) 작성

# 6. 게이트
pnpm gate

# 7. 커밋 (규격 준수)
git commit -m "T06/S3: implement probe"

# 8. 태스크 문서의 진행 상태 체크박스 갱신
```

### 한 세션의 크기

```
한 세션 = 태스크 1개의 한 단계, 또는 마커 1~3개.
그 이상 하지 않는다. 이유:
- 게이트 실패 시 원인을 특정할 수 있다
- 리뷰가 가능하다
- 중간에 끊겨도 손실이 작다
```

## 5. 세션 종료 보고 서식 (CODEX 필수)

```
통과 게이트 : gate:s3 PASS (lint 0 / tsc 0 / depcruise 0 / test 142 passed / cov 78%)
잔존 NIE    : T06 3개 (transcodeToHls, makeThumbnails, transcodeJob)
다음 할 일   : T06:transcodeToHls — spawn + 진행률 파싱 + 타임아웃
막힌 것     : 없음   (또는: ISS-007 로 등록, 스펙 판단 대기 중)
```

## 6. 자주 하는 질문

**Q. 스펙이 틀린 것 같다.**
→ 고치지 않는다. `docs/_ISSUES.md` 에 `[ISS-###]` 로 쓰고 **그 태스크를 멈춘다.**
   다른 태스크는 의존관계상 무관하면 진행 가능하다.

**Q. 라이브러리를 추가하고 싶다.**
→ `docs/_ISSUES.md` 에 `[DEP-###]` 로 요청하고 멈춘다.
   `00_SPEC/03_TECH_STACK.md` 에 등재된 뒤에만 설치한다.

**Q. 게이트가 계속 실패한다.**
→ 2회까지 시도한다. 3회째는 하지 않는다. 실패 로그 전문과 함께 보고한다.
   테스트를 skip 하거나 `any` 로 통과시키는 것은 **위반**이다.

**Q. 테스트가 간헐적으로 실패한다 (플레이키).**
→ 재시도로 넘기지 않는다. `_ISSUES.md` 에 등록하고 원인을 찾는다.
   `O06_TESTING_QA.md` §6 참조.

**Q. 이 코드를 어디에 둬야 하는지 모르겠다.**
→ `00_SPEC/02_REPO_LAYOUT.md` §7 플로차트. 그래도 모르면 `_ISSUES.md`.

**Q. 에러코드가 카탈로그에 없다.**
→ 발명하지 않는다. `_ISSUES.md` 에 제안. 기존 코드로 표현 가능한지 먼저 검토.

**Q. 여러 태스크를 동시에 하면 안 되나?**
→ 한 세션에서는 안 된다. 여러 세션을 병렬로 돌리는 것은
   `INDEX.md` §2 의 병렬 가능 조합만 허용된다. **T05→T06→T07 은 병렬 금지.**

**Q. 성능이 목표에 못 미친다.**
→ 추측으로 최적화하지 않는다. 측정값을 `_ISSUES.md` 에 `[OBS-###]` 로 남긴다.
   `O03_MAINTENANCE.md` §7 순서를 따른다.

## 7. 운영 담당으로 인수받는 경우 (추가 1시간)

- [ ] `O01_DEPLOY.md` 읽고 **배포 1회 직접 수행** (감독하에)
- [ ] **롤백 1회 직접 수행**
- [ ] `O05_INCIDENT.md` §3 진단 명령 실행해보기
- [ ] `O04_BACKUP_DR.md` §5 복구 훈련 참여
- [ ] 알럿 수신 경로 등록 + 테스트 알럿 수신 확인
- [ ] 대시보드 3개 열어보고 정상 범위 감각 익히기
- [ ] 접근 권한 수령: SSH / Object Storage / 레지스트리 / 도메인·CDN 콘솔
- [ ] `.env` 백업 위치와 복호화 방법 인수
- [ ] `O03_MAINTENANCE.md` §2 주간 점검 1회 수행

## 8. 문서 갱신 책임

이 온보딩을 하다가 막혔다면 **그 자리에서 이 문서를 고친다.**

| 상황 | 조치 |
|---|---|
| 30분을 넘겼다 | 어디서 시간이 갔는지 §2 "자주 막히는 곳" 에 추가 |
| 문서에 없는 수동 설정이 필요했다 | `.env.example` 또는 스크립트로 자동화 |
| 명령이 문서와 다르다 | 문서를 고친다 |
| 개념이 이해되지 않았다 | 어느 문서에 무엇이 빠졌는지 `_ISSUES.md` 에 |

**"나는 알아냈으니 됐다" 는 다음 사람에게 같은 30분을 쓰게 한다.**
