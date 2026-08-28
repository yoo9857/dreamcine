// @vitest-environment jsdom

import type { EpisodeResponse, SeriesResponse } from '@aidream/core'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AiDisclosureField } from './AiDisclosureField'
import { CreateEpisodeForm } from './CreateEpisodeForm'
import { EditSeriesForm } from './EditSeriesForm'
import { EpisodeTable } from './EpisodeTable'
import { SeriesPerformancePanel } from './SeriesPerformancePanel'
import { StudioMediaLibrary } from './StudioMediaLibrary'
import { StudioSeriesTable } from './StudioSeriesTable'

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

const SERIES: SeriesResponse = {
  id: 'series_1',
  ownerId: 'user_1',
  slug: 'first-dream',
  title: '첫 번째 꿈',
  synopsis: '한 사람의 취향이 작품이 되는 이야기',
  ageRating: 'ALL',
  isCompleted: false,
  commentsOff: false,
  episodeCount: 1,
  totalViews: '1200',
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T00:00:00.000Z',
}

beforeEach(() => {
  vi.restoreAllMocks()
  router.refresh.mockReset()
  router.push.mockReset()
})

afterEach(() => {
  cleanup()
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

  it('offers only the ready upload assets supplied by the studio', () => {
    render(
      <CreateEpisodeForm
        seriesId="series_1"
        availableAssets={[
          {
            id: 'asset_ready',
            fileName: 'opening-scene.mp4',
            durationSec: 125,
            posterUrl: null,
            readyAt: '2026-08-25T00:00:00.000Z',
          },
        ]}
      />,
    )
    expect(
      screen.getByRole('option', { name: 'opening-scene.mp4 · 2:05' }),
    ).toBeDefined()
  })
})

describe('EditSeriesForm', () => {
  it('saves creator-facing series settings', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<EditSeriesForm series={SERIES} />)
    fireEvent.change(screen.getByRole('textbox', { name: '시리즈 제목' }), {
      target: { value: '수정된 첫 번째 꿈' },
    })
    fireEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/series/series_1',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })
    expect(router.refresh).toHaveBeenCalledOnce()
  })
})

describe('StudioSeriesTable', () => {
  it('filters the content library without hiding management access', () => {
    render(
      <StudioSeriesTable
        series={[
          SERIES,
          {
            ...SERIES,
            id: 'series_2',
            title: '완결된 여행',
            isCompleted: true,
          },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: '첫 번째 꿈 관리' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: '완결' }))
    expect(screen.queryByText('첫 번째 꿈')).toBeNull()
    expect(screen.getByText('완결된 여행')).toBeDefined()
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

  it('edits episode metadata from the content table', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<EpisodeTable episodes={[EPISODE]} />)
    fireEvent.click(view.getByRole('button', { name: '수정' }))
    fireEvent.change(view.getByRole('textbox', { name: '에피소드 제목' }), {
      target: { value: '새로운 첫 장면' },
    })
    fireEvent.click(view.getByRole('button', { name: '변경사항 저장' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/episodes/episode_1',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })
    expect(router.refresh).toHaveBeenCalledOnce()
  })
})

describe('StudioMediaLibrary', () => {
  it('retries a failed transcode from the persistent media library', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(
      <StudioMediaLibrary
        assets={[
          {
            id: 'asset_failed',
            fileName: 'failed-video.mp4',
            status: 'FAILED',
            durationSec: null,
            posterKey: null,
            posterUrl: null,
            width: null,
            height: null,
            attemptCount: 1,
            errorCode: 'E_TRANSCODE_FAILED',
            readyAt: null,
            createdAt: '2026-08-25T00:00:00.000Z',
            episode: null,
          },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '변환 재시도' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/assets/asset_failed/retry', {
        method: 'POST',
      })
    })
    expect(router.refresh).toHaveBeenCalledOnce()
  })
})

describe('SeriesPerformancePanel', () => {
  it('shows comparable episode metrics and links to content analytics', () => {
    render(
      <SeriesPerformancePanel
        analytics={{
          series: { id: 'series_1', title: '첫 번째 꿈' },
          totals: {
            episodes: 1,
            views: '100',
            impressions: '500',
            likes: 10,
            comments: 5,
            shares: 2,
            watchSeconds: '3000',
            uniqueViewers: 20,
            completedViewers: 8,
          },
          episodes: [
            {
              id: 'episode_1',
              title: '첫 장면',
              number: 1,
              status: 'PUBLISHED',
              seasonNumber: 1,
              seasonTitle: null,
              thumbKey: null,
              thumbUrl: null,
              durationSec: 60,
              viewCount: '100',
              impressionCount: '500',
              likeCount: 10,
              commentCount: 5,
              shareCount: 2,
              avgWatchSec: 30,
              uniqueViewers: 20,
              completedViewers: 8,
              publishedAt: '2026-08-25T00:00:00.000Z',
              updatedAt: '2026-08-25T00:00:00.000Z',
            },
          ],
        }}
      />,
    )
    expect(screen.getByText('평균 시청률 50%')).toBeDefined()
    expect(screen.getByText('기록 사용자 20명')).toBeDefined()
    expect(
      screen.getByRole('link', { name: '데이터 보기' }).getAttribute('href'),
    ).toBe('/studio/series/series_1/episodes/episode_1')
  })
})
