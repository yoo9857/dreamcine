import type { Metadata } from 'next'

import { absoluteUrlOrNull } from '../site-url'

import type { JsonLdDocument } from './json-ld'
import ogImage from './og-image.json'

export const SITE_TITLE =
  'ilog | AI 영화·드라마와 크리에이터를 만나는 영상 플랫폼'
export const SITE_DESCRIPTION =
  'ilog는 AI 영화와 드라마, 새로운 영상 작품을 발견하고 크리에이터와 소통하는 영상 플랫폼입니다. 작품을 감상하고 좋아요와 리뷰를 남기거나, 나만의 시리즈와 에피소드를 공개하세요.'
export const DEFAULT_OG_IMAGE = `${ogImage.path}?v=${ogImage.revision}`
export const DEFAULT_OG_ALT = ogImage.alt

export function publicPageMetadata(input: {
  readonly title: string
  readonly description: string
  readonly path: string
}): Metadata {
  const canonical = absoluteUrlOrNull(input.path)
  return {
    title: input.title,
    description: input.description,
    ...(canonical === null ? {} : { alternates: { canonical } }),
    openGraph: {
      type: 'website',
      siteName: 'ilog',
      locale: 'ko_KR',
      title: `${input.title} | ilog`,
      description: input.description,
      ...(canonical === null ? {} : { url: canonical }),
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: DEFAULT_OG_ALT,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${input.title} | ilog`,
      description: input.description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

export const HOME_FAQ = [
  {
    question: 'ilog는 어떤 서비스인가요?',
    answer:
      'ilog는 AI 영화와 드라마를 비롯한 영상 작품을 발견하고, 감상하고, 공개하는 영상 플랫폼입니다. 시청자와 크리에이터가 작품과 이야기를 중심으로 연결됩니다.',
  },
  {
    question: 'ilog에서는 어떤 작품을 찾을 수 있나요?',
    answer:
      '작품 목록에서 공개된 영상과 시리즈를 둘러보고, 크리에이터 페이지에서 만든 사람과 다른 작품을 알아볼 수 있습니다. 시리즈는 에피소드 단위로 감상할 수 있습니다.',
  },
  {
    question: 'ilog 회원가입은 무료인가요?',
    answer:
      '회원가입은 무료입니다. 가입 후 크리에이터를 팔로우하고 좋아요와 리뷰로 감상을 나눌 수 있습니다. 광고형 멤버십의 가격과 이용 조건은 멤버십 안내에서 확인하세요.',
  },
  {
    question: '크리에이터는 어떻게 작품을 공개하나요?',
    answer:
      '크리에이터 모집 페이지에서 참여 방법을 확인하세요. 크리에이터 권한을 갖춘 계정은 스튜디오에서 시리즈를 만들고 영상 에피소드를 업로드해 공개할 수 있습니다.',
  },
] as const

/** Keep page copy, social cards, and brand identity consistent. */
export function homeMetadata(): Metadata {
  const canonical = absoluteUrlOrNull('/')
  return {
    title: { absolute: SITE_TITLE },
    description: SITE_DESCRIPTION,
    ...(canonical === null ? {} : { alternates: { canonical } }),
    openGraph: {
      type: 'website',
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      siteName: 'ilog',
      locale: 'ko_KR',
      ...(canonical === null ? {} : { url: canonical }),
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: DEFAULT_OG_ALT,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

export function siteJsonLd(): JsonLdDocument | null {
  const url = absoluteUrlOrNull('/')
  if (url === null) return null
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${url}#organization`,
        name: 'ilog',
        url,
        logo: absoluteUrlOrNull('/icon.png'),
        description: SITE_DESCRIPTION,
      },
      {
        '@type': 'WebSite',
        '@id': `${url}#website`,
        name: 'ilog',
        url,
        description: SITE_DESCRIPTION,
        inLanguage: 'ko',
        publisher: { '@id': `${url}#organization` },
      },
    ],
  }
}
