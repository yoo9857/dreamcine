import type { UserRole, UserStatus } from '../enums.js'
import { NotImplementedError } from '../errors/not-implemented.js'

export const ACTIONS = [
  'episode.create',
  'episode.update',
  'episode.publish',
  'episode.hide',
  'episode.remove',
  'series.create',
  'series.update',
  'series.remove',
  'upload.create',
  'comment.create',
  'comment.delete',
  'report.create',
  'report.review',
  'user.suspend',
  'user.setRole',
] as const

export type Action = (typeof ACTIONS)[number]

export interface Actor {
  id: string
  role: UserRole
  status: UserStatus
  emailVerified: boolean
}

export interface ResourceRef {
  ownerId?: string | undefined
}

/**
 * 권한 판정의 유일한 지점. (07_AUTH_SECURITY.md §2)
 * 라우트·서비스·컴포넌트가 `role === 'ADMIN'` 을 직접 비교하는 것은 금지된다.
 */
export function can(
  _actor: Actor,
  _action: Action,
  _resource?: ResourceRef,
): boolean {
  throw new NotImplementedError('T03:can')
}
