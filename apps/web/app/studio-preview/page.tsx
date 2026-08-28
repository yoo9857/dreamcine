import type { EpisodeResponse } from '@aidream/core'
import { Eye, Film } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { EpisodeCreateWorkspace } from '@/src/components/studio/EpisodeCreateWorkspace'
import { EpisodeTable } from '@/src/components/studio/EpisodeTable'
import { SeriesPosterUploader } from '@/src/components/studio/SeriesPosterUploader'
import { StudioShell } from '@/src/components/studio/StudioShell'

export default async function StudioPreviewPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ state?: string }>
}): Promise<ReactNode> {
  if (process.env.NODE_ENV === 'production') notFound()
  const filled = (await searchParams).state === 'filled'

  const assets = [
    {
      id: 'preview_asset',
      fileName: 'preview-film.mp4',
      durationSec: 125,
      posterUrl: '/brand/posters/memory.png',
      thumbnailUrl: '/brand/works/red-horizon.png',
      spriteUrl: '/brand/works/red-horizon.png',
      readyAt: new Date().toISOString(),
    },
  ] as const
  const episodes: readonly EpisodeResponse[] = filled
    ? [
        {
          id: 'preview_episode',
          seriesId: 'preview_series',
          seasonId: 'preview_season',
          assetId: 'preview_asset',
          number: 1,
          title: '첫 번째 여정',
          description: '등록된 회차가 목록에 표시되는 예시입니다.',
          thumbUrl: '/brand/works/red-horizon.png',
          status: 'DRAFT',
          ageRating: 'ALL',
          aiDisclosure: '생성형 AI로 배경 콘셉트 이미지를 제작했습니다.',
          publishAt: null,
          publishedAt: null,
          viewCount: '0',
          likeCount: 0,
          commentCount: 0,
          createdAt: '2026-08-28T00:00:00.000Z',
          updatedAt: '2026-08-28T00:00:00.000Z',
        },
      ]
    : []
  const structure = filled
    ? [
        {
          id: 'preview_episode',
          title: '첫 번째 여정',
          number: 1,
          status: 'DRAFT' as const,
          seasonNumber: 1,
          seasonTitle: null,
          thumbKey: null,
          thumbUrl: '/brand/works/red-horizon.png',
          durationSec: 125,
          viewCount: '0',
          impressionCount: '0',
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          avgWatchSec: 0,
          uniqueViewers: 0,
          completedViewers: 0,
          publishedAt: null,
          updatedAt: '2026-08-28T00:00:00.000Z',
        },
      ]
    : []

  return (
    <StudioShell displayName="Administrator" handle="admin">
      <main className="studio-series-page">
        <header className="studio-series-header">
          <SeriesPosterUploader seriesId="preview_series" workType="SERIES" />
          <div>
            <span>WORK · SERIES</span>
            <h1>작품 제목</h1>
            <p>작품 소개가 이곳에 표시됩니다.</p>
            <div className="studio-series-meta">
              <span>
                <Film aria-hidden="true" /> 0개 회차
              </span>
              <span>
                <Eye aria-hidden="true" /> 0회 조회
              </span>
            </div>
          </div>
        </header>

        <section className="studio-series-section" id="episodes">
          <div className="studio-section-title-row">
            <div>
              <span>EPISODE MANAGEMENT</span>
              <h2>작품 제목의 회차 관리</h2>
              <p>작품 안의 1화·2화·3화를 각각 수정하고 공개·예약·분석합니다.</p>
            </div>
            <EpisodeCreateWorkspace
              seriesId="preview_series"
              availableAssets={assets}
              workType="SERIES"
            />
          </div>
          <nav className="studio-preview-switch" aria-label="회차 화면 예시">
            <Link
              href="/studio-preview#episodes"
              aria-current={!filled ? 'page' : undefined}
            >
              빈 상태
            </Link>
            <Link
              href="/studio-preview?state=filled#episodes"
              aria-current={filled ? 'page' : undefined}
            >
              등록 후 화면
            </Link>
          </nav>
          <EpisodeTable
            episodes={episodes}
            availableAssets={assets}
            structure={structure}
            workType="SERIES"
          />
        </section>
      </main>
    </StudioShell>
  )
}
