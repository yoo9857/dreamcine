'use client'

import { Button } from '@aidream/ui'
import React, { type ReactNode, useRef, useState } from 'react'

import { koMessages } from '@/src/lib/messages/ko'

const MESSAGES = koMessages().social

export function LikeButton({
  episodeId,
  initialLiked,
  initialCount,
}: {
  readonly episodeId: string
  readonly initialLiked: boolean
  readonly initialCount: number
}): ReactNode {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const locked = useRef(false)

  async function toggle(): Promise<void> {
    if (locked.current) return
    locked.current = true
    setPending(true)
    setMessage(null)
    const previous = { liked, count }
    const nextLiked = !liked
    setLiked(nextLiked)
    setCount(Math.max(0, count + (nextLiked ? 1 : -1)))
    try {
      const response = await fetch(`/api/episodes/${episodeId}/likes`, {
        method: nextLiked ? 'PUT' : 'DELETE',
      })
      if (!response.ok) throw new Error('like request failed')
      const result = (await response.json()) as {
        liked: boolean
        likeCount: number
      }
      setLiked(result.liked)
      setCount(result.likeCount)
    } catch {
      setLiked(previous.liked)
      setCount(previous.count)
      setMessage(MESSAGES.likeFailed)
    } finally {
      setPending(false)
      locked.current = false
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={liked ? 'primary' : 'secondary'}
        loading={pending}
        aria-pressed={liked}
        onClick={() => void toggle()}
      >
        {MESSAGES.like} {count}
      </Button>
      {message === null ? null : (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  )
}
