'use client'

import {
  Gauge,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings2,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import React, { useState, type CSSProperties, type ReactNode } from 'react'
import type { PlayerState } from '@/src/hooks/use-player'
import { QualityMenu } from './QualityMenu'
import { SeekPreview } from './SeekPreview'

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
  readonly onTogglePictureInPicture?: () => void
  readonly onLevelChange: (level: number) => void
  readonly spriteUrl?: string
  readonly seekFrames?: readonly {
    readonly startSec: number
    readonly endSec: number
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }[]
}

function clock(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const rest = safe % 60
  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes)}:${String(rest).padStart(2, '0')}`
}

function VolumeIcon({
  muted,
  volume,
}: {
  muted: boolean
  volume: number
}): ReactNode {
  if (muted || volume === 0) return <VolumeX />
  if (volume < 0.55) return <Volume1 />
  return <Volume2 />
}

export function PlayerControls(props: PlayerControlsProps): ReactNode {
  const [preview, setPreview] = useState<{
    readonly percent: number
    readonly positionSec: number
  } | null>(null)
  const playing = props.state.status === 'playing'
  const safeDuration = Math.max(props.durationSec, 1)
  const progress = Math.min(100, (props.state.positionSec / safeDuration) * 100)
  const buffered = Math.min(100, (props.state.bufferedSec / safeDuration) * 100)
  const rangeStyle = {
    '--player-progress': `${String(progress)}%`,
    '--player-buffered': `${String(buffered)}%`,
  } as CSSProperties
  const previewFrame =
    preview === null
      ? undefined
      : props.seekFrames?.find(
          (frame) =>
            preview.positionSec >= frame.startSec &&
            preview.positionSec < frame.endSec,
        )

  return (
    <div
      className="ilog-player-controls"
      role="group"
      aria-label="영상 재생 컨트롤"
    >
      <label
        className="ilog-player-timeline"
        style={rangeStyle}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect()
          const percent = Math.max(
            0,
            Math.min(1, (event.clientX - bounds.left) / bounds.width),
          )
          setPreview({
            percent: percent * 100,
            positionSec: percent * props.durationSec,
          })
        }}
        onPointerLeave={() => {
          setPreview(null)
        }}
      >
        <span className="sr-only">재생 위치</span>
        <input
          aria-label="재생 위치"
          type="range"
          min={0}
          max={safeDuration}
          step={0.1}
          value={Math.min(props.state.positionSec, safeDuration)}
          onChange={(event) => {
            props.onSeek(Number(event.target.value))
          }}
        />
        {preview === null ? null : (
          <span
            className="ilog-player-seek-preview"
            style={{ left: `${String(preview.percent)}%` }}
          >
            <SeekPreview
              positionSec={preview.positionSec}
              {...(props.spriteUrl === undefined || previewFrame === undefined
                ? {}
                : {
                    spriteUrl: props.spriteUrl,
                    x: previewFrame.x,
                    y: previewFrame.y,
                    width: previewFrame.width,
                    height: previewFrame.height,
                  })}
            />
          </span>
        )}
      </label>

      <div className="ilog-player-control-row">
        <div className="ilog-player-control-group">
          <button
            className="ilog-player-icon-button ilog-player-play-button"
            type="button"
            aria-label={playing ? '일시정지' : '재생'}
            onClick={props.onTogglePlayback}
          >
            {playing ? (
              <Pause fill="currentColor" />
            ) : (
              <Play fill="currentColor" />
            )}
          </button>
          <button
            className="ilog-player-icon-button ilog-player-skip"
            type="button"
            aria-label="10초 뒤로"
            onClick={() => {
              props.onSeekBy(-10)
            }}
          >
            <RotateCcw />
            <small>10</small>
          </button>
          <button
            className="ilog-player-icon-button ilog-player-skip"
            type="button"
            aria-label="10초 앞으로"
            onClick={() => {
              props.onSeekBy(10)
            }}
          >
            <RotateCw />
            <small>10</small>
          </button>
          <div className="ilog-player-volume">
            <button
              className="ilog-player-icon-button"
              type="button"
              aria-label={props.state.muted ? '음소거 해제' : '음소거'}
              onClick={props.onToggleMuted}
            >
              <VolumeIcon
                muted={props.state.muted}
                volume={props.state.volume}
              />
            </button>
            <label>
              <span className="sr-only">음량</span>
              <input
                aria-label="음량"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={props.state.muted ? 0 : props.state.volume}
                onChange={(event) => {
                  props.onVolumeChange(Number(event.target.value))
                }}
              />
            </label>
          </div>
          <output className="ilog-player-time" aria-live="off">
            <strong>{clock(props.state.positionSec)}</strong>
            <span>/</span>
            <span>{clock(props.durationSec)}</span>
          </output>
        </div>

        <div className="ilog-player-control-group ilog-player-control-end">
          <details className="ilog-player-settings">
            <summary className="ilog-player-icon-button" aria-label="재생 설정">
              <Settings2 />
            </summary>
            <div className="ilog-player-settings-menu">
              <label>
                <span>
                  <Gauge /> 재생 속도
                </span>
                <select
                  aria-label="재생 속도"
                  value={props.state.playbackRate}
                  onChange={(event) => {
                    props.onPlaybackRateChange(Number(event.target.value))
                  }}
                >
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <option key={rate} value={rate}>
                      {rate === 1 ? '보통' : `${String(rate)}x`}
                    </option>
                  ))}
                </select>
              </label>
              <QualityMenu
                levels={props.state.levels}
                currentLevel={props.state.currentLevel}
                onChange={props.onLevelChange}
              />
            </div>
          </details>
          {props.onTogglePictureInPicture === undefined ? null : (
            <button
              className="ilog-player-icon-button ilog-player-pip"
              type="button"
              aria-label="화면 속 화면"
              onClick={props.onTogglePictureInPicture}
            >
              <PictureInPicture2 />
            </button>
          )}
          <button
            className="ilog-player-icon-button"
            type="button"
            aria-label={
              props.state.isFullscreen ? '전체 화면 종료' : '전체 화면'
            }
            onClick={props.onToggleFullscreen}
          >
            {props.state.isFullscreen ? <Minimize /> : <Maximize />}
          </button>
        </div>
      </div>
    </div>
  )
}
