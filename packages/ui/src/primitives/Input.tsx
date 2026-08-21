import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

import { cn } from '../lib/cn.js'

/**
 * 라벨·설명·오류를 프리미티브가 직접 묶는다. 화면마다 `aria-describedby` 를
 * 다시 배선하면 반드시 빠지는 곳이 생긴다.
 */
export interface FieldProps {
  label: string
  /** 라벨을 시각적으로 숨긴다. 접근성 이름은 유지된다. */
  hideLabel?: boolean
  hint?: string
  error?: string
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    FieldProps {
  size?: 'sm' | 'md' | 'lg'
}

export const CONTROL_SIZE = {
  sm: 'h-8 px-2 text-sm',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
} as const

export const CONTROL_BASE =
  'w-full rounded-md bg-bg-elevated text-fg border border-border placeholder:text-fg-muted transition-colors disabled:opacity-60'

export const CONTROL_INVALID = 'border-danger'

export const LABEL_CLASS = 'text-sm font-medium text-fg-secondary'
export const HINT_CLASS = 'text-sm text-fg-muted'
export const ERROR_CLASS = 'text-sm text-danger'

export function Input({
  label,
  hideLabel = false,
  hint,
  error,
  size = 'md',
  className,
  id,
  ...rest
}: InputProps): ReactNode {
  const generated = useId()
  const inputId = id ?? generated
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const described = [
    hint === undefined ? null : hintId,
    error === undefined ? null : errorId,
  ]
    .filter((value): value is string => value !== null)
    .join(' ')

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className={cn(LABEL_CLASS, hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={described === '' ? undefined : described}
        className={cn(
          CONTROL_BASE,
          CONTROL_SIZE[size],
          error !== undefined && CONTROL_INVALID,
          className,
        )}
        {...rest}
      />
      {hint === undefined ? null : (
        <p id={hintId} className={HINT_CLASS}>
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} role="alert" className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  )
}
