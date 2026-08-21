import { describe, expect, it } from 'vitest'
import { AppError } from '@aidream/core'
import { mapPrismaError } from '../src/errors.js'

describe('Prisma error mapping', () => {
  it.each([
    ['P2002', 'E_DB_CONFLICT'],
    ['P2003', 'E_DB_CONFLICT'],
    ['P2025', 'E_NOT_FOUND'],
    ['P1001', 'E_DB_UNAVAILABLE'],
    ['P1002', 'E_DB_UNAVAILABLE'],
    ['P2024', 'E_DB_UNAVAILABLE'],
    ['P2028', 'E_DB_CONFLICT'],
    ['P9999', 'E_INTERNAL'],
  ] as const)('maps %s to %s', (prismaCode, expected) => {
    const mapped = mapPrismaError({
      code: prismaCode,
      meta: { target: ['email'] },
    })
    expect(mapped.code).toBe(expected)
    expect(mapped.cause).toEqual({
      code: prismaCode,
      meta: { target: ['email'] },
    })
  })

  it('preserves an existing AppError', () => {
    const original = new AppError('E_DB_CONFLICT')
    expect(mapPrismaError(original)).toBe(original)
  })

  it('maps unknown thrown values to E_INTERNAL', () => {
    expect(mapPrismaError('database exploded')).toMatchObject({
      code: 'E_INTERNAL',
      cause: 'database exploded',
    })
  })
})
