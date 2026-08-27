import { AppError } from '@aidream/core'

const TRAILING_SLASHES = /\/+$/u

/**
 * **이 파일에서만 `APP_URL` 을 정규화한다.** canonical · hreflang · sitemap ·
 * OG 이미지가 모두 같은 출처를 써야 한다. 한 곳이 어긋나면 색인이 두 URL 로
 * 갈라지는데, 그 증상은 배포 몇 주 뒤 검색 콘솔에서야 보인다.
 *
 * `12_GLOBAL_EXPANSION.md` §2 "The public URL is stable" 의 구현 지점이다.
 */
export function siteOrigin(): string {
  const value = process.env.APP_URL
  if (value === undefined || value === '') {
    throw new AppError('E_INTERNAL', { reason: 'app-url-missing' })
  }
  return value.replace(TRAILING_SLASHES, '')
}

/**
 * canonical 등에 쓸 절대 URL. `path` 는 항상 `/` 로 시작하는 사이트 내부 경로다.
 *
 * 이미 절대 URL 인 값을 그대로 통과시키지 않는다 — 외부 호스트가 canonical 로
 * 새는 경로를 만들지 않기 위해서다.
 */
export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return siteOrigin() + normalized
}

/**
 * `APP_URL` 이 없는 환경(로컬 미리보기, 일부 CI 단계)에서도 페이지가 렌더되어야
 * 한다. 메타데이터 누락은 페이지를 죽일 이유가 아니다.
 */
export function absoluteUrlOrNull(path: string): string | null {
  try {
    return absoluteUrl(path)
  } catch {
    return null
  }
}
