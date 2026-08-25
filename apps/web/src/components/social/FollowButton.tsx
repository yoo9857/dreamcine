'use client'

import { Button } from '@aidream/ui'
import React, { type ReactNode, useRef, useState } from 'react'

import { koMessages } from '@/src/lib/messages/ko'

const MESSAGES = koMessages().social

export function FollowButton({
  handle,
  initialFollowing,
  initialCount,
  disabled = false,
}: {
  readonly handle: string
  readonly initialFollowing: boolean
  readonly initialCount: number
  readonly disabled?: boolean
}): ReactNode {
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const locked = useRef(false)

  async function toggle(): Promise<void> {
    if (locked.current || disabled) return
    locked.current = true
    setPending(true)
    setMessage(null)
    const previous = { following, count }
    const next = !following
    setFollowing(next)
    setCount(Math.max(0, count + (next ? 1 : -1)))
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(handle)}/follow`,
        {
          method: next ? 'PUT' : 'DELETE',
        },
      )
      if (!response.ok) throw new Error('follow request failed')
      const result = (await response.json()) as { followerCount: number }
      setCount(result.followerCount)
    } catch {
      setFollowing(previous.following)
      setCount(previous.count)
      setMessage(MESSAGES.followFailed)
    } finally {
      setPending(false)
      locked.current = false
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={following ? 'secondary' : 'primary'}
        loading={pending}
        disabled={disabled}
        aria-pressed={following}
        onClick={() => void toggle()}
      >
        {following ? MESSAGES.following : MESSAGES.follow} · {count}
      </Button>
      {message === null ? null : (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  )
}
