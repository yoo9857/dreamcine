import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import {
  BUTTON_BASE,
  BUTTON_VARIANT,
  type ButtonVariant,
  type ControlSize,
} from './Button.js'

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** 화면에 글자가 없으므로 접근성 이름은 필수다. (08_UIUX_SPEC.md §5) */
  label: string
  icon: ReactNode
  variant?: ButtonVariant
  size?: ControlSize
}

const SQUARE: Readonly<Record<ControlSize, string>> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps): ReactNode {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANT[variant],
        SQUARE[size],
        'p-0',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  )
}
