import { describe, expect, it } from 'vitest'

import {
  canSendInConversation,
  canStartConversation,
  type DirectMessageParty,
} from './direct-message.js'

const creator: DirectMessageParty = {
  id: 'creator',
  role: 'CREATOR',
  status: 'ACTIVE',
  dmPolicy: 'EVERYONE',
}

function start(
  overrides: Partial<DirectMessageParty> = {},
  extra: { follows?: boolean; blocked?: boolean; senderId?: string } = {},
) {
  return canStartConversation({
    senderId: extra.senderId ?? 'reader',
    recipient: { ...creator, ...overrides },
    senderFollowsRecipient: extra.follows ?? false,
    blocked: extra.blocked ?? false,
  })
}

describe('canStartConversation', () => {
  it('lets a reader open a conversation with a creator who takes everyone', () => {
    expect(start()).toEqual({ allowed: true })
  })

  it.each(['PARTNER', 'ADMIN'] as const)(
    'treats %s as a creator who can receive messages',
    (role) => {
      expect(start({ role })).toEqual({ allowed: true })
    },
  )

  it.each(['VIEWER', 'MEMBER', 'MODERATOR'] as const)(
    'refuses to open a conversation with a %s',
    (role) => {
      expect(start({ role })).toEqual({
        allowed: false,
        code: 'E_DM_NOT_CREATOR',
      })
    },
  )

  it('refuses a conversation with oneself before anything else', () => {
    expect(start({ dmPolicy: 'NOBODY' }, { senderId: 'creator' })).toEqual({
      allowed: false,
      code: 'E_USER_SELF_ACTION',
    })
  })

  it('refuses across a block, whatever the policy', () => {
    expect(start({}, { blocked: true })).toEqual({
      allowed: false,
      code: 'E_SOCIAL_BLOCKED',
    })
  })

  it('refuses when the creator takes no messages', () => {
    expect(start({ dmPolicy: 'NOBODY' }, { follows: true })).toEqual({
      allowed: false,
      code: 'E_DM_CLOSED',
    })
  })

  it('asks a non-follower to follow first when the creator takes followers only', () => {
    expect(start({ dmPolicy: 'FOLLOWERS' })).toEqual({
      allowed: false,
      code: 'E_DM_FOLLOWERS_ONLY',
    })
    expect(start({ dmPolicy: 'FOLLOWERS' }, { follows: true })).toEqual({
      allowed: true,
    })
  })

  it('reports a suspended creator as closed rather than revealing the status', () => {
    expect(start({ status: 'SUSPENDED' })).toEqual({
      allowed: false,
      code: 'E_DM_CLOSED',
    })
  })
})

describe('canSendInConversation', () => {
  function send(
    senderIsInitiator: boolean,
    other: Partial<DirectMessageParty> = {},
    extra: { follows?: boolean; blocked?: boolean } = {},
  ) {
    return canSendInConversation({
      senderIsInitiator,
      other: { ...creator, ...other },
      senderFollowsOther: extra.follows ?? false,
      blocked: extra.blocked ?? false,
    })
  }

  it('lets the creator reply even with messages closed to new readers', () => {
    expect(send(false, { role: 'MEMBER', dmPolicy: 'NOBODY' })).toEqual({
      allowed: true,
    })
  })

  it('stops the reader once the creator switches to no messages', () => {
    expect(send(true, { dmPolicy: 'NOBODY' })).toEqual({
      allowed: false,
      code: 'E_DM_CLOSED',
    })
  })

  it('applies followers-only to the reader on every message', () => {
    expect(send(true, { dmPolicy: 'FOLLOWERS' })).toEqual({
      allowed: false,
      code: 'E_DM_FOLLOWERS_ONLY',
    })
    expect(send(true, { dmPolicy: 'FOLLOWERS' }, { follows: true })).toEqual({
      allowed: true,
    })
  })

  it('blocks both directions across a block', () => {
    expect(send(true, {}, { blocked: true })).toEqual({
      allowed: false,
      code: 'E_SOCIAL_BLOCKED',
    })
    expect(send(false, {}, { blocked: true })).toEqual({
      allowed: false,
      code: 'E_SOCIAL_BLOCKED',
    })
  })

  it('does not let the creator write to a suspended reader', () => {
    expect(send(false, { status: 'SUSPENDED' })).toEqual({
      allowed: false,
      code: 'E_DM_CLOSED',
    })
  })
})
