import { NotImplementedError } from '@aidream/core'
import type { HTMLAttributes, ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'accent' | 'danger' | 'warning' | 'success'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  size?: 'sm' | 'md'
}

export function Badge(_props: BadgeProps): ReactNode {
  throw new NotImplementedError('T14:badge')
}
