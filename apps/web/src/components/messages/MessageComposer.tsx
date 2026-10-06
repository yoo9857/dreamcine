'use client'

import { LIMITS } from '@aidream/core'
import { ArrowUp, LoaderCircle } from 'lucide-react'
import React, {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

/**
 * 메시지 입력창.
 *
 * Enter 로 보내고 Shift+Enter 로 줄을 바꾼다. 한글 조합 중의 Enter 는 글자를
 * 확정하는 키라 보내지 않는다(`isComposing`). 높이는 내용에 맞춰 6줄까지 자란다.
 */
export function MessageComposer({
  placeholder,
  disabled = false,
  autoFocus = false,
  onSend,
}: {
  readonly placeholder: string
  readonly disabled?: boolean
  readonly autoFocus?: boolean
  /** 성공하면 true. 실패하면 입력을 지우지 않는다. */
  readonly onSend: (body: string) => Promise<boolean>
}): ReactNode {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const length = Array.from(value.trim()).length
  const over = length > LIMITS.DM_MAX_LEN
  const near = length > LIMITS.DM_MAX_LEN - 200

  useLayoutEffect(() => {
    const area = areaRef.current
    if (area === null) return
    area.style.height = 'auto'
    area.style.height = `${String(Math.min(area.scrollHeight, 168))}px`
  }, [value])

  const submit = async (): Promise<void> => {
    const body = value.trim()
    if (body === '' || over || sending || disabled) return
    setSending(true)
    const sent = await onSend(body)
    setSending(false)
    if (sent) {
      setValue('')
      areaRef.current?.focus()
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form
      className="dm-composer"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <label className="sr-only" htmlFor="dm-composer-input">
        메시지
      </label>
      <textarea
        id="dm-composer-input"
        ref={areaRef}
        rows={1}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => {
          setValue(event.currentTarget.value)
        }}
        onKeyDown={onKeyDown}
      />
      {near ? (
        <small
          className={over ? 'dm-composer-count is-over' : 'dm-composer-count'}
          aria-live="polite"
        >
          {length.toLocaleString('ko-KR')} /{' '}
          {LIMITS.DM_MAX_LEN.toLocaleString('ko-KR')}
        </small>
      ) : null}
      <button
        type="submit"
        aria-label="보내기"
        disabled={disabled || sending || length === 0 || over}
      >
        {sending ? (
          <LoaderCircle aria-hidden="true" className="dm-spin" />
        ) : (
          <ArrowUp aria-hidden="true" />
        )}
      </button>
    </form>
  )
}
