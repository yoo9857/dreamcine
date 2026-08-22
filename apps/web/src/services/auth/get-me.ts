import {
  AppError,
  type User,
  type UserRole,
  type UserStatus,
} from '@aidream/core'
import { findUserById } from '@aidream/db'
import { avatarUrl } from '@aidream/storage'

export interface MeResult {
  id: string
  handle: string
  email: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  role: UserRole
  status: UserStatus
  emailVerified: string | null
  createdAt: string
}

export function toMeResult(user: User): MeResult {
  return {
    id: user.id,
    handle: user.handle,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: avatarUrl(user.avatarKey),
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  }
}

export async function getMe(userId: string): Promise<MeResult> {
  const user = await findUserById(userId)
  if (user === null) {
    throw new AppError('E_USER_NOT_FOUND')
  }
  return toMeResult(user)
}
