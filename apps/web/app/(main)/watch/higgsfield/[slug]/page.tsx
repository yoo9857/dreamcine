import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import { HiggsfieldPlayer } from '@/src/components/watch/HiggsfieldPlayer'
import { WatchExperience } from '@/src/components/watch/WatchExperience'
import {
  HIGGSFIELD_CREATOR,
  HIGGSFIELD_FILMS,
  formatFilmDuration,
  higgsfieldFeedItem,
  higgsfieldFilmBySlug,
  higgsfieldWatchId,
} from '@/src/content/higgsfield'

import '@/src/styles/player.css'
import '@/src/styles/watch-experience.css'

interface PageProps {
  readonly params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const film = higgsfieldFilmBySlug(slug)
  if (film === undefined) {
    return { title: '재생', robots: { index: false, follow: false } }
  }
  return {
    title: `${film.title} · Higgsfield`,
    description: film.logline,
    robots: { index: true, follow: true },
  }
}

export default async function HiggsfieldWatchPage({
  params,
}: PageProps): Promise<ReactNode> {
  const [{ slug }, session] = await Promise.all([params, getServerSession()])
  const film = higgsfieldFilmBySlug(slug)
  if (film === undefined) notFound()
  const rest = HIGGSFIELD_FILMS.filter((item) => item.slug !== film.slug)
  const next = rest[0]

  return (
    <div className="watch-page">
      <DiscoveryTopbar user={session?.user ?? null} />
      <WatchExperience
        player={
          <HiggsfieldPlayer
            src={film.hls}
            poster={film.poster}
            durationSec={film.durationSec}
            next={
              next === undefined
                ? null
                : {
                    id: higgsfieldWatchId(next.slug),
                    title: next.title,
                  }
            }
          />
        }
        title={film.title}
        seriesTitle={HIGGSFIELD_CREATOR.displayName}
        description={film.logline}
        creator={HIGGSFIELD_CREATOR}
        viewCount={null}
        publishedAt={null}
        actions={null}
        credit={film.credit}
        sourceUrl={film.sourceUrl}
        shortItems={[]}
        longItems={rest.map(higgsfieldFeedItem)}
        longCaption={(item) => {
          const related = higgsfieldFilmBySlug(item.series.slug)
          return related === undefined
            ? null
            : `${related.credit} · ${formatFilmDuration(related.durationSec)}`
        }}
        comments={
          <div className="watch-preview-comments">
            <h2>댓글</h2>
            <p>
              이 작품은 Higgsfield 프로필에서 소개하는 영상입니다. 댓글은 받지
              않습니다.
            </p>
          </div>
        }
      />
    </div>
  )
}
