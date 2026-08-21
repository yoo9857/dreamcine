import { NotImplementedError } from '@aidream/core'

import type { RouteResult } from './handler'

export function ok(_body: unknown): RouteResult {
  throw new NotImplementedError('T03:response')
}

export function created(_body: unknown): RouteResult {
  throw new NotImplementedError('T03:response')
}

export function noContent(): RouteResult {
  throw new NotImplementedError('T03:response')
}

export function paginated(
  _items: readonly unknown[],
  _nextCursor: string | null,
): RouteResult {
  throw new NotImplementedError('T03:response')
}
