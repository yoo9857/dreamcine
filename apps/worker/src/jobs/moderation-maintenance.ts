import {
  releaseExpiredSuspensions,
  listPendingModerationMedia,
  markModerationMediaQueued,
} from '@aidream/db'
import { enqueue, QUEUE } from '@aidream/queue'

export async function moderationMaintenance(now = new Date()) {
  const released = await releaseExpiredSuspensions(now)
  const pending = await listPendingModerationMedia()
  let queued = 0
  for (const action of pending) {
    for (const assetId of action.pendingMediaIds) {
      await enqueue(
        QUEUE.EPISODE_MEDIA_DELETE,
        { assetId },
        { jobId: `episode-media-delete-${assetId}`, attempts: 3 },
      )
    }
    await markModerationMediaQueued(action.id)
    queued++
  }
  return { released, queued }
}
