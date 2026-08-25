'use client'

import type { CommentThreadItem } from '@aidream/core'
import { Button, Textarea } from '@aidream/ui'
import React, { type ReactNode, type SyntheticEvent, useState } from 'react'

import { koMessages } from '@/src/lib/messages/ko'

const MESSAGES = koMessages().social

export function CommentThread({
  episodeId,
  initialItems,
  authenticated,
}: {
  readonly episodeId: string
  readonly initialItems: readonly CommentThreadItem[]
  readonly authenticated: boolean
}): ReactNode {
  const [items, setItems] = useState(initialItems)
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (pending || body.trim() === '') return
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/episodes/${episodeId}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (!response.ok) throw new Error('comment request failed')
      const created =
        (await response.json()) as CommentThreadItem['replies'][number]
      setItems([{ ...created, replies: [] }, ...items])
      setBody('')
    } catch {
      setMessage(MESSAGES.commentFailed)
    } finally {
      setPending(false)
    }
  }

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-4">
      <h2 id="comments-heading" className="text-xl font-bold text-fg">
        {MESSAGES.comments}
      </h2>
      {authenticated ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            void submit(event)
          }}
        >
          <Textarea
            label={MESSAGES.commentLabel}
            value={body}
            maxLength={1000}
            onChange={(event) => {
              setBody(event.target.value)
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-fg-muted">{body.length}/1000</span>
            <Button type="submit" loading={pending}>
              {MESSAGES.commentSubmit}
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-md border border-border p-4 text-sm text-fg-secondary">
          {MESSAGES.commentLogin}
        </p>
      )}
      {message === null ? null : (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
      {items.length === 0 ? (
        <p className="py-8 text-center text-fg-muted">
          {MESSAGES.commentEmpty}
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border bg-bg-elevated p-4"
            >
              <p className="font-semibold text-fg">{item.user.displayName}</p>
              <p className="whitespace-pre-wrap text-fg-secondary">
                {item.body}
              </p>
              {item.replies.length === 0 ? null : (
                <ol className="mt-3 flex flex-col gap-2 border-l border-border pl-4">
                  {item.replies.map((reply) => (
                    <li key={reply.id}>
                      <p className="text-sm font-semibold text-fg">
                        {reply.user.displayName}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-fg-secondary">
                        {reply.body}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
