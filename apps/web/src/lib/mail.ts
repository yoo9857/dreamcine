import { NotImplementedError } from '@aidream/core'

export interface MailRecipientToken {
  to: string
  token: string
}

/**
 * SMTP 발송. `SMTP_URL` 이 없는 환경(테스트)에서는 전송을 수집만 하고
 * 네트워크로 나가지 않는다.
 */
export function sendVerificationMail(
  _input: MailRecipientToken,
): Promise<void> {
  throw new NotImplementedError('T03:mail')
}

export function sendPasswordResetMail(
  _input: MailRecipientToken,
): Promise<void> {
  throw new NotImplementedError('T03:mail')
}
