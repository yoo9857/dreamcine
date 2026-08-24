import { z } from 'zod'

import { AgeRating } from '../enums.js'

export const AgeConfirmSchema = z.object({
  confirmed: z.literal(true),
  birthYear: z.number().int().min(1900).optional(),
})

export type AgeConfirmInput = z.infer<typeof AgeConfirmSchema>

export const AgeVerificationClaimSchema = z.object({
  episodeId: z.string(),
  ageRating: z.enum(AgeRating),
  expiresAt: z.number().int().positive(),
})

export type AgeVerificationClaim = z.infer<typeof AgeVerificationClaimSchema>

export const SaveProgressSchema = z.object({
  positionSec: z.number().int().min(0),
  completed: z.boolean().optional(),
})

export type SaveProgressInput = z.infer<typeof SaveProgressSchema>

export const PlaybackRenditionSchema = z.object({
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export const PlaybackResponseSchema = z.object({
  episodeId: z.string(),
  masterUrl: z.string().url(),
  posterUrl: z.string().url().optional(),
  durationSec: z.number().int().positive(),
  startAtSec: z.number().int().min(0),
  renditions: z.array(PlaybackRenditionSchema),
})

export type PlaybackResponse = z.infer<typeof PlaybackResponseSchema>
