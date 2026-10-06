'use client'

import { Check } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import {
  ERROR_CLASS,
  HINT_CLASS,
  LABEL_CLASS,
  type FieldProps,
} from './Input.js'

export interface CheckboxProps extends Omit<FieldProps, 'hideLabel'> {
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  name?: string
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

/**
 * 체크박스.
 *
 * 브라우저 기본 `<input type="checkbox">` 를 그리고 모양만 바꾼다. 예전에는
 * Radix 체크박스를 썼는데, 그 런타임(약 4KB gz)이 가입 화면을 초기 JS 예산
 * (10_NFR §1, 200KB) 밖으로 밀어냈다. 기본 입력은 키보드·폼 제출·스크린리더
 * 동작을 따로 구현하지 않아도 된다.
 */
export function Checkbox({
  label,
  hint,
  error,
  checked,
  defaultChecked,
  disabled,
  name,
  onCheckedChange,
  className,
}: CheckboxProps): ReactNode {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const described = [
    hint === undefined ? null : hintId,
    error === undefined ? null : errorId,
  ]
    .filter((item): item is string => item !== null)
    .join(' ')

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        <span className="relative inline-flex size-5 shrink-0">
          <input
            id={id}
            type="checkbox"
            // exactOptionalPropertyTypes 아래에서는 undefined 를 넘기는 것과
            // 키를 생략하는 것이 다르다. 제어·비제어를 섞지 않도록 있는 것만 넘긴다.
            {...(name === undefined ? {} : { name })}
            {...(checked === undefined ? {} : { checked })}
            {...(defaultChecked === undefined ? {} : { defaultChecked })}
            {...(disabled === undefined ? {} : { disabled })}
            aria-invalid={error === undefined ? undefined : true}
            aria-describedby={described === '' ? undefined : described}
            onChange={(event) => {
              onCheckedChange?.(event.currentTarget.checked)
            }}
            className={cn(
              'peer size-5 cursor-pointer appearance-none rounded-sm border bg-bg-elevated disabled:cursor-not-allowed disabled:opacity-60',
              error === undefined ? 'border-border' : 'border-danger',
              'checked:border-accent checked:bg-accent',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            )}
          />
          <Check
            aria-hidden="true"
            className="pointer-events-none absolute inset-0.5 size-4 text-bg opacity-0 peer-checked:opacity-100"
          />
        </span>
        <label htmlFor={id} className={LABEL_CLASS}>
          {label}
        </label>
      </div>
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
