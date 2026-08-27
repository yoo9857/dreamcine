import {
  sendEventMailPreviewOnly,
  sendRefundMail,
  sendVerificationMail,
  sendWelcomeMail,
} from '../src/lib/mail.js'

const recipient = process.argv[2]
if (recipient === undefined || recipient === '') {
  throw new Error('usage: preview-transactional-mails.ts <recipient>')
}

const origin = process.env.APP_URL
if (origin === undefined || origin === '') {
  throw new Error('APP_URL is required')
}

await sendVerificationMail({
  to: recipient,
  token: 'preview-verification-token',
  lang: 'ko',
})

await sendWelcomeMail({
  to: recipient,
  handle: 'devoh',
  locale: 'ko',
})

await sendRefundMail({
  to: recipient,
  amount: '₩12,000',
  locale: 'ko',
  processedAt: '2026-08-27 14:20 KST',
  reference: 'RF-20260827-001',
  status: 'completed',
})

await sendEventMailPreviewOnly({
  to: recipient,
  href: new URL('/events/premiere-week', `${origin}/`).toString(),
  locale: 'ko',
  startsAt: '2026-09-01 20:00 KST',
  summary:
    '새로운 크리에이터와 이야기를 가장 먼저 만나는 ILOG 프리미어 위크에 초대합니다.',
  title: 'ILOG 프리미어 위크',
  unsubscribeHref: new URL('/account/notifications', `${origin}/`).toString(),
})

process.stdout.write('MAIL_PREVIEWS_SENT count=4\n')
