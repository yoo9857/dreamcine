import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'
import { CinematicHeroMotion } from '@/src/components/motion/CinematicHeroMotion'

export function AuthRecoveryShell({
  children,
  english,
}: {
  readonly children: ReactNode
  readonly english: boolean
}): ReactNode {
  return (
    <main className="ilog-login-page">
      <header className="ilog-login-header">
        <Link href="/" className="ilog-login-brand" aria-label="ilog home">
          <LeftBrandLogo priority />
        </Link>
        <Link href="/" className="ilog-login-home-link">
          {english ? 'Back home' : '홈으로'} <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <div className="ilog-login-layout">
        <section
          className="ilog-login-form-panel"
          aria-label={english ? 'Account recovery' : '계정 복구'}
        >
          <div className="ilog-login-form-shell">{children}</div>
        </section>
        <aside
          className="ilog-login-visual"
          data-cinematic-hero
          aria-hidden="true"
        >
          <CinematicHeroMotion
            chapter="02 / RECOVER"
            label="RETURN TO YOUR STORY"
          />
          <Image
            src="/brand/login-welcome.png"
            alt=""
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
