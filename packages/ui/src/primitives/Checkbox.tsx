import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

import type { FieldProps } from './Input.js'

export interface CheckboxProps extends Omit<FieldProps, 'hideLabel'> {
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  name?: string
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export function Checkbox(_props: CheckboxProps): ReactNode {
  throw new NotImplementedError('T14:checkbox')
}
