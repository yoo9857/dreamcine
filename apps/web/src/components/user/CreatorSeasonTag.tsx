import React, { type ReactNode } from 'react'
import artworkIndex from '@/src/content/creator-season-artwork.generated'
import '@/src/styles/creator-season-tag.css'

const seasonArtwork: Readonly<Record<string, string>> = artworkIndex

/** Reusable image tag for a monthly creator selection. */
export function CreatorSeasonTag({
  monthLabel,
  className,
}: {
  readonly monthLabel: string
  readonly className?: string
}): ReactNode {
  const parts = /^(\d{4})년\s*(\d{1,2})월$/u.exec(monthLabel)
  const season =
    parts === null
      ? monthLabel
      : `${parts[1] ?? ''}.${(parts[2] ?? '').padStart(2, '0')}`
  return (
    <span
      className={`creator-season-tag${className === undefined ? '' : ` ${className}`}`}
      title={`${monthLabel} 이달의 크리에이터 시즌 태그`}
    >
      <img
        src={seasonArtwork[season] ?? '/brand/tags/creator-season.png'}
        alt={`${monthLabel} 크리에이터 시즌 태그`}
        width={240}
        height={280}
        decoding="async"
        draggable={false}
      />
    </span>
  )
}
