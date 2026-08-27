import { afterEach, describe, expect, it } from 'vitest'

import { mailTransportConfigured } from './mail'

const originalSmtpUrl = process.env.SMTP_URL
const originalMailFrom = process.env.MAIL_FROM

afterEach(() => {
  if (originalSmtpUrl === undefined) delete process.env.SMTP_URL
  else process.env.SMTP_URL = originalSmtpUrl
  if (originalMailFrom === undefined) delete process.env.MAIL_FROM
  else process.env.MAIL_FROM = originalMailFrom
})

describe('mailTransportConfigured', () => {
  it.each(['smtp://localhost:1025', 'smtps://resend:key@smtp.resend.com:465'])(
    'accepts a supported SMTP URL: %s',
    (smtpUrl) => {
      process.env.SMTP_URL = smtpUrl
      process.env.MAIL_FROM = 'noreply@ilog.info'

      expect(mailTransportConfigured()).toBe(true)
    },
  )

  it.each([
    ['', 'noreply@ilog.info'],
    ['https://smtp.resend.com', 'noreply@ilog.info'],
    ['not-a-url', 'noreply@ilog.info'],
    ['smtps://resend:key@smtp.resend.com:465', ''],
  ])('rejects an incomplete or invalid configuration', (smtpUrl, from) => {
    process.env.SMTP_URL = smtpUrl
    process.env.MAIL_FROM = from

    expect(mailTransportConfigured()).toBe(false)
  })
})
