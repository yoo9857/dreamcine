# _ISSUES — 스펙 결함 신고함

> **CODEX가 `00_SPEC/` 을 수정하는 것은 금지다.** 스펙이 틀렸다고 판단되면
> 여기에 기록하고 **그 태스크를 멈춘다.** 다른 태스크로 넘어가지 않는다.
> 사람이 판단해 스펙을 고치고 상태를 `RESOLVED` 로 바꾸면 재개한다.

---

## 작성 서식

### 스펙 결함

```md
## [ISS-###] 한 줄 제목
- 발견 단계: T{NN}/S{n}
- 스펙 위치: 00_SPEC/{파일}.md §{절}
- 문제: 무엇이 왜 불가능/모순인가 (사실만)
- 재현/근거: 명령 출력, 에러 메시지, 계산 결과
- 제안: 어떻게 바꾸면 되는가 (선택지가 여럿이면 전부)
- 영향: 이 결정이 바뀌면 함께 바뀌는 것들
- 상태: OPEN | RESOLVED | REJECTED
```

### 라이브러리 추가 요청

```md
## [DEP-###] 패키지명@버전
- 요청 단계: T{NN}/S{n}
- 용도: 어디에 무엇을 위해
- 대안 검토: 03_TECH_STACK 의 허용 목록으로 안 되는 이유
- 위험: 번들 크기 / 마지막 릴리스 / 라이선스 / 의존성 수
- 상태: OPEN | APPROVED | REJECTED
```

### 성능·용량 관측 보고

```md
## [OBS-###] 한 줄 제목
- 발견 단계: T{NN}/S{n}
- 관측값: 목표 대비 실측 (10_NFR 의 어느 지표인가)
- 측정 방법: 재현 가능한 형태로
- 상태: OPEN | RESOLVED
```

---

## 처리 규칙

| 상태 | 의미 | 누가 바꾸는가 |
|---|---|---|
| `OPEN` | 사람 판단 대기. **해당 태스크 정지 중.** | CODEX 가 생성 |
| `RESOLVED` | 스펙이 수정됨. 태스크 재개 가능. | 사람 |
| `REJECTED` | 스펙이 맞음. CODEX 의 이해가 틀렸음. 이유가 함께 적힌다. | 사람 |
| `APPROVED` | 라이브러리 승인. `03_TECH_STACK.md` 에 등재 완료. | 사람 |

`OPEN` 항목이 하나라도 있으면, 그 항목이 가리키는 태스크는 진행하지 않는다.
다른 태스크는 의존관계상 무관하다면 진행 가능하다 (`INDEX.md` §2 참조).

---

## 항목

<!-- 여기 아래에 추가. 최신 항목을 위로. -->

## [ISS-011] 업로드 재개 응답에 완료 파트 ETag가 없어 멀티파트 완료가 불가능함
- 발견 단계: T05/S3
- 스펙 위치: `00_SPEC/05_API_CONTRACT.md` §3, `10_TASKS/T05_UPLOAD.md` §5·§7
- 문제: `GET /api/uploads/:id`의 재개 응답은 `completedParts: number[]`만 반환하지만,
  `POST /api/uploads/:id/complete`는 모든 파트의 `{ partNumber, etag }`를 요구한다.
  브라우저는 새로고침 뒤 File 객체와 이전 PUT 응답 ETag를 복원할 수 없다. 따라서
  완료 파트 번호를 보고 누락분만 업로드하더라도 마지막 CompleteMultipartUpload에
  이전 파트 ETag를 보낼 수 없다. 현재 계약으로는 "누락분만 재업로드"와 "모든
  ETag로 완료"를 동시에 만족할 수 없다.
- 재현/근거: `UploadSession.completedParts`에는 ETag를 저장할 수 있고 S3 ListParts도
  ETag를 반환하지만, `UploadSessionStateSchema`가 응답에서 번호만 노출한다.
  `CompleteUploadSchema`는 파트 배열을 1개 이상 요구하며 서비스도 요청 목록만 S3에
  전달한다.
- 제안:
  1. 권장: 완료 서비스가 DB에 동기화된 기존 ETag와 이번 요청 ETag를 서버에서 병합하고,
     `parts: []`도 허용한다. 재개 조회 응답은 번호만 유지해 ETag를 외부에 노출하지 않는다.
  2. 대안: 재개 응답을 `{ partNumber, etag }[]`로 확장해 클라이언트가 전체 목록을
     다시 보내게 한다.
- 영향: `CompleteUploadSchema`, `completeUpload`, 업로드 엔진 테스트, OpenAPI 계약.
- 결정: 권장안 채택. 상태 조회가 S3 ListParts 결과를 DB에 동기화하고, 완료 서비스가
  저장된 ETag와 이번 요청 ETag를 병합한다. 모든 파트가 이전 탭에서 끝난 경우를 위해
  `parts: []`도 허용한다. ETag는 클라이언트 응답에 노출하지 않는다. (2026-08-24)
- 상태: RESOLVED

## [DEP-003] jsdom
- 요청 단계: T14/S1
- 용도: `packages/ui` 프리미티브 21개의 컴포넌트 테스트 실행 환경.
- 대안 검토: `03_TECH_STACK.md` §4 는 컴포넌트 테스트 도구로 `@testing-library/react` 를 승인했다. 그 라이브러리는 DOM 없이는 동작하지 않으며 Vitest 의 DOM 환경은 `jsdom` 이다. 즉 승인된 선택의 필수 동반물이다.
- 위험: 낮음. devDependency, 테스트 전용, 런타임 번들 미포함.
- 제안: `check-deps.ts` 의 `DEPENDENCY_EVIDENCE` 에 `jsdom` 을 `@testing-library/react` 근거로 등재한다.
- 결정: 승인 — 등재 완료 (2026-08-22, 사용자 승인)
- 상태: APPROVED

## [DEP-002] Radix UI · Tailwind 계열 패키지
- 요청 단계: T14/S1
- 용도: `08_UIUX_SPEC.md` §6 이 계약으로 고정한 프리미티브 21개 중 11개가 Radix 기반이다(`Select` `Checkbox` `Switch` `Dialog` `Sheet` `DropdownMenu` `Tabs` `Tooltip` `Toast` `Avatar` `Progress`). Tailwind 4 는 `@tailwindcss/postcss` 를 통해 Next 에 붙는다.
- 대안 검토: `03_TECH_STACK.md` §2 는 "컴포넌트 프리미티브: **Radix UI**", "스타일: **Tailwind CSS 4**" 로 **계열**을 승인했다. 그러나 `check-deps.ts` 의 허용 목록은 패키지명 단위여서 `@radix-ui/react-dialog` 하나만 등재되어 있었고, 나머지 Radix 패키지는 승인된 스택인데도 거부됐다.
- 위험: 낮음. 계열 인정은 **스코프 접두**로만 하며 `@radix-ui/`·`@tailwindcss/` 두 개로 한정한다. `@mui/material` 처럼 미승인 스코프는 그대로 거부된다(테스트로 고정).
- 제안: DEP-001 과 같은 성격의 수정이다 — 스펙이 승인한 대상을 검사기가 표현하지 못하는 문제. `DEPENDENCY_FAMILY_EVIDENCE` 를 추가한다.
- 결정: 승인 — 계열은 `@radix-ui/`·`@tailwindcss/` 두 개로 한정, 미승인 스코프 거부는 테스트로 고정 (2026-08-22, 사용자 승인)
- 상태: APPROVED

## [OBS-005] nonce 기반 CSP 와 정적 프리렌더는 함께 쓸 수 없다
- 발견 단계: T03/S3
- 관측값: 프로덕션 빌드에서 `/login` 의 인라인 스크립트 6개에 nonce 가 없었고, RSC 페이로드에 `nonce":"$undefined` 가 박혀 있었다. 우리 CSP 는 `script-src 'self' 'nonce-…'` 로 `unsafe-inline` 을 허용하지 않으므로 브라우저가 그 스크립트를 전부 차단한다. 결과적으로 하이드레이션이 일어나지 않아 **로그인·가입 폼이 실제 브라우저에서 동작하지 않는다.**
- 측정 방법: `next start` 로 띄운 뒤 같은 응답의 헤더와 본문을 비교. 수정 후 스크립트 14개가 응답 헤더와 같은 nonce 를 갖고, RSC 페이로드에도 실린다.
- 원인: nonce 는 요청마다 달라지므로 빌드 시점에 HTML 에 넣을 수 없다. Next 는 정적 프리렌더된 페이지에 nonce 를 주지 않는다.
- 조치: `(auth)` 3개 화면에 `export const dynamic = 'force-dynamic'`. 정적 페이지 수가 13 → 10 으로 줄었다. E2E 에 회귀 가드 2개 추가(같은 응답에서 nonce 대조 + 브라우저 CSP 위반 0건).
- 남은 결합 (후속 태스크가 알아야 함): **클라이언트 상호작용이 필요한 화면은 정적 프리렌더될 수 없다.** 현재 `app/not-found.tsx` 는 정적이라 인라인 스크립트가 차단되지만 링크만 있어 무해하다. `08_UIUX_SPEC.md §1` 의 "`/series/[seriesId]` SSR (60초 캐시)" 는 요청별 nonce 와 양립하지 않으므로 T08 에서 (a) HTML 캐시를 포기하거나 (b) 그 화면만 해시 기반 CSP 로 가는 선택이 필요하다.
- 상태: RESOLVED (T03 범위), 후속 결정은 T08

## [OBS-004] DB 연결 실패가 500 E_INTERNAL 로 나감 (재시도 가능 여부가 감춰짐)
- 발견 단계: T03/S3
- 관측값: 실제 프로덕션 서버에 DB 없이 `POST /api/auth/signup` 을 보내면 `500 E_INTERNAL` 이 나왔다. 09_ERROR_CATALOG.md 기준으로는 `503 E_DB_UNAVAILABLE`(재시도 ○)이어야 한다.
- 측정 방법: `next start` 로 프로덕션 빌드를 띄우고 닿을 수 없는 `DATABASE_URL` 로 요청. 수정 후 같은 요청이 `503 E_DB_UNAVAILABLE` 을 돌려준다.
- 원인: `packages/db/src/errors.ts` 의 `mapPrismaError` 가 `error.code` 만 봤다. 연결 실패 시 Prisma 는 `PrismaClientInitializationError` 를 던지는데, 6.19.3 기준 이 오류에는 `code` 도 `errorCode` 도 없다. 이름이 유일한 식별자다. O02_EXCEPTION_POLICY.md §4-1 의 예시는 이 분기를 담고 있었으나 구현에서 빠져 있었다.
- 조치: 이름 기반 분기 추가(`PrismaClientInitializationError` → `E_DB_UNAVAILABLE`), `errorCode` 도 코드 후보로 읽기, 단위 테스트 3개 추가.
- 상태: RESOLVED

## [OBS-003] 동적 세그먼트가 없는 라우트에서 `withRoute` 가 500 을 돌려줌
- 발견 단계: T03/S3
- 관측값: CI L3 가 `Timed out waiting 300000ms from config.webServer` 로 실패했다. 원인은 Playwright 가 기다리는 `/api/health` 가 **500** 을 돌려줘 서버가 ready 로 판정되지 않은 것이다.
- 측정 방법: 프로덕션 빌드를 로컬에서 띄워 `curl /api/health` → `500 E_INTERNAL`. 서버 로그에 `TypeError: Cannot convert undefined or null to object (Object.entries)`.
- 원인: Next 15 는 **동적 세그먼트가 없는 라우트에 `params` 를 주지 않는다**. `withRoute` 가 `Object.entries(await ctx.params)` 를 무조건 호출했다. 단위 테스트는 항상 `{ params: Promise.resolve({}) }` 를 넘겨서 이 형태를 재현하지 못했다.
- 조치: `NextRouteContext.params` 를 선택적으로 바꾸고 `normalizeParams` 가 `undefined`/`null` 을 허용하도록 수정. `params` 없이 호출되는 경우와 catch-all 배열 params 회귀 테스트 추가.
- 교훈: 단위 테스트가 프레임워크의 실제 호출 형태를 가정으로 대체하면 통과해도 서버는 죽는다. T03 이후 라우트 계층 변경은 프로덕션 빌드 기동 확인을 함께 한다.
- 상태: RESOLVED

## [OBS-002] CI 가 Prisma 클라이언트를 생성하지 않아 정적 게이트가 계속 실패함
- 발견 단계: T03/S3
- 관측값: `main` 의 gate 워크플로가 T03/S1 이후 계속 실패했다(run 32463194812 · 32463352981 · 32492809381). 세 번 모두 `Run SSS gate` 에서 25초 이내에 죽었다 — 테스트가 아니라 `pnpm typecheck` 단계다.
- 측정 방법: 생성된 클라이언트(`node_modules/.pnpm/@prisma+client*/node_modules/.prisma`)를 치우고 `pnpm typecheck` 를 실행하면 `TS2305: Module '"@prisma/client"' has no exported member 'Episode'` 등이 재현된다. `pnpm prisma generate` 후에는 통과한다.
- 원인: `prisma generate` 를 실행하는 지점이 저장소 어디에도 없었다. `@prisma/client` 는 자체 postinstall 로 생성물을 만들지만, pnpm 9 는 의존성의 빌드 스크립트를 기본 차단한다. 로컬은 사람이 수동으로 generate 해서 증상이 가려져 있었다.
- 조치: (1) `gate.yml` 에 `Generate Prisma client` 스텝 추가. (2) `web.Dockerfile`·`worker.Dockerfile` 의 build 단계에 generate 추가 — deps 단계는 `prisma/schema.prisma` 를 복사하지 않으므로 루트 `postinstall` 은 쓰지 않는다. (3) `Run SSS gate` 단일 스텝을 `Gate L1 static` / `L2 contract` / `L3 behaviour` 로 분리해, 로그 다운로드 권한 없이도 깨진 층이 드러나게 했다. (4) 실패 시 Playwright·커버리지 리포트를 아티팩트로 업로드하고, vitest 는 CI 에서 `github-actions` 리포터로 annotation 을 남긴다.
- 상태: RESOLVED

## [OBS-001] `check-prisma` 실측 테스트가 기본 5초 타임아웃 경계에서 플레이키함
- 발견 단계: T03/S3
- 관측값: `scripts/contract/check-prisma.test.ts` 의 "현재 저장소의 실제 Prisma CLI 검사를 통과한다" 가 4.3s / 4.5s / 4.9s / 5.0s 로 측정되어 Vitest 기본 타임아웃(5s)을 오가며 실패했다.
- 측정 방법: `pnpm vitest run --exclude '**/*.integration.test.ts'` 반복 실행. 같은 코드에서 통과와 실패가 번갈아 나왔다.
- 원인: 이 테스트는 `prisma validate` / `migrate diff` 프로세스를 실제로 띄운다. 시간이 오래 걸리는 것이 정상이며, 기본 타임아웃이 그 비용을 반영하지 않았다.
- 조치: 단정은 그대로 두고 테스트 타임아웃을 60초로 명시했다. 하네스의 검사 강도는 변하지 않는다.
- 상태: RESOLVED

## [DEP-001] @types/react · @types/react-dom · @types/nodemailer
- 요청 단계: T03/S2
- 용도: `apps/web` 의 TSX(레이아웃·인증 화면·폼 컴포넌트) 타입체크와 `src/lib/mail.ts` 의 nodemailer SMTP 발송 타입. 세 패키지 모두 **타입 선언 전용**이며 런타임 코드를 포함하지 않는다(번들 0바이트).
- 대안 검토: `react`/`react-dom`/`nodemailer` 는 `03_TECH_STACK.md` §2·§3 에서 이미 승인된 의존성이다. 그러나 세 패키지는 자체 타입 선언을 배포하지 않으므로 DefinitelyTyped 패키지 없이는 `tsc -b` 가 `TS7016`(선언 파일 없음)으로 실패한다. `03_TECH_STACK.md` §7 의 `strict`/`verbatimModuleSyntax` 를 끄는 우회는 하네스 약화이므로 금지된다.
- 위험: 없음에 가깝다. DefinitelyTyped, MIT, 런타임 미포함. 버전은 대응 런타임 패키지의 메이저에 고정한다.
- 근거: `scripts/contract/check-deps.ts` 의 `DEPENDENCY_EVIDENCE` 맵에 `@types/node` 만 등재되어 있어, 승인된 런타임 패키지의 타입 전용 동반 패키지가 일괄적으로 "허용 목록 밖 의존성" 으로 판정된다.
- 제안: (A) `check-deps.ts` 에 규칙을 추가한다 — `@types/{X}` 는 `{X}` 가 허용 목록에 있을 때만 허용. 타입 전용 동반 패키지를 일반화해 처리하므로 이후 태스크에서 같은 문제가 재발하지 않는다. (B) 세 패키지를 `03_TECH_STACK.md` 에 개별 등재한다. (C) 진행 중단.
- 영향: A안은 `check-deps.ts` 와 그 단위 테스트가 함께 바뀐다. 허용 목록의 판정 강도는 유지된다(승인되지 않은 런타임 패키지의 `@types` 도 함께 거부됨).
- 결정: A안 승인 — `check-deps.ts` 에 `@types/{X}` 는 `{X}` 가 허용 목록에 있을 때만 통과하는 규칙을 추가 (2026-08-21, 사용자 승인)
- 상태: APPROVED

## [ISS-005] 로컬 개발환경에 Docker 가 없어 통합·E2E 게이트를 실행할 수 없음
- 발견 단계: T03/S2
- 스펙 위치: `HARNESS.md` §3 `gate:test`, `10_TASKS/T03_AUTH.md` §7·§8, `20_OPS/O06_TESTING_QA.md`
- 문제: `gate:test` 는 `@testcontainers/postgresql` 기반 통합 테스트와 PostgreSQL/Redis/MinIO 를 요구하는 Playwright E2E 를 포함한다. 현재 작업 머신(win32)에 Docker 가 설치되어 있지 않아 `pnpm gate` 를 로컬에서 초록으로 만들 수 없다.
- 재현/근거: `docker --version` → `command not found`. `pnpm vitest run --exclude '**/*.integration.test.ts'` 는 58개 통과, `pnpm gate:static`·`pnpm gate:contract` 는 통과.
- 제안: (A) 로컬에 Docker Desktop 을 설치해 `pnpm gate` 전체를 로컬에서 검증한다. (B) 로컬은 `gate:static` + `gate:contract` + 단위 테스트까지 검증하고, 통합·E2E 는 `.github/workflows/gate.yml`(ubuntu-24.04, Docker 사용 가능) 의 `pnpm gate` 결과를 단계 완료 근거로 삼는다.
- 영향: B안을 택하면 각 단계의 완료 근거가 로컬 로그가 아니라 CI 실행 ID 가 된다(T00 이 이미 `CI 32454394087 PASS` 로 그 선례를 남겼다).
- 결정: B안 승인 — 로컬은 `gate:static`·`gate:contract`·단위 테스트까지, 통합·E2E 는 GitHub Actions `gate` 워크플로 결과를 완료 근거로 사용 (2026-08-21, 사용자 승인)
- 추가 관측 (T03/S3): win32 에서 `next build` 는 컴파일·타입검증·정적생성까지 통과하지만 `output: 'standalone'` 의 traced files 복사가 `EPERM: symlink` 로 실패한다. 관리자 권한이나 개발자 모드 없이 Windows 가 심볼릭 링크를 못 만드는 환경 제약이며 코드 결함이 아니다. ubuntu-24.04 CI 와 dreamcinema 서버에는 영향이 없다. 로컬에서 번들 결과를 확인해야 하면 `output` 을 끈 임시 빌드를 쓴다.
- 상태: RESOLVED

## [ISS-004] T01 완료 조건이 후속 태스크의 미구현 애플리케이션을 요구함
- 발견 단계: T01/S3
- 스펙 위치: `10_TASKS/T01_INFRA_DOCKER.md` §7·§8, `20_OPS/O01_DEPLOY.md` §6
- 문제: T01은 인프라 태스크이지만 완료 조건에 web/worker 최종 이미지 빌드, 마이그레이션, 관리자 생성, 가입→업로드→재생→댓글 스모크, 20분 영상 트랜스코드 부하 실측이 포함되어 있다. 현재 순서상 이 기능과 `apps/web`, `apps/worker`는 T02~T12에서 구현되므로 T01 시점에는 실행 가능한 소스와 CI 이미지가 없다.
- 재현/근거: `apps/` 아래 소스 파일이 0개이며, `infra/docker/web.Dockerfile`과 `worker.Dockerfile`의 최종 빌드는 각각 아직 없는 `apps/web/package.json`, `apps/worker/package.json`을 필요로 한다. 반면 Compose 병합, Caddy, ffmpeg 7.1.1, PostgreSQL/Redis/MinIO는 실제 서버에서 검증됐다.
- 제안: (A) T01 완료 조건을 인프라 단독 검증과 후속 T06 이후의 운영 승인 검증으로 분리하거나, (B) T01보다 먼저 최소 web/worker 헬스 애플리케이션을 만드는 별도 태스크를 추가한다.
- 영향: web/worker 컨테이너 실기동, worker `docker inspect`, 20분 인코딩 부하 실측, 전체 스모크 테스트를 허위 없이 완료할 수 없다. 도메인 DNS·프로덕션 TLS·방화벽·DB/Redis/MinIO 인프라 검증에는 영향이 없다.
- 결정: A안 승인 — T01은 인프라 단독 검증으로 마감하고, 앱·워커·미디어 실측은 해당 구현이 존재하는 T06 이후 운영 승인 게이트에서 수행 (2026-08-21, 사용자 계속 진행 지시)
- 상태: RESOLVED

## [ISS-001] 루트 project references와 `tsc -b --noEmit`이 양립하지 않음
- 발견 단계: T00/S2
- 스펙 위치: `HARNESS.md` §3 `typecheck`, `T00_BOOTSTRAP.md` §3 루트 `tsconfig.json`
- 문제: 루트 `tsconfig.json`이 전 패키지를 `references`로 연결한 상태에서 명시된 `tsc -b --noEmit`을 실행하면 모든 참조 프로젝트에 `TS6310: Referenced project may not disable emit`이 발생한다.
- 재현/근거: TypeScript 5.9.2에서 `pnpm typecheck` 실행 시 `packages/core`, `db`, `storage`, `media`, `queue`, `ui`, `api-client` 7개 참조 모두 TS6310 발생.
- 제안: 다음 중 하나를 계약으로 선택한다. (A) project references를 유지하고 typecheck를 `tsc -b`로 변경, (B) `--noEmit`을 유지하고 루트 references 대신 패키지별 `tsc --noEmit -p`를 실행.
- 영향: 결정 전에는 `gate:s2`가 구조적으로 통과할 수 없으며 T00 이후 모든 태스크의 정적 게이트도 실행 불가.
- 결정: A안 승인 — project references를 유지하고 typecheck를 `tsc -b`로 변경 (2026-08-21, 사용자 승인)
- 상태: RESOLVED

## [ISS-002] T00 빈 프로젝트에서 OpenAPI·Prisma 계약 명령이 선행 산출물을 요구함
- 발견 단계: T00/S3
- 스펙 위치: `HARNESS.md` §3 `contract:openapi`, `contract:prisma`; `T00_BOOTSTRAP.md` §8
- 문제: T00 완료 조건은 빈 프로젝트의 `pnpm gate` 통과지만 OpenAPI 라우트/문서와 Prisma 스키마/마이그레이션은 후속 태스크 산출물이라 고정 검증 명령이 구조적으로 실패한다.
- 제안: 부트스트랩 단계에는 양쪽 산출물이 모두 없을 때만 통과하고, 한쪽만 생성되면 실패하며, 양쪽이 생기면 실제 검증을 실행하는 단계 인식형 검사기를 둔다.
- 결정: 단계 인식형 `check-openapi.ts`와 `check-prisma.ts`를 T00 계약 하네스에 포함 (2026-08-21, 사용자 개선 진행 승인)
- 상태: RESOLVED

## [ISS-003] T00에서 Playwright가 Vitest 파일을 수집하고 빈 E2E를 실패 처리함
- 발견 단계: T00/S3
- 스펙 위치: `HARNESS.md` §3 `gate:test`, `T00_BOOTSTRAP.md` §1·§8
- 문제: Playwright 기본 검색 범위가 저장소 전체라 Vitest 테스트를 잘못 수집하며, T00에는 `apps/web/e2e`가 없어 빈 프로젝트 게이트가 실패한다.
- 제안: Playwright `testDir`를 `apps/web/e2e`로 격리하고 T00 부트스트랩에서는 빈 테스트 집합을 허용한다.
- 결정: 전용 `playwright.config.ts`와 `--pass-with-no-tests` 적용 (2026-08-21, 사용자 개선 진행 승인)
- 상태: RESOLVED

## [OBS-006] Caddy가 `X-Forwarded-For`를 덮어쓰지 않아 IP 레이트리밋을 우회할 수 있었음
- 발견 단계: T03 CI 실패 조사 중 (부수 발견)
- 스펙 위치: `07_AUTH_SECURITY.md` §8 (신원 = `X-Forwarded-For` 첫 IP), §10 (크리덴셜 스터핑 = 방어), `05_API_CONTRACT.md` §10
- 문제: 앱은 계약대로 XFF의 **첫 값**을 레이트리밋 신원으로 쓴다. 그런데 `infra/caddy/Caddyfile`은 `X-Real-IP`만 `{remote_host}`로 세팅하고 XFF는 건드리지 않았다. Caddy `reverse_proxy`의 기본 동작은 들어온 XFF **뒤에 덧붙이는 것**이므로, 클라이언트가 보낸 값이 첫 값으로 남는다. 매 요청 XFF를 바꾸면 IP 키 레이트리밋이 무력화되고, §10이 "방어"로 표시한 크리덴셜 스터핑이 사실상 무방비가 된다.
- 재현/근거: `@auth`와 무관한 순수 프록시 문제. `apps/web/src/http/handler.ts:128` `clientIp()`가 XFF 첫 값을 그대로 신원으로 사용하며, 이 동작은 `handler.test.ts`의 "by:'ip' 는 X-Forwarded-For 첫 값을 신원으로 쓴다"로 계약으로 고정되어 있다. 반면 수정 전 Caddyfile의 `reverse_proxy` 블록에는 XFF 관련 지시문이 없었다.
- 제안: 스펙(앱 동작)은 그대로 두고, 프록시가 XFF를 덮어써 "첫 값 = 실제 접속 IP"라는 전제를 성립시킨다. 스펙이 명시하지 않은 **암묵 전제**였으므로 스펙 변경 없이 인프라에서 충족시킬 수 있다.
- 결정: `header_up X-Forwarded-For {remote_host}` 추가. 재발 방지로 계약 검사 `scripts/contract/check-proxy.ts`(+ `pnpm contract:proxy`)를 추가해, 앱이 XFF 첫 값을 신뢰하는 동안 Caddyfile의 모든 `reverse_proxy` 블록이 XFF를 덮어쓰도록 강제한다. 지시문 삭제·주석 처리 양쪽에서 실제로 실패하는지 확인했다. (2026-08-22, 위임 범위 내 수정)
- 상태: RESOLVED

## [ISS-006] `session.strategy: 'database'` + Credentials 조합을 Auth.js가 거부해 로그인이 전면 불능이었음
- 발견 단계: T03 DoD 검증 (CI E2E 최초 실행)
- 스펙 위치: `07_AUTH_SECURITY.md` §1 — 세션 전략 | **DB 세션** (`strategy: 'database'`)
- 문제: 스펙 §1은 DB 세션을 요구하며 괄호로 `strategy: 'database'`를 명시한다. 그러나 Auth.js v5는 Credentials 공급자와 `session.strategy === 'database'`가 함께 있으면 설정 자체를 거부한다. 스펙이 요구하는 이메일+비밀번호 로그인과 스펙이 명시한 옵션 값이 **동시에 성립할 수 없다.**
- 재현/근거: `node_modules/.../@auth/core/lib/utils/assert.js:114-119` — `hasCredentials && dbStrategy && onlyCredentials` 이면 `UnsupportedStrategy`. CI 런 32538124862에서 로그인 시도가 `/login?error=Configuration`으로 리다이렉트되며 `/api/me`가 401. **판정에 `onlyCredentials`가 포함되므로 Google을 설정한 환경에서는 통과하고 `AUTH_GOOGLE_ID`가 없는 환경에서만 터진다** — 환경에 따라 로그인이 되거나 안 되는 버그였다.
- 왜 게이트가 못 잡았는가: `config.test.ts`가 스펙의 **문구**를 그대로 단정(`expect(strategy).toBe('database')`)했다. 검증해야 할 것은 문구가 아니라 "Auth.js가 이 설정을 받아들이는가"였고, 그래서 로그인이 완전히 죽은 상태로 계속 초록이었다.
- 제안: 스펙의 실질 요구(즉시 취소 가능한 DB 세션)는 `config.ts`의 `jwt.encode` 브리지가 이미 충족한다 — 쿠키 값이 JWT가 아니라 실제 Session 행의 토큰이다. Auth.js에게 알리는 `strategy`는 "쿠키를 어떻게 만드는가"일 뿐이므로 `'jwt'`가 되어야 브리지가 동작한다.
- 영향/남은 판단: 코드를 `'jwt'`로 고쳤고 실질 계약(DB 세션·즉시 취소)은 유지된다. 다만 **스펙 §1의 괄호 문구는 실행 불가능한 값으로 남아 있다.** 스펙은 불변이라 수정하지 않았다. 사람이 §1 괄호를 `strategy: 'jwt'` + DB 세션 브리지로 정정할지 결정해야 한다.
- 결정: 코드를 `strategy: 'jwt'`로 수정. 테스트를 문구 단정에서 `rejectedByAuthjs()`(assert.js 판정을 그대로 옮긴 것) 검사로 교체하고, Google 있음/없음 두 환경 모두에서 확인한다. 스펙 문구 정정은 **사람 결정 대기**. (2026-08-22)
- 상태: OPEN (코드 수정 완료 / 스펙 문구 정정 미결)

## [ISS-007] 로그아웃이 DB 세션 행을 지우지 않아 실제로 취소되지 않았음
- 발견 단계: ISS-006 수정 중 (부수 발견)
- 스펙 위치: `07_AUTH_SECURITY.md` §1 (강제 로그아웃·기기 관리·즉시 정지), `05_API_CONTRACT.md` §7 (`* /api/auth/[...nextauth]` — 로그인/로그아웃 위임)
- 문제: 세션 쿠키는 JWT가 아니라 DB Session 행을 가리킨다. 그런데 Auth.js의 signOut은 `strategy: 'jwt'` 경로에서 `jwt.decode`만 부르고 `adapter.deleteSession`은 호출하지 않는다. 우리 `decode`는 항상 null을 돌려주므로 결과적으로 **쿠키만 지워지고 세션 행은 만료(30일)까지 살아있다.** 쿠키 값이 이미 새어나간 상황에서 로그아웃이 아무것도 취소하지 못한다.
- 재현/근거: `node_modules/.../@auth/core/lib/actions/signout.js` — `if (session.strategy === "jwt") { ...jwt.decode...; events.signOut({token}) } else { adapter.deleteSession(...) }`.
- 결정: `apps/web/src/auth/signout.ts`의 `withSessionRevocation`으로 `[...nextauth]`의 POST를 한 겹 감싼다. Auth.js에 **위임한 뒤**, 응답이 세션 쿠키를 비웠을 때만 행을 지운다 — 요청만 보고 미리 지우면 내장 CSRF를 통과하지 못한 요청으로도 강제 로그아웃이 가능해진다. 단위 테스트 8건으로 고정. (2026-08-22, 위임 범위 내 수정)
- 상태: RESOLVED

## [OBS-007] E2E 전체가 하나의 IP 신원을 공유해 인증 레이트리밋을 서로 잡아먹었음
- 발견 단계: T03 DoD 검증 (CI 런 32538124862)
- 스펙 위치: `05_API_CONTRACT.md` §10 (`POST /api/auth/*` 10회/10분, 키 IP)
- 문제: E2E는 모두 같은 호스트에서 오므로 레이트리밋 신원이 하나로 뭉친다. 스위트가 `auth` 버킷을 기본 7회 쓰는데 한도가 10회/10분이고 CI `retries: 2`가 붙어 있어, 한 건이라도 재시도되면 한도를 넘겨 **관계없는 테스트가 429로 무너진다.** 실제로 진짜 원인(ISS-006 로그인 불능)이 "가입 화면이 안 뜬다"로 위장돼 보였다.
- 결정: `apps/web/e2e/fixtures.ts`에서 `extraHTTPHeaders`를 테스트별 고유 XFF(10.0.0.0/8)로 오버라이드해 "서로 다른 사용자"를 정직하게 흉내낸다. 프로덕션에서는 OBS-006 수정으로 Caddy가 XFF를 덮어쓰므로 클라이언트가 이 값을 위조할 수 없다. 한도 자체는 전용 IP를 쓰는 전용 E2E가 따로 검증하며, 재시도로 자기 한도를 소진해도 실패하지 않는 형태로 작성했다. (2026-08-22, 위임 범위 내 수정)
- 상태: RESOLVED

## [OBS-008] Playwright `APIRequestContext`는 http로 `Secure` 쿠키를 보내지 않음
- 발견 단계: T14 DoD 검증 (CI 런 32538124862)
- 스펙 위치: `08_UIUX_SPEC.md` §7 (테마), `OBS-005`
- 문제: 테마 쿠키는 프로덕션 빌드에서 `Secure`가 붙는다. Chrome은 localhost 예외로 http에서도 이를 저장·전송하지만, Playwright의 `APIRequestContext`(`page.request`)는 규칙대로 http에 `Secure` 쿠키를 보내지 않는다. 그래서 브라우저 탐색·새로고침 단정은 통과하고 `page.request.get('/login')` 단정만 실패했다 — 제품 결함이 아니라 검증 도구 차이였다.
- 결정: 테마 E2E가 확인하려는 것은 "서버가 보낸 HTML에 테마가 이미 들어있는가"이므로, `page.request` 대신 **실제 탐색의 응답 본문**(`(await page.goto('/login'))?.text()`)을 읽는다. 브라우저 쿠키 저장소를 그대로 쓰므로 의도에 더 가깝다. (2026-08-22, 위임 범위 내 수정)
- 상태: RESOLVED

## [OBS-009] E2E 수집 오류가 CI 한 바퀴를 돌기 전에는 드러나지 않았음
- 발견 단계: T03 재검증 (CI 런 32539552603)
- 스펙 위치: `HARNESS.md` §1 (3층 게이트)
- 문제: `e2e/fixtures.ts` 의 픽스처 첫 인자를 `_fixtures` 로 썼다. Playwright 는 소스를 파싱해 픽스처 의존성을 알아내므로 첫 인자가 **구조분해 패턴**이어야 하고, 아니면 수집 단계에서 전체 스위트가 죽는다. eslint·tsc·depcruise 는 이것을 알 수 없어 L1 이 초록이었고, L3 에서 14개 테스트가 한 번도 실행되지 않은 채 실패했다 — 6분짜리 CI 왕복을 쓰고서야 알았다.
- 결정: `pnpm e2e:collect`(`playwright test --list`)를 L1 `gate:static` 에 추가한다. `--list` 는 webServer 를 띄우지 않고 DB 도 필요 없어 로컬에서 몇 초에 끝난다. 실패 시 실제로 exit 1 이 되는지 확인했다. (2026-08-22, 위임 범위 내 수정)
- 상태: RESOLVED

## [OBS-010] E2E 는 `next start` 로 검증하지만 프로덕션은 standalone 서버로 돈다
- 발견 단계: T03 재검증 (CI 런 32539552603 로그)
- 스펙 위치: `03_TECH_STACK.md` (Next.js `output: 'standalone'`), `infra/docker/web.Dockerfile`
- 문제: CI 로그에 Next 경고가 남는다 — `"next start" does not work with "output: standalone" configuration. Use "node .next/standalone/server.js" instead.` 서버는 정상 기동하고 테스트도 통과하지만, **E2E 가 검증하는 서버와 프로덕션이 실행하는 서버가 다르다.** standalone 번들에서만 드러나는 문제(누락된 런타임 의존성, 정적 파일 경로)는 E2E 를 통과한다.
- 참고: 로컬(Windows)에서는 standalone 빌드 자체가 심볼릭 링크 권한(EPERM)으로 실패해 재현이 불가하다. 검증은 CI/서버에서만 가능하다.
- 제안: Playwright `webServer.command` 를 standalone 서버 기동으로 바꾼다. `.next/static` 과 `public` 을 standalone 디렉터리로 복사하는 단계가 함께 필요하다 (Next 문서가 요구하는 절차).
- 영향: 지금 당장 실패하는 것은 없다. 다만 "E2E 초록 = 프로덕션 기동 안전" 이라고 말할 수 없다.
- 상태: OPEN (T03 재검증 초록 확인 후 별도 처리)

## [OBS-011] 브라우저 기본 검증이 접근성 오류 경로를 가로챘음
- 발견 단계: T03 재검증 (CI 런 32538124862 — `입력 오류가 해당 입력에 연결되어 읽힌다` 실패)
- 스펙 위치: `08_UIUX_SPEC.md` §10 (어디를 고쳐야 하는지 알 수 있어야 한다), `10_NFR.md` §10 (WCAG 2.1 AA)
- 문제: 가입·로그인 폼의 이메일 입력은 `type="email"` 인데 `<form>` 에 `noValidate` 가 없었다. 잘못된 이메일로 제출하면 **Chrome 이 제출 자체를 막고 자기 말풍선을 띄운다.** 그러면 zod 검증이 실행되지 않아 `aria-invalid`·`aria-describedby`·화면 문구가 전부 생기지 않는다. 스크린리더 사용자에게는 "어느 칸이 왜 틀렸는지" 가 전달되지 않는다.
- 재현/근거: E2E `입력 오류가 해당 입력에 연결되어 읽힌다` 가 `aria-invalid` 를 찾지 못해 실패. 처음에는 레이트리밋 고갈(OBS-007)의 부수 피해로 보였으나, 이 테스트는 네트워크를 타지 않는 클라이언트 검증 경로라 무관했다.
- 왜 게이트가 못 잡았는가: jsdom 은 constraint validation 의 제출 차단을 구현하지 않는다. 단위/컴포넌트 테스트로는 원리적으로 재현되지 않으며, 실제 브라우저 E2E 만이 잡을 수 있다.
- 결정: 두 폼에 `noValidate` 를 추가한다. 검증은 zod 단일 지점이 소유하고, 문구·스타일·스크린리더 연결을 우리가 통제한다. 행동 가드는 이미 존재하는 위 E2E 다 — 이 결함을 실제로 찾아낸 그 테스트다. (2026-08-22, 위임 범위 내 수정)
- 상태: RESOLVED

## [OBS-012] `apps/web/public` 이 없어 web 이미지를 빌드할 수 없었음
- 발견 단계: OBS-010 처리 중 (부수 발견)
- 스펙 위치: `02_REPO_LAYOUT.md` §4 — `apps/web/public/` (manifest.json, icons, sw.js)
- 문제: `infra/docker/web.Dockerfile` 의 runner 스테이지는 `COPY --from=build /app/apps/web/public ./apps/web/public` 을 수행한다. Docker 의 `COPY` 는 소스가 없으면 **빌드를 실패시킨다.** 그런데 `apps/web/public` 이 저장소에 없었다 — 즉 프로덕션 web 이미지는 지금까지 한 번도 빌드될 수 없는 상태였다.
- 재현/근거: `ls apps/web/public` → 없음. 스펙 §4 의 트리에는 존재한다. ISS-004 결정 A 로 이미지 빌드 검증이 T06 이후로 미뤄져 있어 아무도 실행하지 않았다.
- 결정: `apps/web/public/.gitkeep` 으로 계약된 디렉터리를 만든다. 스펙이 이 디렉터리에 요구하는 `manifest.json`·아이콘·`sw.js` 는 해당 소유 태스크가 채운다 — 지금 내용을 발명하지 않는다.
- 가드를 지금 넣지 않는 이유: Dockerfile 의 `COPY` 소스 전수 검사를 넣으면 `apps/worker` 가 아직 없어 즉시 실패한다. 그것은 ISS-004 결정 A 로 **이미 합의된 지연 상태**이며, 합의된 상태를 게이트가 막으면 게이트를 끄고 싶어진다. T06 으로 `apps/worker` 가 생긴 뒤 이 검사를 추가하는 것이 맞다.
- 상태: RESOLVED (가드는 T06 이후 과제)

## [ISS-008] 배포 파이프라인이 존재하지 않아 CI 초록이 사이트에 도달하지 않음
- 발견 단계: 사용자 질문 — "https://ilog.info/ 에는 하나도 달라진게없는데 왜?"
- 스펙 위치: `20_OPS/O01_DEPLOY.md` §1·§2 (게이트 통과가 배포 조건, 이미지는 CI 가 빌드, 태그는 커밋 SHA, `scripts/ops/deploy.sh {sha}`)
- 문제: `ilog.info` 는 Caddy 의 부트스트랩 정적 페이지를 서빙하고 있다. 응답 헤더 `X-AIDream-Mode: bootstrap`, `Content-Length: 4700` 이 `infra/caddy/bootstrap/index.html`(4700 바이트)과 정확히 일치한다. 즉 앱으로 프록시가 넘어간 적이 없다. CI 초록과 사이트 변경 사이에 세 개가 비어 있다.
  1. **이미지 빌드·push 워크플로가 없다** — `.github/workflows/` 에 `gate.yml` 하나뿐. O01 §2 가 요구하는 `aidream/web:{sha}` 이미지가 생성된 적이 없다.
  2. **`scripts/ops/deploy.sh` 가 없다** — O01 §2 가 참조하지만 `scripts/ops/` 에는 `harden-ssh.sh`, `minio-init.sh`, `provision-server.sh`, `verify-infra.sh` 뿐이다.
  3. **서버가 부트스트랩 모드다** — `BOOTSTRAP_MODE=false` 와 `WEB_IMAGE={sha}` 설정이 필요하다. `docker-compose.prod.yml` 은 `WEB_IMAGE: ${WEB_IMAGE:?...}` 로 불변 태그를 강제하므로 이미지 없이는 뜨지 않는다.
- 덧붙여: OBS-012 로 30분 전까지 web 이미지는 **빌드 자체가 불가능**했다. ISS-004 결정 A 로 이미지 검증이 T06 이후로 미뤄져 있어 드러나지 않았다.
- 지금 배포하면 안 되는 이유: 앱의 화면은 `/login`·`/signup`·`/verify`·`/studio`(리다이렉트) 뿐이고 **`/` 는 404** 다 (홈 피드는 T09 소관). 부트스트랩을 끄면 지금의 소개 페이지가 404 로 바뀐다.
- 결정: **T04 부터 원래 INDEX 순서를 유지한다.** 배포 파이프라인은 별도 과제로 남긴다. 레지스트리는 **GitHub Container Registry**(`ghcr.io`, `GITHUB_TOKEN` 으로 push 가능 — 추가 자격증명 불필요)를 쓴다. (2026-08-22, 사용자 결정)
- 진행 (2026-08-22, 사용자가 "서버에서도 배포 해야함" 지시): 세 공백 중 둘을 메웠다.
  1. **이미지 빌드·push** — `gate.yml` 에 `image` 잡 추가. `needs: gate` 로 O01 §1 의 "게이트 통과가 배포 조건" 을 구조로 만들었다. 태그는 커밋 SHA, `latest` 없음. 워커 이미지는 `apps/worker` 가 생기면 **스스로 켜진다** (사람이 워크플로를 고쳐야 켜지는 구조로 두면 켜는 것을 잊는다).
  2. **`scripts/ops/deploy.sh`** — 사전 확인 → pull → 마이그레이션(별도 1회성 컨테이너) → 워커(그레이스풀) → 웹 → 헬스 확인 → **실패 시 직전 태그로 자동 롤백**. 직전 이미지는 `.deploy-state` 에 남긴다.
  3. **서버 적용은 남아 있다** — `BOOTSTRAP_MODE=false` 로 바꾸고 `deploy.sh` 를 실행하는 일. 이 세션에서는 서버 SSH 접근이 차단되어 있어 대신 수행할 수 없다. 명령은 사람이 실행해야 한다.
- 배포 전 선결: 부트스트랩을 끄면 `/` 가 404 가 된다 (Caddy 의 부트스트랩 분기가 `/api/*` 외 전부를 가로채므로 앱과 공존 불가). 임시 홈 `app/(main)/page.tsx` 를 만들어 해소했다 — **가짜 피드가 아니라 정직한 비어있음 상태**다. T09 가 피드로 교체한다.
- 남은 판단: 배포 시점은 최소 홈 화면이 생긴 뒤여야 한다. T09 완료 시점 또는 그 전에 임시 랜딩을 넣을지는 사람 결정.
- 상태: OPEN (의도적 보류 — 순서 결정 완료)

## [OBS-013] 하나의 `CDN_BASE_URL` 로 공개 버킷 두 개를 서빙해야 하는데 개발/CI 값은 한 버킷만 가리킨다
- 발견 단계: T04/S1
- 스펙 위치: `06_MEDIA_PIPELINE.md` §1 (버킷·키 구조, 변경 금지) · §5 (CDN URL 단일 지점), `03_TECH_STACK.md` §6 (`CDN_BASE_URL` 하나)
- 문제: 공개 버킷은 `aidream-hls` 와 `aidream-thumbs` 두 개인데 환경변수는 `CDN_BASE_URL` 하나다. 키가 `hls/…` · `thumbs/…` 로 시작하므로 **CDN 이 첫 경로 세그먼트로 오리진을 갈라주면** 하나의 호스트로 둘을 서빙할 수 있다 — 키 접두사가 존재하는 이유가 바로 그것으로 읽힌다. 스펙은 모순이 아니다.
  문제는 **개발/CI 값**이다. 현재 `CDN_BASE_URL=http://127.0.0.1:9000/aidream-hls` 로 버킷 하나를 직접 가리킨다. 그래서 `thumbUrl()` 이 만든 URL 은 `…/aidream-hls/thumbs/{assetId}/thumb.jpg` 가 되어 **엉뚱한 버킷**을 가리킨다. MinIO 단독으로는 경로 라우팅을 할 수 없다.
- 지금 깨지지 않는 이유: `cdn.ts` 의 단위 테스트는 문자열만 본다(슬래시 중복/누락). T04 의 통합 테스트도 CDN URL 로 실제 GET 을 하지 않는다. 즉 **게이트는 초록인데 개발/CI 에서 썸네일 URL 은 해석 불가**다. 이 상태로 두면 T07(플레이어)·T09(피드)에서 "이미지가 안 나온다" 로 처음 드러난다.
- 제안: 개발/CI 에 프로덕션과 같은 경로 라우팅을 세운다. dev compose 에 MinIO 앞단 라우팅(예: Caddy 로 `/hls/*` → `aidream-hls`, `/thumbs/*` → `aidream-thumbs`)을 두고 `CDN_BASE_URL` 을 그 앞단으로 돌린다. 그러면 개발·CI·프로덕션이 같은 규칙을 쓴다.
- 영향: T04 구현 자체는 막히지 않는다 — `cdnUrl(key)` 는 `CDN_BASE_URL` 과 키를 잇는 것으로 정의가 명확하다. 막히는 것은 "CDN URL 이 실제로 객체에 도달하는가" 를 검증하는 일이다.
- 결정: T04 는 그대로 진행한다. 라우팅 정비는 T04 DoD 에 넣지 않고, 검증이 실제로 필요해지는 시점(T07 이전)에 인프라 과제로 처리한다. 그때까지 `thumbUrl()`·`avatarUrl()` 은 **문자열 수준까지만 검증됐다**고 본다 — 초록을 도달성 증명으로 읽지 않는다.
- 해결 (2026-08-24): 개발 compose 에 전용 Caddy CDN 프록시를 추가했다. `/hls/*` 는 `S3_BUCKET_HLS`, `/thumbs/*` 는 `S3_BUCKET_THUMBS` 로만 전달하며, CI와 로컬의 `CDN_BASE_URL` 은 공통 출처 `http://127.0.0.1:9002` 를 사용한다. storage 통합 테스트가 두 버킷의 실제 객체를 같은 CDN 출처로 읽어 회귀를 막는다.
- 상태: RESOLVED

## [OBS-014] 10_NFR §8 의 커버리지 대상 일부가 게이트에 연결되어 있지 않았다
- 발견 단계: T04/S3
- 스펙 위치: `10_NFR.md` §8 (커버리지 기준 표), `HARNESS.md` §1 L3
- 문제: §8 표는 `packages/storage` 70%, `packages/media` 85%, `packages/queue` 70%, `apps/worker/src/jobs` 70% 를 요구한다. 그런데 `vitest.config.ts` 의 커버리지 `include` 는 `packages/core`, `packages/db`, `apps/web/src`, `scripts` 뿐이었다. **스펙이 요구하는 기준을 게이트가 재지 않는 상태**였다 — 통과해도 그 항목에 대해서는 아무것도 증명하지 않는다.
- 결정: `packages/storage` 는 실제 코드가 생겼으므로 지금 연결한다 (include + 70% 임계값). 나머지 셋은 아직 `export {}` 뿐인 자리표시자거나(`packages/media`, `packages/queue`) 디렉터리 자체가 없다(`apps/worker`). 빈 모듈에 임계값을 걸면 0/0 을 두고 도구가 무엇을 보고하든 의미가 없으므로, **각 코드가 생기는 태스크에서 함께 연결한다** — T06(media·worker), T05(queue).
- 재발 방지 제안: `scripts/contract/check-coverage.ts` — §8 표를 파싱해, 소스가 존재하는 모든 대상이 `vitest.config.ts` 에 스펙 이상의 임계값으로 등록되어 있는지 검사한다. 지금 넣으면 위 자리표시자들 때문에 바로 실패하므로 T06 이후가 적절하다. (OBS-012 의 Docker COPY 검사와 같은 이유 — 합의된 지연 상태를 게이트가 막으면 게이트를 끄고 싶어진다)
- 상태: RESOLVED (storage·media·queue·worker 모두 커버리지 게이트 연결 완료)

## [OBS-015] `completeMultipart` 가 던져도 업로드는 이미 완료됐을 수 있다
- 발견 단계: T04/S3
- 스펙 위치: `06_MEDIA_PIPELINE.md` §2, `09_ERROR_CATALOG.md` (`E_UPLOAD_ALREADY_COMPLETED` 409, 멱등 처리)
- 문제: `CompleteMultipartUpload` 응답에는 객체 크기가 없다. 업로드 총량 회계가 크기를 필요로 하므로 완료 **직후 HeadObject** 로 실제 값을 읽는다(클라이언트가 신고한 파트 크기 합을 믿지 않기 위해서다). 그런데 완료는 성공하고 HeadObject 가 일시적으로 실패하면 **호출자에게는 실패로 보인다.** 호출자가 재시도하면 uploadId 는 이미 소멸했으므로 S3 가 `NoSuchUpload` 를 주고, 우리는 그것을 `E_UPLOAD_SESSION_EXPIRED`(410) 로 옮긴다 — 성공한 업로드가 "세션 만료" 로 끝난다.
- 왜 storage 계층에서 고치지 않는가: 여기서는 "완료된 적이 있는가" 를 알 방법이 없다. 그 사실을 아는 것은 `upload_session` 을 들고 있는 서비스 계층이다.
- T05 가 해야 할 일: complete 재시도에서 `E_UPLOAD_SESSION_EXPIRED` 를 받으면 **객체 존재를 먼저 확인**한다. 존재하면 `E_UPLOAD_ALREADY_COMPLETED` 로 멱등 처리하고(에러 카탈로그가 이미 그 코드를 정의해 두었다), 없으면 진짜 만료다.
- 상태: RESOLVED (T05 `completeMultipartIdempotently` 구현 및 성공/만료 분기 테스트 완료)

## [OBS-016] `@aidream/storage` 배럴이 미들웨어(Edge 런타임) 빌드를 깨뜨렸다
- 발견 단계: T04/S3 (CI 런 32565988473 — `Build web app` 실패)
- 스펙 위치: `07_AUTH_SECURITY.md` §6 (미들웨어가 CSP 를 만든다), `06_MEDIA_PIPELINE.md` §5 (CDN URL 단일 지점)
- 문제: OBS-013 대응으로 미들웨어가 CSP 의 CDN 출처를 `@aidream/storage` 의 `cdnOrigin()` 에서 가져오게 했다. 그런데 배럴이 `get-object.ts` 를 함께 끌어오고 그것이 `node:stream` 을 쓴다. **미들웨어는 Edge 런타임**이라 Node 코어 모듈을 쓸 수 없어 webpack 이 실패했다.
  ```
  Import trace: node:stream ← packages/storage/src/get-object.ts ← packages/storage/src/index.ts
  ```
- 결정: `packages/storage` 에 `./cdn` 서브패스 export 를 열고 미들웨어가 그것을 쓴다. `cdn.ts` 는 `@aidream/core`(zod, Node 임포트 없음)와 `buckets.ts` 만 의존하므로 Edge 안전하다. 배럴에는 "Node 런타임 전용" 이라고 명시했다 — T07 의 플레이어가 클라이언트에서 `masterUrl` 을 쓸 때도 서브패스를 써야 S3 SDK 가 브라우저 번들에 실리지 않는다.
- 가드: `dependency-cruiser` 에 `middleware-must-be-edge-safe` 규칙을 추가했다. CI 6분 왕복 대신 로컬 수 초에 잡힌다.
- **가드를 만들며 겪은 것 (기록 가치가 있다)**: 처음에는 `to: { reachable: true, path: '^node:' }` 로 전이 의존을 보려 했다. 통과했지만 **되돌려도 통과했다** — 거짓 초록이었다. 두 가지가 겹쳐 있었다.
  1. 코어 모듈은 그래프에 `node:` 접두사 **없이** 들어온다 (`stream`, `crypto`).
  2. 고쳐도 여전히 안 잡혔다. `doNotFollow: node_modules` 때문에 워크스페이스 패키지가 베어 스펙파이어(`@aidream/storage`)에서 그래프가 끊겨 전이 추적 자체가 불가능하다.
  전역 해석 설정을 바꾸면 기존 규칙들의 동작까지 흔들리므로, **Node 전용 배럴을 이름으로 금지**하는 좁은 규칙으로 바꿨다. 좁은 대신 실제로 발동하는 것을 확인했다. 전이 검출은 CI 의 `Build web app` 이 최종 방어선이다.
  또 하나: `path: '^apps/web/middleware\.ts$'` 는 **문자열**이라 `\.` 가 그냥 `.` 이 된다(아무 문자와 매칭). eslint 의 `no-useless-escape` 가 잡아 주었고 `[.]` 로 바꿨다.
- 상태: RESOLVED

## [ISS-009] 업로드 레이트리밋·일일 총량이 두 스펙에서 다르다
- 발견 단계: T05/S1
- 스펙 위치: `11_CAPACITY_TIERS.md` §3 (티어별 상한), `05_API_CONTRACT.md` §10 (레이트리밋 표), `06_MEDIA_PIPELINE.md` §2 ("모든 상한은 capacity 객체에서 읽는다. 리터럴 금지")
- 문제: 같은 값을 두 스펙이 다르게 적고 있다.

  | 항목 | `11_CAPACITY_TIERS` T0 | `05_API_CONTRACT` §10 |
  |---|---|---|
  | 시간당 업로드 세션 | **5회** | 20회 / 1시간 |
  | 일일 업로드 총량 | **10GiB** | 50GB / 1일 |

  §10 의 두 값은 T1/T2 와 정확히 일치한다 — 티어 표의 한 시점을 고정 값처럼 옮겨 적은 것으로 보인다.
- 결정: **capacity 를 따른다.** `06_MEDIA_PIPELINE` §2 가 "리터럴 금지, capacity 에서 읽는다" 를 명시하고 그 이유(T0→T1 승급 시 코드가 바뀌면 안 된다)까지 적어 두었으므로 우선한다. 안전한 방향이기도 하다 — T0 쪽이 더 엄격하고, 2GB VPS 에서 시간당 20세션·일 50GB 는 실제로 위험하다.
- 남은 판단: `05_API_CONTRACT` §10 의 두 행이 "티어에 따름(T0: 5회 / 10GiB)" 으로 정정되어야 한다. 스펙은 불변이라 수정하지 않았다 — **사람 결정 대기.**
- 영향: 결정 전에도 T05 구현은 막히지 않는다. capacity 를 읽는 쪽이 더 엄격하므로 나중에 §10 이 맞다고 판명되어도 한도를 푸는 방향의 변경이다.
- 상태: OPEN (구현은 capacity 기준으로 진행 / 스펙 문구 정정 미결)

## [OBS-017] CORS `ExposeHeaders: ETag` 검사가 존재하지만 실행되지 않았다
- 발견 단계: T05/S1 (문서가 "S1 에서 반드시 확인하라" 고 지목한 항목)
- 스펙 위치: `T05_UPLOAD.md` §5, `O07_ONBOARDING.md` (업로드 시 ETag 오류 → CORS 누락)
- 문제: 브라우저가 파트 PUT 응답의 `ETag` 를 읽어야 멀티파트를 완료할 수 있다. 버킷 CORS 에 `ExposeHeaders: ETag` 가 없으면 브라우저가 그 헤더를 가려 **완료가 영구히 불가능**하다. `scripts/ops/verify-infra.sh` 가 이미 같은 단정을 갖고 있었지만 **어느 워크플로도 그 스크립트를 실행하지 않는다** — OBS-014(커버리지 미연결)와 같은 종류다.
- 결정: 게이트가 실제로 도는 자리로 옮겼다. `packages/storage/src/storage.integration.test.ts` 에 3건 — ETag 노출, 출처 허용, 그리고 **서명 URL 로의 PUT 이 CORS 를 통과하고 ETag 를 읽을 수 있는가**(실제 업로드 경로).
- 범위 한계: 개발/CI 스택(MinIO)만 검증한다. MinIO 는 서버 전역 `MINIO_API_CORS_ALLOW_ORIGIN` 으로 설정되지만 프로덕션(Linode Object Storage)은 **버킷별 CORS 정책**이 필요하고, 그것은 `O01_DEPLOY` 런북의 수동 체크 항목으로만 존재한다. 초록을 프로덕션 증명으로 읽지 않는다. 자동화는 배포 파이프라인(ISS-008)과 함께.
- 상태: RESOLVED (개발/CI) / OPEN (프로덕션 버킷 CORS 자동화)

## [ISS-010] 서비스 이름이 스펙과 라이브 사이트에서 다르다
- 발견 단계: 배포 준비 (임시 홈 작성 중)
- 스펙 위치: `00_PRODUCT.md` §1 — "**AIDREAM** 은 AI로 제작된 드라마를…"
- 문제: 스펙과 앱 메타데이터는 **AIDREAM**, 라이브 도메인과 부트스트랩 페이지는 **iLOG** 다 (`ilog.info`, `<title>iLOG — 이야기가 스크린이 되는 곳</title>`). 배포하는 순간 방문자에게 이름이 바뀐 것처럼 보인다.
- 결정: 스펙이 계약이므로 **AIDREAM** 으로 화면을 만들되, `messages/ko.ts` 의 `brand.name` 한 곳에서만 읽게 했다. 바꾸기로 하면 한 줄이다.
- 남은 판단: 어느 쪽이 진짜 제품명인가. 도메인이 `ilog.info` 이므로 iLOG 가 실제 의도일 가능성이 있다. 그렇다면 `00_PRODUCT.md` 를 정정해야 한다 — 스펙은 불변이라 수정하지 않았다. **사람 결정 대기.**
- 상태: OPEN

## [OBS-018] 프로덕션 compose 가 워커 없이는 아무것도 띄울 수 없었다
- 발견 단계: 배포 파이프라인 작성 (ISS-008 대응)
- 스펙 위치: `O01_DEPLOY.md` §1 (태그는 커밋 SHA, latest 금지), `T01_INFRA_DOCKER.md`
- 문제: `docker-compose.prod.yml` 의 `worker`·`scheduler` 가 `${WORKER_IMAGE:?...}` 를 쓴다. Compose 는 **파일 전체를 먼저 보간**하므로, 어떤 서비스를 올리든 변수가 없으면 통째로 거부한다. `apps/worker` 는 T06 에서 생기므로 그때까지 **web-only 배포까지 막힌다.**
- 결정: 두 서비스를 `profiles: ['media']` 로 옮기고 `${WORKER_IMAGE:-}` 로 완화했다. 태그 강제는 `scripts/ops/deploy.sh` 가 `DEPLOY_WORKER=1` 일 때만 검사한다 — 결정이 실제로 내려지는 자리에 두는 편이 정확하고, 파일 보간 시점의 부작용도 없다.
- 상태: RESOLVED
