# HARNESS — SSS 하네스 규율

> 이 문서는 CODEX의 **최상위 규칙**이다. 다른 모든 문서보다 우선한다.
> 여기 적힌 게이트를 통과하지 않은 코드는 존재하지 않는 것으로 취급한다.

---

## 1. 하네스란 무엇인가

**하네스(harness)** = 코드를 감싸서 **정해진 궤도 밖으로 못 나가게 붙잡는 장치**.
사람이 리뷰해서 막는 게 아니라, **명령 하나가 기계적으로 막는다**.

이 프로젝트의 하네스는 3개 층으로 되어 있다.

| 층 | 이름 | 붙잡는 대상 | 실행 방법 |
|---|---|---|---|
| L1 | **정적 하네스** | 타입·린트·포맷·의존 방향 | `pnpm gate:static` |
| L2 | **계약 하네스** | API/DB/에러코드가 스펙과 일치하는지 | `pnpm gate:contract` |
| L3 | **행위 하네스** | 실제로 동작하는지 (단위·통합·E2E) | `pnpm gate:test` |

`pnpm gate` = L1 + L2 + L3 전부.

### 하네스 철칙 4개

1. **게이트 없는 진행 금지** — 단계가 끝났다는 근거는 게이트 통과 로그뿐이다.
2. **레드 상태 커밋 금지** — 게이트가 빨간 상태로 다음 파일을 건드리지 않는다.
3. **하네스를 약화시키는 수정 금지** — 테스트를 skip 하거나, `any` / `@ts-ignore` /
   `eslint-disable` 로 통과시키는 것은 **실패로 간주**한다.
   (예외: `docs/20_OPS/O02_EXCEPTION_POLICY.md`에 등재된 허용 목록만)
4. **2회 실패 = 정지** — 같은 게이트를 두 번 연속 못 넘기면 사람에게 보고한다.
   혼자 우회로를 찾지 않는다.

---

## 2. SSS = Spec → Skeleton → Stub

모든 태스크(`10_TASKS/T*.md`)는 **반드시 S1 → S2 → S3 순서**로 수행한다.
단계를 합치거나 건너뛰는 것은 금지다.

### S1 : SPEC (코드 0줄)

- **할 일**: 태스크 문서와 참조 스펙을 읽고, "만들 것 목록"을 **파일 경로 단위**로 확정해 출력한다.
- **산출물**: 생성/수정할 파일 경로 목록 + 각 파일의 책임 1줄
- **게이트**: 목록 승인 (자동화 불가, 사람 또는 상위 에이전트) + 목록에 스펙 밖 파일이 없는지 자기검증
- **금지**: 파일 생성, 패키지 설치, 스키마 수정

### S2 : SKELETON (골격만, 로직 금지)

- **허용**: 폴더, 파일, 타입/인터페이스/zod 스키마, 함수 시그니처, Prisma 모델,
  라우트 껍데기, 컴포넌트 껍데기, 에러 클래스 정의, 테스트 파일의 `it.todo(...)`
- **금지**: 분기 로직, DB 쿼리 실행, 외부 호출, 하드코딩된 가짜 응답
- **함수 본문은 반드시**: `throw new NotImplementedError('T05:step2')`
- **게이트**: `pnpm gate:s2` (= typecheck + lint + depcruise + format)

### S3 : STUB → 구현

- `NotImplementedError` 를 **하나씩** 실제 구현으로 바꾼다.
- **규칙**: 한 번에 함수 1개. 함수 1개 구현 → 그 함수의 테스트 통과 → 다음 함수.
  여러 개를 동시에 채우지 않는다.
- **필수 동반물** (없으면 미완성):
  1. 정상 경로 테스트 1개 이상
  2. 실패 경로 테스트 1개 이상 (에러코드까지 단정)
  3. `00_SPEC/09_ERROR_CATALOG.md` 에 등재된 에러코드만 사용
- **게이트**: `pnpm gate:s3` (= static + contract + test)

```
S1 ──게이트: 목록승인──▶ S2 ──게이트: gate:s2──▶ S3 ──게이트: gate:s3──▶ 완료
 │                        │                        │
 └─ 실패 시 스펙 재독      └─ 실패 시 시그니처 수정   └─ 실패 시 구현 수정
    (2회 실패 → 정지)         (2회 실패 → 정지)         (2회 실패 → 정지)
```

### S2에서 반드시 쓰는 센티넬

```ts
// packages/core/src/errors/not-implemented.ts
export class NotImplementedError extends Error {
  readonly code = 'E_NOT_IMPLEMENTED'
  constructor(public readonly marker: string) {
    super(`[SSS:S2] not implemented yet: ${marker}`)
  }
}
```

`marker` 는 반드시 `T{태스크번호}:{단계이름}` 형식. 예: `T06:probeInput`.
이 마커 개수 = **남은 구현량**이며, `pnpm sss:remaining` 이 세어서 보고한다.

```
$ pnpm sss:remaining
T05 upload      : 2/7  남음
T06 transcode   : 7/7  남음
합계 9개 NotImplementedError 잔존
```

**S3 완료 조건: 해당 태스크 범위의 NotImplementedError 잔존 = 0**

---

## 3. 게이트 정의 (package.json scripts)

```jsonc
{
  "scripts": {
    "gate":          "pnpm gate:static && pnpm gate:contract && pnpm gate:test",
    "gate:s2":       "pnpm gate:static",
    "gate:s3":       "pnpm gate",

    "gate:static":   "pnpm lint && pnpm typecheck && pnpm depcruise && pnpm format:check",
    "gate:contract": "pnpm contract:openapi && pnpm contract:prisma && pnpm contract:errors && pnpm contract:limits && pnpm contract:deps && pnpm contract:capacity",
    "gate:test":     "vitest run --coverage && playwright test --pass-with-no-tests",

    "lint":          "eslint . --max-warnings 0",
    "typecheck":     "tsc -b",
    "depcruise":     "depcruise apps packages --config .dependency-cruiser.cjs",
    "format:check":  "prettier --check .",

    "contract:openapi": "tsx scripts/contract/check-openapi.ts",
    "contract:prisma":  "tsx scripts/contract/check-prisma.ts",
    "contract:errors":  "tsx scripts/contract/check-error-catalog.ts",
    "contract:limits":  "tsx scripts/contract/check-limits.ts",
    "contract:deps":    "tsx scripts/contract/check-deps.ts",
    "contract:capacity":"tsx scripts/contract/check-capacity.ts",

    "sss:remaining":  "tsx scripts/sss/count-remaining.ts"
  }
}
```

### 계약 하네스 3종이 실제로 검사하는 것

| 스크립트 | 검사 내용 | 잡히는 실수 |
|---|---|---|
| `contract:openapi` | 라우트 핸들러의 zod 입출력 ↔ `05_API_CONTRACT.md`에서 생성한 `openapi.json` 일치 | 스펙에 없는 필드를 응답에 추가 |
| `contract:prisma` | `schema.prisma` ↔ 마이그레이션 히스토리 드리프트 없음 | 스키마만 고치고 마이그레이션 누락 |
| `contract:errors` | 코드에서 던지는 모든 에러코드가 `09_ERROR_CATALOG.md`에 등재됨 + `status-map`/`error-messages` 누락 없음 | 카탈로그 밖 에러코드 발명 |
| `contract:limits` | `packages/core/src/limits.ts` ↔ 스펙 문서의 숫자 일치 (`10_NFR.md` §4) | 문서엔 댓글 1000자, 코드엔 500자 |
| `contract:deps` | `package.json` 직접 의존성 ↔ `03_TECH_STACK.md` 허용 목록 일치 | 승인 없이 라이브러리 추가 |
| `contract:capacity` | `capacity.ts` ↔ `11_CAPACITY_TIERS.md` §3 표 ↔ compose 의 `cpus`/`mem_limit`/`WORKER_CONCURRENCY` 3자 일치 | 코드는 T0, compose 는 T1 값 |

---

## 4. 의존 방향 하네스

이 규칙을 어기면 `pnpm depcruise` 가 빨개진다. 아키텍처가 썩는 걸 기계가 막는다.

```
apps/web    ──▶ packages/api-client ──▶ (HTTP)
apps/web    ──▶ packages/ui
apps/web    ──▶ packages/db
apps/worker ──▶ packages/media
apps/worker ──▶ packages/db
packages/ui ──▶ packages/core            (ui 는 core 만 참조)
packages/db ──▶ packages/core
packages/core ──▶ (아무것도 참조 안 함)   ◀── 순수 도메인. 최하층.
```

**금지 (하네스가 차단)**

- `packages/core` 가 상위 어떤 것도 import — React, Next, Prisma 포함 전부 금지
- `packages/ui` → `apps/*` import
- `apps/web` → `apps/worker` 직접 import (반드시 큐를 통해)
- 순환 참조 전면 금지
- `apps/web/app/**` 에서 `@prisma/client` 직접 import → 반드시 `packages/db` 경유

```js
// .dependency-cruiser.cjs 핵심 규칙
module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'core-is-pure',
      severity: 'error',
      from: { path: '^packages/core' },
      to: { pathNot: '^packages/core|^node:|node_modules/(zod|date-fns)/' },
    },
    {
      name: 'no-app-to-app',
      severity: 'error',
      from: { path: '^apps/web' },
      to: { path: '^apps/worker' },
    },
    {
      name: 'route-no-direct-prisma',
      severity: 'error',
      from: { path: '^apps/web/app' },
      to: { path: 'node_modules/@prisma/client' },
    },
  ],
}
```

---

## 5. CODEX 세션 1회의 표준 형태

한 세션 = **태스크 1개의 한 단계**. 그 이상 욕심내지 않는다.

```
[세션 시작]
1. docs/HARNESS.md 읽음                            ← 항상
2. docs/10_TASKS/T06_TRANSCODE_WORKER.md 읽음       ← 이번 대상
3. 그 문서의 "참조 스펙" 목록만 추가로 읽음
4. 현재 단계 확인 (문서 상단 진행 상태 체크박스)
5. 해당 단계 작업 수행
6. 게이트 실행 → 로그 전문 출력
7. 초록 → 태스크 문서 체크박스 갱신 + 커밋
   빨강 → 원인 수정 → 6번 반복 (최대 2회, 그 후 정지)

[세션 종료 보고 — 반드시 이 3줄]
   - 통과한 게이트 이름
   - 남은 NotImplementedError 개수
   - 다음 세션이 할 일 한 줄
```

### 커밋 메시지 규격 (commitlint 로 강제)

```
T06/S2: transcode worker skeleton

- packages/media/src/probe.ts        (시그니처만)
- apps/worker/src/jobs/transcode.ts  (핸들러 껍데기)
gate:s2 PASS (lint 0, tsc 0, depcruise 0)
```

정규식: `^T\d{2}/S[123]: .{5,60}$`

---

## 6. 금지 행위 (하네스 위반 = 즉시 롤백)

| 금지 | 이유 | 대신 이것을 |
|---|---|---|
| `any`, `as any`, `@ts-ignore` | 타입 하네스 무력화 | `unknown` + zod 파싱 |
| 파일 전체 `eslint-disable` | 린트 하네스 무력화 | 해당 줄만 + 이유 주석 필수 |
| S3에서 `it.skip` 잔존 | 행위 하네스 무력화 | 구현하거나 태스크를 쪼갠다 |
| `console.log` | 관측 불가 | `logger` (T11 참조) |
| 빈 `catch {}` 삼킴 | 장애 은폐 | `O02_EXCEPTION_POLICY.md` 규칙 |
| 스펙 문서 임의 수정 | 계약 파기 | `docs/_ISSUES.md` 기록 후 정지 |
| 여러 태스크 동시 진행 | 원인 추적 불가 | 한 번에 하나 |
| 라이브러리 임의 추가 | 스택 드리프트 | `03_TECH_STACK.md` 목록 내에서만 |

---

## 7. 스펙이 틀렸을 때 (유일한 탈출구)

CODEX는 스펙을 고칠 권한이 없다. 대신 이렇게 한다.

```md
<!-- docs/_ISSUES.md 에 추가 -->
## [ISS-007] T06 트랜스코드 프리셋이 세로영상에서 깨짐
- 발견 단계: T06/S3
- 스펙 위치: 00_SPEC/06_MEDIA_PIPELINE.md §3 프리셋 표
- 문제: 1080x1920 입력에 고정 scale 적용 시 세로 길이가 규격을 벗어남
- 제안: 종횡비 조건부 scale 표현식으로 변경
- 상태: OPEN (사람 판단 대기)
```

그리고 **그 태스크를 멈춘다.** 다른 태스크로 넘어가지 않는다.
사람이 스펙을 고치고 `상태: RESOLVED` 로 바꾸면 재개한다.

---

## 8. 진행 상태의 유일한 원천

각 `T*.md` 상단에 이 블록이 있고, CODEX는 **게이트 통과 후에만** 체크한다.

```md
## 진행 상태
- [x] S1 Spec 확인   — 2026-08-21 / 파일목록 7개 확정
- [x] S2 Skeleton    — 2026-08-21 / gate:s2 PASS
- [ ] S3 구현        — 잔존 NotImplementedError 4개
```

`docs/INDEX.md` 의 전체 진행표는 이 체크박스를 집계한 것이다.
사람이 손으로 고치지 않는다.
