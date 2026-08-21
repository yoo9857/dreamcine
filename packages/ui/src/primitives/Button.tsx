import { Slot } from '@radix-ui/react-slot'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import { Spinner } from './Spinner.js'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ControlSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ControlSize
  /** 로딩 중에는 클릭이 막히고 스피너가 보인다. */
  loading?: boolean
  fullWidth?: boolean
  /**
   * 자식 요소에 버튼 모양만 입힌다. 링크를 버튼처럼 보이게 할 때 쓴다 —
   * `<button><a></a></button>` 는 유효하지 않은 HTML 이다.
   */
  asChild?: boolean
}

/**
 * 라벨 색으로 `text-bg` 를 쓴다 — 강조 배경 위의 배경색 글자다.
 * 이 조합의 대비는 `tests/tokens.test.ts` 가 4.5:1 이상으로 고정한다.
 */
export const BUTTON_VARIANT: Readonly<Record<ButtonVariant, string>> = {
  primary: 'bg-accent text-bg hover:bg-accent-hover',
  secondary: 'bg-bg-elevated text-fg border border-border hover:bg-bg-overlay',
  ghost: 'text-fg hover:bg-bg-elevated',
  danger: 'bg-danger text-bg hover:opacity-90',
}

export const BUTTON_SIZE: Readonly<Record<ControlSize, string>> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors select-none disabled:opacity-60 disabled:pointer-events-none'

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  asChild = false,
  disabled,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps): ReactNode {
  const classes = cn(
    BUTTON_BASE,
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
    fullWidth && 'w-full',
    className,
  )

  if (asChild) {
    // Slot 은 자식이 하나여야 한다. 로딩 스피너는 붙이지 않는다.
    return (
      <Slot className={classes} {...rest}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      type={type}
      // 로딩 중에는 눌러도 아무 일이 없어야 한다. aria-busy 로 이유를 알린다.
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  )
}
