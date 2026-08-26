'use client'

import { ChevronDown, Globe2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

import { getPlanVariant, PLAN_VARIANTS } from '@/src/config/plan-markets'

import { getPlanCopy, type PlanLocale, type PlanMarket } from './plan-copy'
import styles from './pricing.module.css'

export function RegionSelector({
  locale,
  market,
}: {
  readonly locale: PlanLocale
  readonly market: PlanMarket
}): ReactNode {
  const active = getPlanVariant(locale, market)

  return (
    <label className={styles.regionSelector}>
      <Globe2 size={14} aria-hidden="true" />
      <span className={styles.srOnly}>
        {locale === 'ko' ? '지역 및 언어' : 'Region and language'}
      </span>
      <select
        value={active.key}
        aria-label={locale === 'ko' ? '지역 및 언어' : 'Region and language'}
        onChange={(event) => {
          const next = PLAN_VARIANTS.find(
            ({ key }) => key === event.target.value,
          )
          if (next !== undefined) window.location.assign(next.route)
        }}
      >
        {PLAN_VARIANTS.map((variant) => (
          <option key={variant.key} value={variant.key}>
            {variant.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function PlanJoinForm({
  locale,
  market,
}: {
  readonly locale: PlanLocale
  readonly market: PlanMarket
}): ReactNode {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const copy = getPlanCopy(locale, market)

  function submit(event: { preventDefault(): void }): void {
    event.preventDefault()
    const cleanEmail = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError(copy.form.error)
      return
    }

    setError('')
    router.push(
      `/signup?email=${encodeURIComponent(cleanEmail)}&plan=ads-standard&lang=${locale}&market=${market.toLowerCase()}`,
    )
  }

  return (
    <form className={styles.joinForm} onSubmit={submit} noValidate>
      <label htmlFor="plan-email">{copy.form.emailLabel}</label>
      <div>
        <input
          id="plan-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
          }}
          placeholder={copy.form.placeholder}
          aria-describedby={error === '' ? undefined : 'plan-email-error'}
          aria-invalid={error === '' ? undefined : true}
          autoComplete="email"
        />
        <button type="submit">
          {copy.form.submit} <span aria-hidden="true">→</span>
        </button>
      </div>
      {error === '' ? (
        <small>{copy.form.hint}</small>
      ) : (
        <small className={styles.formError} id="plan-email-error" role="alert">
          {error}
        </small>
      )}
    </form>
  )
}

export function PlanFaq({
  locale,
  market,
}: {
  readonly locale: PlanLocale
  readonly market: PlanMarket
}): ReactNode {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const copy = getPlanCopy(locale, market)

  return (
    <section className={styles.faq} id="faq" aria-labelledby="faq-title">
      <div className={styles.faqHeading}>
        <p>{copy.faqEyebrow}</p>
        <h2 id="faq-title">{copy.faqTitle}</h2>
        <span>{copy.faqDescription}</span>
      </div>
      <div className={styles.faqList}>
        {copy.faqs.map(([question, answer], index) => {
          const isOpen = openFaq === index
          const answerId = `faq-answer-${String(index)}`
          return (
            <article key={question} data-open={isOpen}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => {
                  setOpenFaq(isOpen ? null : index)
                }}
              >
                <span className={styles.faqIndex}>0{index + 1}</span>
                <span>{question}</span>
                <ChevronDown aria-hidden="true" size={20} />
              </button>
              <div id={answerId}>
                <p>{answer}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function MobilePlanBar({
  locale,
  market,
}: {
  readonly locale: PlanLocale
  readonly market: PlanMarket
}): ReactNode {
  const [pastHero, setPastHero] = useState(false)
  const [joinVisible, setJoinVisible] = useState(false)
  const copy = getPlanCopy(locale, market)
  const displayPrice =
    copy.currency === '$' || copy.currency === '₩'
      ? copy.currency + copy.price
      : copy.currency + ' ' + copy.price

  useEffect(() => {
    function syncScroll(): void {
      setPastHero(window.scrollY > window.innerHeight * 0.78)
    }

    syncScroll()
    window.addEventListener('scroll', syncScroll, { passive: true })

    const join = document.querySelector('#join')
    const observer =
      join === null
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              setJoinVisible(entry?.isIntersecting ?? false)
            },
            { threshold: 0.12 },
          )
    if (join !== null) observer?.observe(join)

    return () => {
      window.removeEventListener('scroll', syncScroll)
      observer?.disconnect()
    }
  }, [])

  return (
    <aside
      className={styles.mobileBar}
      data-visible={pastHero && !joinVisible}
      aria-label={copy.mobileBarLabel}
      aria-hidden={!pastHero || joinVisible}
    >
      <span>
        {copy.planName} <strong>{displayPrice}</strong>
      </span>
      <Link href="#join" tabIndex={pastHero && !joinVisible ? undefined : -1}>
        {copy.start}
      </Link>
    </aside>
  )
}
