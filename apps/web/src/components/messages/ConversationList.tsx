'use client'

import {
  ConversationPageSchema,
  LIMITS,
  type ConversationSummary,
} from '@aidream/core'
import { Avatar } from '@aidream/ui'
import { BadgeCheck, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import React, { useCallback, useState, type ReactNode } from 'react'

import { listTime } from './format-time'
import { usePolling } from './use-polling'

/**
 * 메시지함 목록. 배지와 같은 주기로 다시 받아 새 대화가 위로 올라오게 한다.
 * 열려 있는 대화는 강조하고, 그 대화의 읽지 않은 수는 0 으로 보여준다 —
 * 지금 읽고 있기 때문이다.
 */
export function ConversationList({
  initialItems,
  initialCursor,
  activeId = null,
}: {
  readonly initialItems: readonly ConversationSummary[]
  readonly initialCursor: string | null
  readonly activeId?: string | null
}): ReactNode {
  const [items, setItems] = useState<ConversationSummary[]>([...initialItems])
  const [cursor, setCursor] = useState(initialCursor)
  const [loadingMore, setLoadingMore] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    const response = await fetch('/api/conversations?limit=30', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
    if (!response.ok) return
    const parsed = ConversationPageSchema.safeParse(await response.json())
    if (!parsed.success) return
    setItems((current) => {
      const fresh = new Set(parsed.data.items.map((item) => item.id))
      // 첫 쪽은 새로 받은 것으로, 그 아래 이미 불러온 과거 쪽은 그대로 둔다.
      return [
        ...parsed.data.items,
        ...current.filter((item) => !fresh.has(item.id)),
      ]
    })
  }, [])

  usePolling(refresh, LIMITS.DM_UNREAD_POLL_SEC * 1000)

  const loadMore = async (): Promise<void> => {
    if (cursor === null || loadingMore) return
    setLoadingMore(true)
    try {
      const params = new URLSearchParams({ limit: '30', cursor })
      const response = await fetch(`/api/conversations?${params.toString()}`, {
        credentials: 'same-origin',
      })
      if (!response.ok) return
      const parsed = ConversationPageSchema.safeParse(await response.json())
      if (!parsed.success) return
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id))
        return [
          ...current,
          ...parsed.data.items.filter((item) => !seen.has(item.id)),
        ]
      })
      setCursor(parsed.data.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="dm-list-empty">
        <MessageCircle aria-hidden="true" />
        <strong>아직 대화가 없습니다</strong>
        <p>좋아하는 작가의 페이지에서 메시지를 보내 보세요.</p>
        <Link href="/creators">작가 둘러보기</Link>
      </div>
    )
  }

  return (
    <>
      <ul className="dm-list" aria-label="대화 목록">
        {items.map((item) => {
          const active = item.id === activeId
          const unread = active ? 0 : item.unread
          return (
            <li key={item.id}>
              <Link
                href={`/messages/${item.id}`}
                className={`dm-list-item${active ? ' is-active' : ''}${unread > 0 ? ' is-unread' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Avatar
                  name={item.other.displayName}
                  src={item.other.avatarUrl}
                  size="lg"
                  className="dm-list-avatar"
                />
                <span className="dm-list-copy">
                  <span className="dm-list-top">
                    <strong>
                      {item.other.displayName}
                      {item.other.isVerified ? (
                        <BadgeCheck role="img" aria-label="인증 채널" />
                      ) : null}
                    </strong>
                    <time dateTime={item.lastMessageAt}>
                      {listTime(item.lastMessageAt)}
                    </time>
                  </span>
                  <span className="dm-list-bottom">
                    <span className="dm-list-preview">
                      {item.lastMessageMine ? '나: ' : ''}
                      {item.lastMessagePreview}
                    </span>
                    {unread > 0 ? (
                      <span
                        className="dm-unread-pill"
                        aria-label={`읽지 않은 메시지 ${String(unread)}개`}
                      >
                        {unread > 99 ? '99+' : unread}
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      {cursor === null ? null : (
        <button
          type="button"
          className="dm-older"
          onClick={() => void loadMore()}
          disabled={loadingMore}
        >
          {loadingMore ? '불러오는 중…' : '이전 대화 더 보기'}
        </button>
      )}
    </>
  )
}
