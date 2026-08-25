import { createServer } from 'node:http'
import { getQueue, QUEUE_NAMES, type DefinedQueue } from '@aidream/queue'

import {
  renderWorkerMetrics,
  updateQueueMetrics,
  WORKER_METRICS_CONTENT_TYPE,
} from './job-wrapper.js'
import { workerLogger } from './logger.js'

export interface MetricsServerHandle {
  readonly port: number
  close(): Promise<void>
}

export async function startMetricsServer(
  port: number,
): Promise<MetricsServerHandle> {
  const server = createServer((request, response) => {
    if (request.url !== '/metrics') {
      response.writeHead(404).end()
      return
    }
    void renderWorkerMetrics()
      .then((body) => {
        response.writeHead(200, { 'content-type': WORKER_METRICS_CONTENT_TYPE })
        response.end(body)
      })
      .catch(() => {
        response.writeHead(500).end()
      })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '0.0.0.0', resolve)
  })
  const address = server.address()
  const actualPort =
    typeof address === 'object' && address !== null ? address.port : port
  const sampler = setInterval(() => {
    void collectQueueMetrics().catch((error: unknown) => {
      workerLogger().warn({ err: error }, 'queue metric collection failed')
    })
  }, 15_000)
  sampler.unref()
  return {
    port: actualPort,
    close: () => {
      clearInterval(sampler)
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error === undefined) resolve()
          else reject(error)
        })
      })
    },
  }
}

async function collectQueueMetrics(): Promise<void> {
  await Promise.all(
    QUEUE_NAMES.map(async (queueName) => {
      const queue = getQueue(queueName as DefinedQueue)
      const [counts, oldest] = await Promise.all([
        queue.getJobCounts('waiting', 'delayed'),
        queue.getWaiting(0, 0),
      ])
      const depth = (counts.waiting ?? 0) + (counts.delayed ?? 0)
      const timestamp = oldest[0]?.timestamp
      const waitSeconds =
        timestamp === undefined
          ? 0
          : Math.max(0, (Date.now() - timestamp) / 1000)
      updateQueueMetrics(queueName, depth, waitSeconds)
    }),
  )
}
