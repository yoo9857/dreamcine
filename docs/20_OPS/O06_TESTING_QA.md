# O06 — 테스트 전략 · 품질 기준

> 테스트는 하네스의 3번째 층(L3)이다. 이 문서는 **무엇을 어떤 방식으로
> 테스트하는가**를 고정한다. 각 태스크의 §7 은 이 규칙을 따른다.

---

## 1. 테스트 피라미드 (이 프로젝트의 비율)

```
        ╱╲          E2E (Playwright)  — 10개 (US-01~US-10)
       ╱  ╲         느리다. 사용자 시나리오만.
      ╱────╲
     ╱      ╲       통합 (Vitest + testcontainers) — 약 150개
    ╱        ╲      DB/S3/ffmpeg 실물. 계층 조립 검증.
   ╱──────────╲
  ╱            ╲    단위 (Vitest) — 약 400개
 ╱              ╲   순수 함수 중심. 빠르고 촘촘하게.
╱────────────────╲
```

**의도적으로 순수 함수에 테스트를 몰아넣는다.** `packages/core` 의 상태기계,
랭킹 산식, 렌디션 결정, 권한 판정, 업로드 정책은 전부 순수 함수이며
**이 프로젝트의 버그가 가장 많이 숨는 곳**이다.

## 2. 커버리지 기준 (게이트)

> 이 표의 **원천은 `00_SPEC/10_NFR.md` §8** 이다. 값이 어긋나면 10_NFR 이 옳다.

| 대상 | 최소 | 근거 |
|---|---|---|
| `packages/core` | **90%** | 순수 함수. 못 할 이유가 없다 |
| `packages/media` | 85% | ffmpeg 인자 실수가 가장 비싸다 |
| `packages/db` | 70% | testcontainers 통합 |
| `packages/storage` | 70% | MinIO 통합 |
| `packages/queue` | 70% | |
| `apps/web/src/services` | 75% | 유스케이스 |
| `apps/web/src/http` | 85% | `withRoute` 는 모든 라우트의 기반 |
| `apps/worker/src/jobs` | 70% | |
| `apps/web/app` | 제외 | E2E 로 대체 |
| `apps/web/src/components` | 제외 (선별) | 상태기계가 있는 것만 |
| **전체** | **70%** | |

```ts
// vitest.config.ts
coverage: {
  provider: 'v8',
  thresholds: {
    lines: 70, functions: 70, branches: 65, statements: 70,
    'packages/core/**':    { lines: 90, functions: 90, branches: 85 },
    'packages/media/**':   { lines: 85, functions: 85 },
    'apps/web/src/http/**':{ lines: 85, functions: 85 },
  },
  exclude: ['**/*.test.ts', '**/generated/**', 'apps/web/app/**', '**/*.config.*'],
}
```

**커버리지는 하한선이지 목표가 아니다.** 90% 를 채우려고 의미 없는 테스트를
쓰는 것은 하네스를 약화시키는 것과 같다. 아래 §3 의 "무엇을 테스트하는가" 가 더 중요하다.

## 3. 무엇을 반드시 테스트하는가

### 필수 3종 (모든 함수)

| # | 종류 | 예시 |
|---|---|---|
| 1 | **정상 경로** | 올바른 입력 → 기대 출력 |
| 2 | **실패 경로 + 에러코드** | 잘못된 입력 → 정확한 `ErrorCode` |
| 3 | **경계값** | 0, 1, 최대, 최대+1, 빈 배열, null |

**2번에서 에러코드까지 단정한다.** `expect(fn).toThrow()` 만으로는 부족하다.

```ts
// ✗ 부족
await expect(createUpload({ fileSize: 9e9 })).rejects.toThrow()

// ○ 충분
await expect(createUpload({ fileSize: 9e9 })).rejects.toMatchObject({
  code: 'E_UPLOAD_TOO_LARGE',
})
```

### 이 프로젝트에서 특별히 중요한 것 (버그가 실제로 나오는 곳)

| 영역 | 반드시 테스트 | 이유 |
|---|---|---|
| **상태기계** | 전이 전수 조합 | 조건 하나 빠뜨리면 잘못된 상태로 갈 수 있다 |
| **멱등성** | 같은 동작 2회 → 결과 1회 | 네트워크 재시도로 실제 발생. 카운터/과금이 틀어진다 |
| **커서 페이지네이션** | 동일 정렬키 다수 + 중간 삽입 | 중복/누락이 재현 어렵고 사용자에게 바로 보인다 |
| **동시성** | N병렬 → 카운터 정확 | 경합은 프로덕션에서만 재현된다 |
| **권한** | 역할 × 동작 × 소유관계 전조합 | 구멍 하나가 보안 사고 |
| **렌디션 결정** | 가로/세로/저해상도/짝수 | 세로 영상 버그가 실제로 흔하다 |
| **N+1 쿼리** | 쿼리 횟수 단정 | 조용히 성능을 죽인다 |
| **리소스 정리** | 성공/실패 양쪽에서 삭제 확인 | 디스크가 조용히 찬다 |
| **직렬화** | BigInt → string | JSON 정밀도 손실 |
| **새니타이즈** | 경로 탈출, 제어문자 | 보안 |

### 전수 조합 테스트 작성 패턴

```ts
// 표로 정의하고 반복 실행. 조합을 손으로 나열하지 않는다.
const CASES: Array<[EpisodeStatus, EpisodeStatus, AssetStatus | null, boolean]> = [
  ['DRAFT',     'PUBLISHED', 'READY',       true ],
  ['DRAFT',     'PUBLISHED', 'TRANSCODING', false],
  ['DRAFT',     'PUBLISHED', null,          false],
  ['REMOVED',   'PUBLISHED', 'READY',       false],
  // ... 전 조합
]

it.each(CASES)('%s → %s (asset=%s) = %s', (from, to, asset, expected) => {
  expect(checkEpisodeTransition({ current: from, next: to, assetStatus: asset, ... }).ok)
    .toBe(expected)
})
```

## 4. 계층별 테스트 방식

| 계층 | 도구 | 실물/모킹 |
|---|---|---|
| `packages/core` | Vitest | **모킹 없음** (순수 함수라 불필요) |
| `packages/db` | Vitest + testcontainers | **실제 Postgres** |
| `packages/storage` | Vitest + MinIO 컨테이너 | **실제 S3 API** |
| `packages/media` | Vitest + 실제 ffmpeg | **실제 ffmpeg** (인자는 스냅샷) |
| `apps/web/src/services` | Vitest | 리포지토리만 모킹, 도메인은 실물 |
| `apps/web/src/http` | Vitest | Request/Response 실물 (Web API) |
| `apps/worker/src/jobs` | Vitest | 큐는 모킹, 나머지 실물 |
| 컴포넌트 | Testing Library + msw | HTTP 만 모킹 |
| E2E | Playwright | **전부 실물** (dev 스택 기동) |

### 모킹 원칙

```
모킹은 최소화한다. 이유:
- 모킹한 것은 검증되지 않는다
- S3 호환성, Postgres 동작, ffmpeg 인자는 모킹으로 절대 안 잡힌다

모킹해도 되는 것:
- 외부 네트워크 (SMTP, OAuth 공급자)
- 시간 (vi.useFakeTimers)
- 랜덤 (시드 고정)
- 컴포넌트 테스트의 HTTP (msw)

모킹하면 안 되는 것:
- DB (testcontainers 를 쓴다)
- S3 (MinIO 를 쓴다)
- ffmpeg (실제로 돌린다)
- 도메인 로직 (순수 함수이므로 모킹할 이유가 없다)
```

## 5. 픽스처 정책

| 종류 | 방법 |
|---|---|
| DB 데이터 | 팩토리 함수 (`packages/db/tests/factories/`). 각 테스트가 필요한 것만 생성 |
| 영상 파일 | **`ffmpeg -f lavfi` 로 테스트 시 생성**. 바이너리를 저장소에 커밋하지 않는다 |
| 손상 파일 | 랜덤 바이트를 `.mp4` 확장자로 생성 |
| 세션/인증 | 헬퍼 (`createAuthedContext(role)`) |
| 시간 | `vi.setSystemTime()`. `Date.now()` 직접 호출 금지 (테스트 불가) |

```bash
# 테스트용 영상 생성 예 (5초 720p, 오디오 포함)
ffmpeg -f lavfi -i testsrc=size=1280x720:rate=30:duration=5 \
       -f lavfi -i sine=frequency=440:duration=5 \
       -c:v libx264 -c:a aac -shortest out.mp4

# 세로 영상
ffmpeg -f lavfi -i testsrc=size=720x1280:rate=30:duration=5 ... 

# 오디오 없는 영상 (실패 케이스)
ffmpeg -f lavfi -i testsrc=size=1280x720:rate=30:duration=5 -c:v libx264 noaudio.mp4
```

### DB 테스트 격리

```ts
// 각 테스트 파일이 자기 스키마를 쓴다 (병렬 실행 가능)
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start()
  await migrate(container.getConnectionUri())
})
beforeEach(async () => {
  await truncateAll()      // 트랜잭션 롤백보다 명시적 truncate 가 디버깅에 유리
})
afterAll(async () => { await container.stop() })
```

## 6. E2E 시나리오 (정확히 10개)

`00_PRODUCT.md` §5 의 US-01~US-10 과 **1:1 대응**한다.
E2E 를 늘리지 않는다 — 느려지고 불안정해진다.

| 파일 | 시나리오 |
|---|---|
| `auth.e2e.ts` | US-01 가입 → 인증 → 로그인 |
| `upload-flow.e2e.ts` | US-02 시리즈 생성 → 업로드, US-09 중단 → 재개 |
| `playback.e2e.ts` | US-03 변환 후 재생, US-04 이어보기 |
| `social.e2e.ts` | US-05 팔로우 → 피드, US-06 좋아요/댓글 → 알림 |
| `moderation.e2e.ts` | US-07 신고 → 숨김 |
| `schedule.e2e.ts` | US-08 예약공개, US-10 변환 실패 → 재시도 |

### E2E 안정성 규칙 (플레이키 방지)

| 규칙 | 이유 |
|---|---|
| `waitForSelector` / `expect().toBeVisible()` 사용 | 고정 `sleep` 금지 |
| 테스트마다 독립 계정 생성 | 계정 공유 시 순서 의존 발생 |
| 작은 테스트 영상 (5초, 360p) 사용 | 변환 시간 단축 |
| 트랜스코드 완료는 폴링 대기 (최대 120초) | |
| 시각 조작은 API 로 (`?__test_now=`) | 실제 대기 금지 |
| 실패 시 스크린샷 + 트레이스 저장 | 원인 파악 |
| 재시도 1회 허용 | 단, **재시도로 통과한 것은 로그에 남기고 원인을 찾는다** |

**플레이키 테스트를 방치하면 하네스가 무의미해진다.**
"다시 돌리면 되는" 테스트는 아무것도 보장하지 않는다.
플레이키가 발견되면 `_ISSUES.md` 에 등록하고 고친다.

## 7. 성능 테스트 (게이트에 포함)

| 항목 | 도구 | 기준 |
|---|---|---|
| LCP / CLS / INP | Lighthouse CI | `10_NFR.md` §1 |
| 번들 크기 | `@next/bundle-analyzer` + 예산 | 초기 JS ≤ 200KB gzip |
| hls.js 가 초기 번들에 없음 | 번들 분석 | 필수 |
| 피드 API p95 | 부하 테스트 (선택) | ≤ 300ms (1000개 시드) |
| 쿼리 실행 계획 | `EXPLAIN ANALYZE` 테스트 | Seq Scan 금지 |

```ts
// 쿼리 계획 테스트 예 — 인덱스 사용을 강제한다
it('피드 쿼리가 인덱스 스캔을 사용한다', async () => {
  const plan = await prisma.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
    `EXPLAIN (FORMAT JSON) ${feedQuerySql}`)
  const json = JSON.stringify(plan)
  expect(json).not.toContain('Seq Scan')
})
```

**이 테스트가 있으면** 나중에 누가 인덱스를 지우거나 쿼리를 바꿀 때
게이트가 막는다. 성능 회귀를 코드 리뷰가 아니라 기계가 잡는다.

## 8. 접근성 테스트

```ts
// apps/web/e2e/a11y.e2e.ts
const PAGES = ['/', '/series/{id}', '/watch/{id}', '/login', '/studio/upload']
for (const p of PAGES) {
  it(`${p} 접근성 위반 0`, async ({ page }) => {
    await page.goto(p)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations).toEqual([])
  })
}
```

`10_NFR.md` §10 기준. 위반 발견 시 게이트 실패.

## 9. 테스트 작성 금지 패턴

```ts
// ✗ 구현을 그대로 옮긴 테스트 (아무것도 검증하지 않음)
it('점수를 계산한다', () => {
  expect(rankScore(i)).toBe(i.views * 1 + i.likes * 8 + ...)   // 산식 복붙
})
// ○ 성질을 검증한다
it('참여도가 같으면 최신이 높다', () => {
  expect(rankScore({...base, publishedAt: recent})).toBeGreaterThan(
         rankScore({...base, publishedAt: old}))
})

// ✗ 모든 것을 모킹해서 아무 실제 코드도 실행되지 않는 테스트
// ✗ 스냅샷 남용 (무엇이 왜 그런지 알 수 없다) — ffmpeg 인자처럼 정당한 경우만
// ✗ it.skip 을 커밋 (HARNESS §6 위반)
// ✗ 여러 개를 한 it 에 (실패 시 어디가 문제인지 모른다)
// ✗ 고정 sleep
// ✗ 실행 순서에 의존
// ✗ 프로덕션 DB/스토리지에 접근
```

## 10. CI 실행 전략

```yaml
# .github/workflows/gate.yml (개요)
jobs:
  static:     # 1~2분 — 가장 빠른 피드백
    - pnpm lint && pnpm typecheck && pnpm depcruise && pnpm format:check
  contract:   # 1분
    - pnpm contract:openapi && pnpm contract:prisma && pnpm contract:errors
  unit:       # 2~3분
    - pnpm vitest run --coverage packages/core packages/media
  integration:# 5~8분 (testcontainers)
    - pnpm vitest run --coverage packages/db packages/storage apps
  e2e:        # 10~15분 (dev 스택 + ffmpeg)
    needs: [static, contract, unit]
    - docker compose -f infra/compose/docker-compose.dev.yml up -d
    - pnpm playwright test
  perf:
    needs: [e2e]
    - lhci autorun
```

| 규칙 | 이유 |
|---|---|
| 빠른 것부터 | 린트 실패를 15분 뒤에 알면 안 된다 |
| `static`/`contract`/`unit` 은 병렬 | |
| `e2e` 는 앞이 통과해야 실행 | 자원 절약 |
| 실패 시 아티팩트 업로드 (스크린샷/트레이스/커버리지) | 원인 파악 |
| main 브랜치 보호: 전체 통과 필수 | 하네스의 마지막 관문 |

## 11. 로컬 개발 시 권장 흐름

```bash
# 코드 쓰는 중 — 빠른 반복
pnpm vitest --watch packages/core

# 커밋 전 — husky 가 자동 실행
pnpm gate:static           # 1~2분

# 푸시 전 — 전체
pnpm gate                  # 10~20분

# 특정 태스크 진행 상황
pnpm sss:remaining
```

**`pnpm gate` 를 로컬에서 통과시키고 푸시한다.**
CI 를 디버깅 도구로 쓰면 피드백 루프가 10배 느려진다.
