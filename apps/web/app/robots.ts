import type { MetadataRoute } from 'next'

import { absoluteUrlOrNull } from '@/src/lib/site-url'

/**
 * `12_GLOBAL_EXPANSION.md` §4 SEO 게이트가 요구하는 크롤러 계약.
 *
 * 차단 대상을 고른 근거:
 * - `/api/` — 응답이 JSON 이라 색인 가치가 없고, 크롤러가 쓰기 라우트를 두드릴
 *   이유가 없다.
 * - `/studio/`, `/admin/`, `/account` — 인증 전용. 색인되면 로그인 페이지가
 *   대신 색인되어 검색 결과가 오염된다.
 * - `/search`, `/embed/` — 무한한 쿼리 조합과 프레임 전용 문서다. 크롤 예산을
 *   태우고 얻는 것이 없다.
 * - `/verify`, `/password/` — 토큰이 URL 에 실린다.
 */
export default function robots(): MetadataRoute.Robots {
  const sitemap = absoluteUrlOrNull('/sitemap.xml')
  const host = absoluteUrlOrNull('/')

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/studio/',
          '/admin/',
          '/account',
          '/notifications',
          '/search',
          '/embed/',
          '/verify',
          '/password/',
          '/unsubscribe',
        ],
      },
    ],
    ...(sitemap === null ? {} : { sitemap }),
    ...(host === null ? {} : { host }),
  }
}
