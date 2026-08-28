// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EpisodeCreateWorkspace } from './EpisodeCreateWorkspace'

vi.mock('./CreateEpisodeForm', () => ({
  CreateEpisodeForm: ({
    onCreated,
  }: {
    readonly onCreated?: (episode: Record<string, unknown>) => void
  }) => (
    <button
      type="button"
      onClick={() => {
        onCreated?.({
          id: 'episode_new',
          title: '새 영상',
          status: 'DRAFT',
        })
      }}
    >
      테스트 등록 완료
    </button>
  ),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('EpisodeCreateWorkspace', () => {
  it('confirms draft registration and can publish before opening playback', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(
      <EpisodeCreateWorkspace
        seriesId="series_1"
        workType="SERIES"
        availableAssets={[
          {
            id: 'asset_1',
            fileName: 'episode.mp4',
            durationSec: 120,
            posterUrl: null,
            thumbnailUrl: 'https://cdn.example/thumb.jpg',
            spriteUrl: 'https://cdn.example/sprite.jpg',
            readyAt: '2026-08-28T00:00:00.000Z',
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '회차 추가' }))
    fireEvent.click(screen.getByRole('button', { name: '테스트 등록 완료' }))
    expect(screen.getByText('영상 등록이 완료되었습니다')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: '지금 공개' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/episodes/episode_new/publish',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(await screen.findByText('영상 공개가 완료되었습니다')).toBeDefined()
    expect(
      screen
        .getByRole('link', { name: /재생 페이지 열기/u })
        .getAttribute('href'),
    ).toBe('/watch/episode_new')
  })
})
