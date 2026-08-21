'use client'

import * as RadixAvatar from '@radix-ui/react-avatar'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'

export interface AvatarProps {
  /** 표시 이름. 이미지가 없으면 이니셜 폴백에 쓰인다. */
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm: 'size-6 text-xs',
  md: 'size-8 text-sm',
  lg: 'size-12 text-base',
} as const

/**
 * 이름의 첫 글자. 문자열 스프레드는 코드포인트 단위라 한글 조합·이모지를
 * 쪼갠다. `Intl.Segmenter` 로 grapheme 단위로 자른다.
 */
function initial(name: string): string {
  const trimmed = name.trim()
  if (trimmed === '') {
    return '?'
  }
  const segmenter = new Intl.Segmenter('ko', { granularity: 'grapheme' })
  const first = segmenter.segment(trimmed)[Symbol.iterator]().next()
  return first.done === true ? '?' : first.value.segment.toUpperCase()
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: AvatarProps): ReactNode {
  return (
    <RadixAvatar.Root
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-bg-elevated',
        SIZE[size],
        className,
      )}
    >
      {src === null || src === undefined || src === '' ? null : (
        <RadixAvatar.Image
          src={src}
          alt={name}
          className="size-full object-cover"
        />
      )}
      <RadixAvatar.Fallback
        // 이미지가 없을 때만 보인다. 이름을 읽어주므로 aria-hidden 하지 않는다.
        className="font-semibold text-fg-secondary"
        delayMs={0}
      >
        {initial(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  )
}
