import { AsyncLocalStorage } from 'node:async_hooks'

export interface RequestContext {
  requestId: string
  method: string
  path: string
  userId?: string | undefined
}

const storage = new AsyncLocalStorage<RequestContext>()

/**
 * 요청 하나의 로그를 하나의 `requestId` 로 묶는다. 로거를 인자로 넘겨 다니지
 * 않고도 어느 계층에서든 상관관계 정보를 얻을 수 있다.
 */
export function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => T,
): T {
  return storage.run(context, callback)
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore()
}

/** 세션이 해석된 뒤 userId 를 채운다. 같은 요청의 이후 로그에 함께 남는다. */
export function setContextUserId(userId: string): void {
  const context = storage.getStore()
  if (context !== undefined) {
    context.userId = userId
  }
}
