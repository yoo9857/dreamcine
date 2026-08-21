import { AppError, type UpdateProfileInput } from '@aidream/core'
import { findUserById, updateUser, type UpdateUserData } from '@aidream/db'

import { toMeResult, type MeResult } from './get-me'

/**
 * 부분 수정. 주어지지 않은 필드는 건드리지 않고, 명시적 `null` 은 지우기다.
 * 표시이름·소개의 정규화는 zod 스키마가 이미 끝냈다. (07_AUTH_SECURITY.md §5)
 */
export async function updateMe(
  userId: string,
  input: UpdateProfileInput,
): Promise<MeResult> {
  const current = await findUserById(userId)
  if (current === null) {
    throw new AppError('E_USER_NOT_FOUND')
  }

  const data: UpdateUserData = {}
  if (input.displayName !== undefined) {
    data.displayName = input.displayName
  }
  if (input.bio !== undefined) {
    data.bio = input.bio
  }
  if (input.avatarKey !== undefined) {
    data.avatarKey = input.avatarKey
  }

  if (Object.keys(data).length === 0) {
    return toMeResult(current)
  }
  return toMeResult(await updateUser(userId, data))
}
