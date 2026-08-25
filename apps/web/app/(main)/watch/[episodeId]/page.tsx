import { AppError } from '@aidream/core'
import { findPlaybackEpisode, getEpisodeSocialState } from '@aidream/db'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { getServerSession } from '@/src/auth/server-session'
import { AgeGate } from '@/src/components/AgeGate'
import { CommentThread } from '@/src/components/comment/CommentThread'
import { WatchPlayer } from '@/src/components/player/HlsPlayer'
import { ReportDialog } from '@/src/components/ReportDialog'
import { LikeButton } from '@/src/components/social/LikeButton'
import { getPlayback } from '@/src/services/episode/get-playback'
import { listComments } from '@/src/services/social/list-comments'

interface WatchPageProps {
  readonly params: Promise<{ episodeId: string }>
}

export default async function WatchPage(props: WatchPageProps) {
  const { episodeId } = await props.params
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
    const [comments, social, episodeRecord] = await Promise.all([
      listComments(episodeId, { limit: 20 }),
      getEpisodeSocialState(episodeId, session?.userId),
      findPlaybackEpisode(episodeId),
    ])
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4">
        <h1 className="sr-only">에피소드 재생</h1>
        <WatchPlayer
          episodeId={playback.episodeId}
          authenticated={session !== null}
          masterUrl={playback.masterUrl}
          {...(playback.posterUrl === undefined
            ? {}
            : { posterUrl: playback.posterUrl })}
          startAtSec={playback.startAtSec}
          durationSec={playback.durationSec}
        />
        {session === null ? null : (
          <div className="flex items-center gap-3">
            <LikeButton
              episodeId={episodeId}
              initialLiked={social.isLiked}
              initialCount={social.likeCount}
            />
            {episodeRecord?.ownerId === session.userId ? null : (
              <ReportDialog
                target="EPISODE"
                targetId={episodeId}
                trigger="신고"
              />
            )}
          </div>
        )}
        <CommentThread
          episodeId={episodeId}
          initialItems={comments.items}
          authenticated={session !== null}
        />
      </main>
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
    if (error instanceof AppError && error.code === 'E_ASSET_NOT_READY') {
      return (
        <main className="mx-auto max-w-lg p-6">
          <h1 className="text-xl font-bold">영상을 변환하고 있습니다</h1>
          <p>잠시 후 페이지를 새로고침해 주세요.</p>
        </main>
      )
    }
    notFound()
  }
}
