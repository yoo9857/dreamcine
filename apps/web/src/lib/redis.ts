import { NotImplementedError } from '@aidream/core'

/**
 * 레이트리밋과 readiness 가 필요한 최소 명령만 노출하는 관문.
 * 큐(BullMQ)는 워커 쪽 관심사이므로 이 게이트웨이를 공유하지 않는다.
 */
export interface RedisGateway {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<void>
  ttl(key: string): Promise<number>
  ping(): Promise<void>
}

export function getRedis(): RedisGateway {
  throw new NotImplementedError('T03:redis')
}
