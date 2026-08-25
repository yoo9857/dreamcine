// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { ReportDialog } from './ReportDialog'

describe('ReportDialog', () => {
  it('키보드로 열 수 있고 신고 사유와 상세 입력을 제공한다', () => {
    render(
      <ReportDialog target="EPISODE" targetId="episode_1" trigger="신고" />,
    )
    fireEvent.click(screen.getByRole('button', { name: '신고' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('콘텐츠 신고')).toBeTruthy()
    expect(screen.getByLabelText('신고 사유')).toBeTruthy()
    expect(screen.getByLabelText('상세 설명')).toBeTruthy()
  })
})
