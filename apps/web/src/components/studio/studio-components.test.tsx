// @vitest-environment jsdom

import type { EpisodeResponse } from '@aidream/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AiDisclosureField } from './AiDisclosureField'
import { CreateEpisodeForm } from './CreateEpisodeForm'
import { EpisodeTable } from './EpisodeTable'

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))

const EPISODE: EpisodeResponse = {
  id: 'episode_1',
  seriesId: 'series_1',
  seasonId: 'season_1',
  assetId: 'asset_1',
  number: 1,
  title: '첫 번째 꿈',
  description: null,
  status: 'DRAFT',
  ageRating: 'ALL',
  aiDisclosure: '생성형 AI로 배경을 제작했습니다.',
  publishAt: null,
  publishedAt: null,
  viewCount: '0',
  likeCount: 0,
  commentCount: 0,
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T00:00:00.000Z',
}

beforeEach(() => {
  vi.restoreAllMocks()
  router.refresh.mockReset()
  router.push.mockReset()
})

describe('AiDisclosureField', () => {
  it('is required and reports edits to its owner', () => {
    const onChange = vi.fn()
    render(<AiDisclosureField value="" onChange={onChange} />)
    const field = screen.getByRole('textbox', { name: 'AI 제작 표기' })
    expect(field.hasAttribute('required')).toBe(true)
    fireEvent.change(field, { target: { value: 'AI 배경 사용' } })
    expect(onChange).toHaveBeenCalledWith('AI 배경 사용')
  })
})

describe('CreateEpisodeForm', () => {
  it('blocks submission before the API when AI disclosure is empty', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<CreateEpisodeForm seriesId="series_1" />)
    const form = screen
      .getByRole('button', { name: '에피소드 추가' })
      .closest('form')
    expect(form).not.toBeNull()
    if (form !== null) fireEvent.submit(form)
    expect(screen.getByRole('alert').textContent).toContain('AI 제작 표기')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('EpisodeTable', () => {
  it('shows all management states and publishes a draft', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    render(
      <EpisodeTable
        episodes={[
          EPISODE,
          { ...EPISODE, id: 'episode_2', status: 'SCHEDULED' },
          { ...EPISODE, id: 'episode_3', status: 'PUBLISHED' },
          { ...EPISODE, id: 'episode_4', status: 'HIDDEN' },
        ]}
      />,
    )
    expect(screen.getByText('초안')).toBeDefined()
    expect(screen.getAllByText('예약').length).toBeGreaterThan(0)
    expect(screen.getAllByText('공개').length).toBeGreaterThan(0)
    expect(screen.getAllByText('숨김').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: '공개' }))
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/episodes/episode_1/publish',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(router.refresh).toHaveBeenCalledOnce()
  })

  it('renders an honest empty state', () => {
    render(<EpisodeTable episodes={[]} />)
    expect(screen.getByText('아직 에피소드가 없습니다')).toBeDefined()
  })
})
