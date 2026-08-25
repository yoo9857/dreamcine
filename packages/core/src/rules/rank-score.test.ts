import { describe, expect, it } from 'vitest'

import { rankScore } from './rank-score.js'

const publishedAt = new Date('2026-08-01T00:00:00.000Z')

describe('rankScore', () => {
  it('applies the fixed engagement weights and gravity formula', () => {
    const score = rankScore({
      viewCount: 10,
      likeCount: 2,
      commentCount: 1,
      publishedAt,
      now: new Date('2026-08-01T02:00:00.000Z'),
    })

    expect(score).toBeCloseTo((10 + 2 * 8 + 15) / Math.pow(2 + 2, 1.5), 12)
  })

  it('gives a newer episode the higher score when engagement is equal', () => {
    const engagement = {
      viewCount: 100,
      likeCount: 10,
      commentCount: 3,
      publishedAt,
    }

    const newer = rankScore({
      ...engagement,
      now: new Date('2026-08-01T01:00:00.000Z'),
    })
    const older = rankScore({
      ...engagement,
      now: new Date('2026-08-02T00:00:00.000Z'),
    })

    expect(newer).toBeGreaterThan(older)
  })

  it('gives higher engagement the higher score at the same age', () => {
    const time = { publishedAt, now: new Date('2026-08-01T06:00:00.000Z') }

    const lower = rankScore({
      ...time,
      viewCount: 100,
      likeCount: 0,
      commentCount: 0,
    })
    const higher = rankScore({
      ...time,
      viewCount: 100,
      likeCount: 1,
      commentCount: 0,
    })

    expect(higher).toBeGreaterThan(lower)
  })

  it('returns a finite score for a just-published episode', () => {
    const input = { viewCount: 1, likeCount: 0, commentCount: 0, publishedAt }

    expect(rankScore({ ...input, now: publishedAt })).toBeCloseTo(
      1 / Math.pow(2, 1.5),
      12,
    )
  })

  it('is monotonic for each engagement input', () => {
    const now = new Date('2026-08-01T12:00:00.000Z')
    const base = {
      viewCount: 10,
      likeCount: 2,
      commentCount: 1,
      publishedAt,
      now,
    }
    const baseline = rankScore(base)

    expect(
      rankScore({ ...base, viewCount: base.viewCount + 1 }),
    ).toBeGreaterThan(baseline)
    expect(
      rankScore({ ...base, likeCount: base.likeCount + 1 }),
    ).toBeGreaterThan(baseline)
    expect(
      rankScore({ ...base, commentCount: base.commentCount + 1 }),
    ).toBeGreaterThan(baseline)
  })

  it('decays close to zero after 30 days', () => {
    const score = rankScore({
      viewCount: 1,
      likeCount: 0,
      commentCount: 0,
      publishedAt,
      now: new Date('2026-08-31T00:00:00.000Z'),
    })

    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(0.0001)
  })
})
