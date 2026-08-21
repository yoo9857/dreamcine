import { NotImplementedError } from '@aidream/core'

export interface RequestContext {
  requestId: string
  method: string
  path: string
  userId?: string | undefined
}

/** AsyncLocalStorage 기반 로그 상관관계 컨텍스트. */
export function runWithRequestContext<T>(
  _context: RequestContext,
  _callback: () => T,
): T {
  throw new NotImplementedError('T03:requestContext')
}

export function getRequestContext(): RequestContext | undefined {
  throw new NotImplementedError('T03:requestContext')
}
