'use client'

import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import {
  CONTROL_BASE,
  CONTROL_INVALID,
  ERROR_CLASS,
  HINT_CLASS,
  LABEL_CLASS,
  type FieldProps,
} from './Input.js'

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

export function Select({
  label,
  hideLabel = false,
  hint,
  error,
  options,
  value,
  defaultValue,
  placeholder = '선택하세요',
  disabled,
  onValueChange,
  className,
}: SelectProps): ReactNode {
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
      <label htmlFor={id} className={cn(LABEL_CLASS, hideLabel && 'sr-only')}>
        {label}
      </label>
      <RadixSelect.Root
        {...(value === undefined ? {} : { value })}
        {...(defaultValue === undefined ? {} : { defaultValue })}
        {...(disabled === undefined ? {} : { disabled })}
        {...(onValueChange === undefined ? {} : { onValueChange })}
      >
        <RadixSelect.Trigger
          id={id}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={described === '' ? undefined : described}
          className={cn(
            CONTROL_BASE,
            'flex h-10 items-center justify-between px-3 text-sm',
            error !== undefined && CONTROL_INVALID,
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown aria-hidden="true" className="size-4 text-fg-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-50 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-border bg-bg-elevated"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  {...(option.disabled === undefined
                    ? {}
                    : { disabled: option.disabled })}
                  className="flex cursor-default items-center justify-between gap-2 rounded-sm px-2 py-2 text-sm text-fg outline-none data-[disabled]:opacity-60 data-[highlighted]:bg-accent-subtle"
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check aria-hidden="true" className="size-4 text-accent" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
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
