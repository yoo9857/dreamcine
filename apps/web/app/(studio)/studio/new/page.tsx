import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { WorkCreateFlow } from '@/src/components/studio/WorkCreateFlow'
import { listStudioSeries } from '@/src/services/series/get-studio-series'
import { getAvailableStudioAssets } from '@/src/services/studio/get-studio-dashboard'

export const metadata: Metadata = { title: '시리즈 등록 · ILOG' }

export default async function StudioCreatePage(): Promise<ReactNode> {
  const session = await requireCapability('series.create', '/studio/new')
  const [works, availableAssets] = await Promise.all([
    listStudioSeries(session),
    getAvailableStudioAssets(session),
  ])

  return (
    <main className="studio-task-page">
      <header className="studio-page-header">
        <div>
          <h1>시리즈 등록</h1>
        </div>
      </header>
      <WorkCreateFlow works={works} availableAssets={availableAssets} />
    </main>
  )
}
