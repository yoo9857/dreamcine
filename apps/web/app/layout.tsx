import { THEMES, themeTokens } from '@aidream/ui'
import type { Metadata, Viewport } from 'next'
import { cookies, headers } from 'next/headers'
import type { ReactNode } from 'react'

import { ThemeToggle } from '@/src/components/ThemeToggle'
import { THEME_COOKIE, parseTheme } from '@/src/lib/theme'

import './globals.css'
import '../src/styles/app-shell.css'
import '../src/styles/auth-login.css'
import '../src/styles/cinematic-motion.css'
import '../src/styles/discovery-home.css'
import '../src/styles/guest-landing.css'

export const metadata: Metadata = {
  title: {
    default: 'ilog',
    template: '%s | ilog',
  },
  description: '새로운 이야기와 크리에이터를 발견하는 영상 플랫폼 ilog',
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
