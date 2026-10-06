import { describe, expect, it } from 'vitest'

import {
  MessageListQuerySchema,
  SendMessageSchema,
  StartConversationSchema,
  UpdateMessagingPreferenceSchema,
} from './message.schema.js'

describe('message schemas', () => {
  it('trims and requires a body and a handle to start a conversation', () => {
    expect(
      StartConversationSchema.parse({ handle: ' hanbin ', body: ' 안녕 ' }),
    ).toEqual({ handle: 'hanbin', body: '안녕' })
    expect(
      StartConversationSchema.safeParse({ handle: 'hanbin', body: '   ' })
        .success,
    ).toBe(false)
  })

  it('leaves the DM length limit to the service so it can answer E_DM_TOO_LONG', () => {
    expect(
      SendMessageSchema.safeParse({ body: 'a'.repeat(2001) }).success,
    ).toBe(true)
    expect(
      SendMessageSchema.safeParse({ body: 'a'.repeat(10_001) }).success,
    ).toBe(false)
  })

  it('accepts an after cursor for polling and defaults the page size', () => {
    expect(MessageListQuerySchema.parse({ after: 'msg_1' })).toEqual({
      after: 'msg_1',
      limit: 20,
    })
  })

  it('accepts only the three messaging policies', () => {
    expect(
      UpdateMessagingPreferenceSchema.parse({ dmPolicy: 'FOLLOWERS' }),
    ).toEqual({ dmPolicy: 'FOLLOWERS' })
    expect(
      UpdateMessagingPreferenceSchema.safeParse({ dmPolicy: 'FRIENDS' })
        .success,
    ).toBe(false)
  })
})
