import { describe, expect, it } from 'vitest'

import { AppError } from '../src/errors/app-error.js'

describe('AppError', () => {
  it('에러코드를 message로 사용한다', () => {
    const error = new AppError('E_NOT_FOUND')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AppError')
    expect(error.code).toBe('E_NOT_FOUND')
    expect(error.message).toBe('E_NOT_FOUND')
  })

  it('detail과 cause를 보존한다', () => {
    const cause = new Error('database unavailable')
    const error = new AppError('E_DB_UNAVAILABLE', { operation: 'read' }, cause)

    expect(error.detail).toEqual({ operation: 'read' })
    expect(error.cause).toBe(cause)
  })
})
