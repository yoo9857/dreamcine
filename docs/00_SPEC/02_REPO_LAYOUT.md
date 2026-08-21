# 02 — 모노레포 폴더 구조

> 상태: **불변 계약**. CODEX 수정 금지.
> **파일을 어디에 둘지 고민이 되면 무조건 이 문서를 따른다.**

## 0. 이 문서의 구속력 범위 (먼저 읽는다)

| 대상 | 구속력 | 새로 추가할 때 |
|---|---|---|
| **폴더** (디렉터리 구조와 각 폴더의 책임) | **불변 계약** | 트리에 없는 **새 폴더**를 만들려면 `_ISSUES.md` 에 제안하고 **멈춘다** |
| **파일** (트리에 적힌 개별 파일명) | **예시** | 기존 폴더의 책임 범위 안이면 **자유롭게 추가한다.** 멈추지 않는다 |

즉, `apps/web/src/services/episode/count-view.ts` 는 트리에 없지만
`services/episode/` 폴더의 책임(에피소드 유스케이스)에 부합하므로 **그냥 만든다.**
반대로 `apps/web/src/api/` 나 `packages/shared/` 는 §8 금지 목록이므로 만들지 않는다.

**왜 이렇게 나누는가**: 파일 하나까지 계약으로 묶으면 태스크마다 수십 번 멈춘다.
아키텍처를 지키는 것은 **폴더 경계와 의존 방향**이며, 그 둘은
이 문서 §0~§7 과 `HARNESS.md` §4 의 `depcruise` 가 기계적으로 강제한다.
파일 이름은 아키텍처가 아니다.

각 태스크 문서 §3 의 산출물 표가 **그 태스크에서 만들 실제 파일 목록**이며,
S1 단계에서 확정하는 것이 바로 그 표다.

---

## 1. 최상위

```
aidream/
├─ apps/                    실행 가능한 애플리케이션
│  ├─ web/                  Next.js 15 (SSR + API Route Handler)
│  └─ worker/               BullMQ 컨슈머 + scheduler (Node, ffmpeg)
│
├─ packages/                재사용 라이브러리 (실행 불가, 순수 모듈)
│  ├─ core/                 도메인 — 외부 의존 0
│  ├─ db/                   Prisma 클라이언트 + 리포지토리
│  ├─ storage/              S3 호환 Object Storage 어댑터
│  ├─ media/                ffmpeg/ffprobe 래퍼
│  ├─ queue/                BullMQ 큐 정의 · 잡 타입
│  ├─ ui/                   공용 React 컴포넌트 + 디자인 토큰
│  ├─ api-client/           타입 안전 REST 클라이언트 (Phase2 앱이 재사용)
│  └─ config/               eslint/tsconfig/prettier 공유 프리셋
│
├─ prisma/                  스키마 · 마이그레이션 · 시드 (단일 소스)
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
│
├─ scripts/                 개발·운영 스크립트 (하네스 포함)
│  ├─ contract/             계약 하네스 검사기
│  ├─ sss/                  SSS 진행률 집계기
│  └─ ops/                  백업·복구·점검 스크립트
│
├─ infra/                   배포 정의 (코드로서의 인프라)
│  ├─ compose/              docker-compose.*.yml
│  ├─ caddy/                Caddyfile
│  ├─ docker/               Dockerfile 들
│  └─ akamai/               CDN 캐시 규칙 정의(문서+JSON)
│
├─ docs/                    작업지시서 (이 폴더)
│
├─ .github/workflows/       CI (게이트 실행)
├─ .dependency-cruiser.cjs  의존 방향 하네스
├─ commitlint.config.cjs    커밋 규격 하네스
├─ turbo.json               태스크 파이프라인
├─ pnpm-workspace.yaml
├─ package.json             게이트 스크립트 정의 (HARNESS.md §3)
├─ .env.example
└─ README.md
```

## 2. `apps/web` — Next.js

```
apps/web/
├─ app/                                     App Router (표현 계층만)
│  ├─ layout.tsx                            루트 레이아웃 · 폰트 · 테마
│  ├─ globals.css
│  ├─ error.tsx / not-found.tsx             전역 에러 경계
│  │
│  ├─ (auth)/                               인증 화면 그룹 (레이아웃 별도)
│  │  ├─ login/page.tsx
│  │  ├─ signup/page.tsx
│  │  └─ verify/page.tsx
│  │
│  ├─ (main)/                               서비스 본체 그룹
│  │  ├─ layout.tsx                         상단바 + 하단 탭(모바일)
│  │  ├─ page.tsx                           홈 = 피드
│  │  ├─ following/page.tsx                 팔로잉 피드
│  │  ├─ search/page.tsx                    검색
│  │  ├─ tags/[tag]/page.tsx                태그 피드
│  │  ├─ series/[seriesId]/page.tsx         시리즈 상세 (에피소드 목록)
│  │  ├─ watch/[episodeId]/page.tsx         플레이어 화면
│  │  ├─ u/[handle]/page.tsx                프로필
│  │  └─ notifications/page.tsx             알림
│  │
│  ├─ (studio)/                             크리에이터 도구 그룹 (CREATOR 권한)
│  │  ├─ layout.tsx                         권한 가드
│  │  ├─ studio/page.tsx                    대시보드
│  │  ├─ studio/series/new/page.tsx
│  │  ├─ studio/series/[seriesId]/page.tsx  에피소드 관리
│  │  ├─ studio/upload/page.tsx             업로드 화면
│  │  └─ studio/stats/page.tsx              통계
│  │
│  ├─ (admin)/                              운영 도구 그룹 (MODERATOR/ADMIN)
│  │  ├─ layout.tsx                         권한 가드
│  │  ├─ admin/reports/page.tsx             심사큐
│  │  └─ admin/users/page.tsx
│  │
│  └─ api/                                  Route Handler = REST API
│     ├─ auth/[...nextauth]/route.ts
│     ├─ health/route.ts                    라이브니스
│     ├─ ready/route.ts                     레디니스 (DB/Redis/S3 확인)
│     ├─ metrics/route.ts                   Prometheus 텍스트
│     ├─ uploads/route.ts                   POST 업로드 세션 생성
│     ├─ uploads/[id]/parts/route.ts        파트 서명 URL 재발급
│     ├─ uploads/[id]/complete/route.ts     완료 → 큐 발행
│     ├─ uploads/[id]/abort/route.ts
│     ├─ series/route.ts                    GET 목록 / POST 생성
│     ├─ series/[id]/route.ts               GET/PATCH/DELETE
│     ├─ episodes/route.ts
│     ├─ episodes/[id]/route.ts
│     ├─ episodes/[id]/publish/route.ts     상태 전이
│     ├─ episodes/[id]/playback/route.ts    재생 정보 발급
│     ├─ episodes/[id]/progress/route.ts    이어보기 좌표 저장
│     ├─ episodes/[id]/likes/route.ts
│     ├─ episodes/[id]/comments/route.ts
│     ├─ comments/[id]/route.ts
│     ├─ feed/route.ts                      피드 (커서 페이지네이션)
│     ├─ search/route.ts
│     ├─ users/[handle]/route.ts
│     ├─ users/[handle]/follow/route.ts
│     ├─ notifications/route.ts
│     └─ reports/route.ts
│
├─ src/                                     표현 계층 밖의 웹 전용 코드
│  ├─ services/                             ★ 서비스 계층 (유스케이스)
│  │  ├─ upload/create-upload-session.ts
│  │  ├─ upload/complete-upload.ts
│  │  ├─ episode/publish-episode.ts
│  │  ├─ episode/get-playback.ts
│  │  ├─ series/create-series.ts             (series/ 폴더 — T08)
│  │  ├─ feed/get-feed.ts
│  │  ├─ social/toggle-like.ts
│  │  ├─ social/follow-user.ts
│  │  ├─ social/create-comment.ts
│  │  ├─ moderation/create-report.ts
│  │  └─ notification/notify.ts
│  ├─ auth/                                 Auth.js 설정 · 세션 헬퍼 · 가드
│  ├─ http/                                 ★ 라우트 공통 유틸
│  │  ├─ handler.ts                         withRoute(): 에러→HTTP 변환 단일 지점
│  │  ├─ parse.ts                           zod 기반 body/query 파싱
│  │  ├─ response.ts                        ok()/created()/paginated()
│  │  └─ rate-limit.ts
│  ├─ components/                           앱 전용 컴포넌트 (공용은 packages/ui)
│  │  ├─ feed/FeedList.tsx
│  │  ├─ feed/EpisodeCard.tsx
│  │  ├─ player/HlsPlayer.tsx
│  │  ├─ player/PlayerControls.tsx
│  │  ├─ upload/Uploader.tsx
│  │  ├─ upload/UploadProgress.tsx
│  │  ├─ comment/CommentThread.tsx
│  │  ├─ social/LikeButton.tsx               (social/ 폴더 — T10)
│  │  ├─ studio/EpisodeTable.tsx
│  │  └─ AgeGate.tsx                         (그룹 없는 단독 컴포넌트는 여기)
│  ├─ hooks/                                use-upload.ts, use-infinite-feed.ts …
│  ├─ lib/                                  cdn-url.ts, format.ts, logger.ts
│  └─ styles/                               tailwind 확장
│
├─ e2e/                                     Playwright (US-01 ~ US-10)
│  ├─ auth.e2e.ts
│  ├─ upload-flow.e2e.ts
│  ├─ playback.e2e.ts
│  ├─ social.e2e.ts
│  └─ moderation.e2e.ts
│
├─ public/                                  manifest.json, icons, sw.js
├─ middleware.ts                            인증/권한/보안헤더
├─ next.config.mjs
├─ tsconfig.json
└─ package.json
```

### `app/**` 에서 금지되는 것

- Prisma 직접 import (→ `packages/db`)
- 비즈니스 규칙 (→ `src/services`)
- `try/catch` 로 HTTP 응답 만들기 (→ `src/http/handler.ts` 단일 지점)

## 3. `apps/worker`

```
apps/worker/
├─ src/
│  ├─ index.ts                    워커 부트스트랩 · 그레이스풀 셧다운
│  ├─ scheduler.ts                ★ 반복 작업 (컨테이너 1개만)
│  ├─ jobs/                       잡 핸들러 = 큐 이름과 1:1
│  │  ├─ transcode.ts             video.transcode
│  │  ├─ thumbnail.ts             video.thumbnail
│  │  ├─ publish-scheduled.ts     episode.publishScheduled
│  │  ├─ rank-recompute.ts        feed.rankRecompute
│  │  ├─ counter-flush.ts         counter.flush     (조회수 버퍼 반영)
│  │  ├─ counter-reconcile.ts     counter.reconcile (카운터 정합성 보정)
│  │  ├─ notification-fanout.ts   notification.fanout
│  │  ├─ cleanup-orphans.ts       storage.cleanup   (고아 파일 정리)
│  │  ├─ recover-stuck.ts         asset.recoverStuck(방치된 PENDING 재발행)
│  │  └─ db-purge.ts              db.purge          (소프트삭제 물리삭제)
│  ├─ lib/
│  │  ├─ workspace.ts             임시 디렉터리 생성/보장된 삭제
│  │  ├─ progress.ts              Redis 진행률 보고
│  │  └─ idempotency.ts           멱등성 검사 게이트
│  └─ config.ts                   환경변수 zod 검증
├─ tests/
└─ package.json
```

**규칙**: `jobs/*.ts` 파일 하나는 큐 하나만 담당한다. 파일 안에서 다른 잡을 직접
호출하지 않고, **큐에 발행**한다. (실패 격리)

## 4. `packages/*`

```
packages/core/                    ★ 외부 의존 0 — zod, date-fns 만 허용
├─ src/
│  ├─ entities/                   Series, Episode, User, VideoAsset … 타입
│  ├─ schemas/                    zod 스키마 (API 계약의 실체)
│  │  ├─ episode.schema.ts
│  │  ├─ series.schema.ts
│  │  ├─ upload.schema.ts
│  │  └─ pagination.schema.ts
│  ├─ state/                      ★ 상태기계 (순수 함수)
│  │  ├─ episode-state.ts         canTransition(from,to,ctx)
│  │  ├─ asset-state.ts
│  │  └─ upload-state.ts
│  ├─ rules/                      ★ 순수 비즈니스 규칙
│  │  ├─ rank-score.ts            피드 랭킹 산식
│  │  ├─ age-gate.ts              연령등급 접근 판정
│  │  ├─ upload-policy.ts         용량/형식/길이 정책
│  │  └─ permission.ts            역할별 권한 판정
│  ├─ errors/                     ★ 에러 정의 (09_ERROR_CATALOG 의 코드 구현)
│  │  ├─ app-error.ts
│  │  ├─ codes.ts                 as const 코드 목록
│  │  └─ not-implemented.ts       SSS 센티넬
│  ├─ observability/              메트릭 이름 중앙 레지스트리 (T11)
│  │  └─ metrics.ts
│  ├─ enums.ts
│  ├─ limits.ts                   ★ 제품 불변 한도 (10_NFR §4)
│  ├─ capacity.ts                 ★ 티어 프로필 (11_CAPACITY_TIERS §3)
│  ├─ env.ts                      ★ 환경변수 zod 스키마 (03_TECH_STACK §6)
│  └─ index.ts                    ★ 공개 API 배럴 (외부는 이것만 import)
└─ tests/                         순수 함수 → 가장 촘촘한 단위테스트

packages/db/
├─ src/
│  ├─ client.ts                   PrismaClient 싱글턴 (핫리로드 안전)
│  ├─ repositories/               ★ 쿼리는 전부 여기
│  │  ├─ user.repo.ts
│  │  ├─ series.repo.ts
│  │  ├─ episode.repo.ts
│  │  ├─ asset.repo.ts
│  │  ├─ upload.repo.ts
│  │  ├─ feed.repo.ts             ★ 커서 페이지네이션 · 복잡 쿼리
│  │  ├─ social.repo.ts
│  │  └─ report.repo.ts
│  ├─ tx.ts                       withTransaction()
│  └─ mappers/                    Prisma 모델 ↔ core 엔티티 변환
└─ tests/                         testcontainers 기반 통합테스트

packages/storage/
├─ src/
│  ├─ client.ts                   S3Client (Linode Object Storage 엔드포인트)
│  ├─ buckets.ts                  버킷 이름 상수 + 경로 규칙 함수
│  ├─ presign.ts                  업로드/다운로드 서명 URL
│  ├─ multipart.ts                create/sign/complete/abort
│  ├─ put-object.ts               워커용 업로드 (Cache-Control 헤더 포함)
│  └─ cdn.ts                      ★ 오직 여기서만 CDN URL 을 만든다
└─ tests/

packages/media/
├─ src/
│  ├─ probe.ts                    ffprobe → 메타데이터
│  ├─ ladder.ts                   ★ 원본 해상도 → 렌디션 목록 결정 (순수)
│  ├─ transcode-hls.ts            ffmpeg 실행 + 진행률 파싱
│  ├─ thumbnail.ts                프레임 추출
│  ├─ ffmpeg-args.ts              ★ 인자 조립 (순수 → 테스트 가능)
│  └─ errors.ts                   ffmpeg stderr → 에러코드 분류
└─ tests/                         ffmpeg 인자 스냅샷 테스트

packages/queue/
├─ src/
│  ├─ connection.ts               Redis 연결
│  ├─ queues.ts                   ★ 큐 이름 상수 (문자열 하드코딩 금지)
│  ├─ jobs.ts                     ★ 잡 페이로드 zod 스키마
│  └─ enqueue.ts                  타입 안전 발행 함수
└─ tests/

packages/ui/
├─ src/
│  ├─ tokens/                     색·간격·타이포 (다크/라이트)
│  ├─ primitives/                 Button, Input, Dialog, Sheet, Toast …
│  ├─ layout/                     Stack, Grid, Container
│  └─ index.ts
└─ tests/

packages/api-client/              ★ Phase2 앱이 그대로 재사용
├─ src/
│  ├─ generated/                  OpenAPI → 타입 (자동생성, 수정 금지)
│  ├─ client.ts                   fetch 래퍼 · 토큰 주입 · 에러 정규화
│  └─ endpoints/                  도메인별 함수
└─ tests/

packages/config/
├─ eslint/base.cjs · next.cjs · node.cjs
├─ tsconfig/base.json · next.json · node.json
└─ prettier/index.cjs
```

## 5. `scripts/`

```
scripts/
├─ contract/                      ← 계약 하네스 (HARNESS.md §3)
│  ├─ check-openapi.ts            zod 스키마 ↔ 05_API_CONTRACT 대조
│  ├─ check-error-catalog.ts      코드의 에러코드 ↔ 09_ERROR_CATALOG 대조
│  ├─ check-limits.ts             limits.ts ↔ 스펙 숫자 대조
│  ├─ check-deps.ts               package.json ↔ 03_TECH_STACK 허용목록 대조
│  ├─ check-capacity.ts           capacity.ts ↔ 11_CAPACITY_TIERS ↔ compose 3자 대조
│  └─ gen-openapi.ts              zod → openapi.json 생성
├─ sss/
│  ├─ count-remaining.ts          NotImplementedError 개수 집계
│  └─ update-index.ts             docs/INDEX.md 진행표 갱신
├─ dev.sh                         로컬 개발 편의 명령
└─ ops/                           ← O01/O03/O04/O05 가 호출
   ├─ deploy.sh · rollback.sh · post-deploy-check.sh
   ├─ backup-db.sh · restore-db.sh · verify-backup.sh
   ├─ triage.sh · queue-status.sh · dlq-list.sh · dlq-retry.sh
   ├─ verify-infra.sh · minio-init.sh · check-env.ts
   ├─ create-admin.ts · docker-prune.sh
   ├─ health-report.sh            정기점검 리포트
   └─ log-query.sh                로그 검색 헬퍼
```

## 6. `infra/`

```
infra/
├─ compose/
│  ├─ docker-compose.dev.yml      postgres, redis, minio (로컬)
│  ├─ docker-compose.prod.yml     서비스 정의 베이스 (자원 제한 없음)
│  ├─ docker-compose.t0.yml       ★ T0 오버레이 (cpus/mem/DB튜닝)
│  ├─ docker-compose.t1.yml       T1 오버레이
│  └─ docker-compose.worker.yml   T2 워커 노드 분리 시
├─ caddy/
│  └─ Caddyfile                   TLS · 프록시 · 보안헤더 · 캐시헤더
├─ docker/
│  ├─ web.Dockerfile              멀티스테이지, standalone 출력
│  ├─ worker.Dockerfile           ffmpeg 포함 (버전 고정)
│  └─ .dockerignore
├─ monitoring/                    ★ T11 관측 스택
│  ├─ prometheus.yml              스크레이프 설정
│  ├─ alerts.yml                  알럿 규칙 (runbook 주석 필수)
│  ├─ alertmanager.yml            알림 전달
│  └─ dashboards/*.json           Grafana 대시보드 3개
└─ akamai/
   ├─ cache-rules.md              CDN 규칙 설명
   └─ cache-rules.json            적용 값
```

## 7. 파일 배치 판단 플로차트

```
새 파일을 만들려는데 어디 둘지 모르겠다
  │
  ├─ 외부 의존 없이 계산/판정만 하는가?
  │     예 → packages/core/src/rules/ 또는 state/
  │
  ├─ DB 쿼리인가?
  │     예 → packages/db/src/repositories/
  │
  ├─ S3 / ffmpeg / Redis 호출인가?
  │     예 → packages/storage · media · queue
  │
  ├─ 여러 계층을 조립하는 유스케이스인가? (트랜잭션 경계가 있는가?)
  │     예 → apps/web/src/services/
  │
  ├─ 백그라운드에서 도는가?
  │     예 → apps/worker/src/jobs/
  │
  ├─ 화면에 그려지는가?
  │     프로젝트 전용 → apps/web/src/components/
  │     범용 프리미티브 → packages/ui/src/primitives/
  │
  └─ HTTP 진입점인가?
        예 → apps/web/app/api/**/route.ts  (얇게. 파싱+호출+직렬화만)
```

## 8. 절대 만들지 않는 폴더

| 금지 | 이유 |
|---|---|
| `utils/`, `helpers/`, `common/`, `misc/` | 책임 불명 쓰레기통이 된다. 도메인 이름으로 나눈다. |
| `apps/web/src/api/` | API는 `app/api/` 뿐. 중복 진입점 금지. |
| `packages/shared/` | `core` 와 역할 충돌. |
| `apps/web/src/db/` | DB는 `packages/db` 뿐. |
| 최상위 `src/` | 모노레포에서 소유자가 모호해진다. |
