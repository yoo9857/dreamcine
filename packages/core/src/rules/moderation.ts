import type { ReportReason } from '../enums.js'
import { NotImplementedError } from '../errors/not-implemented.js'

export interface AutoActionInput {
  reportCount: number
  distinctReporters: number
  reason: ReportReason
  targetAgeHours: number
}

export type AutoAction = 'NONE' | 'PRIORITIZE' | 'AUTO_HIDE'

export function decideAutoAction(_input: AutoActionInput): AutoAction {
  throw new NotImplementedError('T12:decideAutoAction')
}
