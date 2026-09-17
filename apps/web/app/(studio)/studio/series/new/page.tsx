import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * 시리즈 생성은 `/studio/new` 의 1단계로 흡수됐다. 예전 경로는 북마크와 외부
 * 문서에 남아 있으므로 살려두되, 통합된 흐름으로 보낸다.
 */
export default function NewSeriesRedirectPage(): ReactNode {
  redirect('/studio/new')
}
