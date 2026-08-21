import { NotImplementedError } from '@aidream/core'
import type { ZodType } from 'zod'

/** 모든 외부 입력의 유일한 관문. (07_AUTH_SECURITY.md §5) */
export function parseBody<T>(_schema: ZodType<T>, _body: unknown): T {
  throw new NotImplementedError('T03:parse')
}

export function parseQuery<T>(_schema: ZodType<T>, _query: URLSearchParams): T {
  throw new NotImplementedError('T03:parse')
}
