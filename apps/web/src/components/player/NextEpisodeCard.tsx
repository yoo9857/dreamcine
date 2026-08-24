import Link from 'next/link'
import React, { type ReactNode } from 'react'

export interface NextEpisodeCardProps {
  readonly episodeId: string
  readonly title: string
  readonly visible: boolean
}
export function NextEpisodeCard(props: NextEpisodeCardProps): ReactNode {
  if (!props.visible) return null
  return (
    <aside aria-label="다음 에피소드" className="rounded-lg border p-4">
      <p>다음 에피소드</p>
      <Link href={`/watch/${props.episodeId}`}>{props.title}</Link>
    </aside>
  )
}
