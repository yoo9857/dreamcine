'use client'

import React, { type ReactNode } from 'react'
import type { PlayerState } from '@/src/hooks/use-player'
import { QualityMenu } from './QualityMenu'

export interface PlayerControlsProps {
  readonly state: PlayerState
  readonly durationSec: number
  readonly onTogglePlayback: () => void
  readonly onSeek: (positionSec: number) => void
  readonly onSeekBy: (deltaSec: number) => void
  readonly onVolumeChange: (volume: number) => void
  readonly onToggleMuted: () => void
  readonly onPlaybackRateChange: (rate: number) => void
  readonly onToggleFullscreen: () => void
  readonly onLevelChange: (level: number) => void
}

function clock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(safe / 60))}:${String(safe % 60).padStart(2, '0')}`
}

export function PlayerControls(props: PlayerControlsProps): ReactNode {
  const playing = props.state.status === 'playing'
  return (
    <div
      className="flex flex-wrap items-center gap-2 bg-black/80 p-3 text-white"
      role="group"
      aria-label="동영상 재생 컨트롤"
    >
      <button
        type="button"
        aria-label={playing ? '일시정지' : '재생'}
        onClick={props.onTogglePlayback}
      >
        {playing ? '일시정지' : '재생'}
      </button>
      <button
        type="button"
        aria-label="10초 뒤로"
        onClick={() => {
          props.onSeekBy(-10)
        }}
      >
        -10초
      </button>
      <button
        type="button"
        aria-label="10초 앞으로"
        onClick={() => {
          props.onSeekBy(10)
        }}
      >
        +10초
      </button>
      <label className="min-w-40 flex-1">
        <span className="sr-only">재생 위치</span>
        <input
          aria-label="재생 위치"
          type="range"
          min={0}
          max={props.durationSec}
          step={1}
          value={Math.min(props.state.positionSec, props.durationSec)}
          onChange={(event) => {
            props.onSeek(Number(event.target.value))
          }}
        />
      </label>
      <output aria-live="off">
        {clock(props.state.positionSec)} / {clock(props.durationSec)}
      </output>
      <button
        type="button"
        aria-label={props.state.muted ? '소리 켜기' : '음소거'}
        onClick={props.onToggleMuted}
      >
        {props.state.muted ? '소리 켜기' : '음소거'}
      </button>
      <label>
        <span className="sr-only">볼륨</span>
        <input
          aria-label="볼륨"
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={props.state.muted ? 0 : props.state.volume}
          onChange={(event) => {
            props.onVolumeChange(Number(event.target.value))
          }}
        />
      </label>
      <label>
        <span className="sr-only">재생 속도</span>
        <select
          aria-label="재생 속도"
          value={props.state.playbackRate}
          onChange={(event) => {
            props.onPlaybackRateChange(Number(event.target.value))
          }}
        >
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
            <option key={rate} value={rate}>
              {rate}배
            </option>
          ))}
        </select>
      </label>
      <QualityMenu
        levels={props.state.levels}
        currentLevel={props.state.currentLevel}
        onChange={props.onLevelChange}
      />
      <button
        type="button"
        aria-label={props.state.isFullscreen ? '전체 화면 종료' : '전체 화면'}
        onClick={props.onToggleFullscreen}
      >
        전체 화면
      </button>
    </div>
  )
}
