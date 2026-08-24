import {
  NotImplementedError,
  type CreateSeriesInput,
  type SeriesResponse,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function createSeries(
  _session: RouteSession,
  _input: CreateSeriesInput,
): Promise<SeriesResponse> {
  throw new NotImplementedError('T08:createSeries')
}
