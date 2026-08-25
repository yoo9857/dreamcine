import { Badge, EmptyState } from '@aidream/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getSeries } from '@/src/services/series/get-series'

export const revalidate = 60

export default async function SeriesPage({
  params,
}: {
  readonly params: Promise<{ seriesId: string }>
}): Promise<ReactNode> {
  const { seriesId } = await params
  const detail = await getSeries(seriesId).catch(() => null)
  if (detail === null) notFound()
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="grid gap-6 md:grid-cols-[12rem_1fr]">
        <div className="aspect-[2/3] overflow-hidden rounded-xl bg-bg-subtle">
          {detail.series.posterUrl === undefined ? (
            <div className="flex size-full items-center justify-center text-fg-muted">
              포스터 준비 중
            </div>
          ) : (
            <img
              src={detail.series.posterUrl}
              alt={`${detail.series.title} 포스터`}
              className="size-full object-cover"
            />
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold text-fg">
              {detail.series.title}
            </h1>
            {detail.series.isCompleted ? (
              <Badge tone="success">완결</Badge>
            ) : null}
            <Badge>{detail.series.ageRating}</Badge>
          </div>
          <p className="whitespace-pre-wrap text-fg-secondary">
            {detail.series.synopsis ?? '작품 소개가 아직 없습니다.'}
          </p>
          <p className="text-sm text-fg-muted">
            공개 {detail.series.episodeCount}화
          </p>
        </div>
      </header>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-fg">에피소드</h2>
        {detail.episodes.length === 0 ? (
          <EmptyState
            title="공개된 에피소드가 없습니다"
            description="새 에피소드가 공개되면 이곳에 표시됩니다."
          />
        ) : (
          <ol className="grid gap-3">
            {detail.episodes.map((episode) => (
              <li key={episode.id}>
                <Link
                  href={`/watch/${episode.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-bg-elevated p-4"
                >
                  <span>
                    <span className="mr-3 text-fg-muted">
                      {episode.number}화
                    </span>
                    <strong className="text-fg">{episode.title}</strong>
                  </span>
                  <span className="text-sm text-fg-muted">
                    조회 {episode.viewCount}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}
