'use client'

import Link from 'next/link'
import React, { useRef, useState, type ReactNode } from 'react'

function HeartIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  )
}

export function HeroLikeButton({
  episodeId,
  initialLiked,
  initialCount,
  authenticated,
}: {
  readonly episodeId: string
  readonly initialLiked: boolean
  readonly initialCount: number
  readonly authenticated: boolean
}): ReactNode {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)
  const locked = useRef(false)

  if (!authenticated) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent('/')}`}
        className="discovery-reaction-button"
        aria-label={`로그인하고 좋아요 누르기, 현재 ${String(count)}개`}
      >
        <HeartIcon /> <span>{count}</span>
      </Link>
    )
  }

  async function toggle(): Promise<void> {
    if (locked.current) return
    locked.current = true
    setPending(true)
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
    } finally {
      setPending(false)
      locked.current = false
    }
  }

  return (
    <button
      type="button"
      className={`discovery-reaction-button${liked ? ' is-liked' : ''}`}
      aria-label={`${liked ? '좋아요 취소' : '좋아요'}, 현재 ${String(count)}개`}
      aria-pressed={liked}
      disabled={pending}
      onClick={() => void toggle()}
    >
      <HeartIcon /> <span>{count}</span>
    </button>
  )
}
