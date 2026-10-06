'use client'

import {
  LIMITS,
  MessagePageSchema,
  MessageResponseSchema,
  type ConversationDetail,
  type ErrorCode,
  type MessageResponse,
} from '@aidream/core'
import { Avatar } from '@aidream/ui'
import { ArrowLeft, BadgeCheck, Flag } from 'lucide-react'
import Link from 'next/link'
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { ReportDialog } from '@/src/components/ReportDialog'
import { readApiError, staticMessageFor } from '@/src/lib/error-messages'

import { dayKey, dayLabel, messageTime } from './format-time'
import { MessageComposer } from './MessageComposer'
import { refreshUnreadMessages } from './unread-store'
import { usePolling } from './use-polling'

/** 서버가 닫은 사유 → 입력창 대신 보여줄 안내. */
function closedNotice(detail: ConversationDetail): string {
  if (detail.denial !== null) return staticMessageFor(detail.denial)
  return '이메일 인증을 마치면 메시지를 보낼 수 있습니다.'
}

interface PendingMessage {
  readonly key: string
  readonly body: string
  readonly failed: boolean
}

function mergeById(
  current: readonly MessageResponse[],
  incoming: readonly MessageResponse[],
): MessageResponse[] {
  const seen = new Set(current.map((item) => item.id))
  return [...current, ...incoming.filter((item) => !seen.has(item.id))]
}

export function MessageThread({
  detail,
  initialMessages,
  initialCursor,
}: {
  readonly detail: ConversationDetail
  readonly initialMessages: readonly MessageResponse[]
  readonly initialCursor: string | null
}): ReactNode {
  const [messages, setMessages] = useState<MessageResponse[]>([
    ...initialMessages,
  ])
  const [olderCursor, setOlderCursor] = useState(initialCursor)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [pending, setPending] = useState<PendingMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [closed, setClosed] = useState<string | null>(
    detail.canSend ? null : closedNotice(detail),
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const lastId = messages.at(-1)?.id ?? null
  const base = `/api/conversations/${encodeURIComponent(detail.id)}`

  const markRead = useCallback(async (): Promise<void> => {
    if (document.visibilityState !== 'visible') return
    await fetch(`${base}/read`, { method: 'POST', credentials: 'same-origin' })
    await refreshUnreadMessages()
  }, [base])

  // 처음 열 때 읽음으로 돌린다. 배지도 바로 맞춘다.
  useEffect(() => {
    void markRead()
  }, [markRead])

  // 새 메시지가 붙으면 바닥에 있던 사람만 따라 내려간다. 위를 읽는 중이면 두다.
  useLayoutEffect(() => {
    const area = scrollRef.current
    if (area !== null && stickToBottom.current) {
      area.scrollTop = area.scrollHeight
    }
  }, [messages, pending])

  const poll = useCallback(async (): Promise<void> => {
    const params = new URLSearchParams({ limit: '50' })
    if (lastId !== null) params.set('after', lastId)
    const response = await fetch(`${base}/messages?${params.toString()}`, {
      cache: 'no-store',
      credentials: 'same-origin',
    })
    if (!response.ok) return
    const parsed = MessagePageSchema.safeParse(await response.json())
    if (!parsed.success || parsed.data.items.length === 0) return
    setMessages((current) => mergeById(current, parsed.data.items))
    if (parsed.data.items.some((item) => !item.mine)) await markRead()
  }, [base, lastId, markRead])

  usePolling(poll, LIMITS.DM_THREAD_POLL_SEC * 1000)

  const loadOlder = async (): Promise<void> => {
    if (olderCursor === null || loadingOlder) return
    setLoadingOlder(true)
    const area = scrollRef.current
    const fromBottom = area === null ? 0 : area.scrollHeight - area.scrollTop
    try {
      const params = new URLSearchParams({ limit: '30', cursor: olderCursor })
      const response = await fetch(`${base}/messages?${params.toString()}`, {
        credentials: 'same-origin',
      })
      if (!response.ok) return
      const parsed = MessagePageSchema.safeParse(await response.json())
      if (!parsed.success) return
      stickToBottom.current = false
      setMessages((current) => {
        const seen = new Set(current.map((item) => item.id))
        return [
          ...parsed.data.items.filter((item) => !seen.has(item.id)),
          ...current,
        ]
      })
      setOlderCursor(parsed.data.nextCursor)
      // 위에 붙여도 보던 자리가 그대로 남게 한다.
      window.requestAnimationFrame(() => {
        if (area !== null) area.scrollTop = area.scrollHeight - fromBottom
      })
    } finally {
      setLoadingOlder(false)
    }
  }

  const send = async (body: string): Promise<boolean> => {
    const key = `pending-${String(Date.now())}`
    stickToBottom.current = true
    setError(null)
    setPending((current) => [...current, { key, body, failed: false }])
    try {
      const response = await fetch(`${base}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ body }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const apiError = readApiError(payload)
        setPending((current) => current.filter((item) => item.key !== key))
        const message =
          apiError?.message ??
          '메시지를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
        // 상대가 받기를 닫았으면 입력창을 닫고 이유를 남긴다.
        if (
          apiError !== null &&
          ['E_DM_CLOSED', 'E_DM_FOLLOWERS_ONLY', 'E_SOCIAL_BLOCKED'].includes(
            apiError.code,
          )
        ) {
          setClosed(staticMessageFor(apiError.code as ErrorCode))
        } else {
          setError(message)
        }
        return false
      }
      const sent = MessageResponseSchema.parse(payload)
      setPending((current) => current.filter((item) => item.key !== key))
      setMessages((current) => mergeById(current, [sent]))
      return true
    } catch {
      setPending((current) => current.filter((item) => item.key !== key))
      setError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.')
      return false
    }
  }

  const other = detail.other
  let previousDay: string | null = null

  return (
    <section className="dm-thread" aria-label={`${other.displayName}와의 대화`}>
      <header className="dm-thread-head">
        <Link href="/messages" className="dm-back" aria-label="메시지함으로">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <Link href={`/u/${other.handle}`} className="dm-thread-who">
          <Avatar
            name={other.displayName}
            src={other.avatarUrl}
            size="md"
            className="dm-thread-avatar"
          />
          <span>
            <strong>
              {other.displayName}
              {other.isVerified ? (
                <BadgeCheck role="img" aria-label="인증 채널" />
              ) : null}
            </strong>
            <small>@{other.handle}</small>
          </span>
        </Link>
        <span className="dm-thread-report">
          <ReportDialog
            target="USER"
            targetId={detail.otherId}
            trigger={
              <>
                <Flag aria-hidden="true" />
                <span className="sr-only">이 사용자 신고</span>
              </>
            }
          />
        </span>
      </header>

      <div
        ref={scrollRef}
        className="dm-thread-scroll"
        onScroll={(event) => {
          const area = event.currentTarget
          stickToBottom.current =
            area.scrollHeight - area.scrollTop - area.clientHeight < 80
        }}
      >
        {olderCursor === null ? (
          <p className="dm-thread-start">
            {detail.startedByMe
              ? `${other.displayName}님과의 대화를 시작했습니다.`
              : `${other.displayName}님이 대화를 시작했습니다.`}
          </p>
        ) : (
          <button
            type="button"
            className="dm-older"
            onClick={() => void loadOlder()}
            disabled={loadingOlder}
          >
            {loadingOlder ? '불러오는 중…' : '이전 메시지 보기'}
          </button>
        )}

        <ol className="dm-messages">
          {messages.map((item, index) => {
            const day = dayKey(item.createdAt)
            const showDay = day !== previousDay
            previousDay = day
            const next = messages[index + 1]
            // 같은 사람이 같은 분에 이어 보낸 말풍선은 시각을 마지막에만 단다.
            const lastOfRun =
              next === undefined ||
              next.mine !== item.mine ||
              messageTime(next.createdAt) !== messageTime(item.createdAt)
            return (
              <React.Fragment key={item.id}>
                {showDay ? (
                  <li className="dm-day" aria-hidden="true">
                    <span>{dayLabel(item.createdAt)}</span>
                  </li>
                ) : null}
                <li className={item.mine ? 'dm-bubble is-mine' : 'dm-bubble'}>
                  <p>{item.body}</p>
                  {lastOfRun ? (
                    <time dateTime={item.createdAt}>
                      {messageTime(item.createdAt)}
                    </time>
                  ) : null}
                </li>
              </React.Fragment>
            )
          })}
          {pending.map((item) => (
            <li key={item.key} className="dm-bubble is-mine is-pending">
              <p>{item.body}</p>
              <time>보내는 중</time>
            </li>
          ))}
        </ol>
      </div>

      <footer className="dm-thread-foot">
        {error === null ? null : (
          <p role="alert" className="dm-error">
            {error}
          </p>
        )}
        {closed === null ? (
          <MessageComposer
            placeholder={`${other.displayName}님에게 메시지 보내기`}
            autoFocus
            onSend={send}
          />
        ) : (
          <p className="dm-closed" role="status">
            {closed}
          </p>
        )}
      </footer>
    </section>
  )
}
