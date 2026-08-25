import { afterEach, describe, expect, it } from 'vitest'

import {
  recordHttpRequest,
  renderWebMetrics,
  resetWebMetrics,
} from './metrics-http'

afterEach(() => {
  resetWebMetrics()
})

describe('HTTP metrics', () => {
  it('records bounded route and status labels', async () => {
    recordHttpRequest({
      route: '/api/episodes/episode_123/comments',
      method: 'post',
      status: 201,
      durationMs: 125,
    })
    const output = await renderWebMetrics()
    expect(output).toContain('route="/api/episodes/[id]/comments"')
    expect(output).toContain('method="POST"')
    expect(output).toContain('status="2xx"')
    expect(output).not.toContain('episode_123')
  })

  it('records finite application error codes', async () => {
    recordHttpRequest({
      route: '/api/comments/comment_1',
      method: 'DELETE',
      status: 403,
      durationMs: 2,
      errorCode: 'E_PERM_NOT_OWNER',
    })
    expect(await renderWebMetrics()).toContain('code="E_PERM_NOT_OWNER"')
  })
})
