# O02 — 예외처리 표준 (전 코드 공통 규약)

> 이 문서는 **모든 태스크에 동시에 적용된다.** 코드를 쓸 때마다 참조한다.
> `09_ERROR_CATALOG.md` 가 "무슨 에러가 있는가" 라면, 이 문서는 "어떻게 다루는가" 다.

---

## 1. 대원칙 5개

| # | 원칙 | 의미 |
|---|---|---|
| 1 | **삼키지 않는다** | 빈 `catch {}` 금지. 모든 예외는 처리되거나 전파된다. |
| 2 | **분류한다** | 예외를 `AppError` + 카탈로그 코드로 바꾼다. 미분류는 `E_INTERNAL`. |
| 3 | **한 곳에서 변환한다** | 예외 → HTTP 는 `withRoute` 만, 예외 → 잡 결과는 `withJob` 만. |
| 4 | **경계에서 잡는다** | 중간 계층은 잡지 않고 올린다. 문맥 추가가 필요할 때만 감싼다. |
| 5 | **부수기능은 본기능을 막지 않는다** | 알림·조회수·진행률 실패가 재생·업로드를 깨뜨리지 않는다. |

## 2. 예외의 4가지 종류와 대응

| 종류 | 예시 | 대응 |
|---|---|---|
| **사용자 오류** | 잘못된 입력, 권한 없음, 중복 | 4xx + 명확한 안내. 로그 레벨 `info`/없음. 알럿 안 함. |
| **일시적 장애** | DB 타임아웃, S3 5xx, 네트워크 | 재시도. `warn` 로그. 반복되면 알럿. |
| **영구적 실패** | 손상 파일, 미지원 코덱 | 즉시 확정 실패. 재시도 안 함. `info`/`warn`. 사용자에게 원인 안내. |
| **버그** | null 참조, 타입 오류, 불변식 위반 | 500 + `error` 로그 + 스택 + 알럿. **숨기지 않는다.** |

**가장 흔한 실수**: 버그를 일시적 장애처럼 재시도한다. 같은 버그가 3번 실행되고
로그만 3배가 된다. `AppError` 가 아닌 예외는 재시도하지 않는 것이 기본이다.

## 3. 계층별 책임

```
┌ 라우트 (app/api/**) ────────────────────────────────────┐
│ try/catch 금지. withRoute 가 전부 처리한다.               │
│ 하는 일: zod 파싱 → 서비스 호출 → 결과 반환                │
└─────────────────────────────────────────────────────────┘
┌ 서비스 (src/services/**) ───────────────────────────────┐
│ AppError 를 던진다. HTTP 를 모른다.                       │
│ 하위 예외를 문맥에 맞게 재분류한다 (예: P2002 → EMAIL_TAKEN)│
│ 트랜잭션 경계를 지킨다.                                    │
└─────────────────────────────────────────────────────────┘
┌ 도메인 (packages/core) ─────────────────────────────────┐
│ AppError 를 던지거나, 판정 결과를 반환한다.                 │
│ 순수하므로 I/O 예외가 없다. 불변식 위반만 던진다.            │
└─────────────────────────────────────────────────────────┘
┌ 인프라 (packages/db, storage, media, queue) ────────────┐
│ 외부 라이브러리 예외를 AppError 로 변환한다. ★ 필수         │
│ 원본 예외는 cause 에 보존한다.                             │
│ 라이브러리 타입이 상위로 새어나가지 않게 한다.               │
└─────────────────────────────────────────────────────────┘
┌ 워커 (apps/worker) ─────────────────────────────────────┐
│ withJob 이 처리한다. 재시도 여부는 에러코드가 결정한다.       │
└─────────────────────────────────────────────────────────┘
```

**인프라 계층의 변환이 핵심이다.** 여기서 변환하지 않으면
`PrismaClientKnownRequestError` 나 `S3ServiceException` 같은 라이브러리 타입이
서비스와 라우트로 퍼진다. 그러면 라이브러리 교체가 불가능해진다.

## 4. 코드 패턴

### 4-1. 올바른 예외 변환 (인프라 계층)

```ts
// packages/db/src/errors.ts
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    switch (e.code) {
      case 'P2002': return new AppError('E_DB_CONFLICT',
                       { fields: e.meta?.target }, e)
      case 'P2025': return new AppError('E_NOT_FOUND', undefined, e)
      case 'P2024': return new AppError('E_DB_UNAVAILABLE', { reason: 'pool' }, e)
      default:      return new AppError('E_INTERNAL', { prisma: e.code }, e)
    }
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return new AppError('E_DB_UNAVAILABLE', undefined, e)
  }
  return new AppError('E_INTERNAL', undefined, e)
}
```

### 4-2. 서비스 계층의 문맥 재분류

```ts
// apps/web/src/services/auth/signup.ts
try {
  return await userRepo.createUser(data)
} catch (e) {
  const err = toAppError(e)
  if (err.code === 'E_DB_CONFLICT') {
    // 문맥을 아는 곳에서 구체화한다
    const fields = err.detail?.fields as string[] | undefined
    if (fields?.includes('email'))  throw new AppError('E_USER_EMAIL_TAKEN', undefined, e)
    if (fields?.includes('handle')) throw new AppError('E_USER_HANDLE_TAKEN', undefined, e)
  }
  throw err
}
```

### 4-3. 부수기능 실패 격리

```ts
// 좋아요는 성공했다. 알림 실패로 좋아요를 롤백하면 안 된다.
await addLike(episodeId, userId)                 // 본기능 — 실패하면 던진다

void notify({ type: 'NEW_LIKE', ... }).catch((e) => {
  logger.error({ err: e, episodeId, userId }, 'notification failed')
  // 필요하면 재시도 큐에 넣는다. 사용자 응답은 이미 성공.
})
```

`void` + `.catch()` 를 쓴다. `await` 없는 프로미스는 `no-floating-promises` 가 잡으므로
**의도를 명시**해야 한다. 이것이 하네스와 협력하는 방식이다.

### 4-4. 리소스 정리 보장

```ts
// apps/worker/src/lib/workspace.ts
export async function withWorkspace<T>(id: string, fn: (dir: string) => Promise<T>) {
  const dir = path.join(env.TMP_DIR, id)
  await fs.mkdir(dir, { recursive: true })
  try {
    return await fn(dir)
  } finally {
    // ★ 삭제 실패가 원래 예외를 덮어쓰지 않게 한다
    await fs.rm(dir, { recursive: true, force: true })
      .catch((e) => logger.error({ err: e, dir }, 'workspace cleanup failed'))
  }
}
```

**`finally` 안에서 던지면 원래 예외가 사라진다.** 정리 실패는 로그만 남긴다.

### 4-5. 재시도 (일시적 장애만)

```ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts: number; baseMs: number; retryable: (e: AppError) => boolean },
): Promise<T> {
  let last: unknown
  for (let i = 0; i < opts.attempts; i++) {
    try { return await fn() } catch (e) {
      const err = toAppError(e)
      if (!opts.retryable(err) || i === opts.attempts - 1) throw err
      last = err
      logger.warn({ err, attempt: i + 1 }, 'retrying')
      await sleep(opts.baseMs * 4 ** i)         // 1s → 4s → 16s
    }
  }
  throw last
}
```

`retryable` 판정은 `09_ERROR_CATALOG.md` §6 의 ○/✗ 표를 코드로 옮긴
`isRetryable(code)` 함수를 쓴다. 호출부마다 다르게 판단하지 않는다.

## 5. 금지 패턴 (린트로 차단)

```ts
// ✗ 빈 삼킴
try { await doSomething() } catch {}

// ✗ 로그만 하고 계속 (호출자는 성공으로 오해한다)
try { await doSomething() } catch (e) { logger.error(e) }
// → 부수기능이면 4-3 패턴을 쓰고, 본기능이면 던진다

// ✗ 문자열 throw
throw 'not found'

// ✗ 일반 Error
throw new Error('업로드 실패')          // 코드가 없어 클라이언트가 분기 불가

// ✗ 라우트에서 직접 응답 생성
try { ... } catch (e) { return new Response('error', { status: 500 }) }

// ✗ 카탈로그 밖 코드 발명
throw new AppError('E_UPLOAD_WEIRD_THING')      // contract:errors 가 실패시킴

// ✗ 사용자에게 내부 정보 노출
return { error: { message: e.stack } }

// ✗ 조건 없는 재시도
while (true) { try { return await fn() } catch { /* 계속 */ } }
```

## 6. 예외 → 로그 레벨 매핑 (기계적으로 결정)

```ts
function logLevelFor(code: ErrorCode, status: number): 'info' | 'warn' | 'error' {
  if (code === 'E_INTERNAL') return 'error'
  if (status >= 500) return 'error'
  if (code === 'E_RATE_LIMITED') return 'warn'
  if (code === 'E_PERM_DENIED' || code === 'E_PERM_NOT_OWNER') return 'warn'  // 공격 신호
  if (status >= 400) return 'info'      // 평범한 사용자 오류
  return 'info'
}
```

**4xx 를 `error` 로 남기지 않는다.** 사용자가 잘못 입력하는 것은 정상이며,
그걸 error 로 남기면 진짜 에러가 노이즈에 묻힌다.

**예외**: `E_PERM_DENIED` 는 `warn` 이다. 정상 사용에서는 UI 가 애초에
그 동작을 막기 때문에, 이 에러가 자주 나오면 공격 시도이거나 UI 버그다.

## 7. 사용자에게 무엇을 보여줄 것인가

| 계층 | 노출 여부 |
|---|---|
| 에러코드 (`code`) | ○ 노출 (클라이언트 분기용) |
| 사용자 문구 (`message`) | ○ 노출 (`error-messages.ts` 사전) |
| 검증 실패 필드 (`fields`) | ○ 노출 (`E_VALIDATION` 만) |
| 요청 ID (`requestId`) | ○ 노출 (문의 시 추적용) |
| `detail` | **✗ 절대 금지** (내부 구조 노출) |
| 스택 트레이스 | **✗ 절대 금지** |
| DB 에러 원문 | **✗ 절대 금지** (스키마 노출) |
| 파일 경로 | **✗ 절대 금지** |

### 문구 작성 규칙

```
✗ "오류가 발생했습니다"                          — 무엇을 해야 할지 모른다
✗ "E_UPLOAD_TOO_LARGE"                       — 코드를 그대로 보여주지 않는다
✗ "Prisma error P2002 on episode_number_key" — 내부 노출

○ "업로드 가능한 최대 용량(2GB)을 초과했습니다. 파일을 나눠 올려주세요."
   ★ 괄호 안 숫자는 하드코딩하지 않는다. 문구를 템플릿으로 두고
     capacity.uploadMaxBytes 를 포맷해 넣는다 — 티어 승급 시 문구가 자동으로 맞는다.
     예: MESSAGES.E_UPLOAD_TOO_LARGE(formatBytes(cap.uploadMaxBytes))
○ "이미 사용 중인 화수입니다. 다음 사용 가능한 번호는 5화입니다."
○ "일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요. (문의: ABC123)"
```

**3요소를 담는다**: 무엇이 문제인가 / 왜 그런가 / 무엇을 하면 되는가.

## 8. 하네스 우회 허용 목록

`HARNESS.md` §6 은 `any`/`@ts-ignore`/`eslint-disable` 를 금지한다.
아래는 **명시적으로 허용된 예외**이며, 이 목록 밖의 사용은 위반이다.

| 위치 | 허용 | 이유 |
|---|---|---|
| `packages/db/src/errors.ts` | Prisma 에러 타입 좁히기용 `unknown` 캐스팅 | 라이브러리 타입 경계 |
| `packages/media/src/probe.ts` | ffprobe JSON 파싱 후 zod 검증 전 `unknown` | 외부 프로세스 출력 |
| `apps/web/src/http/handler.ts` | 조건부 세션 타입의 내부 캐스팅 1곳 | 조건부 타입 구현 한계 |
| 테스트 파일 | 의도적 잘못된 입력 주입 시 `as never` | 실패 경로 테스트 |
| 자동생성 파일 (`generated/**`) | lint 제외 | 생성물 |

새 항목 추가는 `_ISSUES.md` 승인을 거쳐 이 표에 등재한다.
표에 없는 우회가 발견되면 **되돌린다.**

## 9. 데이터 정합성이 깨졌을 때

| 상황 | 방침 |
|---|---|
| 카운터 불일치 | 보정 잡이 고친다. `warn` + 메트릭. 서비스는 계속. |
| 자산 없는 에피소드 | 재생 시 `E_ASSET_NOT_READY`. 소유자에게 알림. |
| 에피소드 없는 자산 (고아) | 7일 후 정리 잡이 삭제. |
| DB 에는 있고 스토리지에는 없는 HLS | 재생 실패 + **알럿**. 재트랜스코드 유도. |
| 스토리지에는 있고 DB 에는 없는 파일 | 정리 잡이 삭제 (프리픽스 대조). |
| 상태기계로 도달 불가능한 상태 발견 | `error` + 알럿. **자동 수정하지 않는다.** 사람이 판단. |

**마지막 항목이 중요하다.** 불가능한 상태는 버그의 증거다.
자동으로 고치면 버그가 숨는다. 알럿을 올리고 사람이 원인을 찾는다.

## 10. 체크리스트 (모든 S3 단계에서 확인)

- [ ] 새로 던지는 에러코드가 `09_ERROR_CATALOG.md` 에 있는가
- [ ] 실패 경로 테스트가 **에러코드까지** 단정하는가
- [ ] 인프라 호출을 `AppError` 로 변환했는가
- [ ] 부수기능 실패가 본기능을 막지 않는가
- [ ] 리소스(파일/커넥션/프로세스)를 `finally` 로 정리하는가
- [ ] 재시도가 일시적 장애에만 적용되는가
- [ ] 사용자 문구가 다음 행동을 제시하는가
- [ ] `detail` 이 응답에 새지 않는가
- [ ] 로그 레벨이 §6 규칙과 맞는가
- [ ] 빈 `catch` 가 없는가
