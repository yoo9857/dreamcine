import { describe, expect, it, vi } from 'vitest'

vi.mock('@aidream/db', () => ({ listCreatorDirectory: vi.fn() }))
vi.mock('@aidream/storage/cdn', () => ({ avatarUrl: vi.fn(), cdnUrl: vi.fn() }))

import { creatorMonth } from './get-featured-creators'

describe('creatorMonth', () => {
  it('switches months at midnight in Seoul, including the year boundary', () => {
    const before = creatorMonth(new Date('2026-12-31T14:59:59Z'))
    const after = creatorMonth(new Date('2026-12-31T15:00:00Z'))
    expect(before.label).toBe('2026년 12월')
    expect(before.edition).toBe('2026.12')
    expect(before.start.toISOString()).toBe('2026-11-30T15:00:00.000Z')
    expect(before.end.toISOString()).toBe('2026-12-31T15:00:00.000Z')
    expect(after.label).toBe('2027년 1월')
    expect(after.edition).toBe('2027.01')
    expect(after.start.toISOString()).toBe(before.end.toISOString())
    expect(after.end.toISOString()).toBe('2027-01-31T15:00:00.000Z')
  })
})
