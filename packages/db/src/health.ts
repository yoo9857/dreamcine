import { AppError } from '@aidream/core'
import { db } from './client.js'
import { mapPrismaError } from './errors.js'

export interface DbHealth {
  ok: boolean
  latencyMs: number
}

/**
 * 커넥션 풀을 닫는다. 워커·테스트의 정상 종료 경로에서만 쓴다.
 * PrismaClient 자체는 여전히 외부로 나가지 않는다.
 */
export async function disconnectDb(): Promise<void> {
  await db.$disconnect()
}

/**
 * 주어진 시간 안에 끝나지 않으면 `onTimeout()` 이 만든 오류로 거절한다.
 *
 * 별도 함수로 둔 이유: 타임아웃 분기는 **절대 끝나지 않는 작업**으로만 결정적으로
 * 검증할 수 있다. 실제 DB 질의와 타이머를 경합시키면 어느 쪽이 이길지 환경에
 * 따라 달라져 테스트가 불안정해진다. (CI run 32494337241 에서 실제로 겪었다)
 */
export async function withDeadline<T>(
  work: Promise<T>,
  timeoutMs: number,
  onTimeout: () => Error,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(onTimeout())
    }, timeoutMs)
    timer.unref()
  })

  try {
    return await Promise.race([work, deadline])
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  }
}

/**
 * DB readiness probe. PrismaClient 를 외부로 노출하지 않는다.
 * 타임아웃을 넘기면 `E_DB_UNAVAILABLE` 로 확정한다 — readiness 판정은 기다리는
 * 것보다 빠르게 실패하는 것이 낫다. (05_API_CONTRACT.md §9)
 */
export async function checkDbHealth(timeoutMs: number): Promise<DbHealth> {
  const startedAt = Date.now()

  try {
    await withDeadline(
      db.$queryRaw`select 1`,
      timeoutMs,
      () => new AppError('E_DB_UNAVAILABLE', { reason: 'timeout', timeoutMs }),
    )
    return { ok: true, latencyMs: Date.now() - startedAt }
  } catch (error: unknown) {
    throw mapPrismaError(error)
  }
}
