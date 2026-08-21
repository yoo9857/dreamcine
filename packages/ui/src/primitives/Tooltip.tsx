import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

export interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function Tooltip(_props: TooltipProps): ReactNode {
  throw new NotImplementedError('T14:tooltip')
}
