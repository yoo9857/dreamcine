'use client'

import React, { type CSSProperties, type ReactNode } from 'react'

export interface SeekPreviewProps {
  readonly positionSec: number
  readonly spriteUrl?: string
  readonly x?: number
  readonly y?: number
  readonly width?: number
  readonly height?: number
}

export function SeekPreview(props: SeekPreviewProps): ReactNode {
  const style =
    props.spriteUrl === undefined
      ? undefined
      : ({
          backgroundImage: `url("${props.spriteUrl}")`,
          backgroundPosition: `-${String(props.x ?? 0)}px -${String(props.y ?? 0)}px`,
          width: props.width,
          height: props.height,
        } satisfies CSSProperties)
  return (
    <output className="ilog-player-seek-tooltip" aria-label="탐색 미리보기">
      {props.spriteUrl === undefined ? null : (
        <i className="ilog-player-seek-image" style={style} />
      )}
      <span>
        {String(Math.floor(props.positionSec / 60))}:
        {String(Math.floor(props.positionSec % 60)).padStart(2, '0')}
      </span>
    </output>
  )
}
