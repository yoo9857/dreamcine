import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import type { RouteSession } from '@/src/auth/types'
import { AuthenticatedDiscoveryHome } from './AuthenticatedDiscoveryHome'

const { feed, series } = vi.hoisted(() => ({ feed: vi.fn(), series: vi.fn() }))
vi.mock('@/src/services/feed/get-feed', () => ({ getFeed: feed }))
vi.mock('@/src/services/series/get-series', () => ({ getSeries: series }))
vi.mock('./DiscoveryTopbar', () => ({
  DiscoveryTopbar: () => <header>검색</header>,
}))
vi.mock('./DiscoveryStoryShelves', () => ({
  DiscoveryStoryShelves: () => <section>작품 목록</section>,
}))
vi.mock('./DiscoveryCreatorCta', () => ({
  DiscoveryCreatorCta: () => <section>업로드</section>,
}))
vi.mock('./DiscoveryFooter', () => ({
  DiscoveryFooter: () => <footer>푸터</footer>,
}))

it('waits for home content instead of returning a second promotional loading screen', async () => {
  let complete!: (value: { items: []; nextCursor: null }) => void
  feed.mockResolvedValue({ items: [], nextCursor: null })
  feed.mockReturnValueOnce(
    new Promise((resolve) => {
      complete = resolve
    }),
  )
  const session = { user: { handle: 'test' } } as RouteSession
  let ready = false
  const pending = AuthenticatedDiscoveryHome({ session }).then((node) => {
    ready = true
    return node
  })
  await Promise.resolve()
  expect(ready).toBe(false)
  complete({ items: [], nextCursor: null })
  const html = renderToStaticMarkup(await pending)
  expect(html).toContain('아직 공개된 작품이 없습니다')
  expect(html).toContain('작품 목록')
  expect(html).toContain('검색')
  expect(html).toContain('푸터')
  expect(html).not.toContain('취향이 열리는 순간')
  expect(html).not.toContain('discovery-hero-placeholder')
  expect(html).not.toContain('<!--$')
  expect(series).not.toHaveBeenCalled()
})
