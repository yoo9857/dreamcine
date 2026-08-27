import { AppError, type FeedItem } from '@aidream/core'
import {
  findEpisodeById,
  findPlaybackEpisode,
  getEpisodeSocialState,
} from '@aidream/db'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { AgeGate } from '@/src/components/AgeGate'
import { CommentThread } from '@/src/components/comment/CommentThread'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import { WatchPlayer } from '@/src/components/player/HlsPlayer'
import { ReportDialog } from '@/src/components/ReportDialog'
import { LikeButton } from '@/src/components/social/LikeButton'
import {
  WatchExperience,
  WatchPreviewPlayer,
} from '@/src/components/watch/WatchExperience'
import { getPlayback } from '@/src/services/episode/get-playback'
import { getFeed } from '@/src/services/feed/get-feed'
import { getSeries } from '@/src/services/series/get-series'
import { getSeriesCreator } from '@/src/services/series/get-series-creator'
import { listComments } from '@/src/services/social/list-comments'

import '@/src/styles/watch-experience.css'

interface WatchPageProps {
  readonly params: Promise<{ episodeId: string }>
}

const previewUser = {
  id: 'preview-user',
  handle: 'hanbin',
  email: 'preview@ilog.local',
  displayName: '한빈',
  role: 'CREATOR',
  status: 'ACTIVE',
  emailVerified: true,
} as const

function previewItem(
  id: string,
  title: string,
  image: string,
  seconds: number,
  creator = 'ILOG ORIGINAL',
): FeedItem {
  return {
    episodeId: `preview-${id}`,
    title,
    thumbUrl: image,
    durationSec: seconds,
    ageRating: 'ALL',
    viewCount: String(6400 + seconds * 8),
    likeCount: 420 + seconds,
    publishedAt: '2026-08-26T12:00:00.000Z',
    series: { id: `series-${id}`, title, slug: id },
    creator: { handle: 'hanbin', displayName: creator, avatarUrl: null },
    isLiked: false,
  }
}

const previewRecommendations = [
  previewItem(
    'signal',
    '붉은 신호가 켜진 밤',
    '/brand/posters/memory.png',
    54,
    '한빈',
  ),
  previewItem(
    'paper',
    '종이비가 내리는 순간',
    '/brand/works/paper-dance.png',
    72,
    'LUNA FILM',
  ),
  previewItem(
    'tomorrow-short',
    '내일을 만드는 상상',
    '/brand/posters/tomorrow.png',
    118,
    'NEW SCENE',
  ),
  previewItem('city', '사라지는 도시의 밤', '/brand/posters/city.png', 1028),
  previewItem(
    'frame',
    '마지막 프레임',
    '/brand/posters/last-frame.png',
    2241,
    'FRAME LAB',
  ),
  previewItem(
    'horizon',
    '붉은 지평선 너머',
    '/brand/works/red-horizon.png',
    1482,
    '한빈',
  ),
  previewItem(
    'tomorrow',
    '우리가 만든 내일',
    '/brand/posters/tomorrow.png',
    1874,
    'NEW SCENE',
  ),
  previewItem(
    'moon',
    '달에게 쓰는 편지',
    '/brand/posters/moon-letter.png',
    1360,
    'MOON STUDIO',
  ),
] as const

function PreviewWatchPage(): ReactNode {
  return (
    <div className="watch-page">
      <DiscoveryTopbar user={previewUser} />
      <WatchExperience
        player={<WatchPreviewPlayer posterUrl="/brand/works/red-horizon.png" />}
        title="붉은 지평선 너머"
        seriesTitle="RED HORIZON · EP. 01"
        description="끝없이 비가 내리는 도시, 한 사람이 붉은 빛의 근원을 찾아 경계 너머로 향합니다."
        creator={{
          handle: 'hanbin',
          displayName: '한빈',
          avatarUrl: '/brand/profiles/minseo-color.webp',
        }}
        viewCount="12840"
        publishedAt="2026. 08. 26"
        actions={
          <>
            <button type="button">♡ 926</button>
            <button type="button">공유</button>
          </>
        }
        shortItems={previewRecommendations.slice(0, 3)}
        longItems={previewRecommendations.slice(3)}
        comments={
          <div className="watch-preview-comments">
            <h2>댓글</h2>
            <p>로그인하면 작품에 대한 이야기를 나눌 수 있습니다.</p>
          </div>
        }
      />
    </div>
  )
}

export default async function WatchPage(
  props: WatchPageProps,
): Promise<ReactNode> {
  const { episodeId } = await props.params
  if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL)
    return <PreviewWatchPage />

  const [session, requestHeaders] = await Promise.all([
    getServerSession(),
    headers(),
  ])
  try {
    const playback = await getPlayback({
      episodeId,
      session,
      cookieHeader: requestHeaders.get('cookie'),
      now: new Date(),
    })
    const [comments, social, episode, recommendations] = await Promise.all([
      listComments(episodeId, { limit: 20 }),
      getEpisodeSocialState(episodeId, session?.userId),
      findEpisodeById(episodeId),
      getFeed({ type: 'latest', limit: 18 }, session),
    ])
    if (episode === null) notFound()
    const seriesDetail = await getSeries(episode.seriesId)
    const creator = await getSeriesCreator(seriesDetail.series.ownerId)
    const nextEpisode = seriesDetail.episodes
      .filter(
        (candidate) =>
          candidate.status === 'PUBLISHED' && candidate.number > episode.number,
      )
      .sort((first, second) => first.number - second.number)[0]
    const candidates = recommendations.items.filter(
      (item) => item.episodeId !== episodeId,
    )
    const shorts = candidates.filter(
      (item) => item.durationSec !== null && item.durationSec <= 180,
    )
    const longs = candidates.filter(
      (item) => item.durationSec === null || item.durationSec > 180,
    )
    const publishedAt =
      episode.publishedAt?.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }) ?? null

    return (
      <div className="watch-page">
        <DiscoveryTopbar user={session?.user ?? null} />
        <WatchExperience
          player={
            <WatchPlayer
              episodeId={playback.episodeId}
              authenticated={session !== null}
              masterUrl={playback.masterUrl}
              {...(playback.posterUrl === undefined
                ? {}
                : { posterUrl: playback.posterUrl })}
              {...(playback.spriteUrl === undefined
                ? {}
                : { spriteUrl: playback.spriteUrl })}
              {...(playback.spriteVttUrl === undefined
                ? {}
                : { spriteVttUrl: playback.spriteVttUrl })}
              startAtSec={playback.startAtSec}
              durationSec={playback.durationSec}
              {...(nextEpisode === undefined
                ? {}
                : {
                    nextEpisode: {
                      id: nextEpisode.id,
                      title: nextEpisode.title,
                    },
                  })}
            />
          }
          title={episode.title}
          seriesTitle={seriesDetail.series.title}
          description={episode.description}
          creator={creator}
          viewCount={episode.viewCount}
          publishedAt={publishedAt}
          actions={
            session === null ? null : (
              <>
                <LikeButton
                  episodeId={episodeId}
                  initialLiked={social.isLiked}
                  initialCount={social.likeCount}
                />
                {seriesDetail.series.ownerId === session.userId ? null : (
                  <ReportDialog
                    target="EPISODE"
                    targetId={episodeId}
                    trigger="신고"
                  />
                )}
              </>
            )
          }
          shortItems={shorts.length === 0 ? candidates.slice(0, 3) : shorts}
          longItems={longs.length === 0 ? candidates.slice(3, 9) : longs}
          comments={
            <CommentThread
              episodeId={episodeId}
              initialItems={comments.items}
              authenticated={session !== null}
            />
          }
        />
      </div>
    )
  } catch (error: unknown) {
    if (error instanceof AppError && error.code === 'E_PERM_AGE_RESTRICTED') {
      const episode = await findPlaybackEpisode(episodeId)
      if (episode === null) notFound()
      return (
        <main className="p-4">
          <AgeGate
            episodeId={episodeId}
            rating={episode.ageRating}
            authenticated={session !== null}
          />
        </main>
      )
    }
    if (error instanceof AppError && error.code === 'E_ASSET_NOT_READY')
      return (
        <main className="mx-auto max-w-lg p-6">
          <h1 className="text-xl font-bold">영상을 변환하고 있습니다</h1>
          <p>잠시 후 페이지를 새로고침해 주세요.</p>
        </main>
      )
    notFound()
  }
}
