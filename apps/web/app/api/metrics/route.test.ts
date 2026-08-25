import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { GET, isInternalIp } from './route'

const originalToken = process.env.METRICS_TOKEN
const originalTier = process.env.CAPACITY_TIER

beforeEach(() => {
  process.env.METRICS_TOKEN = 'metrics-test-token'
  process.env.CAPACITY_TIER = 'T0'
})

afterEach(() => {
  if (originalToken === undefined) delete process.env.METRICS_TOKEN
  else process.env.METRICS_TOKEN = originalToken
  if (originalTier === undefined) delete process.env.CAPACITY_TIER
  else process.env.CAPACITY_TIER = originalTier
})

describe('/api/metrics', () => {
  it('accepts internal addresses and returns Prometheus text', async () => {
    const response = await GET(
      new Request('http://localhost/api/metrics', {
        headers: { 'x-forwarded-for': '10.1.2.3' },
      }),
      {},
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/plain')
    expect(await response.text()).toContain('aidream_http_requests_total')
  })

  it('rejects external addresses without a token', async () => {
    const response = await GET(
      new Request('http://localhost/api/metrics', {
        headers: { 'x-forwarded-for': '203.0.113.10' },
      }),
      {},
    )
    expect(response.status).toBe(403)
  })

  it('accepts an external scraper with the configured token', async () => {
    const response = await GET(
      new Request('http://localhost/api/metrics', {
        headers: {
          'x-forwarded-for': '203.0.113.10',
          'x-metrics-token': 'metrics-test-token',
        },
      }),
      {},
    )
    expect(response.status).toBe(200)
  })

  it('recognizes only loopback and RFC1918 ranges', () => {
    expect(isInternalIp('unknown')).toBe(true)
    expect(isInternalIp('127.0.0.1')).toBe(true)
    expect(isInternalIp('172.31.1.1')).toBe(true)
    expect(isInternalIp('172.32.1.1')).toBe(false)
  })
})
