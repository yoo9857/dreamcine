import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LoginForm } from '@/src/components/auth/LoginForm'
import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'
import { CinematicHeroMotion } from '@/src/components/motion/CinematicHeroMotion'

/**
 * CSP nonce 는 요청마다 달라지므로 HTML 을 빌드 시점에 미리 만들 수 없다.
 * 정적 프리렌더된 페이지의 인라인 스크립트에는 nonce 가 붙지 않고, 우리 CSP 는
 * `unsafe-inline` 을 허용하지 않으므로 브라우저가 그것을 차단한다. 그러면
 * 하이드레이션이 일어나지 않아 폼이 동작하지 않는다. (07_AUTH_SECURITY.md §6)
 */
export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ lang?: string; next?: string }>
}): Promise<ReactNode> {
  const { lang, next } = await searchParams
  const english = lang === 'en'
  const locale = english ? 'en' : 'ko'

  return (
    <main className="ilog-login-page">
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

      <div className="ilog-login-layout">
        <section
          className="ilog-login-form-panel"
          aria-label={english ? 'Sign in form' : '로그인 양식'}
        >
          <div className="ilog-login-form-shell">
            <LoginForm
              locale={locale}
              {...(next === undefined ? {} : { nextPath: next })}
            />
          </div>
        </section>

        <aside
          className="ilog-login-visual"
          data-cinematic-hero
          aria-label={english ? 'Welcome back to ilog' : 'ilog 반가운 인사'}
        >
          <CinematicHeroMotion
            chapter="01 / RETURN"
            label="THE JOURNEY CONTINUES"
          />
          <Image
            src="/brand/login-welcome.png"
            alt="Welcome Back! The journey continues."
            fill
            priority
            sizes="(max-width: 980px) 0px, 54vw"
            className="ilog-login-artwork"
          />
        </aside>
      </div>
    </main>
  )
}
