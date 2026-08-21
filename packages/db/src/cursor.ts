import { createHmac, timingSafeEqual } from 'node:crypto'
import { AppError } from '@aidream/core'

export interface CursorPayload {
  k: string | number
  id: string
}

function cursorKey(): Buffer {
  const secret = process.env.AUTH_SECRET
  if (secret === undefined || secret.length < 32) {
    throw new AppError('E_INTERNAL', { reason: 'AUTH_SECRET is unavailable' })
  }
  return createHmac('sha256', secret).update('aidream:feed-cursor:v1').digest()
}

function sign(payload: string): Buffer {
  return createHmac('sha256', cursorKey()).update(payload).digest()
}

function invalidCursor(cause?: unknown): AppError {
  return new AppError('E_FEED_INVALID_CURSOR', undefined, cause)
}

export function encodeCursor(payload: CursorPayload): string {
  if (
    payload.id.length === 0 ||
    (typeof payload.k !== 'string' && typeof payload.k !== 'number') ||
    (typeof payload.k === 'number' && !Number.isFinite(payload.k))
  ) {
    throw invalidCursor()
  }

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded).toString('base64url')}`
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const parts = cursor.split('.')
    if (parts.length !== 2 || parts[0] === '' || parts[1] === '') {
      throw invalidCursor()
    }

    const [encoded, signature] = parts as [string, string]
    const actual = Buffer.from(signature, 'base64url')
    const expected = sign(encoded)
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      throw invalidCursor()
    }

    const parsed: unknown = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    )
    if (typeof parsed !== 'object' || parsed === null) {
      throw invalidCursor()
    }

    const candidate = parsed as Partial<CursorPayload>
    if (
      typeof candidate.id !== 'string' ||
      candidate.id.length === 0 ||
      (typeof candidate.k !== 'string' && typeof candidate.k !== 'number') ||
      (typeof candidate.k === 'number' && !Number.isFinite(candidate.k))
    ) {
      throw invalidCursor()
    }
    return { k: candidate.k, id: candidate.id }
  } catch (error: unknown) {
    if (error instanceof AppError && error.code === 'E_FEED_INVALID_CURSOR') {
      throw error
    }
    throw invalidCursor(error)
  }
}
