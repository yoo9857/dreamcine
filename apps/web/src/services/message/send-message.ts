import {
  AppError,
  LIMITS,
  can,
  canSendInConversation,
  canStartConversation,
  sanitizeUserText,
  type MessageResponse,
  type SendMessageInput,
  type StartConversationInput,
  type StartConversationResponse,
} from '@aidream/core'
import {
  appendDirectMessage,
  findConversationById,
  findUserByHandle,
  getUserSocialState,
  startConversationWithMessage,
} from '@aidream/db'

import { actorFromSession } from '@/src/auth/actor'
import type { RouteSession } from '@/src/auth/types'

import {
  isParticipant,
  messagePreview,
  otherParty,
  toMessageResponse,
} from './message-view'

/**
 * 메시지 보내기. (T18 §3)
 *
 * 순서: 권한(`can`) → 본문 → 상대 → 차단·팔로우 사실 → 순수 판정 → 저장.
 * 판정은 `@aidream/core` 의 순수 함수가 하고, 여기서는 사실만 모은다.
 */

export interface StartConversationDependencies {
  readonly findRecipient: typeof findUserByHandle
  readonly socialState: typeof getUserSocialState
  readonly start: typeof startConversationWithMessage
}

export interface SendMessageDependencies {
  readonly findConversation: typeof findConversationById
  readonly socialState: typeof getUserSocialState
  readonly append: typeof appendDirectMessage
}

/** 정제한 본문. 비었거나 길면 여기서 끝낸다. */
function cleanBody(raw: string): string {
  const body = sanitizeUserText(raw).trim()
  if (body.length === 0) throw new AppError('E_VALIDATION')
  if (Array.from(body).length > LIMITS.DM_MAX_LEN) {
    throw new AppError('E_DM_TOO_LONG')
  }
  return body
}

function requireSend(session: RouteSession): void {
  if (!can(actorFromSession(session), 'message.send')) {
    throw new AppError('E_PERM_DENIED')
  }
}

export function startConversation(
  session: RouteSession,
  input: StartConversationInput,
  dependencies: StartConversationDependencies = {
    findRecipient: findUserByHandle,
    socialState: getUserSocialState,
    start: startConversationWithMessage,
  },
): Promise<StartConversationResponse> {
  return runStartConversation(session, input, dependencies)
}

async function runStartConversation(
  session: RouteSession,
  input: StartConversationInput,
  dependencies: StartConversationDependencies,
): Promise<StartConversationResponse> {
  requireSend(session)
  const body = cleanBody(input.body)
  const recipient = await dependencies.findRecipient(input.handle)
  if (recipient === null) throw new AppError('E_USER_NOT_FOUND')

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
  if (!gate.allowed) throw new AppError(gate.code)

  const result = await dependencies.start({
    senderId: session.userId,
    recipientId: recipient.id,
    body,
    preview: messagePreview(body),
  })
  return {
    conversationId: result.conversation.id,
    message: toMessageResponse(result.message, session.userId),
  }
}

export function sendMessage(
  session: RouteSession,
  conversationId: string,
  input: SendMessageInput,
  dependencies: SendMessageDependencies = {
    findConversation: findConversationById,
    socialState: getUserSocialState,
    append: appendDirectMessage,
  },
): Promise<MessageResponse> {
  return runSendMessage(session, conversationId, input, dependencies)
}

async function runSendMessage(
  session: RouteSession,
  conversationId: string,
  input: SendMessageInput,
  dependencies: SendMessageDependencies,
): Promise<MessageResponse> {
  requireSend(session)
  const body = cleanBody(input.body)
  const conversation = await dependencies.findConversation(conversationId)
  // 참여자가 아니면 대화가 있다는 사실도 알리지 않는다.
  if (conversation === null || !isParticipant(conversation, session.userId)) {
    throw new AppError('E_DM_CONVERSATION_NOT_FOUND')
  }

  const other = otherParty(conversation, session.userId)
  const senderIsInitiator = conversation.initiatorId === session.userId
  const state = await dependencies.socialState(session.userId, other.id)
  const gate = canSendInConversation({
    senderIsInitiator,
    other,
    senderFollowsOther: state.isFollowing,
    blocked: state.isBlocked,
  })
  if (!gate.allowed) throw new AppError(gate.code)

  const message = await dependencies.append({
    conversationId: conversation.id,
    senderId: session.userId,
    senderIsInitiator,
    body,
    preview: messagePreview(body),
  })
  return toMessageResponse(message, session.userId)
}
