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
  it('accepts a selected AI tool without requiring a narrative and synchronizes the summary', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
    fireEvent.click(screen.getByRole('radio', { name: /episode.mp4/u }))
    fireEvent.change(screen.getByRole('textbox', { name: '회차 제목' }), {
      target: { value: '도구로 제작한 회차' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Runway' }))
    expect(
      screen.getByRole('button', { name: /초안으로 등록/u }),
    ).toHaveProperty('disabled', false)
    expect(
      screen.getByRole('textbox', { name: 'AI 제작 표기' }),
    ).toHaveProperty('required', false)
    fireEvent.click(screen.getByRole('button', { name: 'Runway' }))
    expect(
      screen.getByRole('button', { name: /초안으로 등록/u }),
    ).toHaveProperty('disabled', true)
  })

  it('locks the destination and draft fields while saving, then restores them after failure', async () => {
    let fail: (reason: Error) => void = () => {
      throw new Error('missing request')
    }
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((_resolve, reject) => {
          fail = reject
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(
      <WorkCreateFlow
        works={[WORK, { ...WORK, id: 'other', title: '다른 꿈' }]}
        availableAssets={[ASSET]}
      />,
    )
    const destination = screen.getByRole('button', { name: /다른 꿈/u })
    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
    const title = screen.getByRole('textbox', { name: '회차 제목' })
    fireEvent.change(title, { target: { value: '저장 중인 회차' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'AI 제작 표기' }), {
      target: { value: 'AI 배경 생성' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /episode.mp4/u }))
    const form = title.closest('form')
    if (form === null) throw new Error('missing episode form')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(destination.closest('fieldset')).toHaveProperty('disabled', true)
    expect(title.closest('fieldset')).toHaveProperty('disabled', true)
    expect(screen.getByRole('radio', { name: /episode.mp4/u })).toHaveProperty(
      'disabled',
      true,
    )
    fail(new TypeError('offline'))
    const alert = await screen.findByRole('alert')
    expect(document.activeElement).toBe(alert)
    expect(title).toHaveProperty('value', '저장 중인 회차')
    expect(destination.closest('fieldset')).toHaveProperty('disabled', false)
    expect(title.closest('fieldset')).toHaveProperty('disabled', false)
    expect(
      screen.getByRole('button', { name: /초안으로 등록/u }),
    ).toHaveProperty('disabled', false)
  })

  it('preserves the new series draft and its format when switching destinations', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    fireEvent.click(screen.getByRole('radio', { name: /새 시리즈 만들기/u }))
    fireEvent.change(screen.getByRole('textbox', { name: '시리즈 제목' }), {
      target: { value: '작성 중인 새 작품' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: '시리즈 형식' }), {
      target: { value: 'FILM' },
    })
    expect(screen.getByRole('textbox', { name: '영상 제목' })).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /기존 시리즈에 추가/u }))
    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
    expect(screen.getByRole('textbox', { name: '회차 제목' })).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /새 시리즈 만들기/u }))
    expect(screen.getByRole('textbox', { name: '시리즈 제목' })).toHaveProperty(
      'value',
      '작성 중인 새 작품',
    )
    expect(
      screen.getByRole('combobox', { name: '시리즈 형식' }),
    ).toHaveProperty('value', 'FILM')
    expect(screen.getByRole('textbox', { name: '영상 제목' })).toBeTruthy()
    expect(uploaderLifecycle.unmount).not.toHaveBeenCalled()
  })

  it('clears the previous destination when starting a new series without losing episode inputs', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
    const title = screen.getByRole('textbox', { name: '회차 제목' })
    fireEvent.change(title, { target: { value: '입력 유지' } })
    fireEvent.click(screen.getByRole('radio', { name: /새 시리즈 만들기/u }))
    expect(screen.queryByLabelText('시리즈 선택 완료')).toBeNull()
    expect(title).toHaveProperty('value', '입력 유지')
    expect(
      screen.getByRole('button', { name: /초안으로 등록/u }),
    ).toHaveProperty('disabled', true)
  })

  it('shows the entire registration page and keeps submission locked until ready', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)

    expect(
      screen.getByRole('heading', { name: '어떤 시리즈에 등록할까요?' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: '영상과 정보를 준비해 주세요' }),
    ).toBeTruthy()
    expect(screen.getByRole('textbox', { name: '회차 제목' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /episode.mp4/u })).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: /초안으로 등록/u })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen.queryByRole('navigation', { name: '시리즈 등록 단계' }),
    ).toBeNull()
  })

  it('offers an existing work as the default target when the creator has one', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)

    expect(screen.getByRole('button', { name: /첫 번째 꿈/u })).not.toBeNull()
    expect(screen.getByText('시리즈 · 2편')).not.toBeNull()
  })

  it('selects a work inline while keeping ready videos and details available', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)

    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))

    expect(
      screen
        .getByRole('button', { name: /첫 번째 꿈/u })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.getByRole('textbox', { name: '회차 제목' })).toBeTruthy()
    expect(screen.getByTestId('uploader')).toBeTruthy()
  })

  it('opens upload inline when no video is ready without hiding the fields', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))

    expect(screen.getByTestId('uploader').closest('details')?.open).toBe(true)
    expect(screen.getByRole('textbox', { name: '회차 제목' })).toBeTruthy()
  })

  it('opens the create form directly for a creator with no works', () => {
    render(<WorkCreateFlow works={[]} availableAssets={[]} />)

    // 고를 시리즈가 없으면 빈 목록 대신 만들기를 바로 연다.
    expect(screen.queryByRole('radiogroup', { name: '등록할 위치' })).toBeNull()
    expect(
      screen.getByRole('button', { name: '이 시리즈로 등록 준비' }),
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

  it('keeps upload and entered episode details when switching the series', () => {
    render(
      <WorkCreateFlow
        works={[WORK, { ...WORK, id: 'other', title: '다른 꿈' }]}
        availableAssets={[]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
    expect(screen.getByTestId('uploader')).not.toBeNull()

    fireEvent.change(screen.getByRole('textbox', { name: '회차 제목' }), {
      target: { value: '작성 중인 제목' },
    })
    fireEvent.click(screen.getByRole('button', { name: /다른 꿈/u }))

    expect(uploaderLifecycle.unmount).not.toHaveBeenCalled()
    expect(screen.getByTestId('uploader').closest('[hidden]')).toBeNull()
    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: '회차 제목' })
        .value,
    ).toBe('작성 중인 제목')
  })

  it('selects a newly created series inline without offering accidental recreation', async () => {
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
          .getByRole('button', { name: /로봇 마을/u })
          .getAttribute('aria-pressed'),
      ).toBe('true')
    })

    // 빈 생성 폼이 다시 열리면 같은 이름의 시리즈를 또 만들게 된다.
    expect(
      screen.queryByRole('button', { name: '이 시리즈로 등록 준비' }),
    ).toBeNull()
    expect(screen.getByRole('button', { name: /로봇 마을/u })).not.toBeNull()
  })

  it('updates the summary and enables one draft submission after all required choices', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    fireEvent.change(screen.getByRole('textbox', { name: '회차 제목' }), {
      target: { value: '신규 회차' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'AI 제작 표기' }), {
      target: { value: 'AI로 배경 제작' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /episode.mp4/u }))
    expect(
      screen
        .getByRole('button', { name: /초안으로 등록/u })
        .hasAttribute('disabled'),
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
    expect(
      screen
        .getByRole('button', { name: /초안으로 등록/u })
        .hasAttribute('disabled'),
    ).toBe(false)
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('4')
    expect(
      screen
        .getByRole('button', { name: /초안으로 등록/u })
        .getAttribute('form'),
    ).toBe('studio-registration-episode')
  })
})
