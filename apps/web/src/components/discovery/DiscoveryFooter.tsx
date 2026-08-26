import Link from 'next/link'
import React, { type ReactNode } from 'react'

import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'

export function DiscoveryFooter({
  handle,
}: {
  readonly handle: string
}): ReactNode {
  return (
    <footer className="discovery-footer" aria-label="ilog 푸터">
      <div className="discovery-footer-orbit" aria-hidden="true" />
      <div className="discovery-footer-main">
        <section className="discovery-footer-brand" aria-label="ilog 소개">
          <Link href="/browse" aria-label="ilog 홈">
            <LeftBrandLogo />
          </Link>
          <p>WATCH · CREATE · CONNECT</p>
          <h2>
            다음 장면을 발견하고,
            <br />
            당신의 이야기를 시작하세요.
          </h2>
          <div>
            <span>
              <i /> CURATED DAILY
            </span>
            <small>새로운 이야기가 매일 업데이트됩니다.</small>
          </div>
        </section>

        <nav className="discovery-footer-links" aria-label="푸터 메뉴">
          <section>
            <h3>DISCOVER</h3>
            <Link href="/browse">홈</Link>
            <Link href="/search">전체 탐색</Link>
            <Link href="/search?q=로맨스">로맨스</Link>
            <Link href="/search?q=드라마">드라마</Link>
            <Link href="/search?q=영화">영화</Link>
          </section>
          <section>
            <h3>CREATE</h3>
            <Link href="/studio">크리에이터 스튜디오</Link>
            <Link href="/studio/upload">작품 업로드</Link>
            <Link href="/studio/series/new">새 시리즈 만들기</Link>
            <Link href="/creator-apply">크리에이터 모집</Link>
            <Link href="/about">About ilog</Link>
          </section>
          <section>
            <h3>MY ILOG</h3>
            <Link href={`/u/${encodeURIComponent(handle)}`}>내 프로필</Link>
            <Link href="/following">팔로잉</Link>
            <Link href="/notifications">알림</Link>
            <Link href="/account#profile">프로필 관리</Link>
            <Link href="/account#account">계정 설정</Link>
          </section>
          <section>
            <h3>SUPPORT</h3>
            <a href="mailto:support@ilog.kr">고객센터</a>
            <a href="mailto:privacy@ilog.kr">개인정보 문의</a>
            <Link href="/ads-plan">광고형 멤버십</Link>
          </section>
        </nav>
      </div>

      <div className="discovery-footer-bottom">
        <p>© 2026 ILOG. ALL RIGHTS RESERVED.</p>
        <p>AI-NATIVE VIDEO COMMUNITY FOR WATCHERS AND CREATORS.</p>
        <a href="#discovery-top">
          맨 위로 <span aria-hidden="true">↑</span>
        </a>
      </div>
    </footer>
  )
}
