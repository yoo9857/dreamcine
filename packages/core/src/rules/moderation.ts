import type { ReportReason } from '../enums.js'

export interface AutoActionInput {
  reportCount: number
  distinctReporters: number
  reason: ReportReason
  targetAgeHours: number
}

export type AutoAction = 'NONE' | 'PRIORITIZE' | 'AUTO_HIDE'

export function decideAutoAction(input: AutoActionInput): AutoAction {
  if (input.reason === 'MINOR_SAFETY') return 'AUTO_HIDE'
  if (
    (input.reason === 'SEXUAL' || input.reason === 'COPYRIGHT') &&
    input.distinctReporters >= 3
  ) {
    return 'AUTO_HIDE'
  }
  if (input.distinctReporters >= 5) return 'AUTO_HIDE'
  if (input.distinctReporters >= 2) return 'PRIORITIZE'
  return 'NONE'
}
