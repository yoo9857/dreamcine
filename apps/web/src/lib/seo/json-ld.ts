import type { EpisodeMetaView } from '@aidream/core'

import { absoluteUrlOrNull } from '../site-url'

/**
 * JSON-LD 문서 한 덩어리.
 *
 * 재귀 유니온으로 값 모양을 좁히려 했으나, 자기참조 `Record` 는 타입 검사에서
 * `any` 로 붕괴한다 — 좁히는 척만 하는 타입이다. 실제 안전장치는 타입이 아니라
 * `JsonLd` 컴포넌트의 `<` 이스케이프다. 그래서 여기서는 정직하게 넓게 둔다.
 */
export type JsonLdDocument = Record<string, unknown>

/** 초 → ISO 8601 기간. `VideoObject.duration` 은 이 형식만 받는다. */
export function isoDuration(seconds: number): string {
  const total = Math.max(0, Math.trunc(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60
  const parts = [
    hours > 0 ? `${String(hours)}H` : '',
    minutes > 0 ? `${String(minutes)}M` : '',
    // 0초 영상은 없지만, 시·분이 모두 0이면 `PT` 만 남아 무효 문서가 된다.
    rest > 0 || (hours === 0 && minutes === 0) ? `${String(rest)}S` : '',
  ].join('')
  return `PT${parts}`
}

/**
 * AgeRating → schema.org `contentRating`.
 *
 * 한국 등급을 그대로 노출한다. 국제 등급으로 임의 환산하면 법적 표기와
 * 구조화 데이터가 갈라진다 — 등급은 번역 대상이 아니다.
 */
const CONTENT_RATING: Record<string, string> = {
  ALL: 'KMRB ALL',
  A12: 'KMRB 12',
  A15: 'KMRB 15',
  A19: 'KMRB 19',
}

interface VideoObjectInput {
  readonly meta: EpisodeMetaView
  readonly title: string
  readonly description: string | null
  readonly canonical: string | null
  readonly thumbnailUrl: string | null
  readonly embedUrl: string | null
}

/**
 * `schema.org/VideoObject`. Google 동영상 색인이 요구하는 필수 4종
 * (name · description · thumbnailUrl · uploadDate) 을 항상 채우고, 있으면
 * duration · interactionStatistic · contentRating 을 덧붙인다.
 */
export function videoObjectJsonLd(input: VideoObjectInput): JsonLdDocument {
  const { meta } = input
  const creatorUrl = absoluteUrlOrNull(`/u/${meta.creator.handle}`)
  const seriesUrl = absoluteUrlOrNull(`/series/${meta.seriesId}`)

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: input.title,
    description: input.description ?? input.title,
    thumbnailUrl: input.thumbnailUrl ?? undefined,
    uploadDate: meta.publishedAt?.toISOString(),
    duration:
      meta.durationSec === null ? undefined : isoDuration(meta.durationSec),
    url: input.canonical ?? undefined,
    embedUrl: meta.allowEmbed ? (input.embedUrl ?? undefined) : undefined,
    inLanguage: meta.language,
    isFamilyFriendly: meta.madeForKids,
    contentRating: CONTENT_RATING[meta.ageRating],
    genre: meta.category === null ? undefined : meta.category.nameKo,
    keywords: meta.keywords.length === 0 ? undefined : meta.keywords.join(', '),
    creator: {
      '@type': 'Person',
      name: meta.creator.displayName,
      url: creatorUrl,
    },
    partOfSeries: {
      '@type': 'TVSeries',
      name: meta.seriesTitle,
      url: seriesUrl,
    },
    episodeNumber: meta.number,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/WatchAction',
        userInteractionCount: Number(meta.viewCount),
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: meta.likeCount,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: meta.commentCount,
      },
    ],
    // 챕터는 `Clip` 으로 노출한다. 종료 시각은 다음 챕터의 시작이고,
    // 마지막 챕터는 영상 길이가 없으면 종료를 알 수 없어 생략한다.
    hasPart:
      meta.chapters.length === 0
        ? undefined
        : meta.chapters.map((chapter, index) => {
            const next = meta.chapters[index + 1]
            const endSec = next?.startSec ?? meta.durationSec
            return {
              '@type': 'Clip',
              name: chapter.title,
              startOffset: chapter.startSec,
              endOffset: endSec ?? undefined,
              url:
                input.canonical === null
                  ? undefined
                  : `${input.canonical}?t=${String(chapter.startSec)}`,
            }
          }),
    // 자막 존재는 접근성 신호다. 트랙 파일 URL 은 서명이 필요할 수 있어
    // 언어 목록만 노출한다.
    subtitleLanguage:
      meta.subtitles.length === 0
        ? undefined
        : meta.subtitles.map((track) => track.language),
  }
}

export interface BreadcrumbStep {
  readonly name: string
  readonly path: string
}

export function breadcrumbJsonLd(
  steps: readonly BreadcrumbStep[],
): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: absoluteUrlOrNull(step.path),
    })),
  }
}

export interface ProfileJsonLdInput {
  readonly handle: string
  readonly displayName: string
  readonly description: string | null
  readonly avatarUrl: string | null
  readonly followerCount: number | null
  readonly joinedAt: Date | null
}

export function profileJsonLd(input: ProfileJsonLdInput): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateCreated: input.joinedAt?.toISOString(),
    mainEntity: {
      '@type': 'Person',
      name: input.displayName,
      alternateName: `@${input.handle}`,
      description: input.description ?? undefined,
      image: input.avatarUrl ?? undefined,
      url: absoluteUrlOrNull(`/u/${input.handle}`),
      interactionStatistic:
        input.followerCount === null
          ? undefined
          : {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/FollowAction',
              userInteractionCount: input.followerCount,
            },
    },
  }
}

export interface ItemListEntry {
  readonly name: string
  readonly path: string
}

export function itemListJsonLd(
  name: string,
  entries: readonly ItemListEntry[],
): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      url: absoluteUrlOrNull(entry.path),
    })),
  }
}
