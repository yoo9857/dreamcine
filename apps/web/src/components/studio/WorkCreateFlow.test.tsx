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
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  router.refresh.mockReset()
  router.push.mockReset()
  uploaderLifecycle.unmount.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  cleanup()
  vi.unstubAllGlobals()
})

function nextMedia(): void {
  fireEvent.click(screen.getByRole('button', { name: /다음 · 영상 준비/u }))
}
function nextDetails(): void {
  fireEvent.click(screen.getByRole('radio', { name: /episode.mp4/u }))
  fireEvent.click(screen.getByRole('button', { name: /다음 · 정보 입력/u }))
}
function prepare(): void {
  fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
  nextMedia()
  nextDetails()
}
function fillDetails(): void {
  fireEvent.change(screen.getByRole('textbox', { name: '회차 제목' }), {
    target: { value: '새로운 회차' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Runway' }))
}
describe('WorkCreateFlow wizard', () => {
  it('starts with only the first step visible and guards future steps', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    expect(
      screen.getByRole('navigation', { name: '시리즈 등록 단계' }),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: /작품 선택/u })
        .getAttribute('aria-current'),
    ).toBe('step')
    expect(
      screen.getByRole('button', { name: /다음 · 영상 준비/u }),
    ).toHaveProperty('disabled', true)
    expect(
      screen.getByRole('button', { name: /^2\. 영상 준비/u }),
    ).toHaveProperty('disabled', true)
    expect(screen.queryByRole('textbox', { name: '회차 제목' })).toBeNull()
    expect(screen.queryByRole('radio', { name: /episode.mp4/u })).toBeNull()
    expect(screen.queryByRole('button', { name: /초안으로 등록/u })).toBeNull()
  })
  it('moves through three guarded steps and focuses the new heading', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
    nextMedia()
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '이야기를 담은 영상을 준비하세요' }),
    )
    expect(
      screen.getByRole('button', { name: /다음 · 정보 입력/u }),
    ).toHaveProperty('disabled', true)
    expect(screen.queryByRole('textbox', { name: '회차 제목' })).toBeNull()
    nextDetails()
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '작품을 소개해 주세요' }),
    )
    expect(screen.queryByRole('radio', { name: /episode.mp4/u })).toBeNull()
    expect(screen.getByRole('textbox', { name: '회차 제목' })).toBeTruthy()
  })
  it('accepts AI tool selection without narrative and updates submission eligibility', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    prepare()
    fillDetails()
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
  it('preserves title, tools, media selection and mounted upload when going back and forward', () => {
    render(
      <WorkCreateFlow
        works={[WORK, { ...WORK, id: 'other', title: '다른 꿈' }]}
        availableAssets={[ASSET]}
      />,
    )
    prepare()
    fillDetails()
    fireEvent.click(screen.getByRole('button', { name: /작품 선택/u }))
    fireEvent.click(screen.getByRole('button', { name: /다른 꿈/u }))
    nextMedia()
    expect(screen.getByRole('radio', { name: /episode.mp4/u })).toHaveProperty(
      'checked',
      true,
    )
    nextDetails()
    expect(screen.getByRole('textbox', { name: '회차 제목' })).toHaveProperty(
      'value',
      '새로운 회차',
    )
    expect(
      screen
        .getByRole('button', { name: 'Runway' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(uploaderLifecycle.unmount).not.toHaveBeenCalled()
  })
  it('does not submit an episode through Enter while on the media step', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
    nextMedia()
    const form = screen
      .getByRole('radio', { name: /episode.mp4/u })
      .closest('form')
    if (form === null) throw Error('missing form')
    fireEvent.submit(form)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('locks navigation and inputs while saving then restores the draft and focus on failure', async () => {
    let fail: (reason: Error) => void = () => {
      throw Error('missing request')
    }
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((_resolve, reject) => {
          fail = reject
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    prepare()
    fillDetails()
    const title = screen.getByRole('textbox', { name: '회차 제목' })
    const form = title.closest('form')
    if (form === null) throw Error('missing form')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /작품 선택/u })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.getByRole('button', { name: /이전/u })).toHaveProperty(
      'disabled',
      true,
    )
    expect(title.closest('fieldset')).toHaveProperty('disabled', true)
    fail(new TypeError('offline'))
    const alert = await screen.findByRole('alert')
    expect(document.activeElement).toBe(alert)
    expect(title).toHaveProperty('value', '새로운 회차')
    expect(
      screen.getByRole('button', { name: /초안으로 등록/u }),
    ).toHaveProperty('disabled', false)
    expect(title.closest('fieldset')).toHaveProperty('disabled', false)
  })
  it('keeps the new series draft and format when switching modes', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    fireEvent.click(screen.getByRole('radio', { name: /새 시리즈 만들기/u }))
    fireEvent.change(screen.getByRole('textbox', { name: '시리즈 제목' }), {
      target: { value: '작성 중인 작품' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: '시리즈 형식' }), {
      target: { value: 'FILM' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /기존 시리즈에 추가/u }))
    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
    fireEvent.click(screen.getByRole('radio', { name: /새 시리즈 만들기/u }))
    expect(screen.getByRole('textbox', { name: '시리즈 제목' })).toHaveProperty(
      'value',
      '작성 중인 작품',
    )
    expect(
      screen.getByRole('combobox', { name: '시리즈 형식' }),
    ).toHaveProperty('value', 'FILM')
    expect(
      screen.getByRole('button', { name: /다음 · 영상 준비/u }),
    ).toHaveProperty('disabled', true)
    expect(uploaderLifecycle.unmount).not.toHaveBeenCalled()
  })
  it('clears the old destination for a new series and guards completed steps again', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[ASSET]} />)
    prepare()
    fillDetails()
    fireEvent.click(screen.getByRole('button', { name: /작품 선택/u }))
    fireEvent.click(screen.getByRole('radio', { name: /새 시리즈 만들기/u }))
    expect(
      screen.getByRole('button', { name: /^2\. 영상 준비/u }),
    ).toHaveProperty('disabled', true)
    expect(
      screen.getByRole('button', { name: /^3\. 정보 입력/u }),
    ).toHaveProperty('disabled', true)
  })
  it('opens creation directly when the creator has no series', () => {
    render(<WorkCreateFlow works={[]} availableAssets={[]} />)
    expect(screen.queryByRole('radiogroup', { name: '등록할 위치' })).toBeNull()
    expect(screen.getByRole('combobox', { name: '시리즈 형식' })).toBeTruthy()
  })
  it('advances after successful series creation without exposing recreation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              ...WORK,
              id: 'new',
              title: '로봇 마을',
              workType: 'FILM',
            }),
            { status: 201 },
          ),
        ),
      ),
    )
    render(<WorkCreateFlow works={[]} availableAssets={[ASSET]} />)
    const title = screen.getByRole('textbox', { name: '시리즈 제목' })
    fireEvent.change(title, { target: { value: '로봇 마을' } })
    const form = title.closest('form')
    if (form === null) throw Error('missing form')
    fireEvent.submit(form)
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: '이야기를 담은 영상을 준비하세요',
        }),
      ).toBeTruthy()
    })
    expect(screen.queryByRole('textbox', { name: '시리즈 제목' })).toBeNull()
    expect(
      screen.getByText('로봇 마을', {
        selector: '.studio-wizard-context strong',
      }),
    ).toBeTruthy()
    expect(uploaderLifecycle.unmount).not.toHaveBeenCalled()
    nextDetails()
    expect(screen.getByRole('textbox', { name: '영상 제목' })).toBeTruthy()
  })
  it('shows the upload tools when no video is ready and keeps the next step guarded', () => {
    render(<WorkCreateFlow works={[WORK]} availableAssets={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /첫 번째 꿈/u }))
    nextMedia()
    expect(screen.getByTestId('uploader').closest('details')?.open).toBe(true)
    expect(
      screen.getByRole('button', { name: /다음 · 정보 입력/u }),
    ).toHaveProperty('disabled', true)
  })
  it('sorts recent series first and retains long titles in the selection list', () => {
    render(
      <WorkCreateFlow
        works={[
          {
            ...WORK,
            id: 'older',
            title: '아주 긴 작품 제목을 끝까지 확인합니다',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          WORK,
        ]}
        availableAssets={[]}
      />,
    )
    expect(screen.getAllByRole('listitem')[3]?.textContent).toContain(
      '첫 번째 꿈',
    )
    expect(
      screen
        .getByText('아주 긴 작품 제목을 끝까지 확인합니다')
        .getAttribute('title'),
    ).toContain('끝까지')
  })
  it('filters long series lists without discarding selection', () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      ...WORK,
      id: 'series_' + String(index),
      title: '작품 ' + String(index),
    }))
    render(<WorkCreateFlow works={many} availableAssets={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /작품 2/u }))
    fireEvent.change(screen.getByRole('searchbox', { name: '시리즈 검색' }), {
      target: { value: '작품 6' },
    })
    expect(screen.queryByRole('button', { name: /작품 2/u })).toBeNull()
    expect(
      screen.getByRole('button', { name: /다음 · 영상 준비/u }),
    ).toHaveProperty('disabled', false)
  })
})
