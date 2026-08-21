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
