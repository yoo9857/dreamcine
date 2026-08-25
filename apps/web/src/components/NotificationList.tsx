'use client'

import type { Notification } from '@aidream/core'
import { Button } from '@aidream/ui'
import React, { type ReactNode, useState } from 'react'

import { koMessages } from '@/src/lib/messages/ko'

const MESSAGES = koMessages().social

const LABELS: Readonly<Record<Notification['type'], string>> = {
  NEW_FOLLOWER: '새 팔로워가 생겼습니다.',
  NEW_LIKE: '에피소드에 새 좋아요가 있습니다.',
  NEW_COMMENT: '에피소드에 새 댓글이 있습니다.',
  NEW_EPISODE: '팔로우한 크리에이터가 새 에피소드를 공개했습니다.',
  TRANSCODE_DONE: '영상 변환이 완료되었습니다.',
  TRANSCODE_FAILED:
    '영상 변환에 실패했습니다. 스튜디오에서 다시 시도해 주세요.',
  PUBLISH_FAILED:
    '에피소드 공개에 실패했습니다. 스튜디오에서 상태를 확인해 주세요.',
  MODERATION: '콘텐츠 심사 결과가 도착했습니다.',
}

export function NotificationList({
  initialItems,
}: {
  readonly initialItems: readonly Notification[]
}): ReactNode {
  const [items, setItems] = useState(initialItems)
  const unreadIds = items
    .filter((item) => item.readAt === null)
    .map((item) => item.id)

  async function markAllRead(): Promise<void> {
    if (unreadIds.length === 0) return
    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: unreadIds.slice(0, 100) }),
    })
    if (!response.ok) return
    const readAt = new Date()
    setItems(
      items.map((item) =>
        unreadIds.includes(item.id) ? { ...item, readAt } : item,
      ),
    )
  }

  if (items.length === 0)
    return (
      <p className="py-12 text-center text-fg-muted">
        {MESSAGES.notificationEmpty}
      </p>
    )
  return (
    <section className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          disabled={unreadIds.length === 0}
          onClick={() => void markAllRead()}
        >
          {MESSAGES.markAllRead}
        </Button>
      </div>
      <ol className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-border bg-bg-elevated p-4"
          >
            <p
              className={
                item.readAt === null
                  ? 'font-semibold text-fg'
                  : 'text-fg-secondary'
              }
            >
              {LABELS[item.type]}
            </p>
            <time
              className="text-xs text-fg-muted"
              dateTime={item.createdAt.toISOString()}
            >
              {item.createdAt.toLocaleString('ko-KR')}
            </time>
          </li>
        ))}
      </ol>
    </section>
  )
}
