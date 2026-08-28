import type { ReactNode } from 'react'

export function AppRouteLoading({
  label = '다음 장면을 준비하고 있습니다',
}: {
  readonly label?: string
}): ReactNode {
  return (
    <div className="main-route-loading" role="status" aria-live="polite">
      <div className="main-route-loading-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <strong>ILOG</strong>
      <p>{label}</p>
    </div>
  )
}
