import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { CreateSeriesForm } from '@/src/components/studio/CreateSeriesForm'

export const metadata: Metadata = { title: '새 시리즈 · AIDREAM' }

export default function NewSeriesPage(): ReactNode {
  return (
    <main className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-fg">새 시리즈</h1>
        <p className="mt-1 text-fg-muted">작품의 기본 정보를 입력해 주세요.</p>
      </header>
      <CreateSeriesForm />
    </main>
  )
}
