import {
  connectionFromUrl,
  CounterFlushJobSchema,
  CounterReconcileJobSchema,
  DbPurgeJobSchema,
  EpisodeMediaDeleteJobSchema,
  NotificationFanoutJobSchema,
  PublishScheduledJobSchema,
  QUEUE,
  RankRecomputeJobSchema,
  RecoverStuckJobSchema,
  StorageCleanupJobSchema,
  TranscodeJobSchema,
} from '@aidream/queue'
import { Worker } from 'bullmq'
import { pathToFileURL } from 'node:url'
import pino from 'pino'

import { loadWorkerConfig } from './config.js'
import { cleanupOrphans } from './jobs/cleanup-orphans.js'
import { counterFlushJob } from './jobs/counter-flush.js'
import { counterReconcileJob } from './jobs/counter-reconcile.js'
import { purgeDatabase } from './jobs/db-purge.js'
import { deleteEpisodeMedia } from './jobs/delete-episode-media.js'
import {
  drainNotificationFanout,
  processNotificationFanoutJob,
} from './jobs/notification-fanout.js'
import { publishScheduled } from './jobs/publish-scheduled.js'
import { rankRecompute } from './jobs/rank-recompute.js'
import { recoverStuck } from './jobs/recover-stuck.js'
import { processTranscodeJob } from './jobs/transcode.js'
import { withJob } from './lib/job-wrapper.js'
import { startMetricsServer } from './lib/metrics-server.js'
import { startScheduler } from './scheduler.js'

export interface WorkerRuntime {
  close(): Promise<void>
}

/** 첫 실패는 30초, 두 번째 실패는 2분 뒤에 재시도한다. */
export function transcodeBackoff(attemptsMade: number): number {
  return attemptsMade <= 1 ? 30_000 : 120_000
}

export function bootstrapWorker(): Promise<WorkerRuntime> {
  return startWorkers()
}

function startWorkers(): Promise<WorkerRuntime> {
  const config = loadWorkerConfig()
  const connection = connectionFromUrl(config.env.REDIS_URL)
  const logger = pino({ level: config.env.LOG_LEVEL })
  const abortController = new AbortController()
  const workers = [
    new Worker(
      QUEUE.VIDEO_TRANSCODE,
      withJob(QUEUE.VIDEO_TRANSCODE, async (data: unknown) =>
        processTranscodeJob({
          ...TranscodeJobSchema.parse(data),
          signal: abortController.signal,
        }),
      ),
      {
        connection,
        concurrency: config.capacity.workerConcurrency,
        settings: { backoffStrategy: transcodeBackoff },
      },
    ),
    new Worker(
      QUEUE.STORAGE_CLEANUP,
      withJob(QUEUE.STORAGE_CLEANUP, async (input: unknown) => {
        const data = StorageCleanupJobSchema.parse(input)
        return cleanupOrphans({ ...data, now: new Date() })
      }),
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.RECOVER_STUCK,
      withJob(QUEUE.RECOVER_STUCK, async (input: unknown) => {
        const data = RecoverStuckJobSchema.parse(input)
        return recoverStuck(data.olderThanMinutes, new Date())
      }),
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.DB_PURGE,
      withJob(QUEUE.DB_PURGE, async (input: unknown) => {
        const data = DbPurgeJobSchema.parse(input)
        return purgeDatabase({ ...data, now: new Date() })
      }),
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.EPISODE_PUBLISH,
      withJob(QUEUE.EPISODE_PUBLISH, async (data: unknown) => {
        PublishScheduledJobSchema.parse(data)
        return publishScheduled({ now: new Date() })
      }),
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.EPISODE_MEDIA_DELETE,
      withJob(QUEUE.EPISODE_MEDIA_DELETE, async (data: unknown) =>
        deleteEpisodeMedia(EpisodeMediaDeleteJobSchema.parse(data)),
      ),
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.FEED_RANK,
      withJob(QUEUE.FEED_RANK, async (input: unknown) => {
        const data = RankRecomputeJobSchema.parse(input)
        return rankRecompute({ ...data, now: new Date() })
      }),
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.COUNTER_FLUSH,
      withJob(QUEUE.COUNTER_FLUSH, async (data: unknown) => {
        CounterFlushJobSchema.parse(data)
        return counterFlushJob()
      }),
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.COUNTER_RECONCILE,
      withJob(QUEUE.COUNTER_RECONCILE, async (input: unknown) => {
        const data = CounterReconcileJobSchema.parse(input)
        const changedSince = new Date()
        changedSince.setUTCDate(
          changedSince.getUTCDate() - data.changedSinceDays,
        )
        return counterReconcileJob(changedSince)
      }),
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.NOTIFY_FANOUT,
      withJob(QUEUE.NOTIFY_FANOUT, async (input: unknown, _meta, job) => {
        const data = NotificationFanoutJobSchema.parse(input)
        return drainNotificationFanout(data, {
          process: processNotificationFanoutJob,
          checkpoint: async (next) => {
            await job.updateData?.(next)
          },
          pause: () =>
            new Promise((resolve) => {
              setTimeout(resolve, 25)
            }),
        })
      }),
      { connection, concurrency: 1 },
    ),
  ]
  workers.forEach((worker) => {
    worker.on('error', (error) => {
      logger.error({ err: error }, 'worker error')
    })
  })

  let closing: Promise<void> | undefined
  return Promise.resolve({
    close: () => {
      closing ??= (async () => {
        await Promise.all(workers.map((worker) => worker.pause()))
        abortController.abort()
        await Promise.all(workers.map((worker) => worker.close(true)))
      })()
      return closing
    },
  })
}

async function main(): Promise<void> {
  const config = loadWorkerConfig()
  const logger = pino({ level: config.env.LOG_LEVEL })
  const runtime =
    config.processRole === 'scheduler'
      ? await startScheduler()
      : await bootstrapWorker()
  const metricsServer =
    config.processRole === 'scheduler'
      ? undefined
      : await startMetricsServer(config.env.WORKER_METRICS_PORT)
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal, role: config.processRole }, 'shutdown started')
    const timeout = setTimeout(() => {
      logger.error({ signal }, 'shutdown deadline exceeded')
      process.exitCode = 1
    }, 30_000)
    timeout.unref()
    try {
      await Promise.all([runtime.close(), metricsServer?.close()])
    } finally {
      clearTimeout(timeout)
    }
  }
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
  process.once('SIGINT', () => {
    void shutdown('SIGINT')
  })
}

const entryPath = process.argv[1]
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(entryPath).href
) {
  void main().catch((error: unknown) => {
    pino().fatal({ err: error }, 'worker bootstrap failed')
    process.exitCode = 1
  })
}
