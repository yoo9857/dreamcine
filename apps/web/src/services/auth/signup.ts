import { randomBytes } from 'node:crypto'

import {
  AppError,
  RESERVED_HANDLES,
  type SignupInput,
  type User,
} from '@aidream/core'
import {
  createUser,
  createVerificationToken,
  findUserByEmail,
  findUserByHandle,
} from '@aidream/db'

import { hashPassword } from '@/src/auth/password'
import { getLogger } from '@/src/lib/logger'
import { mailTransportConfigured, sendVerificationMail } from '@/src/lib/mail'
import {
  MARKETING_CONSENT_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '@/src/lib/policies'

export interface SignupResult {
  id: string
  handle: string
  email: string
  emailVerified: null
  verificationEmailSent: boolean
}

export interface SignupIntent {
  readonly plan?: 'ads-standard'
  readonly lang?: 'ko' | 'en'
  readonly market?: 'kr' | 'us'
}

/** 인증 토큰 수명. 재설정(1시간)보다 길게 잡는다 — 메일함 확인이 늦을 수 있다. */
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000

/** VerificationToken 은 인증·재설정이 공용이므로 용도를 identifier 로 구분한다. */
export const VERIFY_TOKEN_PREFIX = 'verify:'

export function createOneTimeToken(): string {
  return randomBytes(32).toString('base64url')
}

/** O02_EXCEPTION_POLICY.md §4-2 — 문맥을 아는 곳에서 구체화한다. */
function specifyConflict(error: unknown): unknown {
  if (!(error instanceof AppError) || error.code !== 'E_DB_CONFLICT') {
    return error
  }
  const fields = error.detail?.fields
  const names = Array.isArray(fields) ? fields.map(String) : []
  if (names.includes('email')) {
    return new AppError('E_USER_EMAIL_TAKEN', undefined, error)
  }
  if (names.includes('handle')) {
    return new AppError('E_USER_HANDLE_TAKEN', undefined, error)
  }
  return error
}

async function createAccount(
  input: SignupInput,
  intent: SignupIntent,
): Promise<User> {
  const passwordHash = await hashPassword(input.password)
  try {
    return await createUser({
      handle: input.handle,
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      locale: intent.lang === 'en' ? 'en-US' : 'ko-KR',
      birthDate: new Date(`${input.birthDate}T00:00:00.000Z`),
      gender: input.gender,
      signupPurpose: input.signupPurpose,
      country: input.country,
      consents: [
        {
          kind: 'TOS',
          version: TERMS_VERSION,
          granted: input.acceptTerms,
        },
        {
          kind: 'PRIVACY',
          version: PRIVACY_VERSION,
          granted: input.acceptTerms,
        },
        {
          kind: 'MARKETING',
          version: MARKETING_CONSENT_VERSION,
          granted: input.marketingConsent,
        },
      ],
    })
  } catch (error: unknown) {
    throw specifyConflict(error)
  }
}

/**
 * 예약어 차단 → 중복 검사 → argon2 해시 → 계정 생성 → 인증메일.
 *
 * 이메일 중복은 의도적으로 노출한다. 사용자가 이미 자기 이메일을 아는
 * 상황이므로 정보 유출이 아니다. (07_AUTH_SECURITY.md §11)
 *
 * 메일 발송 실패는 가입을 되돌리지 않는다. 계정은 이미 만들어졌고 사용자는
 * 재발송을 요청할 수 있다. (O02 §1 원칙 5 — 부수기능은 본기능을 막지 않는다)
 */
export async function signup(
  input: SignupInput,
  intent: SignupIntent = {},
): Promise<SignupResult> {
  if (process.env.NODE_ENV === 'production' && !mailTransportConfigured()) {
    getLogger().error(
      { reason: 'mail-transport-missing' },
      'signup blocked because verification mail is unavailable',
    )
    throw new AppError('E_INTERNAL', { reason: 'mail-transport-missing' })
  }

  const reserved: readonly string[] = RESERVED_HANDLES
  if (reserved.includes(input.handle)) {
    throw new AppError('E_USER_HANDLE_TAKEN', { reason: 'reserved' })
  }

  if ((await findUserByEmail(input.email)) !== null) {
    throw new AppError('E_USER_EMAIL_TAKEN')
  }
  if ((await findUserByHandle(input.handle)) !== null) {
    throw new AppError('E_USER_HANDLE_TAKEN')
  }

  const user = await createAccount(input, intent)

  const token = createOneTimeToken()
  await createVerificationToken({
    identifier: `${VERIFY_TOKEN_PREFIX}${user.email}`,
    token,
    expires: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
  })

  let verificationEmailSent = false
  if (mailTransportConfigured()) {
    try {
      await sendVerificationMail({ to: user.email, token, ...intent })
      verificationEmailSent = true
    } catch (error: unknown) {
      getLogger().error(
        { err: error, userId: user.id },
        'verification mail delivery failed',
      )
    }
  } else {
    getLogger().error(
      { userId: user.id },
      'verification mail transport is not configured',
    )
  }

  return {
    id: user.id,
    handle: user.handle,
    email: user.email,
    emailVerified: null,
    verificationEmailSent,
  }
}
