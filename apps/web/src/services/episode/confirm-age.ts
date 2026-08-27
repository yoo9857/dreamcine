import { AppError, checkAgeGate, type AgeConfirmInput } from '@aidream/core'
import { findPlaybackEpisode, findUserById } from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'
import {
  AGE_VERIFICATION_TTL_SEC,
  createAgeVerificationCookie,
} from '@/src/lib/age-verification'

export interface ConfirmAgeInput {
  readonly episodeId: string
  readonly confirmation: AgeConfirmInput
  readonly session: RouteSession | null
  readonly now: Date
}
export interface ConfirmAgeResult {
  readonly setCookie: string
}

export async function confirmAge(
  input: ConfirmAgeInput,
): Promise<ConfirmAgeResult> {
  const episode = await findPlaybackEpisode(input.episodeId)
  if (episode === null) throw new AppError('E_EPISODE_NOT_FOUND')
  const viewer =
    input.session === null ? null : await findUserById(input.session.userId)
  const decision = checkAgeGate({
    rating: episode.ageRating,
    viewer:
      input.session === null
        ? null
        : {
            isAuthenticated: true,
            ...(viewer?.birthDate === null || viewer?.birthDate === undefined
              ? {}
              : { birthDate: viewer.birthDate }),
          },
    confirmed: input.confirmation.confirmed,
    now: input.now,
  })
  if (!decision.allowed) {
    throw new AppError(
      decision.reason === 'AUTH_REQUIRED'
        ? 'E_AUTH_REQUIRED'
        : 'E_PERM_AGE_RESTRICTED',
    )
  }
  const secret = process.env.AUTH_SECRET
  if (secret === undefined || secret === '') throw new AppError('E_INTERNAL')
  return {
    setCookie: createAgeVerificationCookie({
      claim: {
        episodeId: episode.id,
        ageRating: episode.ageRating,
        expiresAt:
          Math.floor(input.now.getTime() / 1000) + AGE_VERIFICATION_TTL_SEC,
      },
      secret,
      secure: process.env.NODE_ENV === 'production',
    }),
  }
}
