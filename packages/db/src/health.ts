import { NotImplementedError } from '@aidream/core'

export interface DbHealth {
  ok: boolean
  latencyMs: number
}

/**
 * DB readiness probe. PrismaClient 를 외부에 노출하지 않는다.
 * (05_API_CONTRACT.md §9 `/api/ready`)
 */
export function checkDbHealth(_timeoutMs: number): Promise<DbHealth> {
  throw new NotImplementedError('T03:dbHealth')
}
