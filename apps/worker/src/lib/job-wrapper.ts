import {
  AppError,
  METRICS,
  type ErrorCode,
  type JobStatus,
} from '@aidream/core'
import { Counter, Gauge, Histogram, Registry } from 'prom-client'

import { workerLogger } from './logger.js'

export interface JobMeta {
  readonly queue: string
  readonly jobId: string
  readonly attempt: number
  readonly requestId?: string | undefined
}

export interface JobMetricSink {
  readonly duration: (queue: string, status: JobStatus, seconds: number) => void
  readonly total: (queue: string, status: JobStatus, code: string) => void
  readonly dlq: (queue: string) => void
}

export interface JobLogger {
  info(fields: Readonly<Record<string, unknown>>, message: string): void
  warn(fields: Readonly<Record<string, unknown>>, message: string): void
  error(fields: Readonly<Record<string, unknown>>, message: string): void
  debug(fields: Readonly<Record<string, unknown>>, message: string): void
}

export interface ObservableJob<TData> {
  readonly data: TData
  readonly id?: string | undefined
  readonly queueName?: string | undefined
  readonly attemptsMade?: number | undefined
  readonly opts?: { readonly attempts?: number | undefined } | undefined
}

export interface JobWrapperDependencies {
  readonly now: () => number
  readonly metrics: JobMetricSink
  readonly logger: (context: JobMeta) => JobLogger
}

export function withJob<TData, TResult>(
  name: string,
  handler: (data: TData, meta: JobMeta) => Promise<TResult>,
  dependencies: JobWrapperDependencies = productionDependencies,
): (job: ObservableJob<TData>) => Promise<TResult> {
  return async (job) => {
    const queue =
      job.queueName === undefined || job.queueName === '' ? name : job.queueName
    const jobId = job.id ?? 'unknown'
    const attempt = (job.attemptsMade ?? 0) + 1
    const requestId = requestIdFrom(job.data)
    const meta = {
      queue,
      jobId,
      attempt,
      ...(requestId === undefined ? {} : { requestId }),
    }
    const logger = dependencies.logger(meta)
    const startedAt = dependencies.now()
    logger.info({ name }, 'job started')
    let status: JobStatus = 'success'
    let code: ErrorCode | 'none' = 'none'
    try {
      const result = await handler(job.data, meta)
      safeMetric(() => {
        dependencies.metrics.total(queue, status, code)
      }, logger)
      logger.info({ name }, 'job completed')
      return result
    } catch (error: unknown) {
      status = error instanceof AppError ? 'failed' : 'error'
      code = error instanceof AppError ? error.code : 'E_INTERNAL'
      safeMetric(() => {
        dependencies.metrics.total(queue, status, code)
      }, logger)
      const lastAttempt = attempt >= (job.opts?.attempts ?? 1)
      if (lastAttempt) {
        safeMetric(() => {
          dependencies.metrics.dlq(queue)
        }, logger)
        logger.error({ err: error, name, code }, 'job exhausted retries')
      } else if (error instanceof AppError) {
        logger.warn({ err: error, name, code }, 'job failed; retry pending')
      } else {
        logger.error({ err: error, name, code }, 'job failed unexpectedly')
      }
      throw error
    } finally {
      safeMetric(() => {
        dependencies.metrics.duration(
          queue,
          status,
          (dependencies.now() - startedAt) / 1000,
        )
      }, logger)
    }
  }
}

function requestIdFrom(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('requestId' in data)) {
    return undefined
  }
  const value = data.requestId
  return typeof value === 'string' && value !== '' ? value : undefined
}

function safeMetric(work: () => void, logger: JobLogger): void {
  try {
    work()
  } catch (error: unknown) {
    logger.debug({ err: error }, 'job metric collection failed')
  }
}

const registry = new Registry()
const JOB_DURATION = new Histogram({
  name: METRICS.JOB_DURATION,
  help: 'Worker job duration in seconds',
  labelNames: ['queue', 'status'],
  registers: [registry],
})
const JOB_TOTAL = new Counter({
  name: METRICS.JOB_TOTAL,
  help: 'Worker jobs by completion status',
  labelNames: ['queue', 'status', 'code'],
  registers: [registry],
})
const QUEUE_DLQ = new Counter({
  name: METRICS.QUEUE_DLQ,
  help: 'Jobs that exhausted retries',
  labelNames: ['queue'],
  registers: [registry],
})
const QUEUE_DEPTH = new Gauge({
  name: METRICS.QUEUE_DEPTH,
  help: 'Jobs waiting or delayed by queue',
  labelNames: ['queue'],
  registers: [registry],
})
const QUEUE_WAIT = new Gauge({
  name: METRICS.QUEUE_WAIT,
  help: 'Age of the oldest waiting job in seconds',
  labelNames: ['queue'],
  registers: [registry],
})

const productionDependencies: JobWrapperDependencies = {
  now: Date.now,
  logger: workerLogger,
  metrics: {
    duration: (queue, status, seconds) => {
      JOB_DURATION.observe({ queue, status }, seconds)
    },
    total: (queue, status, code) => {
      JOB_TOTAL.inc({ queue, status, code })
    },
    dlq: (queue) => {
      QUEUE_DLQ.inc({ queue })
    },
  },
}

export function renderWorkerMetrics(): Promise<string> {
  return registry.metrics()
}

export const WORKER_METRICS_CONTENT_TYPE = registry.contentType

export function updateQueueMetrics(
  queue: string,
  depth: number,
  waitSeconds: number,
): void {
  QUEUE_DEPTH.set({ queue }, depth)
  QUEUE_WAIT.set({ queue }, waitSeconds)
}
