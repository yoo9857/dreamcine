import { AppError } from '@aidream/core'
import { createTransport } from 'nodemailer'

import { getLogger } from './logger'

export interface MailRecipientToken {
  to: string
  token: string
}

interface VerificationMailInput extends MailRecipientToken {
  readonly plan?: 'ads-standard'
  readonly lang?: 'ko' | 'en'
  readonly market?: 'kr' | 'us'
}

interface MailMessage {
  to: string
  subject: string
  text: string
}

function appUrl(): string {
  const value = process.env.APP_URL
  if (value === undefined || value === '') {
    throw new AppError('E_INTERNAL', { reason: 'app-url-missing' })
  }
  return value.replace(/\/$/u, '')
}

/**
 * `SMTP_URL` 이 없으면 네트워크로 나가지 않는다. 개발·테스트 환경에서 메일
 * 서버를 요구하지 않기 위한 경계다. 토큰은 로그에 남기지 않는다(§9 redact).
 */
async function send(message: MailMessage): Promise<void> {
  const smtpUrl = process.env.SMTP_URL
  const from = process.env.MAIL_FROM
  if (
    smtpUrl === undefined ||
    smtpUrl === '' ||
    from === undefined ||
    from === ''
  ) {
    getLogger().info(
      { to: message.to, subject: message.subject },
      'mail transport disabled, skipping delivery',
    )
    return
  }

  try {
    const transport = createTransport(smtpUrl)
    await transport.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    })
  } catch (error: unknown) {
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
  return send({
    to: input.to,
    subject: '[AIDREAM] 이메일 인증을 완료해 주세요',
    text: [
      'AIDREAM 가입을 환영합니다.',
      '',
      '아래 주소에서 이메일 인증을 완료해 주세요. 링크는 24시간 동안 유효합니다.',
      link.toString(),
      '',
      '직접 가입하지 않았다면 이 메일을 무시하세요.',
    ].join('\n'),
  })
}

/**
 * 재설정 화면은 08_UIUX_SPEC.md §1 라우트 맵에 아직 없다. 그래서 링크가 아니라
 * 토큰을 본문에 담는다. 화면이 생기면 이 함수만 바꾸면 된다.
 */
export function sendPasswordResetMail(
  input: MailRecipientToken,
): Promise<void> {
  return send({
    to: input.to,
    subject: '[AIDREAM] 비밀번호 재설정 안내',
    text: [
      '비밀번호 재설정이 요청되었습니다. 아래 토큰으로 재설정을 진행하세요.',
      '토큰은 1시간 동안, 한 번만 사용할 수 있습니다.',
      '',
      input.token,
      '',
      `문의: ${appUrl()}`,
      '요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 그대로 유지됩니다.',
    ].join('\n'),
  })
}
