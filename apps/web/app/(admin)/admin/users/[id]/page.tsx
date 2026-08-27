import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Eye,
  FileVideo2,
  Globe2,
  History,
  KeyRound,
  Mail,
  MessageSquare,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireCapability } from '@/src/auth/server-session'
import { UserRoleAction } from '@/src/components/admin/AdminMutationActions'
import { UserStatusActions } from '@/src/components/moderation/UserStatusActions'
import { getAdminUserDetail } from '@/src/services/moderation/admin-operations'

function formatDate(date: Date | null, time = false): string {
  if (date === null) return '기록 없음'
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    ...(time ? { timeStyle: 'short' as const } : {}),
  }).format(date)
}

function compact(value: number | string): string {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value))
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireCapability('user.suspend', `/admin/users/${id}`)
  const detail = await getAdminUserDetail(session, id)
  if (detail === null) notFound()
  const { user } = detail
  const isSelf = user.id === session.userId

  const metrics = [
    { label: '팔로워', value: user.followerCount, icon: Users },
    { label: '게시 작품', value: user.episodeCount, icon: FileVideo2 },
    { label: '누적 조회', value: user.totalViews, icon: Eye },
    { label: '댓글 활동', value: detail.counts.comments, icon: MessageSquare },
  ]

  return (
    <div className="admin-dashboard admin-user-detail-page">
      <nav className="admin-breadcrumb" aria-label="현재 위치">
        <Link href="/admin/users">
          <ArrowLeft /> 회원 관리
        </Link>
        <span>/</span>
        <span>@{user.handle}</span>
      </nav>

      <section className="admin-user-profile-header">
        <div className="admin-user-profile-main">
          <span className="admin-user-profile-avatar">
            {user.displayName.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <div className="admin-user-title-line">
              <h1>{user.displayName}</h1>
              <span
                className={`admin-user-state is-${user.status.toLowerCase()}`}
              >
                <i
                  className={`admin-status-dot is-${user.status.toLowerCase()}`}
                />
                {user.status === 'ACTIVE' ? '정상 계정' : '정지 계정'}
              </span>
            </div>
            <p>
              @{user.handle} · {user.email}
            </p>
            <div className="admin-user-badges">
              <span className="admin-role-badge">{user.role}</span>
              <span>{user.tier}</span>
              <span
                className={
                  user.emailVerified === null ? 'is-muted' : 'is-verified'
                }
              >
                <BadgeCheck />
                {user.emailVerified === null ? '이메일 미인증' : '이메일 인증'}
              </span>
              {user.verifiedAt === null ? null : (
                <span className="is-verified">
                  <ShieldCheck /> 채널 인증
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="admin-user-header-actions">
          <a
            className="admin-button admin-button-secondary"
            href={`mailto:${user.email}`}
          >
            <Mail /> 이메일
          </a>
          <Link
            className="admin-button admin-button-primary"
            href={`/u/${user.handle}`}
          >
            <UserRound /> 프로필 보기
          </Link>
        </div>
      </section>

      <section className="admin-user-metric-grid" aria-label="회원 활동 지표">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <article key={metric.label}>
              <span>
                <Icon />
              </span>
              <div>
                <small>{metric.label}</small>
                <strong>{compact(metric.value)}</strong>
              </div>
            </article>
          )
        })}
      </section>

      <div className="admin-user-detail-grid">
        <div className="admin-user-detail-main">
          <section className="admin-panel admin-detail-section">
            <header>
              <div>
                <span>PROFILE</span>
                <h2>계정 정보</h2>
              </div>
              <Globe2 />
            </header>
            <dl className="admin-detail-list">
              <div>
                <dt>회원 ID</dt>
                <dd>{user.id}</dd>
              </div>
              <div>
                <dt>서비스 역할</dt>
                <dd>{user.role}</dd>
              </div>
              <div>
                <dt>회원 등급</dt>
                <dd>
                  {user.tier} · {user.tierPoints.toLocaleString('ko-KR')}점
                </dd>
              </div>
              <div>
                <dt>국가 / 언어</dt>
                <dd>
                  {user.country ?? '미설정'} · {user.locale}
                </dd>
              </div>
              <div>
                <dt>시간대</dt>
                <dd>{user.timezone}</dd>
              </div>
              <div>
                <dt>가입 목적</dt>
                <dd>{user.signupPurpose ?? '미설정'}</dd>
              </div>
              <div>
                <dt>프로필 공개</dt>
                <dd>{user.profileVisibility}</dd>
              </div>
              <div>
                <dt>가입일</dt>
                <dd>{formatDate(user.createdAt, true)}</dd>
              </div>
            </dl>
            {user.bio === null && user.channelDescription === null ? null : (
              <div className="admin-detail-note">
                <strong>소개</strong>
                <p>{user.channelDescription ?? user.bio}</p>
              </div>
            )}
          </section>

          <section className="admin-panel admin-detail-section">
            <header>
              <div>
                <span>CONTENT</span>
                <h2>최근 시리즈</h2>
              </div>
              <FileVideo2 />
            </header>
            {detail.series.length === 0 ? (
              <div className="admin-detail-empty">
                등록된 시리즈가 없습니다.
              </div>
            ) : (
              <ul className="admin-detail-series-list">
                {detail.series.map((series) => (
                  <li key={series.id}>
                    <span>
                      <FileVideo2 />
                    </span>
                    <div>
                      <strong>{series.title}</strong>
                      <small>
                        {series.episodeCount}개 에피소드 · 조회{' '}
                        {compact(series.totalViews)}
                      </small>
                    </div>
                    <time>{formatDate(series.createdAt)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-panel admin-detail-section">
            <header>
              <div>
                <span>SECURITY</span>
                <h2>최근 계정 이벤트</h2>
              </div>
              <History />
            </header>
            {detail.authEvents.length === 0 ? (
              <div className="admin-detail-empty">
                기록된 계정 이벤트가 없습니다.
              </div>
            ) : (
              <ul className="admin-event-list">
                {detail.authEvents.map((event) => (
                  <li key={event.id}>
                    <span
                      className={event.success ? 'is-success' : 'is-failed'}
                    >
                      <Activity />
                    </span>
                    <div>
                      <strong>{event.kind}</strong>
                      <small>{event.detail ?? '추가 정보 없음'}</small>
                    </div>
                    <time>{formatDate(event.createdAt, true)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="admin-user-detail-aside">
          <section className="admin-panel admin-control-card">
            <header>
              <span>
                <ShieldCheck />
              </span>
              <div>
                <h2>계정 관리</h2>
                <p>변경 사항은 감사 기록에 남습니다.</p>
              </div>
            </header>
            {isSelf ? (
              <div className="admin-self-notice">
                현재 로그인한 관리자 계정은 여기서 변경할 수 없습니다.
              </div>
            ) : (
              <div className="admin-control-actions">
                <UserStatusActions userId={user.id} />
                <UserRoleAction userId={user.id} current={user.role} />
              </div>
            )}
          </section>

          <section className="admin-panel admin-detail-section admin-access-card">
            <header>
              <div>
                <span>ACCESS</span>
                <h2>접속 정보</h2>
              </div>
              <KeyRound />
            </header>
            <dl className="admin-detail-list is-single">
              <div>
                <dt>최근 로그인</dt>
                <dd>{formatDate(user.lastLoginAt, true)}</dd>
              </div>
              <div>
                <dt>최근 활동</dt>
                <dd>{formatDate(user.lastSeenAt, true)}</dd>
              </div>
              <div>
                <dt>로그인 횟수</dt>
                <dd>{user.loginCount.toLocaleString('ko-KR')}회</dd>
              </div>
              <div>
                <dt>활성 세션</dt>
                <dd>{detail.counts.sessions.toLocaleString('ko-KR')}개</dd>
              </div>
              <div>
                <dt>이메일 인증</dt>
                <dd>{formatDate(user.emailVerified, true)}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-panel admin-detail-section admin-consent-card">
            <header>
              <div>
                <span>CONSENT</span>
                <h2>최근 동의 이력</h2>
              </div>
              <CalendarDays />
            </header>
            {detail.consents.length === 0 ? (
              <div className="admin-detail-empty">동의 기록이 없습니다.</div>
            ) : (
              <ul className="admin-consent-list">
                {detail.consents.map((consent) => (
                  <li key={consent.id}>
                    <div>
                      <strong>{consent.kind}</strong>
                      <small>{consent.version}</small>
                    </div>
                    <span
                      className={
                        consent.granted && consent.revokedAt === null
                          ? 'is-granted'
                          : 'is-revoked'
                      }
                    >
                      {consent.granted && consent.revokedAt === null
                        ? '동의'
                        : '철회'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {detail.roleGrants.length === 0 ? null : (
            <section className="admin-panel admin-detail-section admin-grant-card">
              <header>
                <div>
                  <span>AUDIT</span>
                  <h2>역할 변경</h2>
                </div>
                <History />
              </header>
              <ul className="admin-consent-list">
                {detail.roleGrants.map((grant) => (
                  <li key={grant.id}>
                    <div>
                      <strong>
                        {grant.fromRole} → {grant.toRole}
                      </strong>
                      <small>
                        @{grant.granter?.handle ?? 'system'} ·{' '}
                        {grant.reason ?? '사유 미기록'}
                      </small>
                    </div>
                    <time>{formatDate(grant.createdAt)}</time>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
