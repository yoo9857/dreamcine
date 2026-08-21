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
