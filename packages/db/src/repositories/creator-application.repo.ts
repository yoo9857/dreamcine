import type { CreateCreatorApplicationInput, CreatorTrack } from '@aidream/core'

import { db } from '../client.js'
import { executeDb } from '../errors.js'

export const CREATOR_APPLICATION_ROUND = '2026-FOUNDING'

export interface CreatorApplicationRecord {
  id: string
  email: string
  track: CreatorTrack
  status: 'SUBMITTED' | 'REVIEWING' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED'
  createdAt: Date
  updatedAt: Date
}

export function saveCreatorApplication(
  input: CreateCreatorApplicationInput,
  now: Date,
): Promise<CreatorApplicationRecord> {
  const data = {
    displayName: input.displayName,
    email: input.email,
    track: input.track,
    portfolioUrl: input.portfolioUrl,
    socialUrl: input.socialUrl ?? null,
    experience: input.experience ?? null,
    pitch: input.pitch,
    privacyConsentAt: now,
  }

  return executeDb(async () =>
    db.creatorApplication.upsert({
      where: {
        email_round: {
          email: input.email,
          round: CREATOR_APPLICATION_ROUND,
        },
      },
      create: { ...data, round: CREATOR_APPLICATION_ROUND },
      update: { ...data, status: 'SUBMITTED' },
      select: {
        id: true,
        email: true,
        track: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  )
}
