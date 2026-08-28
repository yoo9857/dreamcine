// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UploadApi, UploadState } from '@/src/hooks/use-upload'

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  abort: vi.fn(),
  retry: vi.fn(),
  state: null as UploadState | null,
}))
const router = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))

vi.mock('@/src/hooks/use-upload', async () => {
  const actual = await vi.importActual<typeof import('@/src/hooks/use-upload')>(
    '@/src/hooks/use-upload',
  )
  return {
    ...actual,
    useUpload: (): UploadApi => ({
      state: mocks.state ?? initialState(),
      start: mocks.start,
      pause: mocks.pause,
      resume: mocks.resume,
      abort: mocks.abort,
      retry: mocks.retry,
    }),
  }
})

const { Uploader } = await import('./Uploader')
const { UploadProgress } = await import('./UploadProgress')

function initialState(overrides: Partial<UploadState> = {}): UploadState {
  return {
    phase: 'idle',
    uploadId: null,
    assetId: null,
    bytesSent: 0,
    bytesTotal: 0,
    progress: 0,
    etaSec: null,
    transcodeProgress: 0,
    errorCode: null,
    ...overrides,
  }
}

beforeEach(() => {
  mocks.state = null
  for (const mock of [
    mocks.start,
    mocks.pause,
    mocks.resume,
    mocks.abort,
    mocks.retry,
  ]) {
    mock.mockReset()
  }
  mocks.start.mockResolvedValue(undefined)
  router.refresh.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('Uploader', () => {
  it('선택한 파일로 업로드를 시작한다', () => {
    render(<Uploader />)
    const file = new File(['video'], 'episode.mp4', { type: 'video/mp4' })

    fireEvent.change(screen.getByLabelText('업로드할 영상 선택'), {
      target: { files: [file] },
    })

    expect(mocks.start).toHaveBeenCalledWith(file)
    expect(screen.getByText(/episode[.]mp4/u)).not.toBeNull()
  })

  it('재개 상태에서는 이어 올리기 동작을 제공한다', () => {
    mocks.state = initialState({
      phase: 'resumable',
      uploadId: 'upl_1',
      bytesSent: 4,
      bytesTotal: 12,
      progress: 33,
    })
    render(<Uploader />)

    fireEvent.click(screen.getByRole('button', { name: '같은 파일 다시 선택' }))

    expect(screen.getByLabelText('업로드할 영상 선택')).not.toBeNull()
  })

  it('준비 완료 후 시리즈 연결을 다음 단계로 안내한다', () => {
    mocks.state = initialState({
      phase: 'ready',
      uploadId: 'upl_1',
      assetId: 'asset_1',
      transcodeProgress: 100,
    })
    render(<Uploader />)

    expect(
      screen.getByRole('heading', { name: '이제 영상을 시리즈에 연결하세요' }),
    ).not.toBeNull()
    expect(screen.getByRole('link', { name: /시리즈 선택/u })).not.toBeNull()
    expect(
      screen.getByRole('link', { name: /새 시리즈 만들기/u }),
    ).not.toBeNull()
    expect(router.refresh).toHaveBeenCalledOnce()
  })
})

describe('UploadProgress', () => {
  it('업로드 바이트와 ETA를 표시한다', () => {
    render(
      <UploadProgress
        state={initialState({
          phase: 'uploading',
          bytesSent: 5 * 1024 ** 2,
          bytesTotal: 10 * 1024 ** 2,
          progress: 50,
          etaSec: 8,
        })}
      />,
    )

    expect(screen.getByText('5.0MB / 10.0MB · 약 8초 남음')).not.toBeNull()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '50',
    )
  })
})
