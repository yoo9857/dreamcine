import type { Series } from '@aidream/core'
import { cdnUrl } from '@aidream/storage/cdn'
import type { Metadata } from 'next'

import { absoluteUrlOrNull } from '../site-url'

import { breadcrumbJsonLd, type JsonLdDocument } from './json-ld'

const META_DESCRIPTION_MAX = 160

function clamp(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/gu, ' ')
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`
}

function publicUrl(key: string | null): string | null {
  if (key === null || key === '') return null
  try {
    return cdnUrl(key)
  } catch {
    return null
  }
}

export function seriesCanonicalPath(series: Series): string {
  return series.canonicalPath ?? `/series/${series.id}`
}

/**
 * 시리즈 상세의 공유·색인 메타데이터.
 *
 * 에피소드가 하나도 공개되지 않은 시리즈는 `noindex` 다. 빈 페이지가 색인되면
 * 나중에 회차가 붙어도 "얇은 콘텐츠" 평가가 남는다.
 */
export function buildSeriesMetadata(
  series: Series,
  options: {
    readonly publishedEpisodeCount: number
    readonly creatorDisplayName: string
  },
): Metadata {
  const canonical = absoluteUrlOrNull(seriesCanonicalPath(series))
  const title = series.metaTitle ?? series.title
  const description =
    series.metaDescription ??
    (series.synopsis === null
      ? `${options.creatorDisplayName}의 ${series.title} — 전 ${String(series.episodeCount)}화`
      : clamp(series.synopsis, META_DESCRIPTION_MAX))
  const image = publicUrl(series.ogImageKey) ?? publicUrl(series.posterKey)
  const indexable =
    series.visibility === 'PUBLIC' &&
    series.deletedAt === null &&
    options.publishedEpisodeCount > 0

  return {
    title,
    description,
    keywords: series.keywords.length === 0 ? undefined : [...series.keywords],
    ...(canonical === null ? {} : { alternates: { canonical } }),
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: 'video.tv_show',
      title,
      description,
      siteName: 'ilog',
      locale: series.language,
      ...(canonical === null ? {} : { url: canonical }),
      ...(image === null ? {} : { images: [{ url: image }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image === null ? {} : { images: [image] }),
    },
    other: {
      rating: series.ageRating === 'A19' ? 'adult' : 'general',
    },
  }
}

export interface SeriesEpisodeRef {
  readonly id: string
  readonly number: number
  readonly title: string
}

/**
 * `TVSeries` + `BreadcrumbList`.
 *
 * `TVSeries.episode` 로 회차 목록을 노출하면 검색 결과에 회차가 함께 잡힌다 —
 * 시리즈물에서 유입 폭이 가장 크게 달라지는 지점이다.
 */
export function buildSeriesJsonLd(
  series: Series,
  options: {
    readonly creatorHandle: string
    readonly creatorDisplayName: string
    readonly episodes: readonly SeriesEpisodeRef[]
  },
): readonly JsonLdDocument[] {
  const canonicalPath = seriesCanonicalPath(series)
  const image = publicUrl(series.ogImageKey) ?? publicUrl(series.posterKey)

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      name: series.title,
      description: series.synopsis ?? series.title,
      url: absoluteUrlOrNull(canonicalPath) ?? undefined,
      image: image ?? undefined,
      inLanguage: series.language,
      numberOfEpisodes: series.episodeCount,
      isFamilyFriendly: series.madeForKids,
      keywords:
        series.keywords.length === 0 ? undefined : series.keywords.join(', '),
      datePublished: series.firstAiredAt?.toISOString(),
      creator: {
        '@type': 'Person',
        name: options.creatorDisplayName,
        url: absoluteUrlOrNull(`/u/${options.creatorHandle}`) ?? undefined,
      },
      episode:
        options.episodes.length === 0
          ? undefined
          : options.episodes.map((episode) => ({
              '@type': 'TVEpisode',
              episodeNumber: episode.number,
              name: episode.title,
              url: absoluteUrlOrNull(`/watch/${episode.id}`) ?? undefined,
            })),
    },
    breadcrumbJsonLd([
      { name: 'ilog', path: '/' },
      { name: options.creatorDisplayName, path: `/u/${options.creatorHandle}` },
      { name: series.title, path: canonicalPath },
    ]),
  ]
}
