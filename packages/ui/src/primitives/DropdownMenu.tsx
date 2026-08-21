import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

export interface DropdownMenuItem {
  id: string
  label: string
  icon?: ReactNode
  onSelect?: () => void
  disabled?: boolean
  destructive?: boolean
}

export interface DropdownMenuProps {
  trigger: ReactNode
  items: readonly DropdownMenuItem[]
  align?: 'start' | 'center' | 'end'
  className?: string
}

export function DropdownMenu(_props: DropdownMenuProps): ReactNode {
  throw new NotImplementedError('T14:dropdownMenu')
}
