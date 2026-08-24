// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWatchProgress } from './use-watch-progress'

describe('useWatchProgress', () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true })
  const beacon = vi.fn().mockReturnValue(true)

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock.mockClear()
    beacon.mockClear()
    vi.stubGlobal('fetch', fetchMock)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: beacon,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('sends authenticated progress every 15 seconds and immediately on pause', () => {
    const { result } = renderHook(() =>
      useWatchProgress({ episodeId: 'episode_1', authenticated: true }),
    )
    act(() => {
      result.current.report(42)
      vi.advanceTimersByTime(15_000)
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/episodes/episode_1/progress',
      expect.objectContaining({
        body: JSON.stringify({ positionSec: 42, completed: false }),
      }),
    )
    act(() => {
      result.current.reportPause(48)
    })
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/episodes/episode_1/progress',
      expect.objectContaining({
        body: JSON.stringify({ positionSec: 48, completed: false }),
      }),
    )
  })

  it('uses sendBeacon on pagehide and marks ended progress completed', () => {
    const { result } = renderHook(() =>
      useWatchProgress({ episodeId: 'episode_1', authenticated: true }),
    )
    act(() => {
      result.current.report(75)
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(beacon).toHaveBeenCalledWith(
      '/api/episodes/episode_1/progress',
      expect.any(Blob),
    )
    act(() => {
      result.current.reportEnded(120)
    })
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/episodes/episode_1/progress',
      expect.objectContaining({
        body: JSON.stringify({ positionSec: 120, completed: true }),
      }),
    )
  })

  it('counts a view once after 30 cumulative watched seconds for anonymous viewers', () => {
    const { result } = renderHook(() =>
      useWatchProgress({ episodeId: 'episode_1', authenticated: false }),
    )
    act(() => {
      result.current.reportWatchedSeconds(29)
      result.current.reportWatchedSeconds(30)
      result.current.reportWatchedSeconds(60)
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/episodes/episode_1/views', {
      method: 'POST',
      credentials: 'same-origin',
    })
  })
})
