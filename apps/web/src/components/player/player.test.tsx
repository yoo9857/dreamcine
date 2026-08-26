// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AgeGate } from '../AgeGate'
import { HlsPlayer } from './HlsPlayer'
import { PlayerControls } from './PlayerControls'
import type { PlayerState } from '@/src/hooks/use-player'

const hlsMocks = vi.hoisted(() => ({ instances: [] as MockHls[] }))

class MockHls {
  static readonly Events = { MANIFEST_PARSED: 'manifest', ERROR: 'error' }
  static readonly ErrorTypes = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError',
  }
  static supported = true
  static isSupported(): boolean {
    return MockHls.supported
  }
  readonly handlers = new Map<string, (...args: never[]) => void>()
  readonly startLoad = vi.fn()
  readonly recoverMediaError = vi.fn()
  readonly destroy = vi.fn()
  readonly attachMedia = vi.fn()
  readonly loadSource = vi.fn()
  readonly levels = [{ height: 720, bitrate: 2_800_000 }]
  currentLevel = -1
  constructor() {
    hlsMocks.instances.push(this)
  }
  on(name: string, handler: (...args: never[]) => void): void {
    this.handlers.set(name, handler)
  }
}

vi.mock('hls.js', () => ({ default: MockHls }))

const STATE: PlayerState = {
  status: 'paused',
  positionSec: 30,
  bufferedSec: 60,
  volume: 0.8,
  muted: false,
  playbackRate: 1,
  levels: [{ index: 0, height: 720, bitrate: 2_800_000 }],
  currentLevel: -1,
  isFullscreen: false,
  errorCode: null,
}

beforeEach(() => {
  hlsMocks.instances.length = 0
  MockHls.supported = true
  vi.restoreAllMocks()
})

describe('PlayerControls', () => {
  it('exposes accessible playback, seek, sound, quality, and fullscreen controls', () => {
    const toggle = vi.fn()
    const seekBy = vi.fn()
    const level = vi.fn()
    render(
      <PlayerControls
        state={STATE}
        durationSec={120}
        onTogglePlayback={toggle}
        onSeek={vi.fn()}
        onSeekBy={seekBy}
        onVolumeChange={vi.fn()}
        onToggleMuted={vi.fn()}
        onPlaybackRateChange={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onLevelChange={level}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '재생' }))
    fireEvent.click(screen.getByRole('button', { name: '10초 앞으로' }))
    fireEvent.change(screen.getByRole('combobox', { name: '화질' }), {
      target: { value: '0' },
    })
    expect(toggle).toHaveBeenCalledOnce()
    expect(seekBy).toHaveBeenCalledWith(10)
    expect(level).toHaveBeenCalledWith(0)
    expect(screen.getByRole('slider', { name: '재생 위치' })).toBeDefined()
    expect(screen.getByRole('button', { name: '전체 화면' })).toBeDefined()
  })
})

describe('HlsPlayer', () => {
  it('uses native HLS on Safari without creating hls.js', async () => {
    MockHls.supported = false
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('maybe')
    render(
      <HlsPlayer
        masterUrl="https://cdn.example.com/master.m3u8"
        startAtSec={0}
        durationSec={120}
        onProgress={vi.fn()}
        onWatchedSeconds={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByLabelText('에피소드 동영상').getAttribute('src')).toBe(
        'https://cdn.example.com/master.m3u8',
      )
    })
    expect(hlsMocks.instances).toHaveLength(0)
  })

  it('prefers hls.js when native HLS and manual renditions are available', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('maybe')
    render(
      <HlsPlayer
        masterUrl="https://cdn.example.com/master.m3u8"
        startAtSec={0}
        durationSec={120}
        onProgress={vi.fn()}
        onWatchedSeconds={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(hlsMocks.instances).toHaveLength(1)
    })
    expect(hlsMocks.instances[0]?.loadSource).toHaveBeenCalledWith(
      'https://cdn.example.com/master.m3u8',
    )
  })

  it('limits fatal network recovery to three retries', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('')
    const onError = vi.fn()
    render(
      <HlsPlayer
        masterUrl="https://cdn.example.com/master.m3u8"
        startAtSec={0}
        durationSec={120}
        onProgress={vi.fn()}
        onWatchedSeconds={vi.fn()}
        onEnded={vi.fn()}
        onError={onError}
      />,
    )
    await waitFor(() => {
      expect(hlsMocks.instances).toHaveLength(1)
    })
    const instance = hlsMocks.instances[0]
    const handler = instance?.handlers.get('error')
    expect(handler).toBeDefined()
    act(() => {
      for (let index = 0; index < 4; index += 1)
        handler?.(null as never, { fatal: true, type: 'networkError' } as never)
    })
    expect(instance?.startLoad).toHaveBeenCalledTimes(3)
    expect(instance?.destroy).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledWith('E_PLAYER_NETWORK')
  })
})

describe('AgeGate', () => {
  it('requires a birth year for A19 and shows a safe failure message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    )
    render(<AgeGate episodeId="episode_1" rating="A19" authenticated />)
    expect(screen.getByRole('spinbutton', { name: '출생 연도' })).toBeDefined()
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '2000' },
    })
    fireEvent.click(screen.getByRole('button', { name: '확인하고 재생' }))
    expect(await screen.findByRole('alert')).toBeDefined()
    expect(fetch).toHaveBeenCalledWith(
      '/api/episodes/episode_1/age-confirm',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
