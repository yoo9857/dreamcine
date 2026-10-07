import type { ReportReason } from '../enums.js'

export interface AutoActionInput {
  reportCount: number
  distinctReporters: number
  reason: ReportReason
  targetAgeHours: number
}

export type AutoAction = 'NONE' | 'PRIORITIZE'

export function decideAutoAction(input: AutoActionInput): AutoAction {
  if (input.reason === 'MINOR_SAFETY') return 'PRIORITIZE'
  if (
    (input.reason === 'SEXUAL' || input.reason === 'COPYRIGHT') &&
    input.distinctReporters >= 3
  ) {
    return 'PRIORITIZE'
  }
  if (input.distinctReporters >= 5) return 'PRIORITIZE'
  if (input.distinctReporters >= 2) return 'PRIORITIZE'
  return 'NONE'
}
