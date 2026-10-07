import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { getServerSession } from '@/src/auth/server-session'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import { DiscoveryFooter } from '@/src/components/discovery/DiscoveryFooter'
import { CreatorSeasonTag } from '@/src/components/user/CreatorSeasonTag'
import artworkIndex from '@/src/content/creator-season-artwork.generated'
import { absoluteUrlOrNull } from '@/src/lib/site-url'

import '@/src/styles/creators-gallery.css'

const canonical = absoluteUrlOrNull('/creators/season-tags')
export const metadata: Metadata = {
  title: '크리에이터 시즌 태그 컬렉션',
  description:
    '계절의 심볼과 선정 연도, 월별 마크를 담은 ilog 크리에이터 시즌 태그를 만나보세요.',
  ...(canonical === null ? {} : { alternates: { canonical } }),
}

function seasonName(month: number) {
  if (month >= 3 && month <= 5) return '봄 · 블로섬'
  if (month >= 6 && month <= 8) return '여름 · 선샤인'
  if (month >= 9 && month <= 11) return '가을 · 앰버 리프'
  return '겨울 · 크리스탈'
}

export default async function SeasonTagsPage() {
  const session = await getServerSession()
  const editions = Object.keys(artworkIndex)
    .sort()
    .map((key) => {
      const [year = '', month = ''] = key.split('.')
      return { key, year, month: Number(month) }
    })
  const years = [...new Set(editions.map((item) => item.year))]
  return (
    <div className="creators-page">
      <DiscoveryTopbar user={session?.user ?? null} />
      <main className="creator-tag-gallery">
        <header>
          <Link href="/creators" className="creator-home-link">
            <ArrowLeft aria-hidden="true" /> 이달의 크리에이터
          </Link>
          <h1>시즌 태그 컬렉션</h1>
          <p>계절의 심볼, 선정 연도, 월별 마크를 담은 크리에이터 에디션.</p>
        </header>
        {years.map((year) => (
          <section key={year} aria-labelledby={`tag-year-${year}`}>
            <h2 id={`tag-year-${year}`}>
              {year} <span>12 MONTHLY EDITIONS</span>
            </h2>
            <div className="creator-tag-gallery-grid">
              {editions
                .filter((item) => item.year === year)
                .map((item) => (
                  <article key={item.key}>
                    <CreatorSeasonTag
                      monthLabel={`${year}년 ${String(item.month)}월`}
                    />
                    <h3>{item.month}월</h3>
                    <p>{seasonName(item.month)}</p>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </main>
      <DiscoveryFooter handle={session?.user.handle ?? 'ilog'} />
    </div>
  )
}
