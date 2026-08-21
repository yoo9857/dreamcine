export const UploadStatus = [
  'CREATED',
  'UPLOADING',
  'UPLOADED',
  'FAILED',
  'ABORTED',
] as const

export const AssetStatus = [
  'PENDING',
  'PROBING',
  'TRANSCODING',
  'READY',
  'FAILED',
] as const

export const EpisodeStatus = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'HIDDEN',
  'REMOVED',
] as const

export const UserRole = ['VIEWER', 'CREATOR', 'MODERATOR', 'ADMIN'] as const

export const ReportStatus = [
  'OPEN',
  'REVIEWING',
  'ACTIONED',
  'REJECTED',
] as const

export const AgeRating = ['ALL', 'A12', 'A15', 'A19'] as const

export const UserStatus = ['ACTIVE', 'SUSPENDED', 'DELETED'] as const

export const ReportReason = [
  'SEXUAL',
  'VIOLENCE',
  'HATE',
  'SPAM',
  'COPYRIGHT',
  'MINOR_SAFETY',
  'OTHER',
] as const

export const ReportTarget = ['EPISODE', 'SERIES', 'COMMENT', 'USER'] as const

export const NotifType = [
  'NEW_EPISODE',
  'NEW_FOLLOWER',
  'NEW_COMMENT',
  'NEW_LIKE',
  'TRANSCODE_DONE',
  'TRANSCODE_FAILED',
  'MODERATION',
] as const

export type UploadStatus = (typeof UploadStatus)[number]
export type AssetStatus = (typeof AssetStatus)[number]
export type EpisodeStatus = (typeof EpisodeStatus)[number]
export type UserRole = (typeof UserRole)[number]
export type UserStatus = (typeof UserStatus)[number]
export type ReportStatus = (typeof ReportStatus)[number]
export type ReportReason = (typeof ReportReason)[number]
export type ReportTarget = (typeof ReportTarget)[number]
export type NotifType = (typeof NotifType)[number]
export type AgeRating = (typeof AgeRating)[number]
