import { HeadObjectCommand } from '@aws-sdk/client-s3'
import type { BucketKind } from './buckets.js'
import { bucketName, s3 } from './client.js'
import { withS3 } from './errors.js'

export async function headObject(bucket: BucketKind, key: string) {
  const head = await withS3(() =>
    s3().send(new HeadObjectCommand({ Bucket: bucketName(bucket), Key: key })),
  )
  return {
    sizeBytes: head.ContentLength ?? 0,
    contentType: head.ContentType ?? null,
  }
}
