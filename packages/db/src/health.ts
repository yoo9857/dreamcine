import { AppError } from '@aidream/core'
import { db } from './client.js'
import { mapPrismaError } from './errors.js'

export interface DbHealth {
  ok: boolean
  latencyMs: number
}

/**
 * DB readiness probe. PrismaClient 를 외부로 노출하지 않는다.
 * 타임아웃을 넘기면 `E_DB_UNAVAILABLE` 로 확정한다 — readiness 판정은 기다리는
 * 것보다 빠르게 실패하는 것이 낫다. (05_API_CONTRACT.md §9)
 */
/**
 * 커넥션 풀을 닫는다. 워커·테스트의 정상 종료 경로에서만 쓴다.
 * PrismaClient 자체는 여전히 외부로 나가지 않는다.
 */
export async function disconnectDb(): Promise<void> {
  await db.$disconnect()
}

export async function checkDbHealth(timeoutMs: number): Promise<DbHealth> {
  const startedAt = Date.now()
  let timer: NodeJS.Timeout | undefined

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new AppError('E_DB_UNAVAILABLE', { reason: 'timeout', timeoutMs }))
    }, timeoutMs)
    timer.unref()
  })

  try {
    await Promise.race([db.$queryRaw`select 1`, timeout])
    return { ok: true, latencyMs: Date.now() - startedAt }
  } catch (error: unknown) {
    throw mapPrismaError(error)
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  }
}
