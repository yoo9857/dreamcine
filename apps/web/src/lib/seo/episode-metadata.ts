import type { EpisodeMetaView } from '@aidream/core'
import { cdnUrl } from '@aidream/storage/cdn'
import type { Metadata } from 'next'

import { absoluteUrlOrNull } from '../site-url'

import {
  breadcrumbJsonLd,
  videoObjectJsonLd,
  type JsonLdDocument,
} from './json-ld'

/** OG 설명 상한. 넘기면 크롤러가 잘라 문장이 중간에 끊긴다. */
const META_DESCRIPTION_MAX = 160

function clamp(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/gu, ' ')
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`
}

/**
 * 저장된 키를 공개 URL 로 바꾼다. CDN 이 설정되지 않은 환경에서 던지면
 * 메타데이터 하나 때문에 페이지 전체가 500 이 되므로 삼킨다.
 */
function publicUrl(key: string | null): string | null {
  if (key === null || key === '') return null
  try {
    return cdnUrl(key)
  } catch {
    return null
  }
}

/** 로케일이 지정되면 그 번역을, 없으면 원본을 쓴다. */
function localized(
  meta: EpisodeMetaView,
  locale: string | undefined,
): {
  readonly title: string
  readonly description: string | null
  readonly metaTitle: string | null
  readonly metaDescription: string | null
} {
  const translation =
    locale === undefined
      ? undefined
      : meta.translations.find((entry) => entry.locale === locale)
  return {
    title: translation?.title ?? meta.title,
    description: translation?.description ?? meta.description,
    metaTitle: translation?.metaTitle ?? meta.metaTitle,
    metaDescription: translation?.metaDescription ?? meta.metaDescription,
  }
}

export function episodeCanonicalPath(meta: EpisodeMetaView): string {
  return meta.canonicalPath ?? `/watch/${meta.episodeId}`
}

/**
 * `watch/[episodeId]` 의 `generateMetadata` 본체.
 *
 * `metaTitle` · `metaDescription` 이 있으면 그것이 이긴다 — 크리에이터가
 * 검색 결과용 카피를 따로 쓴 경우다. 없으면 제목·설명에서 만든다.
 *
 * 색인 정책:
 * - `PUBLISHED` + `PUBLIC` 이 아니면 `noindex`. 예약·초안·숨김·비공개 링크가
 *   검색에 새면 되돌릴 수 없다.
 * - `A19` 는 색인하되 `rating` 메타를 붙인다. 성인 등급을 숨기는 것이 아니라
 *   필터가 걸리게 하는 것이 옳다.
 */
export function buildEpisodeMetadata(
  meta: EpisodeMetaView,
  options: { readonly isPubliclyVisible: boolean; readonly locale?: string },
): Metadata {
  const copy = localized(meta, options.locale)
  const canonicalPath = episodeCanonicalPath(meta)
  const canonical = absoluteUrlOrNull(canonicalPath)
  const title = copy.metaTitle ?? `${copy.title} · ${meta.seriesTitle}`
  const description =
    copy.metaDescription ??
    (copy.description === null
      ? `${meta.creator.displayName}의 ${meta.seriesTitle} ${String(meta.number)}화`
      : clamp(copy.description, META_DESCRIPTION_MAX))
  const image = publicUrl(meta.ogImageKey) ?? publicUrl(meta.thumbKey)

  const languages: Record<string, string> = {}
  if (canonical !== null) {
    languages[meta.language] = canonical
    for (const translation of meta.translations) {
      const localeUrl = absoluteUrlOrNull(
        `${canonicalPath}?lang=${translation.locale}`,
      )
      if (localeUrl !== null) languages[translation.locale] = localeUrl
    }
  }

  return {
    title,
    description,
    keywords: meta.keywords.length === 0 ? undefined : [...meta.keywords],
    alternates: {
      ...(canonical === null ? {} : { canonical }),
      ...(Object.keys(languages).length > 1 ? { languages } : {}),
    },
    robots: options.isPubliclyVisible
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: 'video.episode',
      title,
      description,
      ...(canonical === null ? {} : { url: canonical }),
      siteName: 'ilog',
      locale: meta.language,
      ...(image === null ? {} : { images: [{ url: image }] }),
      ...(meta.publishedAt === null
        ? {}
        : { publishedTime: meta.publishedAt.toISOString() }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image === null ? {} : { images: [image] }),
    },
    other: {
      // 연령 등급은 크롤러·부모 통제 필터가 읽는 표준 키다.
      rating: meta.ageRating === 'A19' ? 'adult' : 'general',
      'video:duration':
        meta.durationSec === null ? '' : String(meta.durationSec),
    },
  }
}

/** 페이지가 심을 구조화 데이터 묶음. 순서가 곧 문서 순서다. */
export function buildEpisodeJsonLd(
  meta: EpisodeMetaView,
  options: { readonly locale?: string } = {},
): readonly JsonLdDocument[] {
  const copy = localized(meta, options.locale)
  const canonicalPath = episodeCanonicalPath(meta)
  const canonical = absoluteUrlOrNull(canonicalPath)

  return [
    videoObjectJsonLd({
      meta,
      title: copy.title,
      description: copy.description,
      canonical,
      thumbnailUrl: publicUrl(meta.ogImageKey) ?? publicUrl(meta.thumbKey),
      embedUrl: absoluteUrlOrNull(`/embed/${meta.episodeId}`),
    }),
    breadcrumbJsonLd([
      { name: 'ilog', path: '/' },
      { name: meta.creator.displayName, path: `/u/${meta.creator.handle}` },
      { name: meta.seriesTitle, path: `/series/${meta.seriesId}` },
      { name: copy.title, path: canonicalPath },
    ]),
  ]
}
