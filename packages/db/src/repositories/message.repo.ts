import {
  AppError,
  type DmPolicy,
  type MemberTier,
  type Page,
  type UserRole,
  type UserStatus,
} from '@aidream/core'
import type { Prisma } from '@prisma/client'
import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'
import { withTransaction, type TransactionClient } from '../tx.js'

/**
 * 1:1 메시지 저장소. (04_DOMAIN_MODEL.md `Conversation`·`DirectMessage`, ISS-023)
 *
 * 읽지 않은 수는 대화 행의 카운터다. 메시지를 넣는 트랜잭션에서 상대 쪽을
 * +1 하고, 읽으면 내 쪽을 0 으로 만든다. 배지는 이 카운터의 합이라 메시지
 * 행을 세지 않는다.
 */

/** 대화에 함께 실어 오는 참여자 정보. 판정(`dmPolicy`, `status`, `role`)과 표시에 쓴다. */
export interface MessagingPartyRow {
  readonly id: string
  readonly handle: string
  readonly displayName: string
  readonly avatarKey: string | null
  readonly tier: MemberTier
  readonly verifiedAt: Date | null
  readonly role: UserRole
  readonly status: UserStatus
  readonly dmPolicy: DmPolicy
}

export interface ConversationRow {
  readonly id: string
  readonly initiatorId: string
  readonly recipientId: string
  readonly lastMessageAt: Date
  readonly lastMessagePreview: string
  readonly lastSenderId: string | null
  readonly initiatorUnread: number
  readonly recipientUnread: number
  readonly createdAt: Date
  readonly initiator: MessagingPartyRow
  readonly recipient: MessagingPartyRow
}

export interface DirectMessageRow {
  readonly id: string
  readonly conversationId: string
  readonly senderId: string
  readonly body: string
  readonly createdAt: Date
}

const PARTY_SELECT = {
  id: true,
  handle: true,
  displayName: true,
  avatarKey: true,
  tier: true,
  verifiedAt: true,
  role: true,
  status: true,
  dmPolicy: true,
} satisfies Prisma.UserSelect

const CONVERSATION_INCLUDE = {
  initiator: { select: PARTY_SELECT },
  recipient: { select: PARTY_SELECT },
} satisfies Prisma.ConversationInclude

const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  senderId: true,
  body: true,
  createdAt: true,
} satisfies Prisma.DirectMessageSelect

/** 두 사람 사이의 대화. 어느 쪽이 열었든 하나로 본다. */
export function findConversationBetween(
  userA: string,
  userB: string,
): Promise<ConversationRow | null> {
  return executeDb(() => findBetween(db, userA, userB))
}

export function findConversationById(
  conversationId: string,
): Promise<ConversationRow | null> {
  return executeDb(() =>
    db.conversation.findUnique({
      where: { id: conversationId },
      include: CONVERSATION_INCLUDE,
    }),
  )
}

export interface StartConversationData {
  readonly senderId: string
  readonly recipientId: string
  readonly body: string
  readonly preview: string
}

/**
 * 첫 메시지와 함께 대화를 연다. 두 사람 사이에 이미 대화가 있으면(반대 방향으로
 * 열렸어도) 그 대화에 이어 쓴다. 생성·메시지·카운터가 한 트랜잭션이다.
 */
export function startConversationWithMessage(
  input: StartConversationData,
): Promise<{
  readonly conversation: ConversationRow
  readonly message: DirectMessageRow
}> {
  return withTransaction(async (tx) => {
    const existing = await findBetween(tx, input.senderId, input.recipientId)
    const conversation =
      existing ??
      (await tx.conversation.create({
        data: { initiatorId: input.senderId, recipientId: input.recipientId },
        include: CONVERSATION_INCLUDE,
      }))
    const message = await insertMessage(tx, {
      conversationId: conversation.id,
      senderId: input.senderId,
      senderIsInitiator: conversation.initiatorId === input.senderId,
      body: input.body,
      preview: input.preview,
    })
    const updated = await tx.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
      include: CONVERSATION_INCLUDE,
    })
    return { conversation: updated, message }
  })
}

export interface AppendMessageData {
  readonly conversationId: string
  readonly senderId: string
  readonly senderIsInitiator: boolean
  readonly body: string
  readonly preview: string
}

export function appendDirectMessage(
  input: AppendMessageData,
): Promise<DirectMessageRow> {
  return withTransaction((tx) => insertMessage(tx, input))
}

/** 내 대화 목록. 최근 메시지순. 연 대화와 받은 대화를 함께 본다. */
export function listConversationsForUser(options: {
  readonly userId: string
  readonly limit: number
  readonly cursor?: string
}): Promise<Page<ConversationRow>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : timeCursor(options.cursor)
    const rows = await db.conversation.findMany({
      where: {
        AND: [
          {
            OR: [
              { initiatorId: options.userId },
              { recipientId: options.userId },
            ],
          },
          cursor === null
            ? {}
            : {
                OR: [
                  { lastMessageAt: { lt: cursor.at } },
                  { lastMessageAt: cursor.at, id: { lt: cursor.id } },
                ],
              },
        ],
      },
      include: CONVERSATION_INCLUDE,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    })
    const hasNext = rows.length > options.limit
    const items = hasNext ? rows.slice(0, options.limit) : rows
    const last = items.at(-1)
    return {
      items,
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({ k: last.lastMessageAt.toISOString(), id: last.id })
          : null,
    }
  })
}

/**
 * 대화의 메시지.
 *
 * - `after` 가 있으면 그 메시지 **이후** 의 새 메시지를 오래된 순으로 준다.
 *   열린 대화의 짧은 주기 갱신이 이 경로를 쓴다. 다음 쪽은 없다.
 * - 없으면 최신 페이지를 최신순으로 주고 `cursor` 로 과거로 간다.
 */
export function listDirectMessages(options: {
  readonly conversationId: string
  readonly limit: number
  readonly cursor?: string
  readonly after?: string
}): Promise<Page<DirectMessageRow>> {
  return executeDb(async () => {
    if (options.after !== undefined) {
      const anchor = await db.directMessage.findFirst({
        where: { id: options.after, conversationId: options.conversationId },
        select: { id: true, createdAt: true },
      })
      // 기준 메시지가 이 대화에 없으면 요청이 잘못된 것이다. 다른 대화의
      // 메시지 id 로 시각을 떠보지 못하게 한다.
      if (anchor === null) throw new AppError('E_DM_CONVERSATION_NOT_FOUND')
      const items = await db.directMessage.findMany({
        where: {
          conversationId: options.conversationId,
          OR: [
            { createdAt: { gt: anchor.createdAt } },
            { createdAt: anchor.createdAt, id: { gt: anchor.id } },
          ],
        },
        select: MESSAGE_SELECT,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: options.limit,
      })
      return { items, nextCursor: null }
    }

    const cursor =
      options.cursor === undefined ? null : timeCursor(options.cursor)
    const rows = await db.directMessage.findMany({
      where: {
        conversationId: options.conversationId,
        ...(cursor === null
          ? {}
          : {
              OR: [
                { createdAt: { lt: cursor.at } },
                { createdAt: cursor.at, id: { lt: cursor.id } },
              ],
            }),
      },
      select: MESSAGE_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    })
    const hasNext = rows.length > options.limit
    const items = hasNext ? rows.slice(0, options.limit) : rows
    const last = items.at(-1)
    return {
      items,
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({ k: last.createdAt.toISOString(), id: last.id })
          : null,
    }
  })
}

/** 내 쪽 읽지 않은 수를 0 으로. 참여자가 아니면 아무 행도 바뀌지 않는다. */
export function markConversationReadBy(
  conversationId: string,
  userId: string,
): Promise<void> {
  return executeDb(async () => {
    await db.$transaction([
      db.conversation.updateMany({
        where: {
          id: conversationId,
          initiatorId: userId,
          initiatorUnread: { gt: 0 },
        },
        data: { initiatorUnread: 0 },
      }),
      db.conversation.updateMany({
        where: {
          id: conversationId,
          recipientId: userId,
          recipientUnread: { gt: 0 },
        },
        data: { recipientUnread: 0 },
      }),
    ])
  })
}

/** 배지 수. 내가 연 대화의 연 쪽 카운터 + 받은 대화의 받은 쪽 카운터. */
export function countUnreadDirectMessages(userId: string): Promise<number> {
  return executeDb(async () => {
    const [started, received] = await Promise.all([
      db.conversation.aggregate({
        where: { initiatorId: userId, initiatorUnread: { gt: 0 } },
        _sum: { initiatorUnread: true },
      }),
      db.conversation.aggregate({
        where: { recipientId: userId, recipientUnread: { gt: 0 } },
        _sum: { recipientUnread: true },
      }),
    ])
    return (
      (started._sum.initiatorUnread ?? 0) + (received._sum.recipientUnread ?? 0)
    )
  })
}

export function getDmPolicy(userId: string): Promise<DmPolicy | null> {
  return executeDb(async () => {
    const row = await db.user.findUnique({
      where: { id: userId },
      select: { dmPolicy: true },
    })
    return row?.dmPolicy ?? null
  })
}

export function setDmPolicy(
  userId: string,
  dmPolicy: DmPolicy,
): Promise<DmPolicy> {
  return executeDb(async () => {
    const row = await db.user.update({
      where: { id: userId },
      data: { dmPolicy },
      select: { dmPolicy: true },
    })
    return row.dmPolicy
  })
}

type ConversationReader = Pick<TransactionClient, 'conversation'>

function findBetween(
  reader: ConversationReader,
  userA: string,
  userB: string,
): Promise<ConversationRow | null> {
  return reader.conversation.findFirst({
    where: {
      OR: [
        { initiatorId: userA, recipientId: userB },
        { initiatorId: userB, recipientId: userA },
      ],
    },
    include: CONVERSATION_INCLUDE,
    // 양쪽이 동시에 열어 대화가 둘 생긴 드문 경우에도 늘 같은 하나를 고른다.
    orderBy: { createdAt: 'asc' },
  })
}

async function insertMessage(
  tx: TransactionClient,
  input: AppendMessageData,
): Promise<DirectMessageRow> {
  const message = await tx.directMessage.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      body: input.body,
    },
    select: MESSAGE_SELECT,
  })
  await tx.conversation.update({
    where: { id: input.conversationId },
    data: {
      lastMessageAt: message.createdAt,
      lastMessagePreview: input.preview,
      lastSenderId: input.senderId,
      // 보낸 사람이 읽지 않은 메시지를 남겨 둘 이유가 없다 — 보내는 순간 읽은 것이다.
      ...(input.senderIsInitiator
        ? { recipientUnread: { increment: 1 }, initiatorUnread: 0 }
        : { initiatorUnread: { increment: 1 }, recipientUnread: 0 }),
    },
  })
  return message
}

function timeCursor(cursor: string): { at: Date; id: string } {
  const payload = decodeCursor(cursor)
  if (typeof payload.k !== 'string') throw new AppError('E_FEED_INVALID_CURSOR')
  const at = new Date(payload.k)
  if (Number.isNaN(at.getTime())) throw new AppError('E_FEED_INVALID_CURSOR')
  return { at, id: payload.id }
}
