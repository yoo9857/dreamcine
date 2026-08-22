import { describe, expect, it } from 'vitest'

import { loadCapacity } from '../capacity.js'
import { LIMITS } from '../limits.js'
import { assertUploadAllowed, decidePartSize } from './upload-policy.js'

const T0 = loadCapacity('T0')
const T1 = loadCapacity('T1')

const MIB = 1024 ** 2
const GIB = 1024 ** 3

function request(
  overrides: Partial<Parameters<typeof assertUploadAllowed>[0]> = {},
) {
  return {
    fileName: 'drama.mp4',
    fileSize: 100 * MIB,
    mimeType: 'video/mp4',
    ...overrides,
  }
}

describe('decidePartSize', () => {
  it('작은 파일은 기본 파트 크기로 한 조각이다', () => {
    expect(decidePartSize(1 * MIB)).toEqual({
      partSize: LIMITS.PART_SIZE_DEFAULT,
      totalParts: 1,
    })
  })

  it('100MB 는 기본 크기로 나눈다', () => {
    const plan = decidePartSize(100 * MIB)

    expect(plan.partSize).toBe(32 * MIB)
    expect(plan.totalParts).toBe(Math.ceil((100 * MIB) / (32 * MIB)))
  })

  it('경계에서 파트 수가 상한을 넘지 않는다', () => {
    // 32MiB × 10,000 = 312.5GiB. 그 이하는 기본 크기로 충분하다.
    const exact = LIMITS.PART_SIZE_DEFAULT * LIMITS.PART_COUNT_MAX
    const plan = decidePartSize(exact)

    expect(plan.partSize).toBe(LIMITS.PART_SIZE_DEFAULT)
    expect(plan.totalParts).toBe(LIMITS.PART_COUNT_MAX)
  })

  it('상한을 한 바이트 넘기면 파트 크기를 배로 늘린다', () => {
    const overflow = LIMITS.PART_SIZE_DEFAULT * LIMITS.PART_COUNT_MAX + 1
    const plan = decidePartSize(overflow)

    expect(plan.partSize).toBe(LIMITS.PART_SIZE_DEFAULT * 2)
    expect(plan.totalParts).toBeLessThanOrEqual(LIMITS.PART_COUNT_MAX)
  })

  it('아무리 커도 파트 수 상한을 지킨다', () => {
    for (const size of [8 * GIB, 500 * GIB, 5000 * GIB]) {
      const plan = decidePartSize(size)

      expect(plan.totalParts).toBeLessThanOrEqual(LIMITS.PART_COUNT_MAX)
      expect(plan.partSize * plan.totalParts).toBeGreaterThanOrEqual(size)
    }
  })

  it('파트 크기가 S3 최소(5MiB) 아래로 내려가지 않는다', () => {
    // 마지막이 아닌 파트가 5MiB 미만이면 S3 가 EntityTooSmall 로 거부한다.
    expect(decidePartSize(1024).partSize).toBeGreaterThanOrEqual(
      LIMITS.PART_SIZE_MIN,
    )
  })

  it('파트 수는 최소 1이다', () => {
    // 0 을 돌려주면 서명할 파트가 없어 세션이 만들어지자마자 죽는다.
    expect(decidePartSize(0).totalParts).toBe(1)
    expect(decidePartSize(1).totalParts).toBe(1)
  })

  it('같은 입력에 같은 답을 준다 (서버와 클라이언트가 일치해야 한다)', () => {
    // 한쪽이 다른 크기로 쪼개면 파트 번호가 어긋나 이어 올릴 수 없다.
    const size = 1234 * MIB
    expect(decidePartSize(size)).toEqual(decidePartSize(size))
  })
})

describe('assertUploadAllowed — 용량', () => {
  it('정상 요청은 통과한다', () => {
    expect(() => {
      assertUploadAllowed(request(), T0)
    }).not.toThrow()
  })

  it('티어 상한을 넘으면 거부한다', () => {
    expect(() => {
      assertUploadAllowed(request({ fileSize: T0.uploadMaxBytes + 1 }), T0)
    }).toThrow(expect.objectContaining({ code: 'E_UPLOAD_TOO_LARGE' }) as Error)
  })

  it('상한 자체는 허용한다', () => {
    expect(() => {
      assertUploadAllowed(request({ fileSize: T0.uploadMaxBytes }), T0)
    }).not.toThrow()
  })

  it('상한은 티어에서 온다 (리터럴이 아니다)', () => {
    // T0 에서 막히는 크기가 T1 에서는 통과해야 한다. 코드가 아니라 티어가
    // 판정한다는 뜻이다. (11_CAPACITY_TIERS §1)
    const between = T0.uploadMaxBytes + 1

    expect(() => {
      assertUploadAllowed(request({ fileSize: between }), T0)
    }).toThrow()
    expect(() => {
      assertUploadAllowed(request({ fileSize: between }), T1)
    }).not.toThrow()
  })

  it('하한 미만도 거부한다', () => {
    expect(() => {
      assertUploadAllowed(
        request({ fileSize: LIMITS.UPLOAD_MIN_BYTES - 1 }),
        T0,
      )
    }).toThrow(expect.objectContaining({ code: 'E_UPLOAD_TOO_LARGE' }) as Error)
  })

  it('어느 경계인지 detail 로 구분한다', () => {
    // 사용자 문구가 "너무 큽니다" 와 "너무 작습니다" 로 갈려야 한다.
    let caught: unknown
    try {
      assertUploadAllowed(request({ fileSize: 1 }), T0)
    } catch (error: unknown) {
      caught = error
    }

    expect(
      (caught as { detail?: Record<string, unknown> }).detail,
    ).toMatchObject({
      reason: 'below-minimum',
    })
  })

  it('NaN·Infinity 를 거부한다', () => {
    for (const fileSize of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => {
        assertUploadAllowed(request({ fileSize }), T0)
      }).toThrow()
    }
  })
})

describe('assertUploadAllowed — 형식', () => {
  it('허용 목록 밖의 MIME 을 거부한다', () => {
    expect(() => {
      assertUploadAllowed(
        request({ fileName: 'a.avi', mimeType: 'video/x-msvideo' }),
        T0,
      )
    }).toThrow(
      expect.objectContaining({ code: 'E_UPLOAD_UNSUPPORTED_TYPE' }) as Error,
    )
  })

  it('영상이 아닌 것을 거부한다', () => {
    expect(() => {
      assertUploadAllowed(
        request({ fileName: 'a.pdf', mimeType: 'application/pdf' }),
        T0,
      )
    }).toThrow()
  })

  it.each([
    ['drama.mp4', 'video/mp4'],
    ['drama.m4v', 'video/mp4'],
    ['drama.mov', 'video/quicktime'],
    ['drama.mkv', 'video/x-matroska'],
    ['drama.webm', 'video/webm'],
  ])('%s / %s 는 통과한다', (fileName, mimeType) => {
    expect(() => {
      assertUploadAllowed(request({ fileName, mimeType }), T0)
    }).not.toThrow()
  })

  it('확장자가 MIME 과 어긋나면 거부한다', () => {
    // .mkv 를 video/mp4 라고 보내면 트랜스코드까지 갔다가 ffprobe 에서
    // 실패한다. 그 낭비를 여기서 끊는다.
    expect(() => {
      assertUploadAllowed(
        request({ fileName: 'drama.mkv', mimeType: 'video/mp4' }),
        T0,
      )
    }).toThrow(
      expect.objectContaining({ code: 'E_UPLOAD_UNSUPPORTED_TYPE' }) as Error,
    )
  })

  it('대문자 확장자를 허용한다', () => {
    expect(() => {
      assertUploadAllowed(request({ fileName: 'DRAMA.MP4' }), T0)
    }).not.toThrow()
  })

  it('확장자가 없으면 거부한다', () => {
    expect(() => {
      assertUploadAllowed(request({ fileName: 'drama' }), T0)
    }).toThrow()
  })

  it('숨김 파일처럼 점으로 시작하는 이름도 확장자로 오인하지 않는다', () => {
    // '.mp4' 는 확장자가 아니라 이름 전체다.
    expect(() => {
      assertUploadAllowed(request({ fileName: '.mp4' }), T0)
    }).toThrow()
  })

  it('용량을 형식보다 먼저 본다', () => {
    // 06 §2 의 순서 — 싼 검사부터. 잘못된 파일에 헛수고하지 않는다.
    let caught: unknown
    try {
      assertUploadAllowed(
        request({
          fileSize: T0.uploadMaxBytes + 1,
          fileName: 'a.avi',
          mimeType: 'video/x-msvideo',
        }),
        T0,
      )
    } catch (error: unknown) {
      caught = error
    }

    expect((caught as { code?: string }).code).toBe('E_UPLOAD_TOO_LARGE')
  })
})
