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
import { CreateSeriesForm } from './CreateSeriesForm'
import { EditSeriesForm } from './EditSeriesForm'
import { EpisodeTable } from './EpisodeTable'
import { SeriesPerformancePanel } from './SeriesPerformancePanel'
import { StudioMediaLibrary } from './StudioMediaLibrary'
import { StudioSeriesTable } from './StudioSeriesTable'
import { StudioShell } from './StudioShell'

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }))
const navigation = vi.hoisted(() => ({ pathname: '/studio' }))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => router,
}))

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
  workType: 'SERIES',
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
  navigation.pathname = '/studio'
  window.history.replaceState(null, '', '/studio')
})

afterEach(() => {
  cleanup()
})

describe('StudioShell', () => {
  it('links content to its library and scrolls dashboard analytics', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))

    render(
      <StudioShell displayName="Hanbin" handle="hanbin9857">
        <section id="analytics">Analytics</section>
        <section id="content">Content</section>
      </StudioShell>,
    )

    expect(
      screen.getByRole('link', { name: /콘텐츠/u }).getAttribute('href'),
    ).toBe('/studio/content')

    fireEvent.click(screen.getByRole('link', { name: /분석/u }))
    expect(window.location.hash).toBe('#analytics')
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })

    scrollIntoView.mockClear()
    fireEvent.click(screen.getByRole('link', { name: /분석/u }))
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })
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
      .getByRole('button', { name: '회차 추가' })
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
            thumbnailUrl: 'https://cdn.example/thumb.jpg',
            spriteUrl: 'https://cdn.example/sprite.jpg',
            readyAt: '2026-08-25T00:00:00.000Z',
          },
        ]}
      />,
    )
    expect(
      screen.getByRole('radio', { name: /opening-scene\.mp4/u }),
    ).toBeDefined()
  })
})

describe('CreateSeriesForm', () => {
  it('creates a work with the selected film format', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'work_1' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<CreateSeriesForm />)

    fireEvent.click(screen.getByRole('radio', { name: /영화·단편/u }))
    fireEvent.change(
      screen.getByRole('textbox', { name: '작품(시리즈) 제목' }),
      { target: { value: '여름의 마지막 밤' } },
    )
    fireEvent.click(screen.getByRole('button', { name: '작품 만들기' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/series',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    expect(typeof request?.body).toBe('string')
    const body: unknown =
      typeof request?.body === 'string' ? JSON.parse(request.body) : null
    expect(body).toMatchObject({
      title: '여름의 마지막 밤',
      workType: 'FILM',
    })
    expect(router.push).toHaveBeenCalledWith('/studio/series/work_1')
  })
})

describe('EditSeriesForm', () => {
  it('saves creator-facing series settings', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<EditSeriesForm series={SERIES} />)
    fireEvent.change(screen.getByRole('textbox', { name: '작품 제목' }), {
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

  it('filters the dedicated library by work format', () => {
    render(
      <StudioSeriesTable
        advanced
        series={[
          SERIES,
          {
            ...SERIES,
            id: 'film_1',
            title: '독립 영화',
            workType: 'FILM',
          },
        ]}
      />,
    )

    fireEvent.change(screen.getByRole('combobox', { name: '포맷' }), {
      target: { value: 'FILM' },
    })
    expect(screen.queryByText('첫 번째 꿈')).toBeNull()
    expect(screen.getByText('독립 영화')).toBeDefined()
    expect(screen.getByText('1개 작품')).toBeDefined()
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
    expect(screen.getAllByText('초안').length).toBeGreaterThan(0)
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
    expect(screen.getByText('아직 회차가 없습니다')).toBeDefined()
  })

  it('filters a series library by season and keeps per-episode data access', () => {
    render(
      <EpisodeTable
        episodes={[
          EPISODE,
          { ...EPISODE, id: 'episode_2', number: 2, title: '두 번째 꿈' },
        ]}
        structure={[
          {
            id: 'episode_1',
            title: '첫 번째 꿈',
            number: 1,
            status: 'DRAFT',
            seasonNumber: 1,
            seasonTitle: null,
            thumbKey: null,
            thumbUrl: null,
            durationSec: 60,
            viewCount: '0',
            impressionCount: '0',
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            avgWatchSec: 0,
            uniqueViewers: 0,
            completedViewers: 0,
            publishedAt: null,
            updatedAt: '2026-08-25T00:00:00.000Z',
          },
          {
            id: 'episode_2',
            title: '두 번째 꿈',
            number: 2,
            status: 'DRAFT',
            seasonNumber: 2,
            seasonTitle: null,
            thumbKey: null,
            thumbUrl: null,
            durationSec: 60,
            viewCount: '0',
            impressionCount: '0',
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            avgWatchSec: 0,
            uniqueViewers: 0,
            completedViewers: 0,
            publishedAt: null,
            updatedAt: '2026-08-25T00:00:00.000Z',
          },
        ]}
      />,
    )
    fireEvent.change(screen.getByRole('combobox', { name: '시즌' }), {
      target: { value: '2' },
    })
    expect(screen.queryByText('첫 번째 꿈')).toBeNull()
    expect(screen.getByText('두 번째 꿈')).toBeDefined()
    expect(screen.getByRole('link', { name: '데이터' })).toBeDefined()
  })

  it('edits episode metadata from the content table', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<EpisodeTable episodes={[EPISODE]} />)
    fireEvent.click(view.getByRole('button', { name: '수정' }))
    fireEvent.change(view.getByRole('textbox', { name: '회차 제목' }), {
      target: { value: '새로운 첫 장면' },
    })
    fireEvent.click(view.getByRole('button', { name: '변경사항 저장' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/episodes/episode_1',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    expect(typeof request?.body).toBe('string')
    const body: unknown =
      typeof request?.body === 'string' ? JSON.parse(request.body) : null
    expect(body).toMatchObject({
      seasonNumber: 1,
      number: 1,
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
