/**
 * 공개 배럴.
 *
 * **`S3Client` 를 내보내지 않는다.** 밖으로 새면 이 패키지를 우회해 버킷
 * 이름과 키를 조립하는 코드가 생기고, 그 순간 "Object Storage 와 대화하는
 * 유일한 계층" 이라는 전제가 무너진다. (T04 §1, DoD)
 */
export { BUCKET, type BucketKind } from './buckets.js'
export {
  avatarKey,
  hlsMasterKey,
  hlsPrefix,
  hlsRenditionKey,
  originalKey,
  sanitizeFileName,
  seriesPosterKey,
  thumbKey,
} from './buckets.js'
export { IMMUTABLE_1Y, NO_STORE } from './cache-presets.js'
export { avatarUrl, cdnOrigin, cdnUrl, masterUrl, thumbUrl } from './cdn.js'
export {
  deleteObject,
  deletePrefix,
  type DeletePrefixResult,
} from './delete.js'
export { mapS3Error } from './errors.js'
export { getObjectStream, type ObjectStream } from './get-object.js'
export {
  MAX_PARTS_PER_SIGN,
  abortMultipart,
  completeMultipart,
  createMultipart,
  listStaleMultipartUploads,
  signParts,
  type CompletedPart,
  type CompletedUpload,
  type CreateMultipartResult,
  type SignedPart,
  type StaleUpload,
} from './multipart.js'
export {
  PRESIGN_GET_ORIGINAL_TTL_SEC,
  PRESIGN_PART_TTL_SEC,
  presignGet,
  type PresignedUrl,
} from './presign.js'
export { putObject, type PutObjectInput } from './put-object.js'
