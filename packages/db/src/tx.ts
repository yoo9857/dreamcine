import type { Prisma } from '@prisma/client'
import { db } from './client.js'
import { mapPrismaError } from './errors.js'

export type TransactionClient = Prisma.TransactionClient

export async function withTransaction<T>(
  operation: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await db.$transaction(operation, { timeout: 10_000 })
    } catch (error: unknown) {
      const mapped = mapPrismaError(error)
      const shouldRetry =
        mapped.code === 'E_DB_CONFLICT' &&
        mapped.detail?.prismaCode === 'P2028' &&
        attempt === 0
      if (!shouldRetry) {
        throw mapped
      }
    }
  }

  throw new Error('unreachable transaction retry state')
}
