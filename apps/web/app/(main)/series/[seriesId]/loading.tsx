import type { ReactNode } from 'react'

import { AppRouteLoading } from '@/src/components/layout/AppRouteLoading'

export default function Loading(): ReactNode {
  return <AppRouteLoading label="시리즈를 불러오고 있습니다" />
}
