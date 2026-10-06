'use client'

import type { NotifType } from '@aidream/core'
import Link from 'next/link'
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { z } from 'zod'

import { listTime } from '@/src/components/messages/format-time'
import { usePolling } from '@/src/components/messages/use-polling'
import { koMessages } from '@/src/lib/messages/ko'

/**
 * 상단 바의 알림 버튼과 팝업.
 *
 * 알림은 다른 화면으로 옮겨 가지 않고 지금 보던 화면 위에서 확인한다.
 * 첫 쪽(20건)만 가져와 읽지 않은 수를 센다 — 배지가 "20+" 를 넘어 정확할
 * 필요는 없다. 전체 이력은 팝업 아래 링크로 `/notifications` 에서 본다.
 */
const PAGE_SIZE = 20
const POLL_MS = 60_000
const MESSAGES = koMessages().social

const NotificationItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
})
const NotificationPageSchema = z.object({
  items: z.array(NotificationItemSchema),
})
type NotificationItem = z.infer<typeof NotificationItemSchema>

const LABELS: Readonly<Record<NotifType, string>> = {
  NEW_FOLLOWER: '새 팔로워가 생겼습니다.',
  NEW_LIKE: '에피소드에 새 좋아요가 있습니다.',
  NEW_COMMENT: '에피소드에 새 댓글이 있습니다.',
  NEW_EPISODE: '팔로우한 크리에이터가 새 에피소드를 공개했습니다.',
  TRANSCODE_DONE: '영상 변환이 완료되었습니다.',
  TRANSCODE_FAILED:
    '영상 변환에 실패했습니다. 스튜디오에서 다시 시도해 주세요.',
  PUBLISH_FAILED: '에피소드 공개에 실패했습니다. 스튜디오에서 확인해 주세요.',
  MODERATION: '콘텐츠 심사 결과가 도착했습니다.',
}

function labelFor(type: string): string {
  return type in LABELS ? LABELS[type as NotifType] : '새 알림이 있습니다.'
}

function stringField(payload: unknown, key: string): string | null {
  if (typeof payload !== 'object' || payload === null) return null
  const value = (payload as Record<string, unknown>)[key]
  return typeof value === 'string' && value !== '' ? value : null
}

/** 알림이 가리키는 곳. 갈 곳이 분명한 것만 링크로 만든다. */
function hrefFor(item: NotificationItem): string | null {
  const episodeId = stringField(item.payload, 'episodeId')
  switch (item.type) {
    case 'NEW_LIKE':
    case 'NEW_COMMENT':
    case 'NEW_EPISODE':
      return episodeId === null ? null : `/watch/${episodeId}`
    case 'TRANSCODE_DONE':
    case 'TRANSCODE_FAILED':
      return '/studio/upload'
    case 'PUBLISH_FAILED':
      return '/studio/content'
    default:
      return null
  }
}

function BellIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  )
}

export function NotificationBell(): ReactNode {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(
        `/api/notifications?limit=${String(PAGE_SIZE)}`,
        {
          cache: 'no-store',
          credentials: 'same-origin',
        },
      )
      if (!response.ok) {
        setFailed(true)
        return
      }
      const parsed = NotificationPageSchema.safeParse(await response.json())
      if (!parsed.success) {
        setFailed(true)
        return
      }
      setFailed(false)
      setItems(parsed.data.items)
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  usePolling(load, POLL_MS)

  // 열 때마다 새로 받는다. 팝업이 옛 목록을 보여주지 않게 한다.
  useEffect(() => {
    if (open) void load()
  }, [open, load])

  useEffect(() => {
    if (!open) return undefined
    const closeFromOutside = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeFromKeyboard = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', closeFromKeyboard)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', closeFromKeyboard)
    }
  }, [open])

  const unread = (items ?? []).filter((item) => item.readAt === null)
  const unreadLabel =
    unread.length >= PAGE_SIZE ? `${String(PAGE_SIZE)}+` : String(unread.length)

  async function markRead(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return
    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ ids: ids.slice(0, 100) }),
    }).catch(() => null)
    if (!response?.ok) return
    const readAt = new Date().toISOString()
    setItems((current) =>
      (current ?? []).map((item) =>
        ids.includes(item.id) ? { ...item, readAt } : item,
      ),
    )
  }

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="notification-bell-trigger"
        aria-label={
          unread.length > 0 ? `알림, 읽지 않은 알림 ${unreadLabel}개` : '알림'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-popover"
        onClick={() => {
          setOpen((current) => !current)
        }}
      >
        <BellIcon />
        {unread.length > 0 ? (
          <span className="notification-bell-badge" aria-hidden="true">
            {unreadLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id="notification-popover"
          className="notification-popover"
          role="dialog"
          aria-label="알림"
        >
          <header>
            <strong>알림</strong>
            <button
              type="button"
              disabled={unread.length === 0}
              onClick={() => void markRead(unread.map((item) => item.id))}
            >
              {MESSAGES.markAllRead}
            </button>
          </header>

          {items === null ? (
            <p className="notification-popover-empty" role="status">
              {failed ? '알림을 불러오지 못했습니다.' : '불러오는 중…'}
            </p>
          ) : items.length === 0 ? (
            <p className="notification-popover-empty">
              {MESSAGES.notificationEmpty}
            </p>
          ) : (
            <ol className="notification-popover-list">
              {items.map((item) => {
                const href = hrefFor(item)
                const body = (
                  <>
                    <span
                      className="notification-dot"
                      aria-label={
                        item.readAt === null ? '읽지 않음' : undefined
                      }
                    />
                    <span className="notification-copy">
                      <span>{labelFor(item.type)}</span>
                      <time dateTime={item.createdAt}>
                        {listTime(item.createdAt)}
                      </time>
                    </span>
                  </>
                )
                const className =
                  item.readAt === null
                    ? 'notification-item is-unread'
                    : 'notification-item'
                return (
                  <li key={item.id}>
                    {href === null ? (
                      <button
                        type="button"
                        className={className}
                        onClick={() => void markRead([item.id])}
                      >
                        {body}
                      </button>
                    ) : (
                      <Link
                        href={href}
                        className={className}
                        onClick={() => {
                          void markRead([item.id])
                          setOpen(false)
                        }}
                      >
                        {body}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ol>
          )}

          <footer>
            <Link
              href="/notifications"
              onClick={() => {
                setOpen(false)
              }}
            >
              알림 전체 보기
            </Link>
          </footer>
        </div>
      ) : null}
    </div>
  )
}
