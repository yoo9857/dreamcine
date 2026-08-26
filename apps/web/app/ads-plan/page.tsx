import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  BadgeCheck,
  Check,
  CirclePlay,
  Download,
  Film,
  MonitorPlay,
  Play,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Users,
  WalletCards,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'
import { CinematicHeroMotion } from '@/src/components/motion/CinematicHeroMotion'
import { getPlanVariant, PLAN_VARIANTS } from '@/src/config/plan-markets'

import {
  MobilePlanBar,
  PlanFaq,
  PlanJoinForm,
  RegionSelector,
} from './plan-experience'
import { getPlanCopy, type PlanLocale, type PlanMarket } from './plan-copy'
import styles from './pricing.module.css'

const detailIcons = [MonitorPlay, Users, Download] as const
const benefitImages = [
  '/brand/posters/memory.png',
  '/brand/posters/city.png',
  '/brand/posters/moon-letter.png',
  '/brand/posters/last-frame.png',
] as const
const stepIcons = [WalletCards, BadgeCheck, CirclePlay] as const

function localeFrom(value: string | undefined): PlanLocale {
  return value === 'en' ? 'en' : 'ko'
}

function marketFrom(value: string | undefined): PlanMarket {
  return value === 'us' ? 'US' : 'KR'
}

export async function generateMetadata({
  searchParams,
}: {
  readonly searchParams: Promise<{ lang?: string; market?: string }>
}): Promise<Metadata> {
  const params = await searchParams
  const locale = localeFrom(params.lang)
  const market = marketFrom(params.market)
  const english = locale === 'en'
  const usMarket = market === 'US'
  const variant = getPlanVariant(locale, market)
  const title = english ? 'Standard with Ads' : '광고형 스탠다드 멤버십'
  const description = usMarket
    ? 'Watch ilog films and series in Full HD for $4.99 per month.'
    : english
      ? 'Watch ilog films and series in Full HD for KRW 6,900 per month.'
      : '월 6,900원으로 ilog의 영화와 시리즈를 Full HD로 즐겨보세요.'
  const languageAlternates: Record<string, string> = {
    'x-default': '/ads-plan',
  }
  for (const { hrefLang, route } of PLAN_VARIANTS) {
    languageAlternates[hrefLang] = route
  }

  return {
    title,
    description,
    alternates: {
      canonical: variant.route,
      languages: languageAlternates,
    },
    openGraph: {
      title: `${title} | ilog`,
      description,
      locale: usMarket ? 'en_US' : english ? 'en_KR' : 'ko_KR',
      alternateLocale: usMarket ? ['ko_KR', 'en_KR'] : ['en_US'],
      type: 'website',
    },
  }
}

export default async function AdsPlanPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ lang?: string; market?: string }>
}): Promise<ReactNode> {
  const params = await searchParams
  const locale = localeFrom(params.lang)
  const market = marketFrom(params.market)
  const copy = getPlanCopy(locale, market)
  const displayPrice =
    copy.currency === '$' || copy.currency === '₩'
      ? copy.currency + copy.price
      : copy.currency + ' ' + copy.price
  const pageClass = styles.page ?? ''

  return (
    <main className={pageClass} lang={copy.htmlLang}>
      <style>{`body:has(.${pageClass}) .aidream-theme-control { display: none; }`}</style>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label={copy.homeLabel}>
          <LeftBrandLogo priority />
        </Link>
        <nav className={styles.primaryNav} aria-label={copy.navLabel}>
          <Link href="#benefits">{copy.nav[0]}</Link>
          <Link href="#how-it-works">{copy.nav[1]}</Link>
          <Link href="#included">{copy.nav[2]}</Link>
          <Link href="#faq">{copy.nav[3]}</Link>
        </nav>
        <nav className={styles.headerActions} aria-label={copy.accountLabel}>
          <RegionSelector locale={locale} market={market} />
          <Link
            href={locale === 'en' ? '/login?lang=en' : '/login'}
            className={styles.loginLink}
          >
            {copy.login}
          </Link>
          <Link href="#join" className={styles.headerCta}>
            {copy.start}
          </Link>
        </nav>
      </header>

      <section
        className={styles.hero}
        aria-labelledby="plan-title"
        data-cinematic-hero
      >
        <CinematicHeroMotion chapter="01 / PREMIERE" label="ILOG MEMBERSHIP" />
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={[styles.poster, styles.posterOne].join(' ')}>
            <Image
              src="/brand/posters/city.png"
              alt=""
              fill
              priority
              sizes="32vw"
            />
          </div>
          <div className={[styles.poster, styles.posterTwo].join(' ')}>
            <Image
              src="/brand/posters/memory.png"
              alt=""
              fill
              priority
              sizes="32vw"
            />
          </div>
          <div className={[styles.poster, styles.posterThree].join(' ')}>
            <Image
              src="/brand/posters/tomorrow.png"
              alt=""
              fill
              priority
              sizes="32vw"
            />
          </div>
          <div className={styles.heroGlow} />
        </div>

        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <Sparkles size={14} aria-hidden="true" /> {copy.heroEyebrow}
          </p>
          <h1 id="plan-title">
            {copy.heroLine1}
            <br />
            <em>{copy.heroPrice}</em>
          </h1>
          <p className={styles.heroDescription}>
            {copy.heroDescription}
            <br className={styles.desktopOnly} /> {copy.heroDescriptionTail}
          </p>

          <div className={styles.priceCard}>
            <div className={styles.priceTopline}>
              <span>{copy.planName}</span>
              <span className={styles.recommended}>{copy.recommended}</span>
            </div>
            <div className={styles.priceRow}>
              <div>
                <small>{copy.monthly}</small>
                <strong>
                  <span>{copy.currency}</span>
                  {copy.price}
                </strong>
              </div>
              <div className={styles.adNote}>
                <span className={styles.pulse} />
                {copy.adNote}
              </div>
            </div>
            <div className={styles.planDetails}>
              {copy.details.map(({ label, value, note }, index) => {
                const Icon = detailIcons[index]
                if (Icon === undefined) return null
                return (
                  <div key={label}>
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span>
                      <small>{label}</small>
                      <strong>{value}</strong>
                      <em>{note}</em>
                    </span>
                  </div>
                )
              })}
            </div>
            <Link href="#join" className={styles.primaryCta}>
              {copy.startWithPrice} <span aria-hidden="true">→</span>
            </Link>
            <p className={styles.cancelNote}>
              <ShieldCheck size={14} aria-hidden="true" /> {copy.cancelNote}
            </p>
          </div>
        </div>

        <a
          className={styles.scrollHint}
          href="#benefits"
          aria-label={copy.scrollLabel}
        >
          <span />
          SCROLL TO DISCOVER
        </a>
      </section>

      <section className={styles.valueStrip} aria-label={copy.nav[2]}>
        {copy.values.map(([prefix, value], index) => (
          <div className={styles.valueItem} key={value}>
            <p>
              {prefix === '' ? null : `${prefix} `}
              <strong>{value}</strong>
            </p>
            {index === copy.values.length - 1 ? null : <span />}
          </div>
        ))}
      </section>

      <section
        className={styles.benefits}
        id="benefits"
        aria-labelledby="benefits-title"
      >
        <div className={styles.sectionHeading}>
          <p>{copy.benefitsEyebrow}</p>
          <h2 id="benefits-title">
            {copy.benefitsTitle[0]}
            <br />
            {copy.benefitsTitle[1]}
          </h2>
        </div>
        <div className={styles.benefitGrid}>
          {copy.benefits.map((benefit, index) => {
            const image = benefitImages[index]
            if (image === undefined) return null
            const cardClass =
              index === 0
                ? styles.benefitWide
                : index === 1
                  ? styles.benefitTall
                  : ''
            return (
              <article className={cardClass} key={benefit.title}>
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 800px) 100vw, 50vw"
                />
                <div className={styles.benefitShade} />
                <span className={styles.benefitNumber}>0{index + 1}</span>
                <div>
                  <p>{benefit.eyebrow}</p>
                  <h3>{benefit.title}</h3>
                  <span>{benefit.description}</span>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section
        className={styles.journey}
        id="how-it-works"
        aria-labelledby="journey-title"
      >
        <div className={styles.journeyIntro}>
          <p>{copy.journeyEyebrow}</p>
          <h2 id="journey-title">
            {copy.journeyTitle[0]}
            <br />
            {copy.journeyTitle[1]}
          </h2>
          <p>{copy.journeyDescription}</p>
          <Link href="#join">
            {copy.startNow} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ol className={styles.stepList}>
          {copy.steps.map(([title, description], index) => {
            const Icon = stepIcons[index]
            if (Icon === undefined) return null
            const number = `0${String(index + 1)}`
            return (
              <li key={title}>
                <div>
                  <Icon size={21} aria-hidden="true" />
                  <span>{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            )
          })}
        </ol>
      </section>

      <section
        className={styles.included}
        id="included"
        aria-labelledby="included-title"
      >
        <div className={styles.includedVisual}>
          <Image
            src="/brand/posters/tomorrow.png"
            alt={copy.includedAlt}
            fill
            sizes="(max-width: 800px) 100vw, 48vw"
          />
          <div>
            <Film aria-hidden="true" size={18} />
            <span>{copy.planName}</span>
            <strong>{displayPrice}</strong>
            <small>{copy.perMonth}</small>
          </div>
        </div>
        <div className={styles.includedCopy}>
          <p>{copy.includedEyebrow}</p>
          <h2 id="included-title">{copy.includedTitle}</h2>
          <p>{copy.includedDescription}</p>
          <dl>
            {copy.features.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <Check size={15} aria-hidden="true" /> {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className={styles.deviceNote}>
            <Smartphone size={19} aria-hidden="true" />
            <span>
              <strong>{copy.devices}</strong>
              {copy.deviceNote}
            </span>
          </div>
        </div>
      </section>

      <section
        className={styles.joinSection}
        id="join"
        aria-labelledby="join-title"
      >
        <div className={styles.joinAura} aria-hidden="true" />
        <div className={styles.joinIcon} aria-hidden="true">
          <Play fill="currentColor" size={28} />
        </div>
        <p>{copy.joinEyebrow}</p>
        <h2 id="join-title">
          {copy.joinTitle[0]}
          <br />
          {copy.joinTitle[1]}
        </h2>
        <p className={styles.joinDescription}>
          {copy.joinDescription[0]}
          <br />
          {copy.joinDescription[1]}
        </p>
        <PlanJoinForm locale={locale} market={market} />
      </section>

      <PlanFaq locale={locale} market={market} />

      <footer className={styles.footer}>
        <Link
          href="/"
          className={styles.footerLogo}
          aria-label={copy.homeLabel}
        >
          <LeftBrandLogo />
        </Link>
        <div>
          <Link href="#faq">{copy.footer[0]}</Link>
          <Link href={locale === 'en' ? '/login?lang=en' : '/login'}>
            {copy.footer[1]}
          </Link>
          <a href="mailto:support@ilog.kr">{copy.footer[2]}</a>
          <a href="mailto:privacy@ilog.kr">{copy.footer[3]}</a>
        </div>
        <p>{copy.copyright}</p>
      </footer>

      <MobilePlanBar locale={locale} market={market} />
    </main>
  )
}
