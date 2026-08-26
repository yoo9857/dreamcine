import { AppError } from '@aidream/core'
import { findUserById } from '@aidream/db'
import { avatarUrl } from '@aidream/storage/cdn'

export interface SeriesCreator {
  readonly handle: string
  readonly displayName: string
  readonly avatarUrl: string | null
}

export async function getSeriesCreator(
  ownerId: string,
): Promise<SeriesCreator> {
  const user = await findUserById(ownerId)
  if (user === null) throw new AppError('E_USER_NOT_FOUND')
  return {
    handle: user.handle,
    displayName: user.displayName,
    avatarUrl: avatarUrl(user.avatarKey),
  }
}
