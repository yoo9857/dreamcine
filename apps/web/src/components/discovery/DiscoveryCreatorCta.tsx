import { ArrowUpRight, Clapperboard } from 'lucide-react'
import Link from 'next/link'
import React, { type ReactNode } from 'react'

export function DiscoveryCreatorCta(): ReactNode {
  return (
    <section
      className="discovery-creator-cta"
      aria-labelledby="creator-cta-title"
    >
      <div className="discovery-creator-cta-mark" aria-hidden="true">
        <Clapperboard />
        <span>YOUR STORY</span>
      </div>
      <div>
        <p>FROM WATCHER TO CREATOR</p>
        <h2 id="creator-cta-title">다음 선반에는 당신의 이야기를.</h2>
        <span>첫 작품을 만들고 ilog의 관객과 만나보세요.</span>
      </div>
      <div className="discovery-creator-cta-actions">
        <Link href="/studio/upload">
          작품 업로드 <ArrowUpRight aria-hidden="true" />
        </Link>
        <Link href="/creator-apply">크리에이터 안내</Link>
      </div>
    </section>
  )
}
