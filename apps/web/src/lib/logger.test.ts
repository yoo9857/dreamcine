import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { REDACT_CENSOR, REDACT_PATHS, createLogger } from './logger'

const originalLevel = process.env.LOG_LEVEL

interface Capture {
  lines: string[]
  stream: { write(chunk: string): void }
}

function capture(): Capture {
  const lines: string[] = []
  return {
    lines,
    stream: {
      write(chunk: string): void {
        lines.push(chunk)
      },
    },
  }
}

function parsed(lines: readonly string[]): Record<string, unknown>[] {
  return lines.map((line) => JSON.parse(line) as Record<string, unknown>)
}

beforeEach(() => {
  process.env.LOG_LEVEL = 'trace'
})

afterEach(() => {
  if (originalLevel === undefined) {
    delete process.env.LOG_LEVEL
  } else {
    process.env.LOG_LEVEL = originalLevel
  }
})

describe('logger', () => {
  it('JSON 한 줄로 출력한다', () => {
    const sink = capture()
    createLogger(sink.stream).info({ requestId: 'r1' }, 'request')

    expect(sink.lines).toHaveLength(1)
    const [record] = parsed(sink.lines)
    expect(record).toMatchObject({ requestId: 'r1', msg: 'request' })
  })

  it('모든 레벨을 지원한다', () => {
    const sink = capture()
    const logger = createLogger(sink.stream)
    logger.trace({}, 't')
    logger.debug({}, 'd')
    logger.info({}, 'i')
    logger.warn({}, 'w')
    logger.error({}, 'e')

    expect(parsed(sink.lines).map((record) => record.msg)).toEqual([
      't',
      'd',
      'i',
      'w',
      'e',
    ])
  })

  it('password 와 passwordHash 를 가린다', () => {
    const sink = capture()
    createLogger(sink.stream).info(
      { input: { password: 'plaintext', passwordHash: '$argon2id$real' } },
      'signup',
    )

    const raw = sink.lines.join('')
    expect(raw).not.toContain('plaintext')
    expect(raw).not.toContain('$argon2id$real')
    expect(raw).toContain(REDACT_CENSOR)
  })

  it('token · secret · signedUrl 을 가린다', () => {
    const sink = capture()
    createLogger(sink.stream).info(
      {
        mail: { token: 'verify-token-value' },
        env: { secret: 'auth-secret-value' },
        upload: { signedUrl: 'https://s3.example.com/put?sig=abc' },
      },
      'sent',
    )

    const raw = sink.lines.join('')
    expect(raw).not.toContain('verify-token-value')
    expect(raw).not.toContain('auth-secret-value')
    expect(raw).not.toContain('sig=abc')
  })

  it('요청 쿠키와 Authorization 헤더를 가린다', () => {
    const sink = capture()
    createLogger(sink.stream).info(
      {
        req: {
          headers: {
            cookie: 'authjs.session-token=super-secret',
            authorization: 'Bearer super-token',
          },
        },
      },
      'request',
    )

    const raw = sink.lines.join('')
    expect(raw).not.toContain('super-secret')
    expect(raw).not.toContain('super-token')
  })

  it('S3 자격증명을 가린다', () => {
    const sink = capture()
    createLogger(sink.stream).error(
      { storage: { accessKeyId: 'AKIA-real', secretAccessKey: 'shhh' } },
      'storage failed',
    )

    const raw = sink.lines.join('')
    expect(raw).not.toContain('AKIA-real')
    expect(raw).not.toContain('shhh')
  })

  it('LOG_LEVEL 보다 낮은 레벨은 출력하지 않는다', () => {
    process.env.LOG_LEVEL = 'warn'
    const sink = capture()
    const logger = createLogger(sink.stream)
    logger.info({}, 'ignored')
    logger.debug({}, 'ignored')
    logger.warn({}, 'kept')

    expect(parsed(sink.lines).map((record) => record.msg)).toEqual(['kept'])
  })

  it('알 수 없는 LOG_LEVEL 은 info 로 떨어진다', () => {
    process.env.LOG_LEVEL = 'nonsense'
    const sink = capture()
    const logger = createLogger(sink.stream)
    logger.debug({}, 'ignored')
    logger.info({}, 'kept')

    expect(parsed(sink.lines).map((record) => record.msg)).toEqual(['kept'])
  })

  it('redact 목록이 07_AUTH_SECURITY §9 와 일치한다', () => {
    expect([...REDACT_PATHS]).toEqual([
      'req.headers.cookie',
      'req.headers.authorization',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.secret',
      '*.accessKeyId',
      '*.secretAccessKey',
      '*.signedUrl',
      '*.url',
    ])
  })
})
