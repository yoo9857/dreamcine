# T00 — 부트스트랩: 모노레포 골격 + 하네스 설치

## 진행 상태
- [x] S1 Spec 확인   — 2026-08-21 / 산출물 경로 및 책임 승인
- [x] S2 Skeleton    — 2026-08-21 / gate:s2 PASS
- [x] S3 구현        — 2026-08-21 / gate:s3 PASS · TOTAL=0 · CI 32454394087 PASS

---

## 1. 목적

**하네스를 먼저 깐다.** 이 태스크가 끝나면 `pnpm gate` 가 실행되고,
빈 프로젝트에서도 lint/typecheck/depcruise/test 가 전부 초록이 된다.
이후 모든 태스크는 이 게이트 위에서만 진행된다.

> **이 태스크 없이 다른 태스크를 시작하면 안 된다.** 하네스 없는 코딩은 이 프로젝트의 방식이 아니다.

## 2. 참조 스펙

- `../HARNESS.md` (전체)
- `../GLOSSARY.md` §3 명명 규칙
- `../00_SPEC/02_REPO_LAYOUT.md` (전체)
- `../00_SPEC/03_TECH_STACK.md` §1, §7, §8

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `package.json` | 워크스페이스 루트 + **게이트 스크립트 전부** | S2 |
| `pnpm-workspace.yaml` | `apps/*`, `packages/*` | S2 |
| `turbo.json` | 태스크 파이프라인 (build/lint/typecheck/test) | S2 |
| `.nvmrc` | `22` | S2 |
| `tsconfig.json` | 루트 솔루션 파일 (`references` 로 전 패키지 연결) | S2 |
| `.dependency-cruiser.cjs` | 의존 방향 하네스 (HARNESS §4 그대로) | S2 |
| `commitlint.config.cjs` | 커밋 규격 정규식 | S2 |
| `.husky/pre-commit` | `pnpm gate:static` 실행 | S3 |
| `.husky/commit-msg` | commitlint 실행 | S3 |
| `.gitignore` | `node_modules`, `.next`, `.env*`, `*.log`, `.turbo` | S2 |
| `.prettierrc.cjs` / `.prettierignore` | 포맷 규칙 | S2 |
| `eslint.config.js` | flat config, `packages/config` 프리셋 사용 | S2 |
| `vitest.config.ts` | 워크스페이스 프로젝트 + 커버리지 임계값 | S2 |
| `packages/config/**` | eslint/tsconfig/prettier 공유 프리셋 | S2 |
| `packages/core/package.json` + `src/index.ts` | 빈 배럴 (의존 최하층 확립) | S2 |
| `packages/core/src/errors/not-implemented.ts` | **SSS 센티넬** | S3 |
| `packages/core/src/errors/app-error.ts` | `AppError` 클래스 | S3 |
| `packages/core/src/errors/codes.ts` | 에러코드 `as const` (카탈로그 전체) | S3 |
| `packages/core/src/enums.ts` | 상태 열거형 (GLOSSARY §4) | S3 |
| `packages/core/src/limits.ts` | `LIMITS` 제품 불변 한도 (10_NFR §4) | S3 |
| `packages/core/src/capacity.ts` | ★ `CAPACITY_TIERS` + `loadCapacity()` (11_CAPACITY_TIERS §3) | S3 |
| `packages/core/src/env.ts` | 환경변수 zod 스키마 + `CAPACITY_TIER` (03_TECH_STACK §6) | S3 |
| `scripts/sss/count-remaining.ts` | NIE 개수 집계 | S3 |
| `scripts/contract/check-error-catalog.ts` | 에러코드 대조 | S3 |
| `scripts/contract/check-limits.ts` | 스펙 숫자 ↔ `LIMITS` 대조 | S3 |
| `scripts/contract/check-capacity.ts` | `capacity.ts` ↔ 티어표 ↔ compose 3자 대조 | S3 |
| `scripts/contract/check-deps.ts` | 직접 의존성 ↔ 허용목록 대조 | S3 |
| `.github/workflows/gate.yml` | CI 에서 `pnpm gate` | S3 |
| `.env.example` | 전체 키 + 주석 | S2 |

**빈 껍데기 패키지도 S2 에서 전부 만든다**: `db` `storage` `media` `queue` `ui` `api-client`
— 각각 `package.json` + `src/index.ts` (빈 export) 만. 의존 방향 하네스가
처음부터 전체 그래프를 검사할 수 있게 하려는 목적.

## 4. S2 Skeleton

```ts
// packages/core/src/errors/not-implemented.ts
export class NotImplementedError extends Error {
  readonly code = 'E_NOT_IMPLEMENTED'
  constructor(public readonly marker: string) {
    super(`[SSS:S2] not implemented yet: ${marker}`)
    this.name = 'NotImplementedError'
  }
}
```

```ts
// packages/core/src/errors/codes.ts
export const ERROR_CODES = [
  // 09_ERROR_CATALOG.md 의 모든 코드를 순서대로. 하나도 빠뜨리지 않는다.
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]
```

```ts
// packages/core/src/errors/app-error.ts
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly detail?: Record<string, unknown>,
    readonly cause?: unknown,
  ) { super(code); this.name = 'AppError' }
}
```

```ts
// scripts/sss/count-remaining.ts
interface RemainingReport { byTask: Record<string, number>; total: number }
export async function countRemaining(root: string): Promise<RemainingReport> {
  throw new NotImplementedError('T00:countRemaining')
}
```

```ts
// scripts/contract/check-error-catalog.ts
export async function checkErrorCatalog(): Promise<{ ok: boolean; problems: string[] }> {
  throw new NotImplementedError('T00:checkErrorCatalog')
}
```

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T00:codes` | `09_ERROR_CATALOG.md` 의 표를 파싱해 `codes.ts` 를 **손으로** 정확히 옮긴다. 누락 금지. |
| 2 | `T00:enums` | `GLOSSARY.md` §4 열거형 |
| 3 | `T00:limits` | `10_NFR.md` §4 `LIMITS` (**사양 의존 값은 넣지 않는다**) |
| 3b | `T00:capacity` | `11_CAPACITY_TIERS.md` §3 `CAPACITY_TIERS` + `loadCapacity()` |
| 4 | `T00:env` | `03_TECH_STACK.md` §6 zod 스키마 + `CAPACITY_TIER` + `loadServerEnv()` |
| 5 | `T00:checkErrorCatalog` | MD 표 파싱 → `codes.ts` 배열과 집합 비교 → 차집합 출력 |
| 6 | `T00:checkLimits` | 스펙 MD 의 숫자 ↔ `LIMITS` 대조 |
| 6b | `T00:checkCapacity` | 티어표 ↔ `capacity.ts` ↔ compose 오버레이 3자 대조 |
| 6c | `T00:checkDeps` | `package.json` 직접 의존성 ↔ `03_TECH_STACK` 허용목록 |
| 7 | `T00:countRemaining` | 소스 전체에서 `new NotImplementedError('T\d+:` 정규식 매치 → 태스크별 집계 |
| 8 | `T00:huskyHooks` | pre-commit / commit-msg 훅 |
| 9 | `T00:ciWorkflow` | GitHub Actions: pnpm 캐시 → `pnpm gate` |

### `count-remaining.ts` 알고리즘

```
1. glob: apps/**/*.ts(x), packages/**/*.ts, scripts/**/*.ts  (node_modules/dist 제외)
2. 각 파일에서 /new NotImplementedError\(\s*['"](T\d{2}):([A-Za-z0-9_]+)['"]/g 매치
3. 태스크 번호별 카운트 + 마커 목록
4. 표로 출력. total 을 stdout 마지막 줄에 `TOTAL={n}` 형태로.
5. 종료코드는 항상 0 (정보 제공 도구이므로 게이트를 막지 않는다)
```

## 6. 예외처리

| 상황 | 에러코드 / 처리 |
|---|---|
| 환경변수 검증 실패 (부팅) | zod 에러를 사람이 읽을 형태로 출력 후 `process.exit(1)`. **부팅을 진행하지 않는다.** |
| `codes.ts` ↔ 카탈로그 불일치 | `check-error-catalog` 가 차집합을 양방향으로 출력하고 exit 1 |
| `LIMITS` ↔ 스펙 숫자 불일치 | `check-limits` 가 어느 파일 어느 값이 다른지 출력하고 exit 1 |
| depcruise 규칙 위반 | 위반 경로를 출력하고 exit 1 |
| 스크립트가 파일을 못 읽음 | 경로를 명시한 에러 메시지. 조용히 넘기지 않는다. |

## 7. 테스트

| 케이스 | 파일 |
|---|---|
| `NotImplementedError` 의 `code`/`marker`/메시지 형식 | `packages/core/tests/not-implemented.test.ts` |
| `AppError` 가 `code` 를 message 로 갖는다 | `packages/core/tests/app-error.test.ts` |
| `ERROR_CODES` 에 중복이 없다 | `packages/core/tests/codes.test.ts` |
| `loadServerEnv` 가 필수 키 누락 시 throw | `packages/core/tests/env.test.ts` |
| `loadServerEnv` 가 잘못된 URL 형식 거부 | 동일 |
| `countRemaining` 이 샘플 픽스처에서 정확히 집계 | `scripts/sss/count-remaining.test.ts` |
| `checkErrorCatalog` 가 누락/초과를 양방향 검출 | `scripts/contract/check-error-catalog.test.ts` |

## 8. 완료 조건 (DoD)

- [x] `pnpm install` 이 경고 없이 완료 — CI Node 22 frozen-lockfile, 경고 0
- [x] `pnpm gate` **전체 통과** (빈 프로젝트 상태에서)
- [x] `pnpm gate:static` 이 실제로 위반을 잡는지 **역검증**:
      일부러 `any` 를 넣어 lint 실패 확인 → 되돌림
      일부러 `packages/core` 에서 React import → depcruise 실패 확인 → 되돌림
- [x] `pnpm sss:remaining` 이 `TOTAL=0` 출력
- [x] 커밋 메시지 규격 위반 시 husky 가 실제로 거부하는지 확인
- [x] CI 에서 `pnpm gate` 초록 — run `32454394087`, 경고 0
- [x] `.env.example` 에 `03_TECH_STACK.md` §6 의 모든 키가 존재

**역검증이 DoD 에 있는 이유**: 하네스가 "존재"하는 것과 "작동"하는 것은 다르다.
설정 오류로 아무것도 검사하지 않는 하네스는 없는 것보다 나쁘다 (거짓 안심).
