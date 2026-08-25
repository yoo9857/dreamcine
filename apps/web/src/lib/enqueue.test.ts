import { enqueue as enqueueJob, QUEUE } from '@aidream/queue'
import { describe, expect, it, vi } from 'vitest'

import { enqueue } from './enqueue.js'
import { runWithRequestContext } from './request-context.js'

vi.mock('@aidream/queue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@aidream/queue')>()),
  enqueue: vi.fn().mockResolvedValue(undefined),
}))

describe('request-aware enqueue', () => {
  it('propagates the current request ID into the job payload', async () => {
    await runWithRequestContext(
      { requestId: 'req_123', method: 'POST', path: '/api/uploads' },
      () => enqueue(QUEUE.VIDEO_TRANSCODE, { assetId: 'asset_1' }),
    )

    expect(enqueueJob).toHaveBeenCalledWith(
      QUEUE.VIDEO_TRANSCODE,
      { assetId: 'asset_1', requestId: 'req_123' },
      undefined,
    )
  })

  it('does not invent a request ID outside an HTTP request', async () => {
    await enqueue(QUEUE.COUNTER_FLUSH, {})

    expect(enqueueJob).toHaveBeenLastCalledWith(
      QUEUE.COUNTER_FLUSH,
      {},
      undefined,
    )
  })
})
