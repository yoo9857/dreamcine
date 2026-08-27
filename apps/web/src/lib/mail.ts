import { AppError } from '@aidream/core'
import { hasActiveMarketingConsent } from '@aidream/db'
import { randomUUID } from 'node:crypto'
import { createTransport, type Transporter } from 'nodemailer'

import { getLogger } from './logger'
import { createMarketingUnsubscribeToken } from './marketing-unsubscribe'
import { absoluteUrl } from './site-url'
import {
  eventTemplate,
  passwordResetTemplate,
  refundTemplate,
  verificationTemplate,
  welcomeTemplate,
  type EventTemplateInput,
  type MailLocale,
  type RefundTemplateInput,
  type RenderedMail,
} from './mail-templates'

export interface MailRecipientToken {
  readonly to: string
  readonly token: string
}

export interface PasswordResetMailInput extends MailRecipientToken {
  readonly locale?: MailLocale
}

export interface WelcomeMailInput {
  readonly handle: string
  readonly locale?: MailLocale
  readonly to: string
}

export interface RefundMailInput extends RefundTemplateInput {
  readonly to: string
}

export interface EventMailInput extends EventTemplateInput {
  readonly to: string
}

export interface MarketingEventMailInput
  extends Omit<EventTemplateInput, 'unsubscribeHref'> {
  readonly userId: string
  readonly to: string
}

interface VerificationMailInput extends MailRecipientToken {
  readonly plan?: 'ads-standard'
  readonly lang?: 'ko' | 'en'
  readonly market?: 'kr' | 'us'
}

let cachedTransport: {
  readonly url: string
  readonly value: Transporter
} | null = null

function appUrl(): string {
  const value = process.env.APP_URL
  if (value === undefined || value === '')
    throw new AppError('E_INTERNAL', { reason: 'app-url-missing' })
  return value.replace(/\/$/u, '')
}

function brandDomain(): string {
  return new URL(appUrl()).hostname
}

export function mailTransportConfigured(): boolean {
  const smtpUrl = process.env.SMTP_URL?.trim()
  const from = process.env.MAIL_FROM?.trim()
  if (
    smtpUrl === undefined ||
    smtpUrl === '' ||
    from === undefined ||
    from === ''
  )
    return false
  try {
    const protocol = new URL(smtpUrl).protocol
    return protocol === 'smtp:' || protocol === 'smtps:'
  } catch {
    return false
  }
}

function transport(): Transporter {
  const smtpUrl = process.env.SMTP_URL?.trim()
  if (smtpUrl === undefined || smtpUrl === '')
    throw new AppError('E_INTERNAL', { reason: 'mail-transport-missing' })
  if (cachedTransport?.url === smtpUrl) return cachedTransport.value
  const value = createTransport({
    url: smtpUrl,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
  cachedTransport = { url: smtpUrl, value }
  return value
}

async function send(
  to: string,
  message: RenderedMail,
  headers: Readonly<Record<string, string>> = {},
): Promise<void> {
  const from = process.env.MAIL_FROM?.trim()
  if (from === undefined || from === '')
    throw new AppError('E_INTERNAL', { reason: 'mail-from-missing' })
  try {
    await transport().sendMail({
      from: { name: 'ILOG', address: from },
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      headers: {
        'X-Entity-Ref-ID': randomUUID(),
        'X-Auto-Response-Suppress': 'All',
        ...headers,
      },
    })
  } catch (error: unknown) {
    getLogger().error({ err: error }, 'transactional mail delivery failed')
    throw new AppError('E_INTERNAL', { reason: 'smtp-send' }, error)
  }
}

export function sendVerificationMail(
  input: VerificationMailInput,
): Promise<void> {
  const link = new URL('/verify', `${appUrl()}/`)
  link.searchParams.set('token', input.token)
  if (input.plan !== undefined) link.searchParams.set('plan', input.plan)
  if (input.lang !== undefined) link.searchParams.set('lang', input.lang)
  if (input.market !== undefined) link.searchParams.set('market', input.market)
  const href = link.toString()
  return send(
    input.to,
    verificationTemplate({
      brandDomain: brandDomain(),
      href,
      locale: input.lang === 'en' ? 'en' : 'ko',
    }),
  )
}

export function sendPasswordResetMail(
  input: PasswordResetMailInput,
): Promise<void> {
  const link = new URL('/password/reset', `${appUrl()}/`)
  link.searchParams.set('token', input.token)
  if (input.locale === 'en') link.searchParams.set('lang', 'en')
  return send(
    input.to,
    passwordResetTemplate({
      brandDomain: brandDomain(),
      href: link.toString(),
      ...(input.locale === undefined ? {} : { locale: input.locale }),
    }),
  )
}

export function sendWelcomeMail(input: WelcomeMailInput): Promise<void> {
  const link = new URL('/browse', `${appUrl()}/`)
  if (input.locale === 'en') link.searchParams.set('lang', 'en')
  return send(
    input.to,
    welcomeTemplate({
      brandDomain: brandDomain(),
      handle: input.handle,
      href: link.toString(),
      ...(input.locale === undefined ? {} : { locale: input.locale }),
    }),
  )
}

export function sendRefundMail(input: RefundMailInput): Promise<void> {
  const { to, ...templateInput } = input
  return send(
    to,
    refundTemplate({ ...templateInput, brandDomain: brandDomain() }),
  )
}

/** 로컬 템플릿 미리보기 전용. 운영 캠페인은 sendMarketingEventMail을 쓴다. */
export function sendEventMailPreviewOnly(input: EventMailInput): Promise<void> {
  const { to, ...templateInput } = input
  return send(
    to,
    eventTemplate({ ...templateInput, brandDomain: brandDomain() }),
    {
      'List-Unsubscribe': `<${input.unsubscribeHref}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  )
}

/**
 * 운영 캠페인의 유일한 발송 진입점. 후보 목록을 만든 뒤 사용자가 철회했을 수
 * 있으므로 SMTP 전송 직전에 최신 동의를 다시 확인한다.
 */
export async function sendMarketingEventMail(
  input: MarketingEventMailInput,
): Promise<boolean> {
  if (!(await hasActiveMarketingConsent(input.userId))) return false
  const secret = process.env.AUTH_SECRET
  if (secret === undefined || secret === '') throw new AppError('E_INTERNAL')
  const token = createMarketingUnsubscribeToken({
    userId: input.userId,
    now: new Date(),
    secret,
  })
  const { userId: _userId, to, ...template } = input
  await sendEventMailPreviewOnly({
    ...template,
    to,
    unsubscribeHref: absoluteUrl(
      `/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`,
    ),
  })
  return true
}
