'use client'

import type { AgeRating, PlaybackResponse } from '@aidream/core'
import React, {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from 'react'

import { WatchPlayer } from './player/HlsPlayer'

export interface AgeGateProps {
  readonly episodeId: string
  readonly rating: AgeRating
  readonly authenticated: boolean
}

export function AgeGate(props: AgeGateProps): ReactNode {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [playback, setPlayback] = useState<PlaybackResponse | null>(null)
  const playbackUrl = `/api/episodes/${props.episodeId}/playback`

  const loadPlayback = useCallback(async (): Promise<boolean> => {
    const response = await fetch(playbackUrl, { credentials: 'same-origin' })
    if (!response.ok) return false
    setPlayback((await response.json()) as PlaybackResponse)
    return true
  }, [playbackUrl])

  useEffect(() => {
    void loadPlayback().catch(() => undefined)
  }, [loadPlayback])

  const submit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/episodes/${props.episodeId}/age-confirm`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            confirmed: true,
          }),
        },
      )
      if (!response.ok) {
        setError(
          response.status === 401
            ? '로그인 후 확인할 수 있습니다.'
            : '연령 조건을 확인하지 못했습니다.',
        )
        return
      }
      if (!(await loadPlayback())) {
        setError('재생 정보를 불러오지 못했습니다. 다시 시도해 주세요.')
      }
    } catch {
      setError('잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }
  if (playback !== null) {
    return (
      <WatchPlayer
        episodeId={playback.episodeId}
        authenticated={props.authenticated}
        masterUrl={playback.masterUrl}
        {...(playback.posterUrl === undefined
          ? {}
          : { posterUrl: playback.posterUrl })}
        {...(playback.spriteUrl === undefined
          ? {}
          : { spriteUrl: playback.spriteUrl })}
        {...(playback.spriteVttUrl === undefined
          ? {}
          : { spriteVttUrl: playback.spriteVttUrl })}
        startAtSec={playback.startAtSec}
        durationSec={playback.durationSec}
      />
    )
  }

  return (
    <section
      aria-labelledby="age-gate-title"
      className="mx-auto max-w-lg rounded-lg border p-6"
    >
      <h1 id="age-gate-title" className="text-xl font-bold">
        연령 확인이 필요합니다
      </h1>
      <p className="mt-2">이 영상은 {props.rating} 등급입니다.</p>
      {props.rating === 'A19' && !props.authenticated ? (
        <p className="mt-2">
          19세 이상 콘텐츠는 로그인해야 확인할 수 있습니다.
        </p>
      ) : null}
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          void submit(event)
        }}
      >
        {props.rating === 'A19' && props.authenticated ? (
          <p className="mt-2">
            가입 시 등록한 생년월일을 기준으로 성인 여부를 확인합니다.
          </p>
        ) : null}
        {error === null ? null : <p role="alert">{error}</p>}
        <button
          type="submit"
          disabled={
            submitting || (props.rating === 'A19' && !props.authenticated)
          }
        >
          {submitting ? '확인 중…' : '확인하고 재생'}
        </button>
      </form>
    </section>
  )
}
