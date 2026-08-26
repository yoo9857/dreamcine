import { z } from 'zod'

import { EmailSchema, sanitizeText } from './auth.schema.js'

export const CREATOR_TRACKS = [
  'DIRECTOR',
  'WRITER',
  'AI_VISUAL',
  'PRODUCER',
  'OTHER',
] as const

const PublicUrlSchema = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine(
    (value) =>
      value.toLowerCase().startsWith('https://') ||
      value.toLowerCase().startsWith('http://'),
    { message: 'URL must use http or https' },
  )

const OptionalPublicUrlSchema = z
  .union([PublicUrlSchema, z.literal('')])
  .transform((value) => (value === '' ? undefined : value))

const OptionalTextSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(z.string().max(1200))
  .transform((value) => (value === '' ? undefined : value))

export const CreateCreatorApplicationSchema = z.object({
  displayName: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().min(2).max(80)),
  email: EmailSchema.pipe(z.string().max(254)),
  track: z.enum(CREATOR_TRACKS),
  portfolioUrl: PublicUrlSchema,
  socialUrl: OptionalPublicUrlSchema.optional(),
  experience: OptionalTextSchema.optional(),
  pitch: z.string().transform(sanitizeText).pipe(z.string().min(40).max(2000)),
  privacyConsent: z.literal(true),
  companyWebsite: z.literal('').optional(),
})

export type CreatorTrack = (typeof CREATOR_TRACKS)[number]
export type CreateCreatorApplicationInput = z.infer<
  typeof CreateCreatorApplicationSchema
>
