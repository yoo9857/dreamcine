import { NotImplementedError } from '../errors/not-implemented.js'

export const METRICS = {
  HTTP_DURATION: 'aidream_http_request_duration_seconds',
  HTTP_TOTAL: 'aidream_http_requests_total',
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
  void path
  throw new NotImplementedError('T11:normalizeRoutePattern')
}

export function httpStatusClass(status: number): HttpStatusClass {
  void status
  throw new NotImplementedError('T11:httpStatusClass')
}
