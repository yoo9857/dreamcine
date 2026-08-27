import {
  AppError,
  can,
  canTransitionAsset,
  isGrantableRole,
  type AssetStatus,
  type EpisodeStatus,
} from '@aidream/core'
import {
  findAssetById,
  listAssetsForAdmin,
  listContentForAdmin,
  listCreatorApplicationsForAdmin,
  listRecentRoleGrants,
  setUserRoleForAdmin,
  updateAssetStatus,
  updateCreatorApplicationStatus,
} from '@aidream/db'
import { QUEUE, retryJob } from '@aidream/queue'

import type { RouteSession } from '@/src/auth/types'

type CreatorApplicationStatus =
  | 'SUBMITTED'
  | 'REVIEWING'
  | 'SHORTLISTED'
  | 'ACCEPTED'
  | 'REJECTED'

function assertAdmin(session: RouteSession): void {
  if (
    !can(
      {
        id: session.userId,
        role: session.user.role,
        status: session.user.status,
        emailVerified: session.user.emailVerified,
      },
      'user.setRole',
    )
  ) {
    throw new AppError('E_PERM_DENIED')
  }
}

export function listAdminCreatorApplications(
  session: RouteSession,
  options: {
    limit: number
    cursor?: string
    query?: string
    status?: CreatorApplicationStatus
  },
) {
  assertAdmin(session)
  return listCreatorApplicationsForAdmin(options)
}

export function changeCreatorApplicationStatus(
  session: RouteSession,
  id: string,
  status: CreatorApplicationStatus,
) {
  assertAdmin(session)
  return updateCreatorApplicationStatus(id, status)
}

export function listAdminContent(
  session: RouteSession,
  options: {
    limit: number
    cursor?: string
    query?: string
    status?: EpisodeStatus
  },
) {
  assertAdmin(session)
  return listContentForAdmin(options)
}

export function listAdminAssets(
  session: RouteSession,
  options: { limit: number; cursor?: string; status?: AssetStatus },
) {
  assertAdmin(session)
  return listAssetsForAdmin(options)
}

export async function changeUserRole(
  session: RouteSession,
  userId: string,
  role: string,
  reason: string,
): Promise<void> {
  assertAdmin(session)
  if (!isGrantableRole(role)) throw new AppError('E_VALIDATION')
  if (userId === session.userId) throw new AppError('E_PERM_DENIED')
  await setUserRoleForAdmin({
    userId,
    role,
    grantedBy: session.userId,
    reason,
  })
}

export function listAdminRoleGrants(session: RouteSession) {
  assertAdmin(session)
  return listRecentRoleGrants()
}

export async function retryAdminAsset(
  session: RouteSession,
  assetId: string,
): Promise<void> {
  assertAdmin(session)
  const asset = await findAssetById(assetId)
  if (asset === null) throw new AppError('E_ASSET_NOT_FOUND')
  if (
    asset.status !== 'FAILED' ||
    !canTransitionAsset('FAILED', 'PENDING', {
      attemptCount: asset.attemptCount,
    })
  ) {
    throw new AppError('E_ASSET_NOT_READY')
  }
  await updateAssetStatus(assetId, 'PENDING', {
    errorCode: null,
    errorDetail: null,
  })
  await retryJob(QUEUE.VIDEO_TRANSCODE, assetId, { assetId })
}
