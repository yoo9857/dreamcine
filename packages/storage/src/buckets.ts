import { NotImplementedError } from '@aidream/core'

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

/**
 * 원본 파일명은 **사용자 입력**이다. 키에 그대로 들어가면 다른 사용자 영역에
 * 쓰는 것이 가능해진다. `originalKey()` 가 내부에서 호출하므로 호출자가
 * 잊어도 안전하다. (T04 §5 파일명 새니타이즈)
 */
export function sanitizeFileName(_raw: string): string {
  throw new NotImplementedError('T04:keys')
}

/** `originals/{userId}/{uploadSessionId}/{파일명}` */
export function originalKey(
  _userId: string,
  _sessionId: string,
  _fileName: string,
): string {
  throw new NotImplementedError('T04:keys')
}

/** `hls/{assetId}/` — 프리픽스 삭제의 대상 */
export function hlsPrefix(_assetId: string): string {
  throw new NotImplementedError('T04:keys')
}

/** `hls/{assetId}/master.m3u8` */
export function hlsMasterKey(_assetId: string): string {
  throw new NotImplementedError('T04:keys')
}

/** `hls/{assetId}/{rendition}/{file}` */
export function hlsRenditionKey(
  _assetId: string,
  _rendition: string,
  _file: string,
): string {
  throw new NotImplementedError('T04:keys')
}

/** `thumbs/{assetId}/{file}` */
export function thumbKey(_assetId: string, _file: string): string {
  throw new NotImplementedError('T04:keys')
}

/** `thumbs/avatars/{userId}.webp` */
export function avatarKey(_userId: string): string {
  throw new NotImplementedError('T04:keys')
}

/** `thumbs/posters/series/{seriesId}.webp` */
export function seriesPosterKey(_seriesId: string): string {
  throw new NotImplementedError('T04:keys')
}
