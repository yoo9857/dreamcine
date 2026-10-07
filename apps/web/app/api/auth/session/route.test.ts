import { beforeEach, describe, expect, it, vi } from 'vitest'

const { readSession } = vi.hoisted(() => ({ readSession: vi.fn() }))
vi.mock('@/src/auth/session', () => ({ getSessionFromRequest: readSession }))
const { GET } = await import('./route')

beforeEach(() => readSession.mockReset())

describe('database session endpoint', () => {
  it('returns the active session without clearing the opaque token cookie', async () => {
    readSession.mockResolvedValue({
      user: { id: 'guest-id', displayName: 'Guest', role: 'VIEWER' },
      expiresAt: new Date('2026-11-01T00:00:00Z'),
    })
    const request = new Request('https://ilog.info/api/auth/session', {
      headers: { cookie: '__Secure-authjs.session-token=opaque-token' },
    })
    const response = await GET(request)
    expect(readSession).toHaveBeenCalledWith(request)
    expect(await response.json()).toEqual({
      user: {
        id: 'guest-id',
        displayName: 'Guest',
        name: 'Guest',
        role: 'VIEWER',
      },
      expires: '2026-11-01T00:00:00.000Z',
    })
    expect(response.headers.getSetCookie()).toEqual([])
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('returns null for missing, expired or revoked sessions', async () => {
    readSession.mockResolvedValue(null)
    const response = await GET(
      new Request('https://ilog.info/api/auth/session'),
    )
    expect(await response.json()).toBeNull()
  })
})
