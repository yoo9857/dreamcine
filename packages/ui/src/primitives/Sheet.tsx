import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  hideTitle?: boolean
  description?: string
  side?: 'left' | 'right' | 'bottom'
  children?: ReactNode
  className?: string
}

export function Sheet(_props: SheetProps): ReactNode {
  throw new NotImplementedError('T14:sheet')
}
