import {
  AppError,
  can,
  canSendInConversation,
  type ConversationDetail,
  type ConversationListQuery,
  type ConversationPage,
  type DmPolicy,
  type MessageListQuery,
  type MessagePage,
} from '@aidream/core'
import {
  countUnreadDirectMessages,
  findConversationById,
  getDmPolicy,
  getUserSocialState,
  listConversationsForUser,
  listDirectMessages,
  markConversationReadBy,
  setDmPolicy,
  type ConversationRow,
} from '@aidream/db'

import { actorFromSession } from '@/src/auth/actor'
import type { RouteSession } from '@/src/auth/types'

import {
  isParticipant,
  otherParty,
  toConversationSummary,
  toMessageResponse,
} from './message-view'

/** 메시지함 읽기 쪽 서비스. 모두 `message.read` 를 먼저 확인한다. */

function requireRead(session: RouteSession): void {
  if (!can(actorFromSession(session), 'message.read')) {
    throw new AppError('E_PERM_DENIED')
  }
}

async function requireConversation(
  session: RouteSession,
  conversationId: string,
  find: typeof findConversationById,
): Promise<ConversationRow> {
  const conversation = await find(conversationId)
  if (conversation === null || !isParticipant(conversation, session.userId)) {
    throw new AppError('E_DM_CONVERSATION_NOT_FOUND')
  }
  return conversation
}

export interface ListConversationsDependencies {
  readonly list: typeof listConversationsForUser
}

export async function listMyConversations(
  session: RouteSession,
  query: ConversationListQuery,
  dependencies: ListConversationsDependencies = {
    list: listConversationsForUser,
  },
): Promise<ConversationPage> {
  requireRead(session)
  const page = await dependencies.list({
    userId: session.userId,
    limit: query.limit,
    ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
  })
  return {
    items: page.items.map((row) => toConversationSummary(row, session.userId)),
    nextCursor: page.nextCursor,
  }
}

export interface ConversationDetailDependencies {
  readonly find: typeof findConversationById
  readonly socialState: typeof getUserSocialState
}

/** 대화 머리. 입력창을 열지, 닫혔다면 왜인지를 함께 준다. */
export async function getConversationDetail(
  session: RouteSession,
  conversationId: string,
  dependencies: ConversationDetailDependencies = {
    find: findConversationById,
    socialState: getUserSocialState,
  },
): Promise<ConversationDetail> {
  requireRead(session)
  const conversation = await requireConversation(
    session,
    conversationId,
    dependencies.find,
  )
  const other = otherParty(conversation, session.userId)
  const state = await dependencies.socialState(session.userId, other.id)
  const gate = canSendInConversation({
    senderIsInitiator: conversation.initiatorId === session.userId,
    other,
    senderFollowsOther: state.isFollowing,
    blocked: state.isBlocked,
  })
  // 이메일 미인증 회원은 읽을 수는 있지만 보낼 수는 없다. 그 사유는 판정
  // 함수가 아니라 권한이 정하므로 따로 닫는다.
  const permitted = can(actorFromSession(session), 'message.send')
  return {
    ...toConversationSummary(conversation, session.userId),
    canSend: permitted && gate.allowed,
    denial: gate.allowed ? null : gate.code,
  }
}

export interface ListMessagesDependencies {
  readonly find: typeof findConversationById
  readonly list: typeof listDirectMessages
}

/** 화면은 위에서 아래로 시간순으로 그린다. 과거 페이지도 오래된 순으로 돌려준다. */
export async function listConversationMessages(
  session: RouteSession,
  conversationId: string,
  query: MessageListQuery,
  dependencies: ListMessagesDependencies = {
    find: findConversationById,
    list: listDirectMessages,
  },
): Promise<MessagePage> {
  requireRead(session)
  await requireConversation(session, conversationId, dependencies.find)
  const page = await dependencies.list({
    conversationId,
    limit: query.limit,
    ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    ...(query.after === undefined ? {} : { after: query.after }),
  })
  const items = page.items.map((row) => toMessageResponse(row, session.userId))
  return {
    items: query.after === undefined ? items.reverse() : items,
    nextCursor: page.nextCursor,
  }
}

export interface MarkReadDependencies {
  readonly find: typeof findConversationById
  readonly markRead: typeof markConversationReadBy
}

export async function markConversationRead(
  session: RouteSession,
  conversationId: string,
  dependencies: MarkReadDependencies = {
    find: findConversationById,
    markRead: markConversationReadBy,
  },
): Promise<void> {
  requireRead(session)
  await requireConversation(session, conversationId, dependencies.find)
  await dependencies.markRead(conversationId, session.userId)
}

export async function getUnreadMessageCount(
  session: RouteSession,
  count: typeof countUnreadDirectMessages = countUnreadDirectMessages,
): Promise<{ readonly count: number }> {
  requireRead(session)
  return { count: await count(session.userId) }
}

export interface MessagingPreferenceDependencies {
  readonly get: typeof getDmPolicy
  readonly set: typeof setDmPolicy
}

const PREFERENCE_DEPENDENCIES: MessagingPreferenceDependencies = {
  get: getDmPolicy,
  set: setDmPolicy,
}

export async function getMessagingPreference(
  session: RouteSession,
  dependencies: MessagingPreferenceDependencies = PREFERENCE_DEPENDENCIES,
): Promise<{ readonly dmPolicy: DmPolicy }> {
  const dmPolicy = await dependencies.get(session.userId)
  if (dmPolicy === null) throw new AppError('E_USER_NOT_FOUND')
  return { dmPolicy }
}

/** 자기 설정만 바꾼다. 소유 판정은 `profile.update` 와 같다. */
export async function updateMessagingPreference(
  session: RouteSession,
  dmPolicy: DmPolicy,
  dependencies: MessagingPreferenceDependencies = PREFERENCE_DEPENDENCIES,
): Promise<{ readonly dmPolicy: DmPolicy }> {
  if (
    !can(actorFromSession(session), 'profile.update', {
      ownerId: session.userId,
    })
  ) {
    throw new AppError('E_PERM_DENIED')
  }
  return { dmPolicy: await dependencies.set(session.userId, dmPolicy) }
}
