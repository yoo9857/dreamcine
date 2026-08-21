import { NotImplementedError } from '@aidream/core'

import type { RouteSession } from './types'

/**
 * 세션 해석의 **단일 지점**.
 *
 * Phase 2(T13) 네이티브 앱은 쿠키를 쓰기 어렵다. `Authorization: Bearer` 지원이
 * 필요해지면 **이 함수 하나만** 확장한다. (07_AUTH_SECURITY.md §1 Phase 2 대비)
 */
export function getSessionFromRequest(
  _req: Request,
): Promise<RouteSession | null> {
  throw new NotImplementedError('T03:getSession')
}
