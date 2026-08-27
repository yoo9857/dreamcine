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
    followerCount: 100,
    seriesCount: 2,
  },
  {
    handle: 'second.creator',
    displayName: '두 번째 작가',
    bio: '자연의 이야기를 만듭니다.',
    avatarUrl: null,
    followerCount: 200,
    seriesCount: 8,
  },
]

describe('CreatorDirectory', () => {
  it('filters creators and keeps profile links navigable', () => {
    render(<CreatorDirectory initialCreators={creators} />)

    fireEvent.change(screen.getByPlaceholderText('이름 또는 @아이디 검색'), {
      target: { value: 'second.creator' },
    })

    expect(screen.queryByRole('heading', { name: '첫 작가' })).toBeNull()
    expect(screen.getByRole('heading', { name: '두 번째 작가' })).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /두 번째 작가/ }).getAttribute('href'),
    ).toBe('/u/second.creator')
  })

  it('sorts creators by work count with a pressed state', () => {
    const { container } = render(
      <CreatorDirectory initialCreators={creators} />,
    )

    fireEvent.change(screen.getByPlaceholderText('이름 또는 @아이디 검색'), {
      target: { value: '작가' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'MOST WORKS' }))

    const headings = Array.from(
      container.querySelectorAll('.creator-directory-card h3'),
    ).map((node) => node.textContent)
    expect(headings).toEqual(['두 번째 작가', '첫 작가'])
    expect(
      screen
        .getByRole('button', { name: 'MOST WORKS' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })
})
