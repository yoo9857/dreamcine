export const METRICS = {
  HTTP_DURATION: 'aidream_http_request_duration_seconds',
  HTTP_TOTAL: 'aidream_http_requests_total',
  JOB_DURATION: 'aidream_job_duration_seconds',
  JOB_TOTAL: 'aidream_jobs_total',
  TRANSCODE_DURATION: 'aidream_transcode_duration_seconds',
  TRANSCODE_TOTAL: 'aidream_transcode_total',
  QUEUE_DEPTH: 'aidream_queue_depth',
  QUEUE_WAIT: 'aidream_queue_wait_seconds',
  QUEUE_DLQ: 'aidream_queue_dlq_total',
  UPLOAD_BYTES: 'aidream_upload_bytes_total',
  DB_QUERY_DURATION: 'aidream_db_query_duration_seconds',
  DB_POOL_USED: 'aidream_db_pool_used',
  STORAGE_ERRORS: 'aidream_storage_errors_total',
  COUNTER_DRIFT: 'aidream_counter_drift_total',
  APP_ERRORS: 'aidream_app_errors_total',
  PLAYBACK_TTFF: 'aidream_playback_ttff_seconds',
  BUSINESS_UPLOADS: 'aidream_uploads_completed_total',
  BUSINESS_VIEWS: 'aidream_views_total',
} as const

export type MetricName = (typeof METRICS)[keyof typeof METRICS]
export type HttpStatusClass = '2xx' | '3xx' | '4xx' | '5xx'
export type JobStatus = 'success' | 'failed' | 'error'

export function normalizeRoutePattern(path: string): string {
  const pathname = path.split('?')[0] ?? path
  const segments = pathname.split('/')
  const dynamicParents: Readonly<Record<string, string>> = {
    assets: '[id]',
    comments: '[id]',
    episodes: '[id]',
    series: '[id]',
    uploads: '[id]',
    users: '[handle]',
    tags: '[tag]',
    reports: '[id]',
  }
  for (let index = 0; index < segments.length - 1; index += 1) {
    const replacement = dynamicParents[segments[index] ?? '']
    const candidate = segments[index + 1]
    if (
      replacement !== undefined &&
      candidate !== undefined &&
      candidate !== '' &&
      !STATIC_ROUTE_SEGMENTS.has(candidate)
    ) {
      segments[index + 1] = replacement
    }
  }
  return segments.join('/') || '/'
}

export function httpStatusClass(status: number): HttpStatusClass {
  if (!Number.isInteger(status) || status < 200 || status >= 600) return '5xx'
  const group = Math.floor(status / 100)
  if (group === 2) return '2xx'
  if (group === 3) return '3xx'
  if (group === 4) return '4xx'
  return '5xx'
}

const STATIC_ROUTE_SEGMENTS = new Set([
  'age-confirm',
  'comments',
  'complete',
  'follow',
  'likes',
  'parts',
  'playback',
  'progress',
  'publish',
  'read',
  'retry',
  'trending',
  'views',
])
