// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { AdminPagination } from './AdminPagination'

afterEach(cleanup)

describe('AdminPagination', () => {
  it('필터를 유지한 채 처음과 다음 페이지 링크를 만든다', () => {
    render(
      <AdminPagination
        path="/admin/users"
        nextCursor="cursor-2"
        params={{ q: '한 빈', status: 'ACTIVE', empty: undefined }}
      />,
    )

    expect(
      screen.getByRole('link', { name: /처음으로/u }).getAttribute('href'),
    ).toBe('/admin/users?q=%ED%95%9C+%EB%B9%88&status=ACTIVE')
    expect(
      screen.getByRole('link', { name: /다음 페이지/u }).getAttribute('href'),
    ).toBe('/admin/users?q=%ED%95%9C+%EB%B9%88&status=ACTIVE&cursor=cursor-2')
  })

  it('다음 커서가 없으면 마지막 페이지를 알린다', () => {
    render(<AdminPagination path="/admin/reports" nextCursor={null} />)

    expect(screen.getByText('마지막 페이지입니다.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /다음 페이지/u })).toBeNull()
  })
})
