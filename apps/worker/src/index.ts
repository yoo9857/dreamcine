import {
  connectionFromUrl,
  DbPurgeJobSchema,
  EpisodeMediaDeleteJobSchema,
  PublishScheduledJobSchema,
  QUEUE,
  RankRecomputeJobSchema,
  RecoverStuckJobSchema,
  StorageCleanupJobSchema,
  TranscodeJobSchema,
} from '@aidream/queue'
import { Worker, type Job } from 'bullmq'
import { pathToFileURL } from 'node:url'
import pino from 'pino'

import { loadWorkerConfig } from './config.js'
import { cleanupOrphans } from './jobs/cleanup-orphans.js'
import { purgeDatabase } from './jobs/db-purge.js'
import { deleteEpisodeMedia } from './jobs/delete-episode-media.js'
import { publishScheduled } from './jobs/publish-scheduled.js'
import { rankRecompute } from './jobs/rank-recompute.js'
import { recoverStuck } from './jobs/recover-stuck.js'
import { processTranscodeJob } from './jobs/transcode.js'
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
      async (job: Job<unknown>) =>
        processTranscodeJob({
          ...TranscodeJobSchema.parse(job.data),
          signal: abortController.signal,
        }),
      {
        connection,
        concurrency: config.capacity.workerConcurrency,
        settings: { backoffStrategy: transcodeBackoff },
      },
    ),
    new Worker(
      QUEUE.STORAGE_CLEANUP,
      async (job: Job<unknown>) => {
        const data = StorageCleanupJobSchema.parse(job.data)
        return cleanupOrphans({ ...data, now: new Date() })
      },
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.RECOVER_STUCK,
      async (job: Job<unknown>) => {
        const data = RecoverStuckJobSchema.parse(job.data)
        return recoverStuck(data.olderThanMinutes, new Date())
      },
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.DB_PURGE,
      async (job: Job<unknown>) => {
        const data = DbPurgeJobSchema.parse(job.data)
        return purgeDatabase({ ...data, now: new Date() })
      },
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.EPISODE_PUBLISH,
      async (job: Job<unknown>) => {
        PublishScheduledJobSchema.parse(job.data)
        return publishScheduled({ now: new Date() })
      },
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.EPISODE_MEDIA_DELETE,
      async (job: Job<unknown>) =>
        deleteEpisodeMedia(EpisodeMediaDeleteJobSchema.parse(job.data)),
      { connection, concurrency: 1 },
    ),
    new Worker(
      QUEUE.FEED_RANK,
      async (job: Job<unknown>) => {
        const data = RankRecomputeJobSchema.parse(job.data)
        return rankRecompute({ ...data, now: new Date() })
      },
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
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal, role: config.processRole }, 'shutdown started')
    const timeout = setTimeout(() => {
      logger.error({ signal }, 'shutdown deadline exceeded')
      process.exitCode = 1
    }, 30_000)
    timeout.unref()
    try {
      await runtime.close()
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
