import { NotImplementedError } from '@aidream/core'
import type { HTMLAttributes, ReactNode } from 'react'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle'
  /** `variant='text'` 일 때 줄 수. */
  lines?: number
}

export function Skeleton(_props: SkeletonProps): ReactNode {
  throw new NotImplementedError('T14:skeleton')
}
