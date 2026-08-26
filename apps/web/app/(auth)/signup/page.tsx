import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { SignupForm } from '@/src/components/auth/SignupForm'
import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'
import { CinematicHeroMotion } from '@/src/components/motion/CinematicHeroMotion'

/**
 * CSP nonce 는 요청마다 달라지므로 HTML 을 빌드 시점에 미리 만들 수 없다.
 * 정적 프리렌더된 페이지의 인라인 스크립트에는 nonce 가 붙지 않고, 우리 CSP 는
 * `unsafe-inline` 을 허용하지 않으므로 브라우저가 그것을 차단한다. 그러면
 * 하이드레이션이 일어나지 않아 폼이 동작하지 않는다. (07_AUTH_SECURITY.md §6)
 */
export const dynamic = 'force-dynamic'

export default async function SignupPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    email?: string
    lang?: string
    market?: string
    plan?: string
  }>
}): Promise<ReactNode> {
  const {
    email,
    lang,
    market: marketParam,
    plan: planParam,
  } = await searchParams
  const english = lang === 'en'
  const locale = english ? 'en' : 'ko'
  const market = marketParam === 'us' ? 'us' : 'kr'
  const plan = planParam === 'ads-standard' ? 'ads-standard' : undefined

  return (
    <main className="ilog-login-page ilog-signup-page">
      <header className="ilog-login-header">
        <Link
          href="/"
          className="ilog-login-brand"
          aria-label={english ? 'ilog home' : 'ilog 홈'}
        >
          <LeftBrandLogo priority />
        </Link>
        <Link href="/" className="ilog-login-home-link">
          {english ? 'Back home' : '홈으로'} <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <div className="ilog-login-layout ilog-signup-layout">
        <section
          className="ilog-login-form-panel"
          aria-label={english ? 'Create account form' : '회원가입 양식'}
        >
          <div className="ilog-login-form-shell ilog-signup-form-shell">
            <SignupForm
              initialEmail={email ?? ''}
              locale={locale}
              market={market}
              {...(plan === undefined ? {} : { plan })}
            />
          </div>
        </section>

        <aside
          className="ilog-login-visual ilog-signup-visual"
          data-cinematic-hero
          aria-label={english ? 'ilog creative preview' : 'ilog 창작 미리보기'}
        >
          <CinematicHeroMotion
            chapter="01 / BEGIN"
            label="YOUR STORY STARTS HERE"
          />
          <div className="ilog-signup-visual-copy">
            <span>WATCH · CREATE · CONNECT</span>
            <h2>
              {english ? 'From the first scene,' : '첫 장면부터,'}
              <br />
              {english ? 'make it your story.' : '당신의 이야기로.'}
            </h2>
            <p>
              {english
                ? 'Turn what inspires you into something original.'
                : '발견한 취향을 작품으로 이어보세요.'}
            </p>
          </div>
          <div className="ilog-signup-poster-stack" aria-hidden="true">
            <Image
              src="/brand/posters/city.png"
              alt=""
              width={320}
              height={445}
              priority
            />
            <Image
              src="/brand/posters/memory.png"
              alt=""
              width={320}
              height={445}
              priority
            />
            <Image
              src="/brand/posters/moon-letter.png"
              alt=""
              width={320}
              height={445}
              priority
            />
          </div>
          <div className="ilog-signup-visual-shade" />
        </aside>
      </div>
    </main>
  )
}
