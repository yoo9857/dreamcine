import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { MarketingUnsubscribeForm } from '@/src/components/auth/MarketingUnsubscribeForm'

export const metadata: Metadata = {
  title: '마케팅 이메일 수신거부',
  robots: { index: false, follow: false },
}

export default async function UnsubscribePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ token?: string }>
}): Promise<ReactNode> {
  const { token = '' } = await searchParams
  return (
    <main className="policy-page">
      <MarketingUnsubscribeForm token={token} />
      <footer>
        <Link href="/">ilog 홈으로</Link>
      </footer>
    </main>
  )
}
