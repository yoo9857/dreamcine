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

  it('연결 실패(PrismaClientInitializationError)를 E_DB_UNAVAILABLE 로 본다', () => {
    // Prisma 6.19.3 의 이 오류에는 code / errorCode 가 없다. 이름이 유일한 단서다.
    const initializationError = Object.assign(new Error('cannot reach db'), {
      name: 'PrismaClientInitializationError',
      clientVersion: '6.19.3',
    })

    const mapped = mapPrismaError(initializationError)
    expect(mapped.code).toBe('E_DB_UNAVAILABLE')
    expect(mapped.cause).toBe(initializationError)
  })

  it('errorCode 만 있는 오류도 코드로 매핑한다', () => {
    expect(mapPrismaError({ errorCode: 'P1001' }).code).toBe('E_DB_UNAVAILABLE')
  })

  it('알 수 없는 이름의 오류는 코드 규칙을 그대로 따른다', () => {
    expect(
      mapPrismaError({ name: 'PrismaClientValidationError', code: 'P2002' })
        .code,
    ).toBe('E_DB_CONFLICT')
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
