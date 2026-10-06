import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  startPostgresTestContext,
  stopPostgresTestContext,
  type PostgresTestContext,
} from './postgres-test-context.js'

let context: PostgresTestContext | undefined

beforeAll(async () => {
  context = await startPostgresTestContext('aidream_t18_messages')
}, 150_000)

beforeEach(async () => {
  const current = requireContext()
  await current.database.$executeRaw`TRUNCATE TABLE "user" CASCADE`
})

afterAll(async () => stopPostgresTestContext(context))

function requireContext(): PostgresTestContext {
  if (context === undefined) throw new Error('database context missing')
  return context
}

async function people() {
  const context = requireContext()
  const [reader, creator, other] = await Promise.all([
    context.database.user.create({
      data: { handle: 'reader', email: 'reader@example.com', displayName: 'R' },
    }),
    context.database.user.create({
      data: {
        handle: 'creator',
        email: 'creator@example.com',
        displayName: 'C',
        role: 'CREATOR',
      },
    }),
    context.database.user.create({
      data: { handle: 'other', email: 'other@example.com', displayName: 'O' },
    }),
  ])
  return { reader, creator, other }
}

describe('T18 direct message repositories', () => {
  it('opens one conversation per pair and counts unread on the receiving side', async () => {
    const context = requireContext()
    const { reader, creator } = await people()

    const first = await context.repo.startConversationWithMessage({
      senderId: reader.id,
      recipientId: creator.id,
      body: '안녕하세요',
      preview: '안녕하세요',
    })
    // 같은 두 사람이 다시 보내면 새 대화가 아니라 같은 대화에 이어진다.
    const second = await context.repo.startConversationWithMessage({
      senderId: reader.id,
      recipientId: creator.id,
      body: '두 번째',
      preview: '두 번째',
    })

    expect(second.conversation.id).toBe(first.conversation.id)
    expect(await context.database.conversation.count()).toBe(1)
    expect(second.conversation.recipientUnread).toBe(2)
    expect(second.conversation.initiatorUnread).toBe(0)
    expect(second.conversation.lastMessagePreview).toBe('두 번째')
    expect(await context.repo.countUnreadDirectMessages(creator.id)).toBe(2)
    expect(await context.repo.countUnreadDirectMessages(reader.id)).toBe(0)
  })

  it('reuses the conversation when the other side writes first in reverse', async () => {
    const context = requireContext()
    const { reader, creator } = await people()
    const opened = await context.repo.startConversationWithMessage({
      senderId: reader.id,
      recipientId: creator.id,
      body: 'hi',
      preview: 'hi',
    })

    const reverse = await context.repo.startConversationWithMessage({
      senderId: creator.id,
      recipientId: reader.id,
      body: 'reply',
      preview: 'reply',
    })

    expect(reverse.conversation.id).toBe(opened.conversation.id)
    // 작가가 답하면 작가 쪽은 읽음, 독자 쪽은 1.
    expect(reverse.conversation.recipientUnread).toBe(0)
    expect(reverse.conversation.initiatorUnread).toBe(1)
  })

  it('clears only the reader side when that participant reads', async () => {
    const context = requireContext()
    const { reader, creator, other } = await people()
    const { conversation } = await context.repo.startConversationWithMessage({
      senderId: reader.id,
      recipientId: creator.id,
      body: 'hi',
      preview: 'hi',
    })
    await context.repo.appendDirectMessage({
      conversationId: conversation.id,
      senderId: creator.id,
      senderIsInitiator: false,
      body: 'reply',
      preview: 'reply',
    })

    // 참여자가 아닌 사람의 읽음 처리는 아무것도 바꾸지 않는다.
    await context.repo.markConversationReadBy(conversation.id, other.id)
    await context.repo.markConversationReadBy(conversation.id, reader.id)

    const row = await context.database.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
    })
    expect(row.initiatorUnread).toBe(0)
    expect(row.recipientUnread).toBe(0)
    expect(await context.repo.countUnreadDirectMessages(reader.id)).toBe(0)
  })

  it('pages history backwards and polls new messages after an anchor', async () => {
    const context = requireContext()
    const { reader, creator } = await people()
    const { conversation, message } =
      await context.repo.startConversationWithMessage({
        senderId: reader.id,
        recipientId: creator.id,
        body: 'm0',
        preview: 'm0',
      })
    for (let index = 1; index <= 4; index += 1) {
      await context.repo.appendDirectMessage({
        conversationId: conversation.id,
        senderId: index % 2 === 0 ? reader.id : creator.id,
        senderIsInitiator: index % 2 === 0,
        body: `m${String(index)}`,
        preview: `m${String(index)}`,
      })
    }

    const newest = await context.repo.listDirectMessages({
      conversationId: conversation.id,
      limit: 3,
    })
    expect(newest.items.map((item) => item.body)).toEqual(['m4', 'm3', 'm2'])
    expect(newest.nextCursor).not.toBeNull()

    const older = await context.repo.listDirectMessages({
      conversationId: conversation.id,
      limit: 3,
      ...(newest.nextCursor === null ? {} : { cursor: newest.nextCursor }),
    })
    expect(older.items.map((item) => item.body)).toEqual(['m1', 'm0'])
    expect(older.nextCursor).toBeNull()

    const fresh = await context.repo.listDirectMessages({
      conversationId: conversation.id,
      limit: 50,
      after: message.id,
    })
    expect(fresh.items.map((item) => item.body)).toEqual([
      'm1',
      'm2',
      'm3',
      'm4',
    ])
  })

  it('refuses an after anchor that belongs to another conversation', async () => {
    const context = requireContext()
    const { reader, creator, other } = await people()
    await context.database.user.update({
      where: { id: other.id },
      data: { role: 'CREATOR' },
    })
    const first = await context.repo.startConversationWithMessage({
      senderId: reader.id,
      recipientId: creator.id,
      body: 'a',
      preview: 'a',
    })
    const second = await context.repo.startConversationWithMessage({
      senderId: reader.id,
      recipientId: other.id,
      body: 'b',
      preview: 'b',
    })

    await expect(
      context.repo.listDirectMessages({
        conversationId: first.conversation.id,
        limit: 10,
        after: second.message.id,
      }),
    ).rejects.toMatchObject({ code: 'E_DM_CONVERSATION_NOT_FOUND' })
  })

  it('lists both started and received conversations by latest message', async () => {
    const context = requireContext()
    const { reader, creator, other } = await people()
    await context.database.user.update({
      where: { id: reader.id },
      data: { role: 'CREATOR' },
    })
    const received = await context.repo.startConversationWithMessage({
      senderId: other.id,
      recipientId: reader.id,
      body: 'to reader',
      preview: 'to reader',
    })
    const started = await context.repo.startConversationWithMessage({
      senderId: reader.id,
      recipientId: creator.id,
      body: 'from reader',
      preview: 'from reader',
    })

    const page = await context.repo.listConversationsForUser({
      userId: reader.id,
      limit: 1,
    })
    expect(page.items.map((item) => item.id)).toEqual([started.conversation.id])
    const rest = await context.repo.listConversationsForUser({
      userId: reader.id,
      limit: 1,
      ...(page.nextCursor === null ? {} : { cursor: page.nextCursor }),
    })
    expect(rest.items.map((item) => item.id)).toEqual([
      received.conversation.id,
    ])
  })

  it('stores the messaging policy and deletes conversations with the account', async () => {
    const context = requireContext()
    const { reader, creator } = await people()
    expect(await context.repo.getDmPolicy(creator.id)).toBe('EVERYONE')
    expect(await context.repo.setDmPolicy(creator.id, 'FOLLOWERS')).toBe(
      'FOLLOWERS',
    )
    await context.repo.startConversationWithMessage({
      senderId: reader.id,
      recipientId: creator.id,
      body: 'hi',
      preview: 'hi',
    })

    await context.database.user.delete({ where: { id: reader.id } })

    expect(await context.database.conversation.count()).toBe(0)
    expect(await context.database.directMessage.count()).toBe(0)
  })
})
