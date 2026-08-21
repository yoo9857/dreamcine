import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import type { SpaceKey } from '../tokens/index.js'

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column'
  gap?: SpaceKey
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between'
  wrap?: boolean
}

const GAP: Readonly<Record<SpaceKey, string>> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  12: 'gap-12',
}

const ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const

const JUSTIFY = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
} as const

export function Stack({
  direction = 'column',
  gap = 4,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
  ...rest
}: StackProps): ReactNode {
  return (
    <div
      className={cn(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        GAP[gap],
        ALIGN[align],
        JUSTIFY[justify],
        wrap && 'flex-wrap',
        className,
      )}
      {...rest}
    />
  )
}
