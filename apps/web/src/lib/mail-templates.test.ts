import { describe, expect, it } from 'vitest'

import {
  accountDeletionCancelTemplate,
  eventTemplate,
  passwordResetTemplate,
  refundTemplate,
  verificationTemplate,
  welcomeTemplate,
} from './mail-templates'

const HTTPS_URL = 'https://ilog.info/action?token=secure-token'

describe('transactional mail templates', () => {
  it.each([
    accountDeletionCancelTemplate({
      href: HTTPS_URL,
      locale: 'ko',
      purgeDate: '2026년 9월 27일',
    }),
    verificationTemplate({ href: HTTPS_URL, locale: 'ko' }),
    passwordResetTemplate({ href: HTTPS_URL, locale: 'ko' }),
    welcomeTemplate({
      handle: 'creator',
      href: 'https://ilog.info/browse',
      locale: 'ko',
    }),
    refundTemplate({
      amount: '₩12,000',
      locale: 'ko',
      processedAt: '2026-08-27 15:30 KST',
      reference: 'RF-20260827-001',
      status: 'completed',
    }),
    eventTemplate({
      href: 'https://ilog.info/events/premiere',
      locale: 'ko',
      startsAt: '2026-09-01 20:00 KST',
      summary: '새로운 이야기를 가장 먼저 만나보세요.',
      title: 'ILOG 프리미어 위크',
      unsubscribeHref: 'https://ilog.info/account/notifications',
    }),
  ])('renders a complete UTF-8 email document', (mail) => {
    expect(mail.subject).toContain('[ILOG]')
    expect(mail.subject).not.toContain('???')
    expect(mail.text).not.toContain('???')
    expect(mail.html).toContain('<meta charset="utf-8">')
    expect(mail.html).toContain('role="presentation"')
    expect(mail.html).toContain('ILOG<span')
    expect(mail.html).toContain('ilog.info')
    expect(mail.html).not.toContain('???')
  })

  it('preserves secure action links in HTML and plain text', () => {
    const mail = verificationTemplate({ href: HTTPS_URL, locale: 'ko' })

    expect(mail.text).toContain(HTTPS_URL)
    expect(mail.html).toContain(HTTPS_URL.replace('&', '&amp;'))
    expect(mail.html).toContain('이메일 인증하기')
  })

  it('escapes event content supplied by an operator', () => {
    const mail = eventTemplate({
      href: 'https://ilog.info/events/1',
      summary: '<script>alert("unsafe")</script>',
      title: '<b>Premiere</b>',
      unsubscribeHref: 'https://ilog.info/account/notifications',
    })

    expect(mail.html).not.toContain('<script>')
    expect(mail.html).not.toContain('<b>Premiere</b>')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).toContain('이벤트 메일 수신 해제')
  })

  it('uses the configured brand domain in the footer', () => {
    const mail = welcomeTemplate({
      brandDomain: 'ilog.com',
      handle: 'creator',
      href: 'https://ilog.com/browse',
    })

    expect(mail.html).toContain('ILOG · ilog.com')
    expect(mail.html).not.toContain('ILOG · ilog.info')
  })
})
