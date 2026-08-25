import { Button, EmptyState } from '@aidream/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { SeriesCard } from '@/src/components/SeriesCard'
import { requireCapability } from '@/src/auth/server-session'
import { listStudioSeries } from '@/src/services/series/get-studio-series'

export default async function StudioPage(): Promise<ReactNode> {
  const session = await requireCapability('series.create', '/studio')
  const series = await listStudioSeries(session)
  return (
    <main className="flex flex-col gap-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">스튜디오</h1>
          <p className="mt-1 text-fg-muted">
            시리즈와 에피소드 공개 상태를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/studio/upload">영상 업로드</Link>
          </Button>
          <Button asChild>
            <Link href="/studio/series/new">새 시리즈</Link>
          </Button>
        </div>
      </header>
      {series.length === 0 ? (
        <EmptyState
          title="첫 시리즈를 만들어 보세요"
          description="시리즈를 만든 다음 준비된 영상으로 첫 에피소드를 추가할 수 있습니다."
          action={
            <Button asChild>
              <Link href="/studio/series/new">시리즈 만들기</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((item) => (
            <div key={item.id} className="flex flex-col gap-2">
              <SeriesCard series={item} />
              <Button asChild variant="secondary">
                <Link href={`/studio/series/${item.id}`}>관리</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
