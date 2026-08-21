'use client'

import * as RadixCheckbox from '@radix-ui/react-checkbox'
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
        <RadixCheckbox.Root
          id={id}
          // exactOptionalPropertyTypes 아래에서는 undefined 를 넘기는 것과
          // 키를 생략하는 것이 다르다. Radix 는 후자를 기대한다.
          {...(name === undefined ? {} : { name })}
          {...(checked === undefined ? {} : { checked })}
          {...(defaultChecked === undefined ? {} : { defaultChecked })}
          {...(disabled === undefined ? {} : { disabled })}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={described === '' ? undefined : described}
          onCheckedChange={(next) => {
            onCheckedChange?.(next === true)
          }}
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-sm border bg-bg-elevated disabled:opacity-60',
            error === undefined ? 'border-border' : 'border-danger',
            'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
          )}
        >
          <RadixCheckbox.Indicator className="text-bg">
            <Check aria-hidden="true" className="size-4" />
          </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
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
