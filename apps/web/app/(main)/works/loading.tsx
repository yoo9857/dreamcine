import type { ReactNode } from 'react'

import { AppRouteLoading } from '@/src/components/layout/AppRouteLoading'

export default function WorksLoading(): ReactNode {
  return <AppRouteLoading label="작품을 불러오고 있습니다" />
}
