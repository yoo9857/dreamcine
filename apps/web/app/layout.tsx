import { THEMES, themeTokens } from '@aidream/ui'
import type { Metadata, Viewport } from 'next'
import { cookies, headers } from 'next/headers'
import type { ReactNode } from 'react'

import { ThemeToggle } from '@/src/components/ThemeToggle'
import { THEME_COOKIE, parseTheme } from '@/src/lib/theme'
import { siteOrigin } from '@/src/lib/site-url'

import './globals.css'
import '../src/styles/app-shell.css'
import '../src/styles/account.css'
import '../src/styles/auth-login.css'
import '../src/styles/cinematic-motion.css'
import '../src/styles/discovery-home.css'
import '../src/styles/guest-landing.css'
import '../src/styles/player.css'
import '../src/styles/policy.css'

const SITE_DESCRIPTION =
  '새로운 이야기와 크리에이터를 발견하는 영상 플랫폼 ilog'

/** 공유 카드 기본 이미지. 썸네일·포스터가 없는 페이지도 회색 카드로 나가지 않게 한다. */
const DEFAULT_OG_IMAGE = '/brand/ilog-app-icon.png'

/**
 * `metadataBase` 는 하위 페이지가 상대 경로 이미지를 절대 URL 로 승격할 때
 * 쓰인다. 없으면 Next 가 빌드마다 경고를 내고, OG 이미지 경로가 상대값으로
 * 나가 크롤러가 해석하지 못한다.
 *
 * `APP_URL` 이 없는 환경에서 던지면 모든 페이지가 죽으므로 삼킨다.
 */
function metadataBase(): URL | undefined {
  try {
    return new URL(siteOrigin())
  } catch {
    return undefined
  }
}

export const metadata: Metadata = {
  ...(metadataBase() === undefined ? {} : { metadataBase: metadataBase() }),
  title: {
    default: 'ilog',
    template: '%s | ilog',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'ilog',
  // 전화번호 자동 링크는 모바일에서 제목·설명을 링크로 깨뜨린다.
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // 동영상 플랫폼이므로 미리보기 길이를 제한하지 않는다.
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'ilog',
    locale: 'ko_KR',
    title: 'ilog',
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ilog',
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: themeTokens('dark').color.bg.base,
}

/**
 * 쿠키를 읽어 첫 페인트부터 테마를 적용한다. 인라인 스크립트가 필요 없다.
 *
 * 부수효과가 하나 있다 — `cookies()` 를 읽으면 이 레이아웃 아래 모든 페이지가
 * 동적 렌더가 된다. 그래서 모든 페이지가 CSP nonce 를 받는다. 정적 프리렌더된
 * 페이지는 nonce 를 못 받아 인라인 스크립트가 차단된다. (OBS-005)
 *
 * 쿠키가 없으면 기본값(다크)을 토글에 넘긴다. 시스템이 라이트인 사용자는
 * 첫 클릭이 한 번 헛돌 수 있지만, 그 클릭이 명시적 선택을 남기므로 이후로는
 * 항상 일치한다. 인라인 스크립트 없이 시스템 설정을 서버가 알 방법은 없다.
 */
export default async function RootLayout({
  children,
}: {
  readonly children: ReactNode
}): Promise<ReactNode> {
  const [store, requestHeaders] = await Promise.all([cookies(), headers()])
  const theme = parseTheme(store.get(THEME_COOKIE)?.value)
  const language = requestHeaders.get('x-ilog-locale') === 'en' ? 'en' : 'ko'

  return (
    <html lang={language} {...(theme === null ? {} : { 'data-theme': theme })}>
      <body>
        {/*
            08_UIUX_SPEC.md §7 은 시스템 설정 외에 수동 토글도 요구한다.
            상단바(T09)가 생기면 그쪽으로 옮긴다. 그때까지 화면 어디서든
            닿을 수 있게 고정해 둔다.
          */}
        <div className="aidream-theme-control">
          <ThemeToggle current={theme ?? 'dark'} />
        </div>
        {children}
      </body>
    </html>
  )
}

/** 지원하는 테마 목록을 한 곳에서 확인할 수 있게 다시 내보낸다. */
export const SUPPORTED_THEMES = THEMES
