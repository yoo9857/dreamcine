import {
  AppError,
  can,
  canStartConversation,
  type DirectMessageDenial,
  type PublicUser,
} from '@aidream/core'
import {
  findConversationBetween,
  findUserByHandle,
  getUserSocialState,
} from '@aidream/db'
import { avatarUrl } from '@aidream/storage/cdn'

import { actorFromSession } from '@/src/auth/actor'
import type { RouteSession } from '@/src/auth/types'

/**
 * `/messages?to={handle}` 진입 판정.
 *
 * 이미 두 사람의 대화가 있으면 그 대화로 보낸다(같은 사람에게 두 번째 창을
 * 열지 않는다). 없으면 입력창을 열지, 왜 못 여는지를 미리 알려준다 — 다 쓰고
 * 보낸 뒤에야 거절당하지 않게 한다.
 */
export type NewConversationDenial =
  | DirectMessageDenial
  | 'E_AUTH_EMAIL_NOT_VERIFIED'

export type PreparedConversation =
  | { readonly kind: 'EXISTING'; readonly conversationId: string }
  | {
      readonly kind: 'NEW'
      readonly recipient: PublicUser
      readonly denial: NewConversationDenial | null
    }

export interface PrepareConversationDependencies {
  readonly findRecipient: typeof findUserByHandle
  readonly findBetween: typeof findConversationBetween
  readonly socialState: typeof getUserSocialState
}

export async function prepareConversation(
  session: RouteSession,
  handle: string,
  dependencies: PrepareConversationDependencies = {
    findRecipient: findUserByHandle,
    findBetween: findConversationBetween,
    socialState: getUserSocialState,
  },
): Promise<PreparedConversation> {
  const recipient = await dependencies.findRecipient(handle)
  if (recipient === null) throw new AppError('E_USER_NOT_FOUND')

  if (recipient.id !== session.userId) {
    const existing = await dependencies.findBetween(
      session.userId,
      recipient.id,
    )
    if (existing !== null) {
      return { kind: 'EXISTING', conversationId: existing.id }
    }
  }

  const state =
    recipient.id === session.userId
      ? { isFollowing: false, isBlocked: false }
      : await dependencies.socialState(session.userId, recipient.id)
  const gate = canStartConversation({
    senderId: session.userId,
    recipient,
    senderFollowsRecipient: state.isFollowing,
    blocked: state.isBlocked,
  })
  const permitted = can(actorFromSession(session), 'message.send')
  return {
    kind: 'NEW',
    recipient: {
      handle: recipient.handle,
      displayName: recipient.displayName,
      avatarUrl: avatarUrl(recipient.avatarKey),
      tier: recipient.tier,
      isVerified: recipient.verifiedAt !== null,
    },
    denial: !gate.allowed
      ? gate.code
      : permitted
        ? null
        : 'E_AUTH_EMAIL_NOT_VERIFIED',
  }
}
