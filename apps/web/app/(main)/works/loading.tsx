import type { ReactNode } from 'react'

export default function WorksLoading(): ReactNode {
  return (
    <div className="works-page" aria-busy="true" aria-label="작품 불러오는 중">
      <div className="works-topbar-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="works-page-loading" aria-hidden="true">
        <div className="works-page-skeleton-banner" />
        <div className="works-page-skeleton-grid">
          {Array.from({ length: 8 }, (_, index) => (
            <span className="works-page-skeleton-card" key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
