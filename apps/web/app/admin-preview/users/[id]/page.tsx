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

const metrics = [
  { label: '팔로워', value: '1.8만', icon: Users },
  { label: '게시 작품', value: '24', icon: FileVideo2 },
  { label: '누적 조회', value: '81.2만', icon: Eye },
  { label: '댓글 활동', value: '342', icon: MessageSquare },
] as const

export default function AdminUserDetailPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="admin-dashboard admin-user-detail-page">
      <nav className="admin-breadcrumb" aria-label="현재 위치">
        <Link href="/admin-preview/users">
          <ArrowLeft /> 회원 관리
        </Link>
        <span>/</span>
        <span>@minseo.film</span>
      </nav>

      <section className="admin-user-profile-header">
        <div className="admin-user-profile-main">
          <span className="admin-user-profile-avatar">김</span>
          <div>
            <div className="admin-user-title-line">
              <h1>김민서</h1>
              <span className="admin-user-state is-active">
                <i className="admin-status-dot is-active" /> 정상 계정
              </span>
            </div>
            <p>@minseo.film · minseo@example.com</p>
            <div className="admin-user-badges">
              <span className="admin-role-badge">CREATOR</span>
              <span>GOLD</span>
              <span className="is-verified">
                <BadgeCheck /> 이메일 인증
              </span>
              <span className="is-verified">
                <ShieldCheck /> 채널 인증
              </span>
            </div>
          </div>
        </div>
        <div className="admin-user-header-actions">
          <a
            className="admin-button admin-button-secondary"
            href="mailto:minseo@example.com"
          >
            <Mail /> 이메일
          </a>
          <span className="admin-button admin-button-primary">
            <UserRound /> 프로필 보기
          </span>
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
                <strong>{metric.value}</strong>
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
                <dd>usr_01JX8M3K7P</dd>
              </div>
              <div>
                <dt>서비스 역할</dt>
                <dd>CREATOR</dd>
              </div>
              <div>
                <dt>회원 등급</dt>
                <dd>GOLD · 8,420점</dd>
              </div>
              <div>
                <dt>국가 / 언어</dt>
                <dd>대한민국 · ko-KR</dd>
              </div>
              <div>
                <dt>시간대</dt>
                <dd>Asia/Seoul</dd>
              </div>
              <div>
                <dt>가입 목적</dt>
                <dd>영화 제작 및 작품 공개</dd>
              </div>
              <div>
                <dt>프로필 공개</dt>
                <dd>PUBLIC</dd>
              </div>
              <div>
                <dt>가입일</dt>
                <dd>2025. 11. 18. 오후 2:32</dd>
              </div>
            </dl>
            <div className="admin-detail-note">
              <strong>소개</strong>
              <p>
                도시와 사람 사이의 작은 이야기를 기록하는 독립영화 제작자입니다.
              </p>
            </div>
          </section>

          <section className="admin-panel admin-detail-section">
            <header>
              <div>
                <span>CONTENT</span>
                <h2>최근 시리즈</h2>
              </div>
              <FileVideo2 />
            </header>
            <ul className="admin-detail-series-list">
              <li>
                <span>
                  <FileVideo2 />
                </span>
                <div>
                  <strong>밤의 기록</strong>
                  <small>12개 에피소드 · 조회 48.2만</small>
                </div>
                <time>2026. 8. 20.</time>
              </li>
              <li>
                <span>
                  <FileVideo2 />
                </span>
                <div>
                  <strong>서울의 가장자리</strong>
                  <small>8개 에피소드 · 조회 29.7만</small>
                </div>
                <time>2026. 6. 11.</time>
              </li>
            </ul>
          </section>

          <section className="admin-panel admin-detail-section">
            <header>
              <div>
                <span>SECURITY</span>
                <h2>최근 계정 이벤트</h2>
              </div>
              <History />
            </header>
            <ul className="admin-event-list">
              <li>
                <span className="is-success">
                  <Activity />
                </span>
                <div>
                  <strong>LOGIN</strong>
                  <small>로그인 성공</small>
                </div>
                <time>오늘 오전 9:42</time>
              </li>
              <li>
                <span className="is-success">
                  <Activity />
                </span>
                <div>
                  <strong>PASSWORD_CHANGE</strong>
                  <small>비밀번호 변경 완료</small>
                </div>
                <time>2026. 8. 2.</time>
              </li>
            </ul>
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
            <div className="admin-control-actions">
              <button
                className="admin-button admin-button-secondary"
                type="button"
              >
                계정 일시 정지
              </button>
              <button
                className="admin-button admin-button-secondary"
                type="button"
              >
                역할 변경
              </button>
            </div>
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
                <dd>오늘 오전 9:42</dd>
              </div>
              <div>
                <dt>최근 활동</dt>
                <dd>12분 전</dd>
              </div>
              <div>
                <dt>로그인 횟수</dt>
                <dd>184회</dd>
              </div>
              <div>
                <dt>활성 세션</dt>
                <dd>2개</dd>
              </div>
              <div>
                <dt>이메일 인증</dt>
                <dd>2025. 11. 18.</dd>
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
            <ul className="admin-consent-list">
              <li>
                <div>
                  <strong>TERMS</strong>
                  <small>v2.1</small>
                </div>
                <span className="is-granted">동의</span>
              </li>
              <li>
                <div>
                  <strong>PRIVACY</strong>
                  <small>v3.0</small>
                </div>
                <span className="is-granted">동의</span>
              </li>
              <li>
                <div>
                  <strong>MARKETING</strong>
                  <small>v1.2</small>
                </div>
                <span className="is-revoked">철회</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
