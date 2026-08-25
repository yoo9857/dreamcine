import { afterEach, describe, expect, it } from 'vitest'

import {
  startMetricsServer,
  type MetricsServerHandle,
} from './metrics-server.js'

let handle: MetricsServerHandle | undefined

afterEach(async () => {
  await handle?.close()
  handle = undefined
})

describe('worker metrics server', () => {
  it('serves Prometheus metrics and rejects unknown paths', async () => {
    handle = await startMetricsServer(0)
    const metrics = await fetch(
      `http://127.0.0.1:${String(handle.port)}/metrics`,
    )
    expect(metrics.status).toBe(200)
    expect(metrics.headers.get('content-type')).toContain('text/plain')
    expect(await metrics.text()).toContain('aidream_jobs_total')
    expect(
      (await fetch(`http://127.0.0.1:${String(handle.port)}/unknown`)).status,
    ).toBe(404)
  })
})
