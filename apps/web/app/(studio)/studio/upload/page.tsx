import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Uploader } from '@/src/components/upload/Uploader'

export const metadata: Metadata = {
  title: '영상 업로드 · AIDREAM',
}

export default function UploadPage(): ReactNode {
  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg">영상 업로드</h1>
        <p className="text-fg-muted">
          업로드가 끝나면 재생용 영상 변환이 자동으로 시작됩니다. 변환 중에는 이
          페이지를 닫아도 작업이 계속됩니다.
        </p>
      </header>
      <Uploader />
    </main>
  )
}
