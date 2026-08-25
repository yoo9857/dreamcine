import { randomUUID } from 'node:crypto'

import {
  createEpisode,
  createSeries,
  createUser,
  updateEpisodeStatus,
} from '@aidream/db'

import { expect, test } from './fixtures'

test('1000개 에피소드에서 피드 API p95가 300ms 이하이다', async ({
  request,
}) => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10)
  const creator = await createUser({
    handle: `feed_perf_${suffix}`,
    email: `feed_perf_${suffix}@example.com`,
    displayName: '피드 성능 제작자',
    role: 'CREATOR',
  })
  const series = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      createSeries({
        ownerId: creator.id,
        slug: `feed-performance-${suffix}-${String(index)}`,
        title: `피드 성능 시리즈 ${String(index + 1)}`,
      }),
    ),
  )
  const baseTime = Date.now() - 1000 * 60 * 60
  await Promise.all(
    series.map(async (item, seriesIndex) => {
      for (let number = 1; number <= 50; number += 1) {
        const index = seriesIndex * 50 + number - 1
        const episode = await createEpisode({
          seriesId: item.id,
          number,
          title: `피드 성능 에피소드 ${String(index + 1)}`,
        })
        await updateEpisodeStatus(episode.id, 'PUBLISHED', {
          publishedAt: new Date(baseTime + index * 1000),
        })
      }
    }),
  )

  const first = await request.get('/api/feed?type=popular&limit=20')
  expect(first.status()).toBe(200)
  const firstBody = (await first.json()) as { nextCursor: string | null }
  expect(firstBody.nextCursor).not.toBeNull()
  const cursor = firstBody.nextCursor
  if (cursor === null) throw new Error('performance fixture has no next page')

  const samples: number[] = []
  for (let index = 0; index < 20; index += 1) {
    const startedAt = performance.now()
    const response = await request.get(
      `/api/feed?type=popular&limit=20&cursor=${encodeURIComponent(cursor)}`,
    )
    samples.push(performance.now() - startedAt)
    expect(response.status()).toBe(200)
  }
  samples.sort((left, right) => left - right)
  const p95 = samples[Math.ceil(samples.length * 0.95) - 1]
  expect(p95).toBeDefined()
  expect(p95).toBeLessThanOrEqual(300)
})
