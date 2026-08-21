import { NextResponse, type NextRequest } from 'next/server'

import { SESSION_COOKIE_NAMES } from '@/src/auth/types'

/**
 * 08_UIUX_SPEC.md §1 에서 인증이 필요한 최상위 경로.
 * 이 목록은 **UX 용 리다이렉트 기준**일 뿐이며 보안 경계가 아니다.
 */
const PROTECTED_PREFIXES = [
  '/studio',
  '/admin',
  '/notifications',
  '/following',
] as const

function createNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

/**
 * 07_AUTH_SECURITY.md §6 의 CSP 를 그대로 만든다.
 * `script-src` 에 `unsafe-inline`/`unsafe-eval` 을 넣지 않는다 — hls.js 는
 * 그것을 필요로 하지 않는다. `media-src` 에서 CDN 을 빼면 영상이 재생되지 않는다.
 */
function contentSecurityPolicy(nonce: string): string {
  const cdn = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? ''
  const withCdn = (base: string): string =>
    cdn === '' ? base : `${base} ${cdn}`
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    withCdn("img-src 'self' data: blob:"),
    withCdn("media-src 'self' blob:"),
    withCdn("connect-src 'self'"),
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

function applySecurityHeaders(headers: Headers, csp: string): void {
  headers.set('content-security-policy', csp)
  headers.set(
    'strict-transport-security',
    'max-age=63072000; includeSubDomains; preload',
  )
  headers.set('x-content-type-options', 'nosniff')
  headers.set('x-frame-options', 'DENY')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  headers.set('cross-origin-opener-policy', 'same-origin')
}

function needsAuth(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/**
 * 1층 방어. 미인증 사용자를 로그인으로 보내고 CSP nonce·보안 헤더를 붙인다.
 *
 * **보안의 근거로 삼지 않는다** — 여기서는 쿠키 존재만 보고, 실제 세션 검증은
 * 하지 않는다(Edge 런타임에서 DB 를 볼 수 없다). 진짜 경계는 3층인
 * `withRoute` + `can()` 이다. (07_AUTH_SECURITY.md §3)
 */
export function middleware(req: NextRequest): NextResponse {
  const nonce = createNonce()
  const csp = contentSecurityPolicy(nonce)

  // Next.js 가 자기 인라인 스크립트에 nonce 를 붙이도록 요청 헤더로 전달한다.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) =>
    req.cookies.has(name),
  )

  let response: NextResponse
  if (needsAuth(req.nextUrl.pathname) && !hasSessionCookie) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set(
      'next',
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
    )
    response = NextResponse.redirect(loginUrl)
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } })
  }

  applySecurityHeaders(response.headers, csp)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
