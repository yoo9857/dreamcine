'use client'

import { ArrowRight, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import React, { type ReactNode } from 'react'

export interface NextEpisodeCardProps {
  readonly episodeId?: string
  readonly title?: string
  readonly onReplay: () => void
}

export function NextEpisodeCard(props: NextEpisodeCardProps): ReactNode {
  return (
    <aside aria-label="재생 완료" className="ilog-player-ended-card">
      <span>PLAYBACK COMPLETE</span>
      <h2>
        {props.title === undefined
          ? '감상을 마쳤습니다'
          : '다음 이야기를 이어보세요'}
      </h2>
      {props.title === undefined ? null : <p>{props.title}</p>}
      <div>
        <button type="button" onClick={props.onReplay}>
          <RotateCcw /> 다시 보기
        </button>
        {props.episodeId === undefined ? null : (
          <Link href={`/watch/${props.episodeId}`}>
            다음 화 <ArrowRight />
          </Link>
        )}
      </div>
    </aside>
  )
}
