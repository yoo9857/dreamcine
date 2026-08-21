import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'AIDREAM',
  description: 'AI로 제작된 드라마를 공유하는 소셜 네트워크',
}

export default function RootLayout({
  children,
}: {
  readonly children: ReactNode
}): ReactNode {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
