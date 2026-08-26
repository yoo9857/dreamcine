import { BadgeCheck, CalendarDays, Mail, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { AccountSettingsForm } from '@/src/components/account/AccountSettingsForm'
import { getMe } from '@/src/services/auth/get-me'

export const metadata = { title: '계정 관리' }

export default async function AccountPage(): Promise<ReactNode> {
  const session = await getServerSession()
  if (session === null) redirect('/login?next=%2Faccount')

  const profile = await getMe(session.userId)
  const joinedAt = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(profile.createdAt))

  return (
    <main className="account-page">
      <header className="account-hero">
        <div>
          <span>MY ILOG</span>
          <h1>내 계정, 한눈에.</h1>
          <p>프로필과 계정 정보를 안전하고 간결하게 관리하세요.</p>
        </div>
        <Link href="/browse">
          BROWSE로 돌아가기 <span aria-hidden="true">→</span>
        </Link>
      </header>

      <nav className="account-jump-nav" aria-label="계정 관리 메뉴">
        <a href="#profile">프로필 관리</a>
        <a href="#account">계정 정보</a>
        <a href="mailto:support@ilog.kr?subject=ilog%20고객센터%20문의">
          고객센터
        </a>
      </nav>

      <section
        className="account-panel"
        id="profile"
        aria-labelledby="profile-title"
      >
        <div className="account-section-heading">
          <span>01 / PROFILE</span>
          <h2 id="profile-title">프로필 관리</h2>
          <p>@{profile.handle}의 공개 프로필에 표시될 정보를 편집합니다.</p>
        </div>
        <AccountSettingsForm
          initialDisplayName={profile.displayName}
          initialBio={profile.bio}
        />
      </section>

      <section
        className="account-panel"
        id="account"
        aria-labelledby="account-title"
      >
        <div className="account-section-heading">
          <span>02 / ACCOUNT</span>
          <h2 id="account-title">계정 정보</h2>
          <p>보안과 로그인에 사용되는 핵심 정보입니다.</p>
        </div>
        <dl className="account-facts">
          <div>
            <dt>
              <Mail aria-hidden="true" /> 이메일
            </dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt>
              <BadgeCheck aria-hidden="true" /> 인증 상태
            </dt>
            <dd>
              {profile.emailVerified === null ? '인증 대기' : '인증 완료'}
            </dd>
          </div>
          <div>
            <dt>
              <ShieldCheck aria-hidden="true" /> 계정 상태
            </dt>
            <dd>{profile.status === 'ACTIVE' ? '정상' : profile.status}</dd>
          </div>
          <div>
            <dt>
              <CalendarDays aria-hidden="true" /> 가입일
            </dt>
            <dd>{joinedAt}</dd>
          </div>
        </dl>
        <div className="account-support-card">
          <div>
            <span>NEED A HAND?</span>
            <h3>도움이 필요한가요?</h3>
            <p>계정, 로그인, 작품 공개에 관한 문의를 도와드립니다.</p>
          </div>
          <a href="mailto:support@ilog.kr?subject=ilog%20고객센터%20문의">
            고객센터 문의 →
          </a>
        </div>
      </section>
    </main>
  )
}
