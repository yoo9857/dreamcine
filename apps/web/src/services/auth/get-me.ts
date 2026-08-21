import type { UserRole, UserStatus } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

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

export function getMe(_userId: string): Promise<MeResult> {
  throw new NotImplementedError('T03:getMe')
}
