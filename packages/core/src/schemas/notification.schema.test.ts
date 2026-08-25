import { describe, expect, it } from 'vitest'

import { NotificationPayloadSchema } from './notification.schema.js'

describe('NotificationPayloadSchema', () => {
  it('discriminates valid payloads', () => {
    expect(
      NotificationPayloadSchema.parse({
        type: 'NEW_LIKE',
        actorId: 'user_1',
        episodeId: 'episode_1',
      }).type,
    ).toBe('NEW_LIKE')
  })

  it('rejects fields from another notification type', () => {
    expect(() =>
      NotificationPayloadSchema.parse({ type: 'NEW_LIKE', actorId: 'user_1' }),
    ).toThrow()
  })
})
