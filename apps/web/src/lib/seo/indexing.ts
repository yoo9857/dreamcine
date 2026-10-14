/** A noindex header also covers redirects and preview routes without metadata. */
export function isNonIndexablePath(pathname: string): boolean {
  return [
    '/account',
    '/admin',
    '/studio',
    '/browse',
    '/following',
    '/messages',
    '/notifications',
    '/search',
    '/login',
    '/signup',
    '/verify',
    '/password',
    '/deletion',
    '/unsubscribe',
    '/admin-preview',
    '/studio-preview',
    '/tier-preview',
    '/dev-media',
    '/api',
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
