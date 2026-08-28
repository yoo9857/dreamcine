import type { ReactNode } from 'react'

export function AppRouteLoading({
  label = '페이지를 준비하고 있습니다',
}: {
  readonly label?: string
}): ReactNode {
  return (
    <div className="main-route-loading" role="status" aria-live="polite">
      <span aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}
