import { describe, expect, it } from 'vitest'

import { httpStatusClass, METRICS, normalizeRoutePattern } from './metrics.js'

describe('observability metric contract', () => {
  it('uses stable aidream metric names', () => {
    expect(new Set(Object.values(METRICS)).size).toBe(
      Object.keys(METRICS).length,
    )
    for (const name of Object.values(METRICS))
      expect(name).toMatch(/^aidream_[a-z0-9_]+$/u)
  })

  it('normalizes IDs and handles without changing static actions', () => {
    expect(normalizeRoutePattern('/api/episodes/ep_123/comments')).toBe(
      '/api/episodes/[id]/comments',
    )
    expect(normalizeRoutePattern('/api/users/creator/follow')).toBe(
      '/api/users/[handle]/follow',
    )
    expect(normalizeRoutePattern('/api/tags/판타지/episodes?limit=20')).toBe(
      '/api/tags/[tag]/episodes',
    )
    expect(normalizeRoutePattern('/api/notifications/read')).toBe(
      '/api/notifications/read',
    )
  })

  it('groups statuses into bounded classes', () => {
    expect(httpStatusClass(201)).toBe('2xx')
    expect(httpStatusClass(429)).toBe('4xx')
    expect(httpStatusClass(503)).toBe('5xx')
  })
})
