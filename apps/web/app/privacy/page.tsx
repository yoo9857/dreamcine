import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { PRIVACY_VERSION } from '@/src/lib/policies'

export const metadata: Metadata = { title: '개인정보 처리방침' }

export default function PrivacyPage(): ReactNode {
  return (
    <main className="policy-page">
      <header>
        <span>ILOG PRIVACY</span>
        <h1>개인정보 처리방침</h1>
        <p>시행일 및 문서 버전: {PRIVACY_VERSION}</p>
      </header>
      <article>
        <section>
          <h2>1. 수집 항목과 목적</h2>
          <p>
            계정 생성과 인증을 위해 이메일, 사용자명, 비밀번호 해시를
            처리합니다. 연령에 맞는 시청 환경과 서비스 분석을 위해 생년월일,
            성별, 이용 목적, 국가를 처리하며 선택 동의한 경우에만 마케팅
            이메일을 보냅니다.
          </p>
        </section>
        <section>
          <h2>2. 보유와 파기</h2>
          <p>
            계정 이용 중 필요한 정보는 서비스 제공 기간 동안 보관합니다. 탈퇴나
            동의 철회 후에는 법령상 보존 의무가 있는 정보를 분리 보관하고, 그
            밖의 정보는 복구할 수 없는 방식으로 파기합니다. 보안 로그의 IP는
            원문 대신 해시로 저장합니다.
          </p>
        </section>
        <section>
          <h2>3. 제공·처리위탁·국외 이전</h2>
          <p>
            법적 근거가 없으면 개인정보를 제3자에게 판매하거나 제공하지
            않습니다. 메일 전송, 인프라, 저장소 등 서비스 제공업체를 이용하는
            경우 필요한 범위로 제한하고 계약과 보안조치를 적용합니다. 구체적인
            업체·국가·이전 항목은 정식 출시 전에 이 문서에 확정 고지합니다.
          </p>
        </section>
        <section>
          <h2>4. 이용자의 권리</h2>
          <p>
            계정 관리 화면에서 동의 현황을 확인하고 마케팅 동의를 즉시 철회할 수
            있습니다. 개인정보 열람·정정·삭제·처리정지 또는 계정 탈퇴 요청은{' '}
            <a href="mailto:privacy@ilog.kr">privacy@ilog.kr</a>로 접수할 수
            있습니다.
          </p>
        </section>
        <section>
          <h2>5. 보호조치와 문의</h2>
          <p>
            전송구간 암호화, 비밀번호 단방향 해시, 최소 권한, 감사 로그를
            적용합니다. 개인정보 보호 문의는 privacy@ilog.kr로 보내 주세요.
          </p>
        </section>
        <aside>
          이 문서는 서비스 기능 연결을 위한 운영 초안입니다. 정식 출시 전 국내외
          적용 법률, 수탁사, 보유기간 및 개인정보 보호책임자 정보를 법률 검토 후
          확정해야 합니다.
        </aside>
      </article>
      <footer>
        <Link href="/terms">이용약관</Link>
        <Link href="/">홈으로</Link>
      </footer>
    </main>
  )
}
