// @vitest-environment jsdom

import type { SeriesResponse } from '@aidream/core'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StudioAssetOption } from '@/src/services/studio/get-studio-dashboard'

import { WorkCreateFlow } from './WorkCreateFlow'

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }))

vi.mock('next/navigation', () => ({
  usePathname: () => '/studio/new',
  useRouter: () => router,
}))

// 업로더가 떼어지면 use-upload 가 전송 중인 업로드를 끊는다. 실제 업로더 대신
// 붙고 떼어지는 시점만 기록한다.
const uploaderLifecycle = vi.hoisted(() => ({ unmount: vi.fn() }))

vi.mock('@/src/components/upload/Uploader', async () => {
  const { useEffect } = await import('react')
  return {
    Uploader: () => {
      useEffect(() => uploaderLifecycle.unmount, [])
      return <div data-testid="uploader" />
    },
  }
})

const WORK: SeriesResponse = {
  id: 'series_1',
  ownerId: 'user_1',
  slug: 'first-dream',
  title: '첫 번째 꿈',
  synopsis: null,
  workType: 'SERIES',
  ageRating: 'ALL',
  isCompleted: false,
  commentsOff: false,
  episodeCount: 2,
  totalViews: '1200',
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T00:00:00.000Z',
}

const ASSET: StudioAssetOption = {
  id: 'asset_1',
  fileName: 'episode.mp4',
  durationSec: 60,
  posterUrl: null,
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  spriteUrl: 'https://cdn.example.com/sprite.jpg',
  readyAt: '2026-08-25T00:00:00.000Z',
}

beforeEach(() => {
  router.refresh.mockReset()
  router.push.mockReset()
  uploaderLifecycle.unmount.mockReset()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('WorkCreateFlow', () => {
  it('starts on the work step and keeps later steps locked', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)

    const steps = screen.getAllByRole('button', { name: /STEP/u })
    expect(steps[0]?.getAttribute('aria-current')).toBe('step')
    // 앞 단계를 끝내기 전에는 건너뛸 수 없다.
    expect(steps[1]?.hasAttribute('disabled')).toBe(true)
    expect(steps[2]?.hasAttribute('disabled')).toBe(true)
  })

  it('offers an existing work as the default target when the creator has one', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)

    expect(screen.getByRole('button', { name: /첫 번째 꿈/u })).not.toBeNull()
    expect(screen.getByText('시리즈 · 2편')).not.toBeNull()
  })

  it('skips upload and goes straight to details when a ready video exists', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)

    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))

    const steps = screen.getAllByRole('button', { name: /STEP/u })
    expect(steps[2]?.getAttribute('aria-current')).toBe('step')
    expect(screen.getByText('시리즈')).not.toBeNull()
  })

  it('sends the creator to upload first when no video is ready', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))

    const steps = screen.getAllByRole('button', { name: /STEP/u })
    expect(steps[1]?.getAttribute('aria-current')).toBe('step')
  })

  it('opens the create form directly for a creator with no works', () => {
    render(<WorkCreateFlow works={[]} availableAssets={[]} />)

    // 고를 시리즈가 없으면 빈 목록 대신 만들기를 바로 연다.
    expect(screen.queryByRole('radiogroup', { name: '등록할 위치' })).toBeNull()
    expect(
      screen.getByRole('button', { name: '시리즈 만들고 계속' }),
    ).not.toBeNull()
  })

  it('flags a series with no videos, since that is what needs filling', () => {
    const empty: SeriesResponse = {
      ...WORK,
      id: 'series_2',
      title: '빈 시리즈',
      episodeCount: 0,
    }
    render(<WorkCreateFlow works={[WORK, empty]} availableAssets={[ASSET]} />)

    expect(screen.getByText('비어 있음')).not.toBeNull()
    expect(screen.getByText('시리즈 · 아직 영상 없음')).not.toBeNull()
  })

  it('puts the most recently updated series first', () => {
    const older: SeriesResponse = {
      ...WORK,
      id: 'series_old',
      title: '오래된 시리즈',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    render(<WorkCreateFlow works={[older, WORK]} availableAssets={[ASSET]} />)

    const rows = screen.getAllByRole('listitem')
    expect(rows[0]?.textContent).toContain('첫 번째 꿈')
  })

  it('offers search only once the list is long enough to need it', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    expect(screen.queryByLabelText('시리즈 검색')).toBeNull()

    cleanup()
    const many = Array.from({ length: 7 }, (_, index) => ({
      ...WORK,
      id: `series_${String(index)}`,
      title: `시리즈 ${String(index)}`,
    }))
    render(<WorkCreateFlow works={many} availableAssets={[ASSET]} />)
    expect(screen.getByLabelText('시리즈 검색')).not.toBeNull()
  })

  it('keeps an upload running when the creator steps back to change the series', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
    expect(screen.getByTestId('uploader')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /STEP 1/u }))

    // 1단계로 돌아가도 업로더는 숨겨질 뿐 떼어지지 않는다.
    expect(uploaderLifecycle.unmount).not.toHaveBeenCalled()
    expect(screen.getByTestId('uploader').closest('[hidden]')).not.toBeNull()
  })

  it('lists a series created in the flow when the creator returns to step 1', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              ...WORK,
              id: 'series_new',
              title: '로봇 마을',
              episodeCount: 0,
            }),
            { status: 201, headers: { 'content-type': 'application/json' } },
          ),
        ),
      ),
    )
    const { container } = render(
      <WorkCreateFlow works={[]} availableAssets={[ASSET]} />,
    )
    const title = container.querySelector('input[name="title"]')
    const form = title?.closest('form')
    if (title === null || form === null || form === undefined) {
      throw new Error('series form is missing')
    }
    fireEvent.change(title, { target: { value: '로봇 마을' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(
        screen
          .getAllByRole('button', { name: /STEP/u })[2]
          ?.getAttribute('aria-current'),
      ).toBe('step')
    })

    fireEvent.click(screen.getByRole('button', { name: /STEP 1/u }))

    // 빈 생성 폼이 다시 열리면 같은 이름의 시리즈를 또 만들게 된다.
    expect(
      screen.queryByRole('button', { name: '시리즈 만들고 계속' }),
    ).toBeNull()
    expect(screen.getByRole('button', { name: /로봇 마을/u })).not.toBeNull()
  })
})
