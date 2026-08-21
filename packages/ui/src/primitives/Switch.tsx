import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

export interface SwitchProps {
  label: string
  hideLabel?: boolean
  hint?: string
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export function Switch(_props: SwitchProps): ReactNode {
  throw new NotImplementedError('T14:switch')
}
