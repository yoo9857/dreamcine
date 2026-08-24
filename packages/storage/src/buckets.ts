import { AppError } from '@aidream/core'

/**
 * 버킷의 **논리 이름**. 실제 이름은 env(`S3_BUCKET_*`)에서 온다.
 * 논리 이름과 실제 이름을 분리하는 이유는 버킷을 갈아탈 때 키 조립 코드가
 * 한 글자도 바뀌지 않게 하려는 것이다. (06_MEDIA_PIPELINE.md §1)
 */
export const BUCKET = {
  ORIGINALS: 'originals',
  HLS: 'hls',
  THUMBS: 'thumbs',
} as const

export type BucketKind = (typeof BUCKET)[keyof typeof BUCKET]

/** T04 §5 — 200자로 절단하되 확장자를 보존한다. */
const MAX_FILE_NAME_LENGTH = 200

/** 확장자로 인정하는 길이의 상한. 이보다 길면 확장자가 아니라 본문이다. */
const MAX_EXTENSION_LENGTH = 20

/** 새니타이즈 결과가 비면 이 이름을 쓴다. */
const FALLBACK_FILE_NAME = 'upload'

/**
 * 제어문자와 NULL. 키에 들어가면 도구마다 다르게 해석한다.
 *
 * `/g` 정규식과 `/g` 없는 정규식을 **따로 둔다.** 전역 정규식은
 * `lastIndex` 를 들고 있어서 같은 정규식으로 `.test()` 를 두 번
 * 부르면 두 번째가 false 를 돌려준다 — 검사가 호출마다 번갈아
 * 통과하게 된다.
 */
const CONTROL_CHARACTERS_GLOBAL = /\p{Cc}/gu
const CONTROL_CHARACTER = /\p{Cc}/u

const PATH_SEPARATORS = /[/\\]/gu

/** `.` `..` `...` 처럼 점만 남은 이름은 경로 자체를 의미한다. */
const ONLY_DOTS = /^\.+$/u

/**
 * 길이를 **자소(grapheme) 단위**로 센다.
 *
 * UTF-16 단위로 자르면 이모지의 서러게이트 페어가 반토막 난다. 코드 포인트로
 * 자르면 그건 막지만 ZWJ 로 이어진 이모지(가족 이모지 등)가 쪼개져 매달린
 * 결합자가 남는다. "200자" 를 사람이 세는 방식과 같게 하려면 자소여야 한다.
 */
const GRAPHEMES = new Intl.Segmenter('ko', { granularity: 'grapheme' })

function graphemes(value: string): string[] {
  return [...GRAPHEMES.segment(value)].map((part) => part.segment)
}

function truncatePreservingExtension(name: string, max: number): string {
  const units = graphemes(name)
  if (units.length <= max) {
    return name
  }

  const dot = name.lastIndexOf('.')
  const extension = dot > 0 ? name.slice(dot) : ''
  const extensionLength = graphemes(extension).length
  if (extension === '' || extensionLength > MAX_EXTENSION_LENGTH) {
    return units.slice(0, max).join('')
  }

  const base = graphemes(name.slice(0, dot))
  return base.slice(0, Math.max(1, max - extensionLength)).join('') + extension
}

/**
 * 원본 파일명은 **사용자 입력**이다. 키에 그대로 들어가면 다른 사용자
 * 영역에 쓰는 것이 가능해진다. `originalKey()` 가 내부에서 호출하므로
 * 호출자가 잊어도 안전하다. (T04 §5)
 *
 * 순서가 중요하다 — NFC 정규화를 먼저 한다. 정규화가 문자 구성을 바꾸므로
 * 그 뒤에 걸러야 걸러진 것이 최종형이다. 경로 구분자를 지운 다음 `..` 를
 * 지우고, `..` 는 **사라질 때까지 반복**한다. 한 번만 지우면 `....` 가
 * `..` 로 남는다.
 */
export function sanitizeFileName(raw: string): string {
  let name = raw
    .normalize('NFC')
    .replace(CONTROL_CHARACTERS_GLOBAL, '')
    .replace(PATH_SEPARATORS, '')

  while (name.includes('..')) {
    name = name.replaceAll('..', '')
  }
  name = name.trim()

  if (name === '' || ONLY_DOTS.test(name)) {
    return FALLBACK_FILE_NAME
  }
  return truncatePreservingExtension(name, MAX_FILE_NAME_LENGTH)
}

/**
 * 키의 중간 조각은 우리 DB 의 id 다. 거기에 경로 문자가 들어 있다면
 * 새니타이즈로 조용히 고칠 일이 아니라 **프로그래밍 오류**다. id 를 몰래
 * 바꾸면 잘못된 위치를 정상으로 착각하게 된다.
 */
function assertSegment(value: string, label: string): string {
  const unsafe =
    value === '' ||
    value.includes('/') ||
    value.includes('\\') ||
    value.includes('..') ||
    CONTROL_CHARACTER.test(value)
  if (unsafe) {
    throw new AppError('E_INTERNAL', { reason: 'unsafe-key-segment', label })
  }
  return value
}

/** `originals/{userId}/{uploadSessionId}/{파일명}` */
export function originalKey(
  userId: string,
  sessionId: string,
  fileName: string,
): string {
  return [
    BUCKET.ORIGINALS,
    assertSegment(userId, 'userId'),
    assertSegment(sessionId, 'sessionId'),
    sanitizeFileName(fileName),
  ].join('/')
}

/** `hls/{assetId}/` — 프리픽스 삭제의 대상 */
export function hlsPrefix(assetId: string): string {
  return `${BUCKET.HLS}/${assertSegment(assetId, 'assetId')}/`
}

/** `hls/{assetId}/master.m3u8` */
export function hlsMasterKey(assetId: string): string {
  return `${hlsPrefix(assetId)}master.m3u8`
}

/** `hls/{assetId}/{rendition}/{file}` */
export function hlsRenditionKey(
  assetId: string,
  rendition: string,
  file: string,
): string {
  return `${hlsPrefix(assetId)}${assertSegment(rendition, 'rendition')}/${assertSegment(file, 'file')}`
}

/** `thumbs/{assetId}/{file}` */
export function thumbKey(assetId: string, file: string): string {
  return `${BUCKET.THUMBS}/${assertSegment(assetId, 'assetId')}/${assertSegment(file, 'file')}`
}

export function thumbPrefix(assetId: string): string {
  return `${BUCKET.THUMBS}/${assertSegment(assetId, 'assetId')}/`
}

/** `thumbs/avatars/{userId}.webp` */
export function avatarKey(userId: string): string {
  return `${BUCKET.THUMBS}/avatars/${assertSegment(userId, 'userId')}.webp`
}

/** `thumbs/posters/series/{seriesId}.webp` */
export function seriesPosterKey(seriesId: string): string {
  return `${BUCKET.THUMBS}/posters/series/${assertSegment(seriesId, 'seriesId')}.webp`
}
