import type { PublicUserSummary } from '@aidream/core'
import { listCreatorDirectory } from '@aidream/db'
import { avatarUrl, cdnUrl } from '@aidream/storage/cdn'

export interface CreatorWorkPreview {
  readonly id: string
  readonly title: string
  readonly watchPath: string
  readonly posterUrl: string | null
  readonly durationSec: number | null
}

/**
 * `PublicUserSummary` 를 확장한다 — 등급 배지를 그리는 컴포넌트가 피드·댓글과
 * 같은 타입을 받아야 화면마다 배지 규칙이 갈라지지 않는다.
 */
export interface CreatorDirectoryItem extends PublicUserSummary {
  readonly bio: string | null
  readonly followerCount: number | null
  readonly seriesCount: number
  readonly monthlySeriesCount?: number
  readonly works?: readonly CreatorWorkPreview[]
}

export function creatorMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  return {
    edition: `${String(year)}.${String(month).padStart(2, '0')}`,
    label: `${String(year)}년 ${String(month)}월`,
    start: new Date(Date.UTC(year, month - 1, 1, -9)),
    end: new Date(Date.UTC(year, month, 1, -9)),
  }
}

export async function getFeaturedCreators(
  limit = 100,
  month = creatorMonth(),
): Promise<readonly CreatorDirectoryItem[]> {
  const creators = await listCreatorDirectory({
    limit,
    monthStart: month.start,
    monthEnd: month.end,
  })
  return creators.map(
    ({ user: creator, publicSeriesCount, monthlySeriesCount, works }) => ({
      handle: creator.handle,
      displayName: creator.displayName,
      bio: creator.bio,
      avatarUrl: avatarUrl(creator.avatarKey),
      tier: creator.tier,
      isVerified: creator.verifiedAt !== null,
      followerCount: creator.hideFollowerCount ? null : creator.followerCount,
      seriesCount: publicSeriesCount,
      monthlySeriesCount,
      works: works.map((work) => ({
        id: work.id,
        title: work.title,
        watchPath: `/watch/${encodeURIComponent(work.episodeId)}`,
        posterUrl: work.posterKey === null ? null : cdnUrl(work.posterKey),
        durationSec: work.durationSec,
      })),
    }),
  )
}
