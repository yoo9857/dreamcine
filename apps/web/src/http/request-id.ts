import { randomBytes } from 'node:crypto'

/** Crockford base32 (I, L, O, U 제외). */
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

const TIME_CHARS = 10
const RANDOM_BYTES = 10
const RANDOM_CHARS = 16

/** ULID 는 26자다. 시간 10자 + 난수 16자. */
export const REQUEST_ID_LENGTH = TIME_CHARS + RANDOM_CHARS

function encodeTime(milliseconds: number): string {
  let value = Math.floor(milliseconds)
  let out = ''
  for (let index = 0; index < TIME_CHARS; index += 1) {
    out = ENCODING.charAt(value % 32) + out
    value = Math.floor(value / 32)
  }
  return out
}

function encodeRandom(): string {
  const bytes = randomBytes(RANDOM_BYTES)
  let accumulator = 0
  let bits = 0
  let out = ''
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += ENCODING.charAt((accumulator >> bits) & 31)
    }
  }
  return out
}

/**
 * 외부 패키지 없이 만드는 ULID. 시간순 정렬이 되므로 로그를 시간축으로 훑을 때
 * 유용하다. 암호학적 용도가 아니라 상관관계 추적용이다.
 */
export function createRequestId(nowMs: number = Date.now()): string {
  return `${encodeTime(nowMs)}${encodeRandom()}`
}
