import { BadgeCheck, CalendarDays, Mail, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { AccountSettingsForm } from '@/src/components/account/AccountSettingsForm'
import { AccountDeletionPanel } from '@/src/components/account/AccountDeletionPanel'
import { ConsentPreferences } from '@/src/components/account/ConsentPreferences'
import {
  CONSENT_DOCUMENTS,
  getConsentPreferences,
} from '@/src/services/auth/consent-preferences'
import { getMe } from '@/src/services/auth/get-me'

export const metadata = { title: '계정 관리' }

export default async function AccountPage(): Promise<ReactNode> {
  const session = await getServerSession()
  if (session === null) redirect('/login?next=%2Faccount')

  const [profile, consents] = await Promise.all([
    getMe(session.userId),
    getConsentPreferences(session.userId),
  ])
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
          <h1>내 계정</h1>
          <p>공개 프로필과 계정 설정을 한곳에서 관리하세요.</p>
        </div>
        <Link href={`/u/${encodeURIComponent(profile.handle)}`}>
          공개 프로필 보기 <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <nav className="account-jump-nav" aria-label="계정 관리 메뉴">
        <span>SETTINGS</span>
        <a href="#profile">프로필</a>
        <a href="#account">계정 정보</a>
        <a href="#consents">동의 관리</a>
        <a href="#delete-account">회원탈퇴</a>
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
          <h2 id="profile-title">프로필</h2>
          <p>작품과 크리에이터 페이지에 공개되는 정보입니다.</p>
        </div>
        <AccountSettingsForm
          handle={profile.handle}
          avatarUrl={profile.avatarUrl}
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
          <p>로그인과 보안에 사용되는 기본 정보입니다.</p>
        </div>
        <div>
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
              <h3>도움이 필요하신가요?</h3>
              <p>계정, 로그인, 작품 공개 관련 문의를 도와드립니다.</p>
            </div>
            <a href="mailto:support@ilog.kr?subject=ilog%20고객센터%20문의">
              고객센터 문의 ↗
            </a>
          </div>
        </div>
      </section>

      <section
        className="account-panel"
        id="consents"
        aria-labelledby="consents-title"
      >
        <div className="account-section-heading">
          <span>03 / CONSENT</span>
          <h2 id="consents-title">동의 관리</h2>
          <p>필수 문서와 마케팅 이메일 수신 여부를 관리합니다.</p>
        </div>
        <ConsentPreferences
          initialMarketing={consents.marketing}
          termsVersion={CONSENT_DOCUMENTS.terms}
          privacyVersion={CONSENT_DOCUMENTS.privacy}
        />
      </section>

      <section
        className="account-panel account-danger-panel"
        id="delete-account"
        aria-labelledby="delete-account-heading"
      >
        <div className="account-section-heading">
          <span>04 / DELETE</span>
          <h2 id="delete-account-heading">회원탈퇴</h2>
          <p>탈퇴 전 삭제 범위와 본인 확인 절차를 꼭 확인해 주세요.</p>
        </div>
        <AccountDeletionPanel
          handle={profile.handle}
          hasPassword={profile.hasPassword}
        />
      </section>
    </main>
  )
}
