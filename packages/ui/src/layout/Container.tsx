import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn.js'

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'narrow' | 'default' | 'wide'
  padded?: boolean
}

const SIZE = {
  narrow: 'max-w-md',
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
} as const

export function Container({
  size = 'default',
  padded = true,
  className,
  ...rest
}: ContainerProps): ReactNode {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        SIZE[size],
        padded && 'px-4 sm:px-6',
        className,
      )}
      {...rest}
    />
  )
}
