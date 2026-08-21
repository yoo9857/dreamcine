import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react'

import { cn } from '../lib/cn.js'
import {
  CONTROL_BASE,
  CONTROL_INVALID,
  ERROR_CLASS,
  HINT_CLASS,
  LABEL_CLASS,
  type FieldProps,
} from './Input.js'

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldProps {
  /** 남은 글자 수를 보여준다. `maxLength` 와 함께 쓴다. */
  showCount?: boolean
}

export function Textarea({
  label,
  hideLabel = false,
  hint,
  error,
  showCount = false,
  className,
  id,
  maxLength,
  value,
  rows = 4,
  ...rest
}: TextareaProps): ReactNode {
  const generated = useId()
  const areaId = id ?? generated
  const hintId = `${areaId}-hint`
  const errorId = `${areaId}-error`
  const described = [
    hint === undefined ? null : hintId,
    error === undefined ? null : errorId,
  ]
    .filter((item): item is string => item !== null)
    .join(' ')
  const length = typeof value === 'string' ? value.length : 0

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={areaId}
        className={cn(LABEL_CLASS, hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <textarea
        id={areaId}
        rows={rows}
        maxLength={maxLength}
        value={value}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={described === '' ? undefined : described}
        className={cn(
          CONTROL_BASE,
          'px-3 py-2 text-sm',
          error !== undefined && CONTROL_INVALID,
          className,
        )}
        {...rest}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
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
        {showCount && maxLength !== undefined ? (
          <p className={HINT_CLASS} aria-live="polite">
            {length} / {maxLength}
          </p>
        ) : null}
      </div>
    </div>
  )
}
