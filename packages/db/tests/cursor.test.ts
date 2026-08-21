import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '@aidream/core'
import { decodeCursor, encodeCursor } from '../src/cursor.js'

const originalSecret = process.env.AUTH_SECRET

function expectAppError(
  operation: () => unknown,
  code: AppError['code'],
): void {
  try {
    operation()
    throw new Error(`expected ${code}`)
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(AppError)
    if (!(error instanceof AppError)) {
      throw error
    }
    expect(error.code).toBe(code)
  }
}

describe('signed feed cursor', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret-that-is-at-least-thirty-two-bytes'
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.AUTH_SECRET
    } else {
      process.env.AUTH_SECRET = originalSecret
    }
  })

  it('round-trips a tuple cursor without losing the tie-breaker', () => {
    const payload = { k: '2026-08-21T00:00:00.000Z', id: 'episode-01' }
    expect(decodeCursor(encodeCursor(payload))).toEqual(payload)
  })

  it('rejects a forged signature with the catalogued error', () => {
    const cursor = encodeCursor({ k: 42.5, id: 'episode-02' })
    const forged = `${cursor.slice(0, -1)}${cursor.endsWith('A') ? 'B' : 'A'}`

    expectAppError(() => decodeCursor(forged), 'E_FEED_INVALID_CURSOR')
  })

  it('rejects malformed payloads and missing secrets', () => {
    expectAppError(() => decodeCursor('not-a-cursor'), 'E_FEED_INVALID_CURSOR')
    delete process.env.AUTH_SECRET
    expectAppError(() => encodeCursor({ k: 1, id: 'episode-03' }), 'E_INTERNAL')
  })
})
