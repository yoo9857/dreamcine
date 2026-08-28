import type { ReactNode } from 'react'

import { AppRouteLoading } from '@/src/components/layout/AppRouteLoading'

export default function Loading(): ReactNode {
  return <AppRouteLoading label="에피소드 정보를 불러오고 있습니다" />
}
