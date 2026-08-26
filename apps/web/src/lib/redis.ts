import { Socket } from 'node:net'

import { AppError } from '@aidream/core'

/**
 * 레이트리밋과 readiness 가 필요한 최소 명령만 노출하는 관문.
 * 큐(BullMQ)는 워커 쪽 관심사이므로 이 게이트웨이를 공유하지 않는다.
 */
export interface RedisGateway {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<void>
  ttl(key: string): Promise<number>
  ping(): Promise<void>
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSec: number): Promise<void>
  setIfAbsent(key: string, value: string, ttlSec: number): Promise<boolean>
  getdel(key: string): Promise<string | null>
  incrby(key: string, by: number): Promise<number>
}

export function isSetNxSuccess(reply: unknown): boolean {
  if (reply === 'OK') return true
  if (reply === null) return false
  throw new AppError('E_QUEUE_UNAVAILABLE', { reason: 'unexpected-reply' })
}

export function assertSetSuccess(reply: unknown): void {
  if (reply !== 'OK') {
    throw new AppError('E_QUEUE_UNAVAILABLE', { reason: 'unexpected-reply' })
  }
}

export interface RedisTarget {
  host: string
  port: number
  username: string | undefined
  password: string | undefined
  db: number | undefined
}

const CONNECT_TIMEOUT_MS = 2000
const COMMAND_TIMEOUT_MS = 1000
const MAX_PENDING_COMMANDS = 1024
const CRLF = '\r\n'

export function parseRedisUrl(raw: string): RedisTarget {
  let url: URL
  try {
    url = new URL(raw)
  } catch (error: unknown) {
    throw new AppError('E_QUEUE_UNAVAILABLE', { reason: 'invalid-url' }, error)
  }
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new AppError('E_QUEUE_UNAVAILABLE', { reason: 'invalid-protocol' })
  }
  const database = url.pathname.replace(/^\//u, '')
  return {
    host: url.hostname === '' ? '127.0.0.1' : url.hostname,
    port: url.port === '' ? 6379 : Number(url.port),
    username:
      url.username === '' ? undefined : decodeURIComponent(url.username),
    password:
      url.password === '' ? undefined : decodeURIComponent(url.password),
    db: database === '' ? undefined : Number(database),
  }
}

type RedisReply = string | number | null

type ParseOutcome =
  | { kind: 'incomplete' }
  | { kind: 'value'; reply: RedisReply; rest: Buffer }
  | { kind: 'error'; message: string; rest: Buffer }

/** RESP2 중 우리가 쓰는 4종(simple string / error / integer / bulk string)만 읽는다. */
function parseReply(buffer: Buffer): ParseOutcome {
  const lineEnd = buffer.indexOf(CRLF)
  if (lineEnd === -1) {
    return { kind: 'incomplete' }
  }
  const prefix = buffer.subarray(0, 1).toString('ascii')
  const payload = buffer.subarray(1, lineEnd).toString('utf8')
  const afterLine = buffer.subarray(lineEnd + CRLF.length)

  switch (prefix) {
    case '+':
      return { kind: 'value', reply: payload, rest: afterLine }
    case '-':
      return { kind: 'error', message: payload, rest: afterLine }
    case ':':
      return { kind: 'value', reply: Number(payload), rest: afterLine }
    case '$': {
      const length = Number(payload)
      if (length === -1) {
        return { kind: 'value', reply: null, rest: afterLine }
      }
      if (afterLine.length < length + CRLF.length) {
        return { kind: 'incomplete' }
      }
      return {
        kind: 'value',
        reply: afterLine.subarray(0, length).toString('utf8'),
        rest: afterLine.subarray(length + CRLF.length),
      }
    }
    default:
      return {
        kind: 'error',
        message: `unsupported reply prefix: ${prefix}`,
        rest: afterLine,
      }
  }
}

function encodeCommand(args: readonly string[]): Buffer {
  const parts = [Buffer.from(`*${String(args.length)}${CRLF}`, 'utf8')]
  for (const arg of args) {
    parts.push(
      Buffer.from(
        `$${String(Buffer.byteLength(arg))}${CRLF}${arg}${CRLF}`,
        'utf8',
      ),
    )
  }
  return Buffer.concat(parts)
}

interface Pending {
  resolve: (reply: RedisReply) => void
  reject: (error: unknown) => void
  timer: NodeJS.Timeout
}

/**
 * 명령을 순서대로 보내고 응답도 순서대로 받는 단일 커넥션.
 * 소켓이 끊기면 대기 중인 명령을 전부 거절하고 다음 호출에서 다시 연결한다.
 */
class RedisConnection {
  readonly #target: RedisTarget
  #socket: Socket | null = null
  #handshake: Promise<Socket> | null = null
  #buffer: Buffer = Buffer.alloc(0)
  #pending: Pending[] = []

  constructor(target: RedisTarget) {
    this.#target = target
  }

  async command(args: readonly string[]): Promise<RedisReply> {
    const socket = await this.#connect()
    if (this.#pending.length >= MAX_PENDING_COMMANDS) {
      throw new AppError('E_QUEUE_UNAVAILABLE', { reason: 'overloaded' })
    }
    return new Promise<RedisReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#fail(new AppError('E_QUEUE_UNAVAILABLE', { reason: 'timeout' }))
      }, COMMAND_TIMEOUT_MS)
      timer.unref()
      this.#pending.push({ resolve, reject, timer })
      socket.write(encodeCommand(args))
    })
  }

  #connect(): Promise<Socket> {
    const existing = this.#socket
    if (existing !== null && !existing.destroyed) {
      return Promise.resolve(existing)
    }
    this.#handshake ??= this.#openAndAuthenticate().catch((error: unknown) => {
      this.#handshake = null
      throw error
    })
    return this.#handshake
  }

  async #openAndAuthenticate(): Promise<Socket> {
    const socket = await this.#open()
    this.#socket = socket

    const { username, password, db } = this.#target
    if (password !== undefined) {
      await this.command(
        username === undefined
          ? ['AUTH', password]
          : ['AUTH', username, password],
      )
    }
    if (db !== undefined && db !== 0) {
      await this.command(['SELECT', String(db)])
    }
    return socket
  }

  #open(): Promise<Socket> {
    return new Promise<Socket>((resolve, reject) => {
      const socket = new Socket()
      socket.setNoDelay(true)
      const onFailure = (cause: unknown): void => {
        socket.destroy()
        reject(
          new AppError('E_QUEUE_UNAVAILABLE', { reason: 'connect' }, cause),
        )
      }
      socket.setTimeout(CONNECT_TIMEOUT_MS, () => {
        onFailure(new Error('redis connect timeout'))
      })
      socket.once('error', onFailure)
      socket.connect(this.#target.port, this.#target.host, () => {
        socket.setTimeout(0)
        socket.removeListener('error', onFailure)
        socket.on('data', (chunk: Buffer) => {
          this.#receive(chunk)
        })
        socket.on('error', (error: Error) => {
          this.#fail(
            new AppError('E_QUEUE_UNAVAILABLE', { reason: 'socket' }, error),
          )
        })
        socket.on('close', () => {
          this.#fail(new AppError('E_QUEUE_UNAVAILABLE', { reason: 'closed' }))
        })
        resolve(socket)
      })
    })
  }

  #receive(chunk: Buffer): void {
    this.#buffer = Buffer.concat([this.#buffer, chunk])
    for (;;) {
      const outcome = parseReply(this.#buffer)
      if (outcome.kind === 'incomplete') {
        return
      }
      this.#buffer = outcome.rest
      const pending = this.#pending.shift()
      if (pending === undefined) {
        continue
      }
      clearTimeout(pending.timer)
      if (outcome.kind === 'error') {
        pending.reject(
          new AppError('E_QUEUE_UNAVAILABLE', { redisError: outcome.message }),
        )
        continue
      }
      pending.resolve(outcome.reply)
    }
  }

  /** 호출자가 커넥션을 정리한다. 테스트·워커 종료 경로에서만 쓴다. */
  close(): void {
    this.#fail(
      new AppError('E_QUEUE_UNAVAILABLE', { reason: 'closed-by-caller' }),
    )
  }

  /** 소켓 단위 실패. 대기 중인 모든 명령을 같은 이유로 거절한다. */
  #fail(error: AppError): void {
    const socket = this.#socket
    this.#socket = null
    this.#handshake = null
    this.#buffer = Buffer.alloc(0)
    const pending = this.#pending
    this.#pending = []
    for (const entry of pending) {
      clearTimeout(entry.timer)
      entry.reject(error)
    }
    if (socket !== null && !socket.destroyed) {
      socket.destroy()
    }
  }
}

function expectNumber(reply: RedisReply): number {
  if (typeof reply !== 'number') {
    throw new AppError('E_QUEUE_UNAVAILABLE', { reason: 'unexpected-reply' })
  }
  return reply
}

export function expectNullableString(reply: unknown): string | null {
  if (reply === null || typeof reply === 'string') return reply
  throw new AppError('E_QUEUE_UNAVAILABLE', { reason: 'unexpected-reply' })
}

class RedisClient implements RedisGateway {
  readonly #connection: RedisConnection

  constructor(target: RedisTarget) {
    this.#connection = new RedisConnection(target)
  }

  async incr(key: string): Promise<number> {
    return expectNumber(await this.#connection.command(['INCR', key]))
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.#connection.command(['EXPIRE', key, String(seconds)])
  }

  async ttl(key: string): Promise<number> {
    return expectNumber(await this.#connection.command(['TTL', key]))
  }

  async ping(): Promise<void> {
    const reply = await this.#connection.command(['PING'])
    if (reply !== 'PONG') {
      throw new AppError('E_QUEUE_UNAVAILABLE', { reason: 'unexpected-pong' })
    }
  }

  async get(key: string): Promise<string | null> {
    const reply = await this.#connection.command(['GET', key])
    if (reply === null || typeof reply === 'string') return reply
    throw new AppError('E_QUEUE_UNAVAILABLE', { reason: 'unexpected-reply' })
  }

  async set(key: string, value: string, ttlSec: number): Promise<void> {
    assertSetSuccess(
      await this.#connection.command(['SET', key, value, 'EX', String(ttlSec)]),
    )
  }

  async setIfAbsent(
    key: string,
    value: string,
    ttlSec: number,
  ): Promise<boolean> {
    return isSetNxSuccess(
      await this.#connection.command([
        'SET',
        key,
        value,
        'NX',
        'EX',
        String(ttlSec),
      ]),
    )
  }

  async getdel(key: string): Promise<string | null> {
    return expectNullableString(await this.#connection.command(['GETDEL', key]))
  }

  async incrby(key: string, by: number): Promise<number> {
    return expectNumber(
      await this.#connection.command(['INCRBY', key, String(by)]),
    )
  }

  close(): void {
    this.#connection.close()
  }
}

let cached: { url: string; client: RedisClient } | undefined

export function getRedis(): RedisGateway {
  const url = process.env.REDIS_URL
  if (url === undefined || url === '') {
    throw new AppError('E_QUEUE_UNAVAILABLE', { reason: 'missing-url' })
  }
  if (cached?.url !== url) {
    cached = { url, client: new RedisClient(parseRedisUrl(url)) }
  }
  return cached.client
}

/**
 * 열린 커넥션을 닫는다. 살아있는 소켓은 이벤트 루프를 붙잡으므로 테스트
 * 프로세스가 끝나지 않을 수 있다. 서버는 리스닝 소켓이 루프를 유지하므로
 * 이 함수를 부르지 않는다.
 */
export function closeRedis(): void {
  cached?.client.close()
  cached = undefined
}
