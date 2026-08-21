import { NotImplementedError } from '@aidream/core'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import type { ButtonVariant, ControlSize } from './Button.js'

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** 화면에 글자가 없으므로 접근성 이름은 필수다. (08_UIUX_SPEC.md §5) */
  label: string
  icon: ReactNode
  variant?: ButtonVariant
  size?: ControlSize
}

export function IconButton(_props: IconButtonProps): ReactNode {
  throw new NotImplementedError('T14:iconButton')
}
