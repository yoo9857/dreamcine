import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

import type { FieldProps } from './Input.js'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends FieldProps {
  options: readonly SelectOption[]
  value?: string
  defaultValue?: string
  placeholder?: string
  disabled?: boolean
  onValueChange?: (value: string) => void
  className?: string
}

export function Select(_props: SelectProps): ReactNode {
  throw new NotImplementedError('T14:select')
}
