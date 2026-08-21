/**
 * 화면 문구는 여기 모은다. 톤 규칙은 08_UIUX_SPEC.md §10 —
 * 존댓말, 사용자를 탓하지 않는다, 다음 행동을 제시한다.
 *
 * 에러 문구는 여기 두지 않는다. 그것은 에러코드와 1:1 로 묶여
 * `src/lib/error-messages.ts` 가 담당한다. (09_ERROR_CATALOG.md §5)
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

const KO: Messages = {
  common: {
    retry: '다시 시도',
    loading: '불러오는 중',
    cancel: '취소',
    confirm: '확인',
    next: '다음',
    previous: '이전',
  },
  theme: {
    label: '화면 테마',
    dark: '어두운 화면으로 바꾸기',
    light: '밝은 화면으로 바꾸기',
  },
  auth: {
    loginTitle: '로그인',
    loginSubmit: '로그인',
    loginSubmitting: '로그인 중…',
    signupTitle: '회원가입',
    signupSubmit: '가입하기',
    signupSubmitting: '가입 중…',
    signupSentTitle: '인증 메일을 보냈습니다',
    signupSentBody: (email) =>
      `${email} 으로 인증 메일을 보냈습니다. 메일의 링크를 열면 가입이 완료됩니다.`,
    verifyChecking: '인증을 확인하고 있습니다',
    verifySuccessTitle: '이메일 인증 완료',
    verifySuccessBody: '이제 로그인할 수 있습니다.',
    verifyExpiredTitle: '인증 링크가 만료되었습니다',
    verifyFailedTitle: '인증하지 못했습니다',
    resendVerification: '인증 메일 다시 받기',
    toLogin: '로그인으로 이동',
    toSignup: '회원가입',
    hasAccount: '이미 계정이 있으신가요?',
    noAccount: '계정이 없으신가요?',
    email: '이메일',
    password: '비밀번호',
    handle: '아이디',
    handleHint: '영문 소문자·숫자·밑줄 3~20자',
    displayName: '표시 이름',
  },
}

export function koMessages(): Messages {
  return KO
}
