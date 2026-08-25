import type { SeriesResponse } from '@aidream/core'
import { Badge } from '@aidream/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

export function SeriesCard({
  series,
}: {
  readonly series: SeriesResponse
}): ReactNode {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-bg-elevated">
      <Link href={`/series/${series.id}`} className="block">
        <div className="aspect-[2/3] bg-bg-subtle">
          {series.posterUrl === undefined ? (
            <div className="flex size-full items-center justify-center text-sm text-fg-muted">
              포스터 준비 중
            </div>
          ) : (
            <img
              src={series.posterUrl}
              alt={`${series.title} 포스터`}
              className="size-full object-cover"
            />
          )}
        </div>
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold text-fg">{series.title}</h2>
            {series.isCompleted ? <Badge tone="success">완결</Badge> : null}
          </div>
          <p className="text-sm text-fg-muted">공개 {series.episodeCount}화</p>
        </div>
      </Link>
    </article>
  )
}
