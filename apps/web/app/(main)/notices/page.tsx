import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { DiscoveryFooter } from '@/src/components/discovery/DiscoveryFooter'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import { NOTICES } from '@/src/content/notices'
import '@/src/styles/notices.css'

export const metadata: Metadata = {
  title: '공지사항',
  description: 'ilog의 공지, 업데이트, 점검 소식을 확인하세요.',
}

const DATE = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
})

export default async function NoticesPage(): Promise<ReactNode> {
  const session = await getServerSession()
  // 고정 공지를 먼저, 그 안에서는 최신순.
  const notices = [...NOTICES].sort(
    (left, right) =>
      Number(right.pinned === true) - Number(left.pinned === true) ||
      right.date.localeCompare(left.date),
  )

  return (
    <div className="notices-page" id="discovery-top">
      <DiscoveryTopbar user={session?.user ?? null} />
      <main className="notices">
        <header className="notices-head">
          <span>NOTICE</span>
          <h1>공지사항</h1>
          <p>서비스 공지, 업데이트, 점검 일정을 알려드립니다.</p>
        </header>

        {notices.length === 0 ? (
          <div className="notices-empty">
            <strong>아직 등록된 공지사항이 없습니다</strong>
            <p>새 소식이 생기면 이곳에서 가장 먼저 알려드릴게요.</p>
          </div>
        ) : (
          <ol className="notices-list">
            {notices.map((notice) => (
              <li key={notice.id} id={notice.id}>
                <details>
                  <summary>
                    <span className="notices-tag">
                      {notice.pinned === true ? '고정 · ' : ''}
                      {notice.category}
                    </span>
                    <strong>{notice.title}</strong>
                    <time dateTime={notice.date}>
                      {DATE.format(new Date(`${notice.date}T00:00:00+09:00`))}
                    </time>
                  </summary>
                  <div className="notices-body">
                    {notice.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </details>
              </li>
            ))}
          </ol>
        )}
      </main>
      <DiscoveryFooter handle={session?.user.handle ?? 'ilog'} />
    </div>
  )
}
