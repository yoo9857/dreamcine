import type {
  ConversationRow,
  DirectMessageRow,
  MessagingPartyRow,
} from '@aidream/db'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import { userFixture } from '@/src/test-support/entity-fixtures'

import {
  getConversationDetail,
  getUnreadMessageCount,
  listConversationMessages,
  listMyConversations,
  markConversationRead,
  updateMessagingPreference,
} from './conversation-queries'
import { messagePreview } from './message-view'
import {
  sendMessage,
  startConversation,
  type SendMessageDependencies,
  type StartConversationDependencies,
} from './send-message'

const NOW = new Date('2026-10-06T00:00:00.000Z')

function sessionFor(
  id: string,
  overrides: Partial<RouteSession['user']> = {},
): RouteSession {
  return {
    userId: id,
    user: {
      id,
      handle: id,
      email: `${id}@example.com`,
      displayName: id,
      role: 'VIEWER',
      status: 'ACTIVE',
      emailVerified: true,
      tier: 'BRONZE',
      isVerified: false,
      ...overrides,
    },
    expiresAt: new Date('2026-12-01T00:00:00.000Z'),
  }
}

const reader = sessionFor('reader')
const creatorSession = sessionFor('creator', { role: 'CREATOR' })

function party(
  id: string,
  overrides: Partial<MessagingPartyRow> = {},
): MessagingPartyRow {
  return {
    id,
    handle: id,
    displayName: id.toUpperCase(),
    avatarKey: null,
    tier: 'BRONZE',
    verifiedAt: null,
    role: 'VIEWER',
    status: 'ACTIVE',
    dmPolicy: 'EVERYONE',
    ...overrides,
  }
}

function conversation(
  overrides: Partial<ConversationRow> = {},
): ConversationRow {
  return {
    id: 'conv_1',
    initiatorId: 'reader',
    recipientId: 'creator',
    lastMessageAt: NOW,
    lastMessagePreview: '안녕하세요',
    lastSenderId: 'reader',
    initiatorUnread: 0,
    recipientUnread: 2,
    createdAt: NOW,
    initiator: party('reader'),
    recipient: party('creator', { role: 'CREATOR' }),
    ...overrides,
  }
}

function message(overrides: Partial<DirectMessageRow> = {}): DirectMessageRow {
  return {
    id: 'msg_1',
    conversationId: 'conv_1',
    senderId: 'reader',
    body: '안녕하세요',
    createdAt: NOW,
    ...overrides,
  }
}

const creatorUser = {
  ...userFixture(),
  id: 'creator',
  role: 'CREATOR',
} as const

function startDependencies(
  overrides: Partial<StartConversationDependencies> = {},
): StartConversationDependencies {
  return {
    findRecipient: vi.fn().mockResolvedValue(creatorUser),
    socialState: vi
      .fn()
      .mockResolvedValue({ isFollowing: false, isBlocked: false }),
    start: vi.fn().mockResolvedValue({
      conversation: conversation(),
      message: message(),
    }),
    ...overrides,
  }
}

function sendDependencies(
  overrides: Partial<SendMessageDependencies> = {},
): SendMessageDependencies {
  return {
    findConversation: vi.fn().mockResolvedValue(conversation()),
    socialState: vi
      .fn()
      .mockResolvedValue({ isFollowing: false, isBlocked: false }),
    append: vi.fn().mockResolvedValue(message()),
    ...overrides,
  }
}

describe('startConversation', () => {
  it('opens a conversation with a creator and stores a one-line preview', async () => {
    const dependencies = startDependencies()

    const result = await startConversation(
      reader,
      { handle: 'creator', body: '  첫 줄\n둘째 줄 ' },
      dependencies,
    )

    expect(result.conversationId).toBe('conv_1')
    expect(result.message).toMatchObject({ id: 'msg_1', mine: true })
    expect(dependencies.start).toHaveBeenCalledWith({
      senderId: 'reader',
      recipientId: 'creator',
      body: '첫 줄\n둘째 줄',
      preview: '첫 줄 둘째 줄',
    })
  })

  it('refuses an unverified account before touching the database', async () => {
    const dependencies = startDependencies()
    await expect(
      startConversation(
        sessionFor('reader', { emailVerified: false }),
        { handle: 'creator', body: 'hi' },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
    expect(dependencies.findRecipient).not.toHaveBeenCalled()
  })

  it('answers E_DM_TOO_LONG past the DM limit', async () => {
    await expect(
      startConversation(
        reader,
        { handle: 'creator', body: 'a'.repeat(2001) },
        startDependencies(),
      ),
    ).rejects.toMatchObject({ code: 'E_DM_TOO_LONG' })
  })

  it('answers E_USER_NOT_FOUND for an unknown handle', async () => {
    await expect(
      startConversation(
        reader,
        { handle: 'ghost', body: 'hi' },
        startDependencies({ findRecipient: vi.fn().mockResolvedValue(null) }),
      ),
    ).rejects.toMatchObject({ code: 'E_USER_NOT_FOUND' })
  })

  it('refuses a conversation with oneself', async () => {
    await expect(
      startConversation(
        creatorSession,
        { handle: 'creator', body: 'hi' },
        startDependencies(),
      ),
    ).rejects.toMatchObject({ code: 'E_USER_SELF_ACTION' })
  })

  it('refuses a reader who is not a creator', async () => {
    await expect(
      startConversation(
        reader,
        { handle: 'viewer', body: 'hi' },
        startDependencies({
          findRecipient: vi
            .fn()
            .mockResolvedValue({ ...creatorUser, role: 'MEMBER' }),
        }),
      ),
    ).rejects.toMatchObject({ code: 'E_DM_NOT_CREATOR' })
  })

  it.each([
    ['NOBODY', false, false, 'E_DM_CLOSED'],
    ['FOLLOWERS', false, false, 'E_DM_FOLLOWERS_ONLY'],
    ['EVERYONE', false, true, 'E_SOCIAL_BLOCKED'],
  ] as const)(
    'refuses policy %s (following=%s, blocked=%s) with %s',
    async (dmPolicy, isFollowing, isBlocked, code) => {
      const dependencies = startDependencies({
        findRecipient: vi.fn().mockResolvedValue({ ...creatorUser, dmPolicy }),
        socialState: vi.fn().mockResolvedValue({ isFollowing, isBlocked }),
      })
      await expect(
        startConversation(
          reader,
          { handle: 'creator', body: 'hi' },
          dependencies,
        ),
      ).rejects.toMatchObject({ code })
      expect(dependencies.start).not.toHaveBeenCalled()
    },
  )
})

describe('sendMessage', () => {
  it('lets the creator reply even with messages closed to new readers', async () => {
    const dependencies = sendDependencies({
      findConversation: vi.fn().mockResolvedValue(
        conversation({
          recipient: party('creator', { role: 'CREATOR', dmPolicy: 'NOBODY' }),
        }),
      ),
      append: vi
        .fn()
        .mockResolvedValue(message({ senderId: 'creator', body: '답장' })),
    })

    const sent = await sendMessage(
      creatorSession,
      'conv_1',
      { body: '답장' },
      dependencies,
    )

    expect(sent).toMatchObject({ body: '답장', mine: true })
    expect(dependencies.append).toHaveBeenCalledWith(
      expect.objectContaining({ senderIsInitiator: false }),
    )
  })

  it('stops the reader once the creator closes messages', async () => {
    await expect(
      sendMessage(
        reader,
        'conv_1',
        { body: 'hi' },
        sendDependencies({
          findConversation: vi.fn().mockResolvedValue(
            conversation({
              recipient: party('creator', {
                role: 'CREATOR',
                dmPolicy: 'NOBODY',
              }),
            }),
          ),
        }),
      ),
    ).rejects.toMatchObject({ code: 'E_DM_CLOSED' })
  })

  it('hides a conversation from someone outside it', async () => {
    await expect(
      sendMessage(
        sessionFor('stranger'),
        'conv_1',
        { body: 'hi' },
        sendDependencies(),
      ),
    ).rejects.toMatchObject({ code: 'E_DM_CONVERSATION_NOT_FOUND' })
  })

  it('answers not found for a missing conversation', async () => {
    await expect(
      sendMessage(
        reader,
        'missing',
        { body: 'hi' },
        sendDependencies({ findConversation: vi.fn().mockResolvedValue(null) }),
      ),
    ).rejects.toMatchObject({ code: 'E_DM_CONVERSATION_NOT_FOUND' })
  })
})

describe('conversation queries', () => {
  it('shows each side its own unread count and the other person', async () => {
    const list = vi
      .fn()
      .mockResolvedValue({ items: [conversation()], nextCursor: null })

    const asCreator = await listMyConversations(
      creatorSession,
      { limit: 20 },
      { list },
    )
    const asReader = await listMyConversations(reader, { limit: 20 }, { list })

    expect(asCreator.items[0]).toMatchObject({
      unread: 2,
      startedByMe: false,
      lastMessageMine: false,
      other: { handle: 'reader' },
    })
    expect(asReader.items[0]).toMatchObject({
      unread: 0,
      startedByMe: true,
      lastMessageMine: true,
      other: { handle: 'creator' },
    })
  })

  it('explains why the reader cannot send in the detail', async () => {
    const detail = await getConversationDetail(reader, 'conv_1', {
      find: vi.fn().mockResolvedValue(
        conversation({
          recipient: party('creator', {
            role: 'CREATOR',
            dmPolicy: 'FOLLOWERS',
          }),
        }),
      ),
      socialState: vi
        .fn()
        .mockResolvedValue({ isFollowing: false, isBlocked: false }),
    })

    expect(detail).toMatchObject({
      canSend: false,
      denial: 'E_DM_FOLLOWERS_ONLY',
    })
  })

  it('keeps the composer closed for an unverified member without a denial code', async () => {
    const detail = await getConversationDetail(
      sessionFor('reader', { emailVerified: false }),
      'conv_1',
      {
        find: vi.fn().mockResolvedValue(conversation()),
        socialState: vi
          .fn()
          .mockResolvedValue({ isFollowing: false, isBlocked: false }),
      },
    )
    expect(detail).toMatchObject({ canSend: false, denial: null })
  })

  it('returns history oldest first and passes the polling anchor through', async () => {
    const list = vi.fn().mockResolvedValue({
      items: [message({ id: 'msg_2' }), message({ id: 'msg_1' })],
      nextCursor: 'older',
    })
    const find = vi.fn().mockResolvedValue(conversation())

    const history = await listConversationMessages(
      reader,
      'conv_1',
      { limit: 20 },
      { find, list },
    )
    expect(history.items.map((item) => item.id)).toEqual(['msg_1', 'msg_2'])
    expect(history.nextCursor).toBe('older')

    await listConversationMessages(
      reader,
      'conv_1',
      { limit: 20, after: 'msg_2' },
      { find, list },
    )
    expect(list).toHaveBeenLastCalledWith({
      conversationId: 'conv_1',
      limit: 20,
      after: 'msg_2',
    })
  })

  it('refuses to read or mark a conversation one is not part of', async () => {
    const find = vi.fn().mockResolvedValue(conversation())
    await expect(
      listConversationMessages(
        sessionFor('stranger'),
        'conv_1',
        { limit: 20 },
        { find, list: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: 'E_DM_CONVERSATION_NOT_FOUND' })
    const markRead = vi.fn()
    await expect(
      markConversationRead(sessionFor('stranger'), 'conv_1', {
        find,
        markRead,
      }),
    ).rejects.toMatchObject({ code: 'E_DM_CONVERSATION_NOT_FOUND' })
    expect(markRead).not.toHaveBeenCalled()
  })

  it('marks only the caller side read and counts the badge', async () => {
    const markRead = vi.fn().mockResolvedValue(undefined)
    await markConversationRead(creatorSession, 'conv_1', {
      find: vi.fn().mockResolvedValue(conversation()),
      markRead,
    })
    expect(markRead).toHaveBeenCalledWith('conv_1', 'creator')

    expect(
      await getUnreadMessageCount(creatorSession, vi.fn().mockResolvedValue(3)),
    ).toEqual({ count: 3 })
  })

  it('updates only the caller messaging policy', async () => {
    const set = vi.fn().mockResolvedValue('FOLLOWERS')
    await expect(
      updateMessagingPreference(creatorSession, 'FOLLOWERS', {
        get: vi.fn(),
        set,
      }),
    ).resolves.toEqual({ dmPolicy: 'FOLLOWERS' })
    expect(set).toHaveBeenCalledWith('creator', 'FOLLOWERS')
  })
})

describe('messagePreview', () => {
  it('folds whitespace and cuts long text with an ellipsis', () => {
    expect(messagePreview('a\n\n b')).toBe('a b')
    const preview = messagePreview('가'.repeat(200))
    expect(Array.from(preview)).toHaveLength(120)
    expect(preview.endsWith('…')).toBe(true)
  })
})
