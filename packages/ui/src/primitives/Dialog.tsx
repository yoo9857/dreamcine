import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 접근성 이름. 시각적으로 숨기려면 `hideTitle` 을 쓴다. */
  title: string
  hideTitle?: boolean
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Dialog(_props: DialogProps): ReactNode {
  throw new NotImplementedError('T14:dialog')
}
