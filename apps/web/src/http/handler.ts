import { NotImplementedError } from '@aidream/core'

import type { RouteSession } from '../auth/types'

export interface RouteContext<TSession> {
  req: Request
  params: Record<string, string>
  query: URLSearchParams
  /** 파싱되지 않은 원본. 라우트가 zod 로 파싱한다. */
  body: unknown
  session: TSession
  requestId: string
  ip: string
}

export interface RouteResult {
  status: number
  body?: unknown
  headers?: Record<string, string>
}

export interface RouteRateLimit {
  bucket: string
  limit: number
  windowSec: number
  by: 'ip' | 'user'
}

export interface RouteOptions {
  auth: 'required' | 'optional' | 'none'
  rateLimit?: RouteRateLimit
  /** 상태변경 메서드의 Origin 검증. 기본 true. */
  csrf?: boolean
}

/**
 * `auth: 'required'` 는 non-null, `'optional'` 은 nullable, `'none'` 은 null.
 * 라우트에서 null 체크를 반복하지 않게 만드는 조건부 타입이다.
 */
export type SessionFor<O extends RouteOptions> = O['auth'] extends 'required'
  ? RouteSession
  : O['auth'] extends 'optional'
    ? RouteSession | null
    : null

export type RouteHandler<O extends RouteOptions> = (
  ctx: RouteContext<SessionFor<O>>,
) => Promise<RouteResult>

/** Next.js 15 의 라우트 핸들러 두 번째 인자. `params` 는 Promise 다. */
export interface NextRouteContext {
  params: Promise<Record<string, string>>
}

export type NextRouteHandler = (
  req: Request,
  ctx: NextRouteContext,
) => Promise<Response>

/**
 * 이 프로젝트에서 가장 많이 재사용되는 코드. 실행 순서는 T03 §5 를 따른다.
 * requestId → ip → CSRF → 세션 → 인증 → 상태 → 레이트리밋 → body → params →
 * 핸들러 → 직렬화 → 로그 → `X-Request-Id`.
 */
export function withRoute<O extends RouteOptions>(
  _handler: RouteHandler<O>,
  _options: O,
): NextRouteHandler {
  throw new NotImplementedError('T03:withRoute')
}
