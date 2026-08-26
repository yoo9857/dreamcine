import type { FeedItem } from '@aidream/core'
import { Badge } from '@aidream/ui'
import Image from 'next/image'
import Link from 'next/link'
import React, { type ReactNode } from 'react'

import { rememberFeedScrollPosition } from '@/src/lib/feed-scroll'

function formatDuration(durationSec: number | null): string {
  if (durationSec === null) return '--:--'

  const minutes = Math.floor(durationSec / 60)
  const seconds = Math.floor(durationSec % 60)
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}

export function EpisodeCard({
  item,
  priority = false,
}: {
  readonly item: FeedItem
  readonly priority?: boolean
}): ReactNode {
  return (
    <article className="episode-card overflow-hidden rounded-xl border border-border bg-bg-elevated">
      <Link
        href={`/watch/${item.episodeId}`}
        className="block"
        onClick={rememberFeedScrollPosition}
      >
        <div className="episode-card-visual aspect-video bg-bg-subtle">
          {item.thumbUrl === null ? (
            <div className="flex size-full items-center justify-center text-sm text-fg-muted">
              썸네일 준비 중
            </div>
          ) : (
            <Image
              src={item.thumbUrl}
              alt={`${item.title} 썸네일`}
              width={640}
              height={360}
              priority={priority}
              unoptimized
              className="size-full object-cover"
            />
          )}
          <span className="episode-duration">
            {formatDuration(item.durationSec)}
          </span>
        </div>
        <div className="episode-card-body flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold text-fg">{item.title}</h2>
            <Badge>{item.ageRating}</Badge>
          </div>
          <p className="episode-series text-sm text-fg-secondary">
            {item.series.title}
          </p>
          <div className="episode-meta flex justify-between text-xs text-fg-muted">
            <span className="episode-creator">
              <i aria-hidden="true">
                {item.creator.displayName.slice(0, 1).toLocaleUpperCase()}
              </i>
              {item.creator.displayName}
            </span>
            <span className="episode-stats">
              조회 {item.viewCount} · 좋아요 {item.likeCount}
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
