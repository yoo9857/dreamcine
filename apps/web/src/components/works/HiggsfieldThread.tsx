import {
  HIGGSFIELD_CREATOR,
  HIGGSFIELD_FILMS,
  formatFilmDuration,
  higgsfieldWatchPath,
} from '@/src/content/higgsfield'
import { Play } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { type ReactNode } from 'react'

export const FESTIVAL_FILM_COUNT = HIGGSFIELD_FILMS.length

function FestivalFilmCard({
  film,
}: {
  readonly film: (typeof HIGGSFIELD_FILMS)[number]
}): ReactNode {
  const watchPath = higgsfieldWatchPath(film.slug)
  return (
    <article className="works-long-card">
      <Link className="works-long-visual" href={watchPath}>
        <img src={film.poster} alt={`${film.title} 썸네일`} />
        <span className="works-card-duration">
          {formatFilmDuration(film.durationSec)}
        </span>
        <span className="works-card-play" aria-hidden="true">
          <Play />
        </span>
      </Link>
      <div className="works-long-info">
        <Link
          className="works-avatar"
          href={`/u/${HIGGSFIELD_CREATOR.handle}`}
          aria-label={`${HIGGSFIELD_CREATOR.displayName} 프로필`}
        >
          {HIGGSFIELD_CREATOR.avatarUrl === null ? (
            <span className="works-avatar-fallback" aria-hidden="true">
              {HIGGSFIELD_CREATOR.displayName.slice(0, 1)}
            </span>
          ) : (
            <Image
              src={HIGGSFIELD_CREATOR.avatarUrl}
              alt=""
              width={38}
              height={38}
              className="works-avatar-image"
            />
          )}
        </Link>
        <div>
          <Link className="works-card-title" href={watchPath}>
            {film.title}
          </Link>
          <Link
            className="works-card-creator"
            href={`/u/${HIGGSFIELD_CREATOR.handle}`}
          >
            {HIGGSFIELD_CREATOR.displayName}
          </Link>
          <p className="works-card-meta">{film.credit}</p>
        </div>
      </div>
    </article>
  )
}

export function HiggsfieldThread(): ReactNode {
  return HIGGSFIELD_FILMS.map((film) => (
    <FestivalFilmCard film={film} key={film.slug} />
  ))
}
