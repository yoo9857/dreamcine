import { THEMES, ToastProvider } from '@aidream/ui'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'

import { THEME_COOKIE, parseTheme } from '@/src/lib/theme'

import './globals.css'

export const metadata: Metadata = {
  title: 'AIDREAM',
  description: 'AI로 제작된 드라마를 공유하는 소셜 네트워크',
}

/**
 * 쿠키를 읽어 첫 페인트부터 테마를 적용한다. 인라인 스크립트가 필요 없다.
 *
 * 부수효과가 하나 있다 — `cookies()` 를 읽으면 이 레이아웃 아래 모든 페이지가
 * 동적 렌더가 된다. 그래서 모든 페이지가 CSP nonce 를 받는다. 정적 프리렌더된
 * 페이지는 nonce 를 못 받아 인라인 스크립트가 차단된다. (OBS-005)
 */
export default async function RootLayout({
  children,
}: {
  readonly children: ReactNode
}): Promise<ReactNode> {
  const store = await cookies()
  const theme = parseTheme(store.get(THEME_COOKIE)?.value)

  return (
    <html lang="ko" {...(theme === null ? {} : { 'data-theme': theme })}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}

/** 지원하는 테마 목록을 한 곳에서 확인할 수 있게 다시 내보낸다. */
export const SUPPORTED_THEMES = THEMES
