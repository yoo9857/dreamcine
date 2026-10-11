// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { WatchExperience } from './WatchExperience'

const props = {
  player: <div>영상</div>,
  title: '여름, 찡긋',
  seriesTitle: '여름, 찡긋',
  creator: {
    handle: 'creator',
    displayName: '제작자',
    avatarUrl: null,
    tier: 'BRONZE',
    isVerified: false,
  } as const,
  viewCount: '1',
  publishedAt: '2026. 10. 12.',
  actions: null,
  shortItems: [],
  longItems: [],
  comments: null,
  description: null,
}
afterEach(cleanup)
describe('compact watch information', () => {
  it('shows the requested title, year, genre, runtime and credited director in order', () => {
    render(
      <WatchExperience
        {...props}
        year={2026}
        genre="애니메이션"
        durationSec={485}
        directors={['조차분']}
      />,
    )
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      '여름, 찡긋',
    )
    expect(
      within(screen.getByRole('list', { name: '작품 정보' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['2026', '애니메이션', '08:05', 'Director 조차분'])
    expect(screen.queryByText('NOW PLAYING')).toBeNull()
  })
  it('omits unknown metadata and empty actions without replacing the director with the uploader', () => {
    const view = render(<WatchExperience {...props} durationSec={50} />)
    expect(
      within(screen.getByRole('list', { name: '작품 정보' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['00:50'])
    expect(view.container.querySelector('.watch-actions')).toBeNull()
    expect(screen.getAllByRole('link', { name: /제작자/u })).toHaveLength(1)
  })
  it('keeps a different parent work available without duplicating the main title', () => {
    render(
      <WatchExperience
        {...props}
        seriesTitle="fire"
        seriesHref="/series/fire"
      />,
    )
    expect(
      screen.getByRole('link', { name: 'fire' }).getAttribute('href'),
    ).toBe('/series/fire')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
