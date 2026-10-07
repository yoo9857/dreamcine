import type {
  FeedItem,
  PublicUserSummary,
  SearchResult,
  SeriesResponse,
  UserProfile,
} from '@aidream/core'

/**
 * Higgsfield 프로필.
 *
 * 출품작은 ilog 계정이 아니라 여기서 따로 관리한다. 작품을 더하거나 빼면
 * 작품 목록, `/u/higgsfield`, 재생 화면이 함께 바뀐다.
 */
export const HIGGSFIELD_CREATOR: PublicUserSummary = {
  handle: 'higgsfield',
  displayName: 'Higgsfield',
  avatarUrl: '/brand/ai-tools/higgsfield.png',
  tier: 'BRONZE',
  isVerified: true,
}

const JOINED_AT = new Date('2026-10-06T00:00:00.000Z')
const PUBLISHED_AT = '2026-10-06T00:00:00.000Z'

export const HIGGSFIELD_BIO =
  'Higgsfield Global Film Festival 출품작을 ilog에서 소개합니다. 작품은 이 프로필에서 따로 관리합니다.'

export interface HiggsfieldFilm {
  readonly slug: string
  readonly title: string
  readonly credit: string
  readonly durationSec: number
  readonly logline: string
  readonly sourceUrl: string
  readonly hls: string
  readonly poster: string
}

export const HIGGSFIELD_FILMS: readonly HiggsfieldFilm[] = [
  {
    slug: 'thread',
    title: 'THREAD',
    credit: 'pandaproduction',
    durationSec: 344,
    logline:
      '골목의 물길이 검게 흐르는 시간. 슬픔과 기쁨이 낯선 사람처럼 스쳐 지나고, 한 창 너머에서 무언가가 일어나려 하거나 이미 일어났다.',
    sourceUrl: 'https://higgsfield.ai/ko/@pandaproduction/projects/thread',
    hls: 'https://cdn.higgsfield.ai/hls/video_input/97f832bd-1d33-4562-bb3f-c34364a9f93c/index.m3u8',
    poster:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_39tDAPbknLeiOHGT4b1AsPWiZ3z/d54e034b-40b5-48be-bd07-e3441c28f499.webp',
  },
  {
    slug: 'borrowed-wounds',
    title: 'Borrowed Wounds',
    credit: 'jeffzambrano',
    durationSec: 870,
    logline:
      '사무라이 의식에서는 모든 상처가 무릎 꿇은 다음 사람에게 넘어간다. 수십 년을 견딘 한 노인이 마침내 일어서기로 한다.',
    sourceUrl:
      'https://higgsfield.ai/ko/@jeffzambrano/projects/borrowed-wounds',
    hls: 'https://cdn.higgsfield.ai/hls/video_input_watermarked/2688a1ee-de6a-4e57-bf68-546e8d34f257/aa67b49b-6553-48c6-b6d6-f314a0b150bd/index.m3u8?v=aa67b49b-6553-48c6-b6d6-f314a0b150bd',
    poster:
      'https://cdn.higgsfield.ai/hls/video_input_watermarked/2688a1ee-de6a-4e57-bf68-546e8d34f257/aa67b49b-6553-48c6-b6d6-f314a0b150bd/thumbnail.webp?v=aa67b49b-6553-48c6-b6d6-f314a0b150bd',
  },
]

const SERIES_PREFIX = 'higgsfield:'

export function isHiggsfieldHandle(handle: string): boolean {
  return handle.toLowerCase() === HIGGSFIELD_CREATOR.handle
}

export function higgsfieldWatchId(slug: string): string {
  return `higgsfield/${slug}`
}

export function higgsfieldWatchPath(slug: string): string {
  return `/watch/${higgsfieldWatchId(slug)}`
}

export function higgsfieldFilmBySlug(slug: string): HiggsfieldFilm | undefined {
  return HIGGSFIELD_FILMS.find((film) => film.slug === slug)
}

export function formatFilmDuration(durationSec: number): string {
  const minutes = Math.floor(durationSec / 60)
  const seconds = durationSec % 60
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}

export function higgsfieldProfile(): UserProfile {
  return {
    ...HIGGSFIELD_CREATOR,
    bio: HIGGSFIELD_BIO,
    channelDescription: HIGGSFIELD_BIO,
    bannerUrl: null,
    channelKeywords: ['Global Film Festival', 'AI 영화'],
    country: null,
    locale: 'ko-KR',
    role: 'CREATOR',
    dmPolicy: 'NOBODY',
    tierPoints: 0,
    followerCount: null,
    followingCount: 0,
    seriesCount: HIGGSFIELD_FILMS.length,
    episodeCount: HIGGSFIELD_FILMS.length,
    totalViews: '0',
    joinedAt: JOINED_AT,
    trailerEpisodeId: null,
    links: [
      {
        id: 'higgsfield-website',
        kind: 'WEBSITE',
        label: 'Higgsfield',
        url: 'https://higgsfield.ai',
        order: 0,
      },
    ],
    isFollowing: false,
    isBlocked: false,
  }
}

export function higgsfieldSeriesList(): readonly SeriesResponse[] {
  return HIGGSFIELD_FILMS.map((film) => ({
    id: `${SERIES_PREFIX}${film.slug}`,
    ownerId: HIGGSFIELD_CREATOR.handle,
    slug: film.slug,
    title: film.title,
    synopsis: film.logline,
    workType: 'FILM',
    posterUrl: film.poster,
    ageRating: 'ALL',
    isCompleted: true,
    commentsOff: true,
    episodeCount: 1,
    totalViews: '0',
    aspectRatio: 16 / 9,
    createdAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
  }))
}

export function higgsfieldFeedItem(film: HiggsfieldFilm): FeedItem {
  return {
    episodeId: higgsfieldWatchId(film.slug),
    title: film.title,
    thumbUrl: film.poster,
    durationSec: film.durationSec,
    ageRating: 'ALL',
    viewCount: '0',
    likeCount: 0,
    publishedAt: PUBLISHED_AT,
    series: {
      id: `higgsfield-${film.slug}`,
      title: film.title,
      slug: film.slug,
      workType: 'FILM',
    },
    aspectRatio: 16 / 9,
    creator: HIGGSFIELD_CREATOR,
    isLiked: false,
  }
}

function includesQuery(query: string, values: readonly string[]): boolean {
  const needle = query.trim().toLocaleLowerCase()
  if (needle.length < 2) return false
  return values.some((value) => value.toLocaleLowerCase().includes(needle))
}

function filmSearchValues(film: HiggsfieldFilm): readonly string[] {
  return [
    film.title,
    film.credit,
    film.logline,
    film.slug,
    HIGGSFIELD_CREATOR.displayName,
    HIGGSFIELD_CREATOR.handle,
    'Global Film Festival',
    'AI 영화',
  ]
}

/**
 * 검색 목록은 절대 URL 만 받는다. 프로필 아바타는 로컬 파일이라 여기서는 뺀다.
 */
const SEARCH_CREATOR = { ...HIGGSFIELD_CREATOR, avatarUrl: null }

/** 카탈로그에 없는 소개 작품. 첫 페이지에만 붙인다. */
export function higgsfieldSearchResults(
  type: 'series' | 'episode' | 'user',
  query: string,
): readonly SearchResult[] {
  if (type === 'user') {
    return includesQuery(query, [
      HIGGSFIELD_CREATOR.handle,
      HIGGSFIELD_CREATOR.displayName,
      HIGGSFIELD_BIO,
    ])
      ? [
          {
            type: 'user',
            handle: HIGGSFIELD_CREATOR.handle,
            displayName: HIGGSFIELD_CREATOR.displayName,
            avatarUrl: null,
            followerCount: 0,
          },
        ]
      : []
  }
  const films = HIGGSFIELD_FILMS.filter((film) =>
    includesQuery(query, filmSearchValues(film)),
  )
  if (type === 'series') {
    return films.map((film) => ({
      type: 'series',
      id: `${SERIES_PREFIX}${film.slug}`,
      title: film.title,
      slug: film.slug,
      posterUrl: film.poster,
      creator: SEARCH_CREATOR,
    }))
  }
  return films.map((film) => ({
    type: 'episode',
    episode: { ...higgsfieldFeedItem(film), creator: SEARCH_CREATOR },
  }))
}

export function higgsfieldWorkCard(
  seriesId: string,
): { readonly href: string; readonly meta: string } | null {
  if (!seriesId.startsWith(SERIES_PREFIX)) return null
  const film = higgsfieldFilmBySlug(seriesId.slice(SERIES_PREFIX.length))
  if (film === undefined) return null
  return {
    href: higgsfieldWatchPath(film.slug),
    meta: `${film.credit} · ${formatFilmDuration(film.durationSec)}`,
  }
}
