import {
  httpStatusClass,
  METRICS,
  normalizeRoutePattern,
  type ErrorCode,
} from '@aidream/core'
import { Counter, Histogram, Registry } from 'prom-client'

import { getLogger } from './logger'

export interface HttpMetricInput {
  readonly route: string
  readonly method: string
  readonly status: number
  readonly durationMs: number
  readonly errorCode?: ErrorCode | undefined
}

export function recordHttpRequest(input: HttpMetricInput): void {
  try {
    const labels = {
      route: normalizeRoutePattern(input.route),
      method: input.method.toUpperCase(),
      status: httpStatusClass(input.status),
    }
    HTTP_TOTAL.inc(labels)
    HTTP_DURATION.observe(labels, input.durationMs / 1000)
    if (input.errorCode !== undefined) APP_ERRORS.inc({ code: input.errorCode })
  } catch (error: unknown) {
    getLogger().debug({ err: error }, 'http metric collection failed')
  }
}

export function renderWebMetrics(): Promise<string> {
  return registry.metrics()
}

const registry = new Registry()
export const WEB_METRICS_CONTENT_TYPE = registry.contentType
const HTTP_LABELS = ['route', 'method', 'status'] as const
const HTTP_TOTAL = new Counter({
  name: METRICS.HTTP_TOTAL,
  help: 'Completed HTTP requests',
  labelNames: HTTP_LABELS,
  registers: [registry],
})
const HTTP_DURATION = new Histogram({
  name: METRICS.HTTP_DURATION,
  help: 'HTTP request duration in seconds',
  labelNames: HTTP_LABELS,
  buckets: [0.025, 0.05, 0.1, 0.3, 0.5, 1, 2.5, 5],
  registers: [registry],
})
const APP_ERRORS = new Counter({
  name: METRICS.APP_ERRORS,
  help: 'Application errors grouped by finite error code',
  labelNames: ['code'],
  registers: [registry],
})

export function resetWebMetrics(): void {
  registry.resetMetrics()
}
