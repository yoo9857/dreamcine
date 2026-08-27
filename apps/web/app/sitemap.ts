import {
  listSitemapCreators,
  listSitemapEpisodes,
  listSitemapSeries,
  listSitemapTags,
  type SitemapEntry,
} from '@aidream/db'
import type { MetadataRoute } from 'next'

import { absoluteUrlOrNull, siteOrigin } from '@/src/lib/site-url'

/**
 * sitemap 은 매 요청 DB 를 4번 때릴 이유가 없다. 크롤러 방문 간격보다 짧게
 * 갱신해도 얻는 것이 없으므로 1시간 캐시한다.
 */
export const revalidate = 3600

/**
 * 한 파일당 상한을 sitemaps.org 기준(50,000 URL) 아래로 잡는다. 이 상한에
 * 닿으면 `sitemap.ts` 를 `generateSitemaps` 로 쪼개야 한다 — 지금은 T0 티어에서
 * 그 규모가 아니므로 단일 파일로 두고, 넘칠 때 로그로 드러나게 한다.
 */
const EPISODE_LIMIT = 20_000
const SERIES_LIMIT = 5_000
const CREATOR_LIMIT = 5_000
const TAG_LIMIT = 500

interface StaticRoute {
  readonly path: string
  readonly changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  readonly priority: number
}

const STATIC_ROUTES: readonly StaticRoute[] = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/browse', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/works', changeFrequency: 'daily', priority: 0.8 },
  { path: '/creators', changeFrequency: 'daily', priority: 0.8 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/creator-apply', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
  // 요금제는 언어·시장별로 canonical 이 다르다 (12_GLOBAL_EXPANSION §1).
  { path: '/ads-plan', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/kr-en/ads-plan', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/en-us/ads-plan', changeFrequency: 'monthly', priority: 0.4 },
]

function toSitemapEntries(
  entries: readonly SitemapEntry[],
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number,
): MetadataRoute.Sitemap {
  return entries.flatMap((entry) => {
    const url = absoluteUrlOrNull(entry.path)
    return url === null
      ? []
      : [{ url, lastModified: entry.lastModified, changeFrequency, priority }]
  })
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // APP_URL 이 없으면 절대 URL 을 만들 수 없다. 빈 sitemap 은 잘못된 호스트가
  // 박힌 sitemap 보다 낫다 — 후자는 크롤러가 캐시해 오래 남는다.
  try {
    siteOrigin()
  } catch {
    return []
  }

  const now = new Date()
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap(
    (route) => {
      const url = absoluteUrlOrNull(route.path)
      return url === null
        ? []
        : [
            {
              url,
              lastModified: now,
              changeFrequency: route.changeFrequency,
              priority: route.priority,
            },
          ]
    },
  )

  // DB 가 죽어도 정적 경로는 나가야 한다. sitemap 500 은 크롤러가 재시도를
  // 줄이는 신호로 읽는다.
  const [episodes, series, creators, tags] = await Promise.all([
    listSitemapEpisodes(EPISODE_LIMIT).catch(() => []),
    listSitemapSeries(SERIES_LIMIT).catch(() => []),
    listSitemapCreators(CREATOR_LIMIT).catch(() => []),
    listSitemapTags(TAG_LIMIT).catch(() => []),
  ])

  return [
    ...staticEntries,
    ...toSitemapEntries(series, 'daily', 0.8),
    ...toSitemapEntries(episodes, 'weekly', 0.7),
    ...toSitemapEntries(creators, 'weekly', 0.6),
    ...toSitemapEntries(tags, 'weekly', 0.4),
  ]
}
