import { AppError } from '@aidream/core'
import { Avatar } from '@aidream/ui'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { FollowButton } from '@/src/components/social/FollowButton'
import { getProfile } from '@/src/services/user/get-profile'

export default async function ProfilePage({
  params,
}: {
  readonly params: Promise<{ handle: string }>
}): Promise<ReactNode> {
  const [{ handle }, session] = await Promise.all([params, getServerSession()])
  try {
    const profile = await getProfile(handle, session)
    const isSelf = session?.user.handle === profile.handle
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 py-6">
        <header className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-bg-elevated p-6">
          <Avatar
            name={profile.displayName}
            src={profile.avatarUrl}
            size="lg"
            className="size-20 text-2xl"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-fg">
              {profile.displayName}
            </h1>
            <p className="text-sm text-fg-muted">@{profile.handle}</p>
            <p className="mt-2 whitespace-pre-wrap text-fg-secondary">
              {profile.bio ?? '아직 소개가 없습니다.'}
            </p>
            <p className="mt-3 text-sm text-fg-muted">
              팔로워 {profile.followerCount} · 시리즈 {profile.seriesCount}
            </p>
          </div>
          {isSelf ? null : (
            <FollowButton
              handle={profile.handle}
              initialFollowing={profile.isFollowing}
              initialCount={profile.followerCount}
              disabled={session === null || profile.isBlocked}
            />
          )}
        </header>
      </main>
    )
  } catch (error: unknown) {
    if (error instanceof AppError && error.code === 'E_USER_NOT_FOUND')
      notFound()
    throw error
  }
}
