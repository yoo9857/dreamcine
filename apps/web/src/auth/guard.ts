import { checkRateLimit } from '../http/rate-limit'

type Handler<R extends Request> = (request: R) => Promise<Response>

const CREDENTIALS_LOGIN_RULE = {
  bucket: 'auth-login',
  limit: 10,
  windowSec: 600,
} as const

function isCredentialsLogin(request: Request): boolean {
  return new URL(request.url).pathname.endsWith('/auth/callback/credentials')
}

function clientIdentity(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp !== undefined && realIp !== '') return realIp
  const forwarded = request.headers.get('x-forwarded-for')
  const firstForwarded = forwarded?.split(',')[0]?.trim()
  return firstForwarded !== undefined && firstForwarded !== ''
    ? firstForwarded
    : 'unknown'
}

function loginErrorUrl(request: Request): string {
  const base = process.env.APP_URL ?? request.url
  const url = new URL('/login', base)
  url.searchParams.set('error', 'CredentialsSignin')
  url.searchParams.set('code', 'credentials')
  return url.toString()
}

/** Credentials 로그인 폭주가 비밀번호 검증과 DB 세션 생성을 고갈시키지 않게 한다. */
export function withCredentialLoginRateLimit<R extends Request>(
  handler: Handler<R>,
): Handler<R> {
  return async (request: R): Promise<Response> => {
    if (!isCredentialsLogin(request)) return handler(request)

    const decision = await checkRateLimit(
      CREDENTIALS_LOGIN_RULE,
      clientIdentity(request),
    )
    if (decision.allowed) return handler(request)

    return Response.json(
      { url: loginErrorUrl(request) },
      {
        status: 429,
        headers: {
          'cache-control': 'no-store',
          'retry-after': String(decision.retryAfterSec),
        },
      },
    )
  }
}
