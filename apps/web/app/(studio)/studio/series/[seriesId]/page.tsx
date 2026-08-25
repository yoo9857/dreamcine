import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { CreateEpisodeForm } from '@/src/components/studio/CreateEpisodeForm'
import { EpisodeTable } from '@/src/components/studio/EpisodeTable'
import { getStudioSeries } from '@/src/services/series/get-studio-series'

export default async function StudioSeriesPage({
  params,
}: {
  readonly params: Promise<{ seriesId: string }>
}): Promise<ReactNode> {
  const { seriesId } = await params
  const session = await requireCapability(
    'episode.create',
    `/studio/series/${seriesId}`,
  )
  const detail = await getStudioSeries(session, seriesId).catch(() => null)
  if (detail === null) notFound()
  return (
    <main className="flex flex-col gap-9">
      <header>
        <h1 className="text-2xl font-semibold text-fg">
          {detail.series.title}
        </h1>
        <p className="mt-1 text-fg-muted">
          에피소드 추가와 공개 상태를 관리합니다.
        </p>
      </header>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-fg">에피소드 추가</h2>
        <CreateEpisodeForm seriesId={seriesId} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-fg">에피소드 목록</h2>
        <EpisodeTable episodes={detail.episodes} />
      </section>
    </main>
  )
}
