'use client'

import React, { type ReactNode } from 'react'
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
      : {
          backgroundImage: `url("${props.spriteUrl}")`,
          backgroundPosition: `-${String(props.x ?? 0)}px -${String(props.y ?? 0)}px`,
          width: props.width,
          height: props.height,
        }
  return (
    <output aria-label="탐색 미리보기" style={style}>
      {Math.floor(props.positionSec / 60)}:
      {String(Math.floor(props.positionSec % 60)).padStart(2, '0')}
    </output>
  )
}
