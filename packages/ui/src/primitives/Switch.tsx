'use client'

import * as RadixSwitch from '@radix-ui/react-switch'
import { useId, type ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import { HINT_CLASS, LABEL_CLASS } from './Input.js'

export interface SwitchProps {
  label: string
  hideLabel?: boolean
  hint?: string
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export function Switch({
  label,
  hideLabel = false,
  hint,
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  className,
}: SwitchProps): ReactNode {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-3">
        <RadixSwitch.Root
          id={id}
          {...(checked === undefined ? {} : { checked })}
          {...(defaultChecked === undefined ? {} : { defaultChecked })}
          {...(disabled === undefined ? {} : { disabled })}
          {...(onCheckedChange === undefined ? {} : { onCheckedChange })}
          aria-describedby={hint === undefined ? undefined : hintId}
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full border border-border bg-bg-elevated transition-colors disabled:opacity-60',
            'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
          )}
        >
          <RadixSwitch.Thumb className="block size-4 translate-x-1 rounded-full bg-fg transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-bg" />
        </RadixSwitch.Root>
        <label htmlFor={id} className={cn(LABEL_CLASS, hideLabel && 'sr-only')}>
          {label}
        </label>
      </div>
      {hint === undefined ? null : (
        <p id={hintId} className={HINT_CLASS}>
          {hint}
        </p>
      )}
    </div>
  )
}
