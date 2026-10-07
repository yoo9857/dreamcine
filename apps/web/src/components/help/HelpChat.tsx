'use client'

import Link from 'next/link'
import React, {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from 'react'

import { HELP_ENTRIES, HELP_SUGGESTIONS } from '@/src/content/help-qa'

import '@/src/styles/help-chat.css'

interface ChatMessage {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly text: string
  readonly href: string | null
  readonly linkLabel: string | null
  readonly at: string
  readonly links?: readonly { readonly href: string; readonly label: string }[]
}

interface ChatResponse {
  readonly answer: string
  readonly href: string | null
  readonly linkLabel: string | null
  readonly links: readonly { readonly href: string; readonly label: string }[]
}

const STORAGE_KEY = 'ilog-help-chat'
const FAILURE =
  '지금 답변을 받지 못했습니다. 다시 보내거나 support@ilog.kr 로 문의해 주세요.'
const GREETING =
  '안녕하세요. ilog 고객 상담입니다. 준비된 서비스 안내로 작품, 계정, 크리에이터 지원을 도와드려요. 개인 계정·접수 내역은 조회하지 않습니다.'

function readResponse(payload: unknown): ChatResponse | null {
  if (typeof payload !== 'object' || payload === null) return null
  const record = payload as Record<string, unknown>
  if (
    typeof record.answer !== 'string' ||
    record.answer.trim() === '' ||
    record.answer.length > 2000
  )
    return null
  return {
    answer: record.answer,
    href: typeof record.href === 'string' ? record.href : null,
    linkLabel: typeof record.linkLabel === 'string' ? record.linkLabel : null,
    links: Array.isArray(record.links)
      ? record.links
          .filter(
            (link): link is { href: string; label: string } =>
              typeof link === 'object' &&
              link !== null &&
              typeof (link as Record<string, unknown>).href === 'string' &&
              typeof (link as Record<string, unknown>).label === 'string',
          )
          .slice(0, 6)
      : [],
  }
}

function clock(now: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(now)
}

function isMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    (record.role === 'user' || record.role === 'assistant') &&
    typeof record.text === 'string' &&
    record.text.length <= 2000 &&
    (record.href === null || typeof record.href === 'string') &&
    (record.linkLabel === null || typeof record.linkLabel === 'string') &&
    typeof record.at === 'string'
  )
}

function readStored(): {
  messages: readonly ChatMessage[]
  cloudDismissed: boolean
} {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw !== null && raw.length > 40_000)
      return { messages: [], cloudDismissed: false }
    const value: unknown = raw === null ? null : JSON.parse(raw)
    if (typeof value !== 'object' || value === null) {
      return { messages: [], cloudDismissed: false }
    }
    const record = value as Record<string, unknown>
    const messages = Array.isArray(record.messages)
      ? record.messages
          .filter(isMessage)
          .slice(-12)
          .map((message) => ({ ...message, links: readLinks(message.links) }))
      : []
    return {
      messages,
      cloudDismissed: record.cloudDismissed === true,
    }
  } catch {
    return { messages: [], cloudDismissed: false }
  }
}

function readLinks(
  value: unknown,
): readonly { readonly href: string; readonly label: string }[] {
  if (!Array.isArray(value)) return []
  return value
    .flatMap((item: unknown) => {
      if (typeof item !== 'object' || item === null) return []
      const link = item as Record<string, unknown>
      return typeof link.href === 'string' && typeof link.label === 'string'
        ? [{ href: link.href, label: link.label.slice(0, 140) }]
        : []
    })
    .slice(0, 6)
}

function HelpLink({
  href,
  label,
}: {
  readonly href: string
  readonly label: string
}): ReactNode {
  if (
    (href.startsWith('/') &&
      HELP_ENTRIES.some((entry) => entry.href === href)) ||
    /^\/(?:series|u)\/[a-zA-Z0-9_-]+$/.test(href) ||
    /^\/watch\/higgsfield\/(?:thread|borrowed-wounds)$/.test(href)
  ) {
    return <Link href={href}>{label}</Link>
  }
  if (href === 'mailto:support@ilog.kr' || href === 'mailto:privacy@ilog.kr') {
    return <a href={href}>{label}</a>
  }
  return null
}

export function HelpChat({
  initialOpen = false,
}: {
  readonly initialOpen?: boolean
}): ReactNode {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(false)
  const restored = useRef(false)
  const [open, setOpen] = useState(initialOpen)
  const pendingRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)
  const composingRef = useRef(false)
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [unseen, setUnseen] = useState(false)
  const [ready, setReady] = useState(false)
  const [cloudDismissed, setCloudDismissed] = useState(false)
  const [messages, setMessages] = useState<readonly ChatMessage[]>([])

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const stored = readStored()
    setMessages((current) => (current.length > 0 ? current : stored.messages))
    setCloudDismissed((current) => current || stored.cloudDismissed)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages: messages.slice(-12), cloudDismissed }),
      )
    } catch {
      /* Storage may be disabled; the current conversation still works. */
      return
    }
  }, [cloudDismissed, messages, ready])

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    const reopen = (): void => {
      setOpen(true)
      setUnseen(false)
      setCloudDismissed(true)
    }
    window.addEventListener('ilog:open-help', reopen)
    return () => {
      window.removeEventListener('ilog:open-help', reopen)
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const viewport = window.visualViewport
    const update = (): void => {
      const height = viewport?.height ?? window.innerHeight
      const offset = Math.max(
        0,
        window.innerHeight - height - (viewport?.offsetTop ?? 0),
      )
      frameRef.current?.style.setProperty(
        '--help-height',
        `${String(height)}px`,
      )
      frameRef.current?.style.setProperty(
        '--help-bottom',
        `${String(offset > 100 ? offset + 12 : 12)}px`,
      )
    }
    update()
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false)
        launcherRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    const log = logRef.current
    if (log === null) return
    log.scrollTop = log.scrollHeight
  }, [messages, pending, open])

  function show(): void {
    setOpen(true)
    setUnseen(false)
    setCloudDismissed(true)
  }

  async function ask(question: string): Promise<void> {
    const text = question.trim()
    if (text === '' || pendingRef.current || text.length > 500) return
    pendingRef.current = true
    setRetryQuestion(null)
    const controller = new AbortController()
    controllerRef.current = controller
    const timer = window.setTimeout(() => {
      controller.abort()
    }, 25_000)
    const history = messages.slice(-6).map((message) => ({
      role: message.role,
      content: message.text.slice(0, 800),
    }))
    const userId = `user-${String(messages.length)}-${String(Date.now())}`
    const sentAt = clock(new Date())
    setMessages((current) => [
      ...current.slice(-22),
      {
        id: userId,
        role: 'user',
        text,
        href: null,
        linkLabel: null,
        at: sentAt,
      },
    ])
    setDraft('')
    setPending(true)
    try {
      const response = await fetch('/api/help/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
        signal: controller.signal,
      })
      if (controllerRef.current !== controller) return
      const payload: unknown = await response.json()
      const answer = response.ok ? readResponse(payload) : null
      if (answer === null) setRetryQuestion(text)
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${userId}`,
          role: 'assistant',
          text:
            answer?.answer ??
            (response.status === 429
              ? '질문이 잠시 몰렸어요. 잠시 후 다시 시도해 주세요.'
              : FAILURE),
          href: answer === null ? 'mailto:support@ilog.kr' : answer.href,
          linkLabel: answer === null ? '고객센터 메일' : answer.linkLabel,
          links: answer?.links ?? [],
          at: clock(new Date()),
        },
      ])
      if (!openRef.current) setUnseen(true)
    } catch {
      if (controllerRef.current !== controller) return
      setRetryQuestion(text)
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${userId}`,
          role: 'assistant',
          text: FAILURE,
          href: 'mailto:support@ilog.kr',
          linkLabel: '고객센터 메일',
          at: clock(new Date()),
        },
      ])
      if (!openRef.current) setUnseen(true)
    } finally {
      window.clearTimeout(timer)
      if (controllerRef.current === controller) {
        pendingRef.current = false
        setPending(false)
        controllerRef.current = null
      }
    }
  }

  function onSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (composingRef.current) return
    void ask(draft)
  }

  const showCloud = ready && !open && !cloudDismissed && messages.length === 0

  return (
    <div
      className="help-chat"
      data-help-chat=""
      data-open={open}
      ref={frameRef}
    >
      {showCloud ? (
        <div className="help-chat-cloud">
          <button type="button" onClick={show}>
            도움이 필요하시면 바로 물어보세요.
          </button>
          <button
            type="button"
            aria-label="안내 닫기"
            onClick={() => {
              setCloudDismissed(true)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7 17 17M17 7 7 17" />
            </svg>
          </button>
        </div>
      ) : null}
      {open ? (
        <section
          className="help-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <header className="help-chat-header">
            <span className="help-chat-agent" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6 16.5 4 20l4.2-1.2A8 8 0 1 0 6 16.5Z" />
              </svg>
              <i />
            </span>
            <div>
              <p>자동 안내 · 개인정보를 입력하지 마세요</p>
              <h2 id={titleId}>고객 상담</h2>
            </div>
            <button
              type="button"
              aria-label="대화 삭제"
              disabled={pending || messages.length === 0}
              onClick={() => {
                setMessages([])
                setRetryQuestion(null)
                setDraft('')
                inputRef.current?.focus()
              }}
            >
              ↺
            </button>
            <button
              type="button"
              aria-label="상담창 닫기"
              onClick={() => {
                setOpen(false)
                launcherRef.current?.focus()
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 7 17 17M17 7 7 17" />
              </svg>
            </button>
          </header>
          <div
            className="help-chat-log"
            ref={logRef}
            aria-live="polite"
            role="log"
            aria-busy={pending}
          >
            <article data-role="assistant">
              <small>상담</small>
              <p>{GREETING}</p>
            </article>
            {messages.length === 0 ? (
              <div className="help-chat-suggestions">
                {HELP_SUGGESTIONS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      void ask(entry.title)
                    }}
                  >
                    {entry.title}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((message) => (
                <article key={message.id} data-role={message.role}>
                  {message.role === 'assistant' ? <small>상담</small> : null}
                  <p>{message.text}</p>
                  {message.href !== null && message.linkLabel !== null ? (
                    <HelpLink href={message.href} label={message.linkLabel} />
                  ) : null}
                  <time>{message.at}</time>
                  {message.links !== undefined
                    ? message.links
                        .slice(0, 6)
                        .map((link) =>
                          typeof link.href === 'string' &&
                          typeof link.label === 'string' ? (
                            <HelpLink
                              key={link.href}
                              href={link.href}
                              label={link.label}
                            />
                          ) : null,
                        )
                    : null}
                </article>
              ))
            )}
            {pending ? (
              <article
                className="is-typing"
                data-role="assistant"
                aria-label="답변을 준비하고 있습니다"
              >
                <span />
                <span />
                <span />
              </article>
            ) : null}
            {retryQuestion !== null ? (
              <button
                className="help-chat-retry"
                type="button"
                disabled={pending}
                onClick={() => {
                  void ask(retryQuestion)
                }}
              >
                다시 시도
              </button>
            ) : null}
          </div>
          <form onSubmit={onSubmit}>
            <label htmlFor="help-chat-input">메시지</label>
            <input
              id="help-chat-input"
              ref={inputRef}
              value={draft}
              maxLength={500}
              autoComplete="off"
              onCompositionStart={() => {
                composingRef.current = true
              }}
              onCompositionEnd={() => {
                composingRef.current = false
              }}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  (event.nativeEvent.isComposing || composingRef.current)
                )
                  event.preventDefault()
              }}
              placeholder="메시지를 입력하세요"
              onChange={(event) => {
                setDraft(event.target.value)
              }}
            />
            <button
              type="submit"
              aria-label="보내기"
              disabled={pending || draft.trim() === ''}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </section>
      ) : null}
      <button
        ref={launcherRef}
        type="button"
        className="help-chat-launcher"
        aria-label={open ? '상담 닫기' : '고객 상담'}
        aria-expanded={open}
        data-unseen={unseen ? 'true' : 'false'}
        onClick={() => {
          if (open) {
            setOpen(false)
            return
          }
          show()
        }}
      >
        {unseen ? <i className="help-chat-unseen" /> : null}
        {open ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6 18 18M18 6 6 18" />
          </svg>
        ) : (
          <span className="help-chat-launcher-face">
            <img src="/brand/help-mascot.png" alt="" width={72} height={72} />
          </span>
        )}
      </button>
    </div>
  )
}
