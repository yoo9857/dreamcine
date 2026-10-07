import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { TierOverview } from '@/src/components/account/TierOverview'
import { tierBenefits } from '@/src/content/member-tier-guide'
import { currentCapacity } from '@/src/http/handler'
import { getMyTier } from '@/src/services/user/get-my-tier'

export const metadata = { title: '나의 크리에이터 등급' }
export const dynamic = 'force-dynamic'

export default async function AccountTierPage(): Promise<ReactNode> {
  const session = await getServerSession()
  if (session === null) redirect('/login?next=%2Faccount%2Ftier')

  const tier = await getMyTier(session.userId)
  return (
    <TierOverview
      tier={tier}
      benefits={tierBenefits(tier.role, currentCapacity())}
    />
  )
}
