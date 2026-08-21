import { NotImplementedError } from '@aidream/core'

/**
 * 화면 문구는 여기 모은다. 톤 규칙은 08_UIUX_SPEC.md §10 —
 * 존댓말, 사용자를 탓하지 않는다, 다음 행동을 제시한다.
 */
export interface Messages {
  readonly common: {
    readonly retry: string
    readonly loading: string
    readonly cancel: string
    readonly confirm: string
    readonly next: string
    readonly previous: string
  }
  readonly theme: {
    readonly label: string
    readonly dark: string
    readonly light: string
  }
  readonly auth: {
    readonly loginTitle: string
    readonly loginSubmit: string
    readonly loginSubmitting: string
    readonly signupTitle: string
    readonly signupSubmit: string
    readonly signupSubmitting: string
    readonly signupSentTitle: string
    readonly signupSentBody: (email: string) => string
    readonly verifyChecking: string
    readonly verifySuccessTitle: string
    readonly verifySuccessBody: string
    readonly verifyExpiredTitle: string
    readonly verifyFailedTitle: string
    readonly resendVerification: string
    readonly toLogin: string
    readonly toSignup: string
    readonly hasAccount: string
    readonly noAccount: string
    readonly email: string
    readonly password: string
    readonly handle: string
    readonly handleHint: string
    readonly displayName: string
  }
}

export function koMessages(): Messages {
  throw new NotImplementedError('T14:messages')
}
