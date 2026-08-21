import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

export interface ProgressProps {
  /** 0 ~ 100. 범위를 벗어나면 잘라낸다. */
  value: number
  label: string
  hideLabel?: boolean
  className?: string
}

export function Progress(_props: ProgressProps): ReactNode {
  throw new NotImplementedError('T14:progress')
}
