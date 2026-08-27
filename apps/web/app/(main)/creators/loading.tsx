import type { ReactNode } from 'react'

export default function CreatorsLoading(): ReactNode {
  return (
    <div
      className="creators-page creators-page-loading"
      aria-label="작가 불러오는 중"
    >
      <div className="creator-topbar-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="creator-page-skeleton-hero" aria-hidden="true" />
      <div className="creator-page-skeleton-feature" aria-hidden="true" />
      <div className="creator-page-skeleton-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  )
}
