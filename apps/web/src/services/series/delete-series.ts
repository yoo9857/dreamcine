import { AppError, can } from '@aidream/core'
import { softDeleteSeriesCascade, findSeriesById } from '@aidream/db'
import { QUEUE } from '@aidream/queue'

import type { RouteSession } from '@/src/auth/types'
import { enqueue } from '@/src/lib/enqueue'

export async function deleteSeries(
  seriesId: string,
  session: RouteSession,
): Promise<void> {
  const series = await findSeriesById(seriesId)
  if (series === null) throw new AppError('E_SERIES_NOT_FOUND')
  const actor = {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }
  if (!can(actor, 'series.remove', { ownerId: series.ownerId })) {
    throw new AppError('E_PERM_NOT_OWNER')
  }
  const deleted = await softDeleteSeriesCascade(series.id)
  await Promise.all(
    deleted.assetIds.map((assetId) =>
      enqueue(
        QUEUE.EPISODE_MEDIA_DELETE,
        { assetId },
        { jobId: `episode-media-delete-${assetId}`, attempts: 3 },
      ),
    ),
  )
}
