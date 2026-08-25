import { AppError } from '@aidream/core'
import { timingSafeEqual } from 'node:crypto'

import { withRoute } from '@/src/http/handler'
import {
  renderWebMetrics,
  WEB_METRICS_CONTENT_TYPE,
} from '@/src/lib/metrics-http'

export const GET = withRoute(
  async ({ req, ip }) => {
    if (!isInternalIp(ip) && !hasMetricsToken(req))
      throw new AppError('E_PERM_DENIED')
    return {
      status: 200,
      rawBody: await renderWebMetrics(),
      headers: { 'content-type': WEB_METRICS_CONTENT_TYPE },
    }
  },
  { auth: 'none', csrf: false },
)

export function isInternalIp(ip: string): boolean {
  return (
    // Next's Request omits the peer address on direct container-to-container
    // traffic. Production ingress always overwrites X-Forwarded-For, so an
    // unknown value can only arrive through the private compose network.
    ip === 'unknown' ||
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./u.test(ip)
  )
}

function hasMetricsToken(req: Request): boolean {
  const expected = process.env.METRICS_TOKEN
  const supplied = req.headers.get('x-metrics-token')
  if (expected === undefined || expected === '' || supplied === null)
    return false
  const left = Buffer.from(expected)
  const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}
