import { z } from 'zod'
import { LIMITS } from '../limits.js'
import { Gender, SignupPurpose } from '../enums.js'

/**
 * 라우트 경로와 충돌하거나 신뢰를 오인시키는 핸들. (07_AUTH_SECURITY.md §5)
 * 08_UIUX_SPEC.md §1 의 최상위 경로를 모두 포함한다.
 */
export const RESERVED_HANDLES = [
  'about',
  'admin',
  'api',
  'assets',
  'auth',
  'following',
  'health',
  'help',
  'login',
  'logout',
  'me',
  'metrics',
  'notifications',
  'privacy',
  'public',
  'ready',
  'root',
  'search',
  'series',
  'settings',
  'signup',
  'static',
  'studio',
  'support',
  'tags',
  'terms',
  'u',
  'verify',
  'watch',
] as const

const CONTROL_OR_FORMAT = /[\p{Cc}\p{Cf}]/gu

/** 제어문자·zero-width 문자를 제거하고 양끝 공백을 정리한다. */
export function sanitizeText(value: string): string {
  return value.replace(CONTROL_OR_FORMAT, '').trim()
}

export const EmailSchema = z.string().trim().toLowerCase().email()

export const PasswordSchema = z.string().min(10)

export const HandleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/u)

/** 로그인에서는 이메일 또는 공개 핸들을 같은 식별자 입력으로 받는다. */
export const LoginIdentifierSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    (value) =>
      value === 'admin@admin' ||
      EmailSchema.safeParse(value).success ||
      HandleSchema.safeParse(value).success,
    { message: 'Invalid email or username' },
  )

export const DisplayNameSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(z.string().min(1).max(40))

export const BioSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(z.string().max(LIMITS.BIO_MAX_LEN))

export const SignupSchema = z
  .object({
    email: EmailSchema,
    emailConfirmation: EmailSchema,
    password: PasswordSchema,
    handle: HandleSchema,
    displayName: DisplayNameSchema,
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u, { message: 'Invalid birth date' })
      .refine(
        (value) => {
          const date = new Date(`${value}T00:00:00.000Z`)
          const oldest = new Date()
          oldest.setUTCFullYear(oldest.getUTCFullYear() - 120)
          return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().startsWith(value) &&
            date <= new Date() &&
            date >= oldest
          )
        },
        { message: 'Invalid birth date' },
      ),
    gender: z.enum(Gender),
    signupPurpose: z.enum(SignupPurpose),
    country: z.enum(['KR', 'US', 'CN', 'JP']),
    acceptTerms: z.boolean().refine((value) => value, {
      message: 'Terms and privacy consent is required',
    }),
    marketingConsent: z.boolean(),
  })
  .refine((input) => input.email === input.emailConfirmation, {
    path: ['emailConfirmation'],
    message: 'Email addresses do not match',
  })

export const LoginSchema = z.object({
  email: LoginIdentifierSchema,
  password: z.string().min(1),
})

export const VerifyEmailSchema = z.object({
  token: z.string().min(1).max(256),
})

export const RequestPasswordResetSchema = z.object({
  email: EmailSchema,
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1).max(256),
  password: PasswordSchema,
})

export const UpdateProfileSchema = z.object({
  displayName: DisplayNameSchema.optional(),
  bio: BioSchema.nullable().optional(),
  avatarKey: z.string().trim().min(1).max(255).nullable().optional(),
})

export type SignupInput = z.infer<typeof SignupSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>
export type RequestPasswordResetInput = z.infer<
  typeof RequestPasswordResetSchema
>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
