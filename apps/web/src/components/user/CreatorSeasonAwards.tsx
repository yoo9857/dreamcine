import React from 'react'

import { creatorSeasonAwards } from '@/src/content/creator-season-editions'
import { CreatorSeasonTag } from './CreatorSeasonTag'

export function CreatorSeasonAwards({
  handle,
  compact = false,
  className = '',
}: {
  readonly handle: string
  readonly compact?: boolean
  readonly className?: string
}) {
  const editions = creatorSeasonAwards(handle)
  if (editions.length === 0) return null
  return (
    <span className={`creator-season-awards ${className}`}>
      {(compact ? editions.slice(0, 1) : editions).map((edition) => (
        <CreatorSeasonTag
          key={edition}
          monthLabel={edition}
          className={
            compact ? 'creator-season-award-compact' : 'creator-season-award'
          }
        />
      ))}
    </span>
  )
}
