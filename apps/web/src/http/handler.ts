import {
  AppError,
  NotImplementedError,
  ServerEnvSchema,
  loadCapacity,
  type Capacity,
  type ErrorCode,
} from '@aidream/core'
import { ZodError } from 'zod'

import {
  getSessionFromRequest,
  hasSessionCookie,
  revokeSessionFromRequest,
} from '../auth/session'
import { SESSION_COOKIE_NAMES } from '../auth/types'
import type { RouteSession } from '../auth/types'
import { messageFor } from '../lib/error-messages'
import { getLogger } from '../lib/logger'
import {
  runWithRequestContext,
  setContextUserId,
  type RequestContext,
} from '../lib/request-context'
import { checkRateLimit } from './rate-limit'
import { createRequestId } from './request-id'
import { httpStatusFor } from './status-map'

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

/**
 * Next.js 15 의 라우트 핸들러 두 번째 인자. `params` 는 Promise 이며,
 * catch-all 세그먼트(`[...slug]`)에서는 값이 배열로 온다.
 */
export interface NextRouteContext {
  params: Promise<Record<string, string | string[] | undefined>>
}

export type NextRouteHandler = (
  req: Request,
  ctx: NextRouteContext,
) => Promise<Response>

const STATE_CHANGING_METHODS: ReadonlySet<string> = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
])

const BODYLESS_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD'])

/** catch-all 세그먼트의 배열은 첫 값만 쓴다. 라우트는 항상 문자열을 본다. */
function normalizeParams(
  raw: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      params[key] = value
    } else if (Array.isArray(value)) {
      params[key] = value[0] ?? ''
    }
  }
  return params
}

let capacityCache: Capacity | undefined

/** 티어는 env 를 통해서만 들어온다. 문구·한도 리터럴을 코드에 박지 않는다. */
function currentCapacity(): Capacity {
  capacityCache ??= loadCapacity(
    ServerEnvSchema.shape.CAPACITY_TIER.parse(process.env.CAPACITY_TIER),
  )
  return capacityCache
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  if (first !== undefined && first !== '') {
    return first
  }
  const real = req.headers.get('x-real-ip')?.trim()
  return real !== undefined && real !== '' ? real : 'unknown'
}

/**
 * sameSite=lax 쿠키 + Origin 검증의 2중 CSRF 방어. (07_AUTH_SECURITY.md §7)
 * Origin 이 **없는** 상태변경 요청도 거부한다 — 쿠키 세션은 브라우저에서만
 * 자동 첨부되므로, Origin 부재는 정상 브라우저 요청이 아니라는 뜻이다.
 */
function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin')
  if (origin === null || origin === '') {
    throw new AppError('E_PERM_DENIED', { reason: 'origin-missing' })
  }
  const appUrl = process.env.APP_URL
  if (appUrl === undefined || appUrl === '') {
    throw new AppError('E_INTERNAL', { reason: 'app-url-missing' })
  }
  if (origin !== new URL(appUrl).origin) {
    throw new AppError('E_PERM_DENIED', { reason: 'origin-mismatch' })
  }
}

async function readJsonBody(req: Request, method: string): Promise<unknown> {
  if (BODYLESS_METHODS.has(method)) {
    return undefined
  }
  const raw = await req.text()
  if (raw === '') {
    return undefined
  }
  try {
    return JSON.parse(raw) as unknown
  } catch (error: unknown) {
    throw new AppError('E_VALIDATION', { reason: 'invalid-json' }, error)
  }
}

async function enforceRateLimit(
  rule: RouteRateLimit,
  session: RouteSession | null,
  ip: string,
): Promise<void> {
  const identity = rule.by === 'user' ? (session?.userId ?? ip) : ip
  const decision = await checkRateLimit(
    { bucket: rule.bucket, limit: rule.limit, windowSec: rule.windowSec },
    identity,
  )
  if (!decision.allowed) {
    throw new AppError('E_RATE_LIMITED', {
      retryAfterSec: decision.retryAfterSec,
    })
  }
}

/** BigInt 를 문자열로 직렬화한다. JSON 정밀도 손실 방지. (05 §1) */
function serialize(body: unknown): string {
  return JSON.stringify(body, (_key, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value,
  )
}

function baseHeaders(requestId: string): Headers {
  const headers = new Headers()
  headers.set('cache-control', 'no-store')
  headers.set('x-request-id', requestId)
  return headers
}

function toResponse(result: RouteResult, requestId: string): Response {
  const headers = baseHeaders(requestId)
  for (const [name, value] of Object.entries(result.headers ?? {})) {
    headers.set(name, value)
  }
  if (result.status === 204 || result.body === undefined) {
    return new Response(null, { status: result.status, headers })
  }
  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(serialize(result.body), {
    status: result.status,
    headers,
  })
}

function expiredSessionCookies(headers: Headers): void {
  for (const name of SESSION_COOKIE_NAMES) {
    headers.append(
      'set-cookie',
      `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    )
  }
}

interface Failure {
  status: number
  code: ErrorCode
  response: Response
  fatal: boolean
}

function errorResponse(
  code: ErrorCode,
  fields: Record<string, string> | null,
  requestId: string,
  extra?: { retryAfterSec?: number; clearSession?: boolean },
): Response {
  const status = httpStatusFor(code)
  const headers = baseHeaders(requestId)
  headers.set('content-type', 'application/json; charset=utf-8')
  if (extra?.retryAfterSec !== undefined) {
    headers.set('retry-after', String(extra.retryAfterSec))
  }
  if (extra?.clearSession === true) {
    expiredSessionCookies(headers)
  }
  // detail 은 절대 응답에 넣지 않는다. 로그에만 남긴다. (09 §1)
  const body = {
    error: {
      code,
      message: messageFor(code, currentCapacity()),
      fields,
      requestId,
    },
  }
  return new Response(serialize(body), { status, headers })
}

function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.length === 0 ? '_' : issue.path.join('.')
    fields[key] ??= issue.message
  }
  return fields
}

function readRetryAfter(detail: Record<string, unknown> | undefined): number {
  const value = detail?.retryAfterSec
  return typeof value === 'number' ? value : 1
}

function toFailure(error: unknown, requestId: string): Failure {
  if (error instanceof ZodError) {
    return {
      status: httpStatusFor('E_VALIDATION'),
      code: 'E_VALIDATION',
      response: errorResponse('E_VALIDATION', zodFields(error), requestId),
      fatal: false,
    }
  }

  // S2 센티넬. 프로덕션 빌드에 남아 있으면 CI 가 막는다. (09 §3)
  if (error instanceof NotImplementedError) {
    return {
      status: httpStatusFor('E_NOT_IMPLEMENTED'),
      code: 'E_NOT_IMPLEMENTED',
      response: errorResponse('E_NOT_IMPLEMENTED', null, requestId),
      fatal: true,
    }
  }

  if (error instanceof AppError) {
    const status = httpStatusFor(error.code)
    return {
      status,
      code: error.code,
      response: errorResponse(error.code, null, requestId, {
        ...(error.code === 'E_RATE_LIMITED'
          ? { retryAfterSec: readRetryAfter(error.detail) }
          : {}),
        clearSession: error.code === 'E_AUTH_SESSION_EXPIRED',
      }),
      fatal: status >= 500,
    }
  }

  return {
    status: httpStatusFor('E_INTERNAL'),
    code: 'E_INTERNAL',
    response: errorResponse('E_INTERNAL', null, requestId),
    fatal: true,
  }
}

/**
 * 이 프로젝트에서 가장 많이 재사용되는 코드. 실행 순서는 T03 §5 를 따르며
 * **이 순서를 바꾸지 않는다**.
 *
 * requestId → ip → CSRF → 세션 → 인증 → 계정상태 → 레이트리밋 → body →
 * params → 핸들러 → 직렬화 → 로그 → `X-Request-Id`.
 *
 * 레이트리밋이 인증 뒤에 오는 이유: 사용자별 한도를 적용하려면 신원을 먼저
 * 알아야 한다. 인증 엔드포인트는 IP 기준이므로 순서와 무관하다.
 */
export function withRoute<O extends RouteOptions>(
  handler: RouteHandler<O>,
  options: O,
): NextRouteHandler {
  // 조건부 타입 SessionFor<O> 는 호출자 쪽 계약이다. 구현 내부에서는
  // 런타임 값이 항상 `RouteSession | null` 이므로 경계에서 한 번만 좁힌다.
  const invoke = handler as (
    ctx: RouteContext<RouteSession | null>,
  ) => Promise<RouteResult>

  return async (req, ctx) => {
    const requestId = createRequestId()
    const method = req.method.toUpperCase()
    const url = new URL(req.url)
    const context: RequestContext = {
      requestId,
      method,
      path: url.pathname,
    }

    return runWithRequestContext(context, async () => {
      const startedAt = Date.now()
      const logger = getLogger()
      let status = 500
      let failureCode: ErrorCode | undefined

      try {
        const ip = clientIp(req)

        if (options.csrf !== false && STATE_CHANGING_METHODS.has(method)) {
          assertSameOrigin(req)
        }

        let session: RouteSession | null = null
        if (options.auth !== 'none') {
          session = await getSessionFromRequest(req)
        }

        if (options.auth === 'required' && session === null) {
          // 쿠키가 있었는데 세션이 없다면 만료다. 쿠키를 지워 재로그인으로 보낸다.
          throw new AppError(
            hasSessionCookie(req)
              ? 'E_AUTH_SESSION_EXPIRED'
              : 'E_AUTH_REQUIRED',
          )
        }

        if (session !== null) {
          setContextUserId(session.userId)
          if (session.user.status !== 'ACTIVE') {
            await revokeSessionFromRequest(req)
            throw new AppError('E_AUTH_ACCOUNT_SUSPENDED', {
              userStatus: session.user.status,
            })
          }
        }

        if (options.rateLimit !== undefined) {
          await enforceRateLimit(options.rateLimit, session, ip)
        }

        const body = await readJsonBody(req, method)
        const params = normalizeParams(await ctx.params)

        const result = await invoke({
          req,
          params,
          query: url.searchParams,
          body,
          session,
          requestId,
          ip,
        })

        status = result.status
        return toResponse(result, requestId)
      } catch (error: unknown) {
        const failure = toFailure(error, requestId)
        status = failure.status
        failureCode = failure.code

        if (failure.fatal) {
          // 버그이거나 인프라 장애다. 스택을 남긴다. 클라이언트에는 보내지 않는다.
          logger.error(
            { requestId, method, path: url.pathname, err: error },
            'request failed',
          )
        }
        return failure.response
      } finally {
        logger.info(
          {
            requestId,
            method,
            path: url.pathname,
            status,
            durationMs: Date.now() - startedAt,
            userId: context.userId,
            ...(failureCode === undefined ? {} : { errorCode: failureCode }),
          },
          'request',
        )
      }
    })
  }
}
