import { NotImplementedError } from '@aidream/core'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ControlSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ControlSize
  /** 로딩 중에는 클릭이 막히고 스피너가 보인다. */
  loading?: boolean
  fullWidth?: boolean
}

export function Button(_props: ButtonProps): ReactNode {
  throw new NotImplementedError('T14:button')
}
