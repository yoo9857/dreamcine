// @vitest-environment jsdom

import { publicUserFixture } from '@aidream/core/test-support'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { UserBadges, UserTierLine } from './UserTierLine'

afterEach(() => {
  cleanup()
})

describe('UserBadges', () => {
  it('BRONZE + 미인증이면 아무것도 그리지 않는다', () => {
    // 빈 래퍼도 만들지 않는다 — 빈 span 이 gap 을 벌려 이름 뒤에 공백이 남는다.
    const { container } = render(
      <UserBadges user={publicUserFixture({ tier: 'BRONZE' })} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('BRONZE 이지만 인증됐으면 인증 마크만 그린다', () => {
    render(
      <UserBadges
        user={publicUserFixture({ tier: 'BRONZE', isVerified: true })}
      />,
    )
    expect(screen.getByLabelText('인증 채널')).toBeTruthy()
    expect(screen.queryByTitle(/등급$/u)).toBeNull()
  })

  it('DIAMOND 는 등급 이름을 보여준다', () => {
    render(<UserBadges user={publicUserFixture({ tier: 'DIAMOND' })} />)
    expect(screen.getByText('DIAMOND')).toBeTruthy()
  })

  it('compact 는 이름을 접근성 레이블로만 남긴다', () => {
    render(<UserBadges user={publicUserFixture({ tier: 'GOLD' })} compact />)
    expect(screen.queryByText('GOLD')).toBeNull()
    expect(screen.getByLabelText('GOLD 등급')).toBeTruthy()
  })
})

describe('UserTierLine', () => {
  it('이름과 등급을 함께 보여주고 프로필로 링크한다', () => {
    render(
      <UserTierLine
        user={publicUserFixture({
          handle: 'hanbin',
          displayName: '한빈',
          tier: 'PLATINUM',
        })}
      />,
    )
    const link = screen.getByRole('link', { name: '한빈' })
    expect(link.getAttribute('href')).toBe('/u/hanbin')
    expect(screen.getByText('PLATINUM')).toBeTruthy()
  })

  it('link=false 면 링크를 만들지 않는다', () => {
    // 카드 전체가 이미 링크인 자리에서 중첩 링크가 되지 않게 하는 장치다.
    render(
      <UserTierLine
        user={publicUserFixture({ displayName: '한빈' })}
        link={false}
      />,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('한빈')).toBeTruthy()
  })

  it('showHandle 이면 @handle 을 보여준다', () => {
    render(
      <UserTierLine
        user={publicUserFixture({ handle: 'hanbin' })}
        showHandle
        link={false}
      />,
    )
    expect(screen.getByText('@hanbin')).toBeTruthy()
  })

  it('BRONZE 사용자는 이름만 남는다', () => {
    render(
      <UserTierLine
        user={publicUserFixture({ displayName: '신규', tier: 'BRONZE' })}
        link={false}
      />,
    )
    expect(screen.getByText('신규')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })
})
