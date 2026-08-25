import {
  enqueue as enqueueJob,
  type DefinedQueue,
  type EnqueueOptions,
  type JobPayload,
} from '@aidream/queue'

import { getRequestContext } from './request-context.js'

/** Carries the current HTTP request ID into asynchronously processed work. */
export function enqueue<Q extends DefinedQueue>(
  name: Q,
  payload: JobPayload<Q>,
  options?: EnqueueOptions,
): Promise<void> {
  const requestId = getRequestContext()?.requestId
  const tracedPayload = {
    ...payload,
    ...(requestId === undefined ? {} : { requestId }),
  } as JobPayload<Q>
  return enqueueJob(name, tracedPayload, options)
}
