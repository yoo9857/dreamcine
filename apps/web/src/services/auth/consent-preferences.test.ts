import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  set: vi.fn(),
}))

vi.mock('@aidream/db', () => ({
  listUserConsents: mocks.list,
  setUserConsent: mocks.set,
}))

const { getConsentPreferences, updateMarketingConsent } = await import(
  './consent-preferences.js'
)

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AUTH_SECRET = 'test-secret-at-least-thirty-two-characters'
  mocks.set.mockResolvedValue(undefined)
})

describe('consent preferences', () => {
  it('uses the latest row for each consent kind', async () => {
    mocks.list.mockResolvedValue([
      { kind: 'MARKETING', granted: false, revokedAt: new Date() },
      { kind: 'MARKETING', granted: true, revokedAt: null },
      { kind: 'PRIVACY', granted: true, revokedAt: null },
      { kind: 'TOS', granted: true, revokedAt: null },
    ])
    await expect(getConsentPreferences('user_1')).resolves.toEqual({
      terms: true,
      privacy: true,
      marketing: false,
    })
  })

  it('records an immediate marketing withdrawal with hashed network data', async () => {
    mocks.list.mockResolvedValue([
      { kind: 'MARKETING', granted: false, revokedAt: new Date() },
    ])
    await updateMarketingConsent({
      userId: 'user_1',
      granted: false,
      ip: '203.0.113.5',
      userAgent: 'test-agent',
    })
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        kind: 'MARKETING',
        granted: false,
        userAgent: 'test-agent',
      }),
    )
    expect(JSON.stringify(mocks.set.mock.calls[0]?.[0])).toMatch(
      /"ipHash":"[a-f0-9]{64}"/u,
    )
  })
})
