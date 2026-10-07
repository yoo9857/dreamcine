// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import type { CreatorDirectoryItem } from '@/src/services/user/get-featured-creators'

import { CreatorDirectory } from './CreatorDirectory'

afterEach(cleanup)

const creators: readonly CreatorDirectoryItem[] = [
  {
    handle: 'first.creator',
    displayName: '첫 작가',
    bio: '도시의 이야기를 만듭니다.',
    avatarUrl: null,
    tier: 'GOLD',
    isVerified: true,
    followerCount: 100,
    seriesCount: 2,
    monthlySeriesCount: 1,
    works: [
      {
        id: 'city',
        title: '도시의 밤',
        watchPath: '/watch/city-episode',
        posterUrl: null,
        durationSec: 30,
      },
    ],
  },
  {
    handle: 'second.creator',
    displayName: '두 번째 작가',
    bio: '자연의 이야기를 만듭니다.',
    avatarUrl: null,
    tier: 'GOLD',
    isVerified: true,
    followerCount: 200,
    seriesCount: 8,
    monthlySeriesCount: 1,
  },
]

describe('CreatorDirectory', () => {
  it('filters creators and keeps profile links navigable', () => {
    render(<CreatorDirectory initialCreators={creators} />)

    fireEvent.change(
      screen.getByPlaceholderText('이름, @아이디 또는 작품 검색'),
      {
        target: { value: 'second.creator' },
      },
    )

    expect(screen.queryByRole('heading', { name: '첫 작가' })).toBeNull()
    expect(screen.getByRole('heading', { name: '두 번째 작가' })).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: /두 번째 작가 @second.creator/ })
        .getAttribute('href'),
    ).toBe('/u/second.creator')
  })

  it('sorts creators by work count with a pressed state', () => {
    const { container } = render(
      <CreatorDirectory initialCreators={creators} />,
    )

    fireEvent.change(
      screen.getByPlaceholderText('이름, @아이디 또는 작품 검색'),
      {
        target: { value: '작가' },
      },
    )
    fireEvent.click(screen.getByRole('button', { name: '공개 작품순' }))

    const headings = Array.from(
      container.querySelectorAll('.creator-world h3'),
    ).map((node) => node.textContent)
    expect(headings).toEqual(['두 번째 작가', '첫 작가'])
    expect(
      screen
        .getByRole('button', { name: '공개 작품순' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('renders monthly creators once and keeps their work worlds visible', () => {
    const { container } = render(
      <CreatorDirectory
        initialCreators={[...creators, ...creators.slice(0, 1)]}
        monthLabel="2026년 10월"
      />,
    )
    const monthly = container.querySelectorAll('.creator-monthly-card h3')
    expect(Array.from(monthly).map((node) => node.textContent)).toEqual([
      '첫 작가',
      '두 번째 작가',
    ])
    expect(container.querySelectorAll('.creator-world')).toHaveLength(2)
    expect(screen.getByText('2명의 작가')).toBeTruthy()
    expect(screen.queryByText('일치하는 작가가 없습니다.')).toBeNull()
    expect(
      screen.getByRole('link', { name: '도시의 밤 재생' }).getAttribute('href'),
    ).toBe('/watch/city-episode')
    expect(container.querySelector('.creator-monthly-track')).toBeNull()
  })

  it('searches handles with @ and work titles, then clears the search', () => {
    render(<CreatorDirectory initialCreators={creators} />)
    const input = screen.getByRole('textbox', { name: '작가와 작품 검색' })
    fireEvent.change(input, { target: { value: '@first.creator' } })
    expect(screen.getByRole('heading', { name: '첫 작가' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '두 번째 작가' })).toBeNull()
    fireEvent.change(input, { target: { value: '도시의 밤' } })
    expect(screen.getByRole('link', { name: '도시의 밤 재생' })).toBeTruthy()
    fireEvent.change(input, { target: { value: '없는이름' } })
    expect(screen.getByText('검색 결과가 없습니다.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '전체 작가 보기' }))
    expect(screen.getByText('2명의 작가')).toBeTruthy()
  })

  it('keeps existing work worlds when no one has published this month', () => {
    const { container } = render(
      <CreatorDirectory
        initialCreators={creators.map((creator) => ({
          ...creator,
          monthlySeriesCount: 0,
          followerCount: null,
        }))}
      />,
    )
    expect(container.querySelectorAll('.creator-monthly-card')).toHaveLength(0)
    expect(screen.getByText('다음 이야기를 기다리고 있습니다.')).toBeTruthy()
    expect(container.querySelectorAll('.creator-world')).toHaveLength(2)
    expect(screen.getAllByText('비공개')).toHaveLength(2)
  })
})
