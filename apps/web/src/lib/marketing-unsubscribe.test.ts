import { describe, expect, it } from 'vitest'

import {
  createMarketingUnsubscribeToken,
  verifyMarketingUnsubscribeToken,
} from './marketing-unsubscribe.js'

const SECRET = 'test-secret-at-least-thirty-two-characters'
const NOW = new Date('2026-08-27T00:00:00.000Z')

describe('marketing unsubscribe token', () => {
  it('round-trips an unexpired signed user id', () => {
    const token = createMarketingUnsubscribeToken({
      userId: 'user_1',
      now: NOW,
      secret: SECRET,
    })
    expect(
      verifyMarketingUnsubscribeToken({ token, now: NOW, secret: SECRET }),
    ).toBe('user_1')
  })

  it('rejects tampering, a different secret, and expiry', () => {
    const token = createMarketingUnsubscribeToken({
      userId: 'user_1',
      now: NOW,
      secret: SECRET,
    })
    expect(
      verifyMarketingUnsubscribeToken({
        token: `${token}x`,
        now: NOW,
        secret: SECRET,
      }),
    ).toBeNull()
    expect(
      verifyMarketingUnsubscribeToken({
        token,
        now: NOW,
        secret: `${SECRET}x`,
      }),
    ).toBeNull()
    expect(
      verifyMarketingUnsubscribeToken({
        token,
        now: new Date('2027-12-01T00:00:00.000Z'),
        secret: SECRET,
      }),
    ).toBeNull()
  })
})
