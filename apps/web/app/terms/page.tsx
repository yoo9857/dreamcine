import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { TERMS_VERSION } from '@/src/lib/policies'

export const metadata: Metadata = { title: '이용약관' }

export default function TermsPage(): ReactNode {
  return (
    <main className="policy-page">
      <header>
        <span>ILOG LEGAL</span>
        <h1>이용약관</h1>
        <p>시행일 및 문서 버전: {TERMS_VERSION}</p>
      </header>
      <article>
        <section>
          <h2>1. 서비스와 계정</h2>
          <p>
            ilog는 영상 콘텐츠의 게시, 탐색, 재생 및 이용자 간 소통 기능을
            제공합니다. 회원은 정확한 가입 정보를 제공하고 계정 접근 수단을
            안전하게 관리해야 합니다.
          </p>
        </section>
        <section>
          <h2>2. 콘텐츠와 권리</h2>
          <p>
            회원은 게시한 콘텐츠에 필요한 권리를 보유해야 하며, 타인의 저작권,
            초상권, 개인정보 또는 관련 법령을 침해해서는 안 됩니다. 회원은
            서비스 제공과 노출에 필요한 범위에서 ilog가 콘텐츠를
            저장·변환·전송할 수 있도록 허락합니다.
          </p>
        </section>
        <section>
          <h2>3. 이용 제한</h2>
          <p>
            불법 콘텐츠, 권리 침해, 괴롭힘, 서비스 보안 침해, 자동화된 남용은
            금지됩니다. 위반 또는 법적 요청이 확인되면 콘텐츠 숨김, 계정 제한,
            삭제 등 필요한 조치를 할 수 있으며 이의 제기 경로를 제공합니다.
          </p>
        </section>
        <section>
          <h2>4. 변경·해지·문의</h2>
          <p>
            중요한 약관 변경은 시행 전에 알립니다. 회원은 언제든 계정 관리에서
            동의 현황을 확인하고 탈퇴를 요청할 수 있습니다. 문의는{' '}
            <a href="mailto:support@ilog.kr">support@ilog.kr</a>로 보내 주세요.
          </p>
        </section>
        <aside>
          이 문서는 서비스 기능 연결을 위한 운영 초안입니다. 정식 출시 전 관할
          법률에 따른 법률 검토와 사업자 정보 확정이 필요합니다.
        </aside>
      </article>
      <footer>
        <Link href="/privacy">개인정보 처리방침</Link>
        <Link href="/">홈으로</Link>
      </footer>
    </main>
  )
}
