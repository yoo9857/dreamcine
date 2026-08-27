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

/**
 * 저장되는 역할. 사다리 순서 그대로다.
 *
 * `GUEST` 가 여기 없는 이유: 게스트는 행이 없다. 판정 계층의 `ActorRole` 이
 * 담당한다. (ISS-020, `rules/roles.ts`)
 */
export const UserRole = [
  'VIEWER',
  'MEMBER',
  'CREATOR',
  'PARTNER',
  'MODERATOR',
  'ADMIN',
] as const

/** 활동 기반 회원 등급. 권한이 아니라 혜택을 가른다. */
export const MemberTier = [
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'DIAMOND',
] as const

export const ReportStatus = [
  'OPEN',
  'REVIEWING',
  'ACTIONED',
  'REJECTED',
] as const

export const AgeRating = ['ALL', 'A12', 'A15', 'A19'] as const

export const UserStatus = ['ACTIVE', 'SUSPENDED', 'DELETED'] as const

export const Gender = [
  'FEMALE',
  'MALE',
  'NON_BINARY',
  'OTHER',
  'PREFER_NOT_TO_SAY',
] as const

export const SignupPurpose = ['VIEWER', 'CREATOR', 'BOTH'] as const

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

export const Visibility = ['PUBLIC', 'UNLISTED', 'PRIVATE'] as const

export const LinkKind = [
  'WEBSITE',
  'YOUTUBE',
  'INSTAGRAM',
  'X',
  'TIKTOK',
  'THREADS',
  'DISCORD',
  'EMAIL',
  'OTHER',
] as const

export const ConsentKind = [
  'TOS',
  'PRIVACY',
  'MARKETING',
  'AGE',
  'AI_TRAINING',
  'SENSITIVE_DATA',
] as const

export const ContentLicense = ['STANDARD', 'CC_BY'] as const

export const CreditRole = [
  'DIRECTOR',
  'WRITER',
  'VOICE',
  'MUSIC',
  'EDIT',
  'AI_VISUAL',
  'PRODUCER',
  'TRANSLATOR',
  'OTHER',
] as const

export const SubtitleKind = ['SUBTITLE', 'CAPTION'] as const

export const AuthEventKind = [
  'SIGNUP',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'PASSWORD_RESET_REQUEST',
  'PASSWORD_CHANGED',
  'EMAIL_VERIFIED',
  'ROLE_CHANGED',
  'SUSPENDED',
  'REACTIVATED',
] as const

export const DeletionRequestStatus = ['PENDING', 'CANCELLED', 'PURGED'] as const

export const NotifType = [
  'NEW_EPISODE',
  'NEW_FOLLOWER',
  'NEW_COMMENT',
  'NEW_LIKE',
  'TRANSCODE_DONE',
  'TRANSCODE_FAILED',
  'PUBLISH_FAILED',
  'MODERATION',
] as const

export type UploadStatus = (typeof UploadStatus)[number]
export type AssetStatus = (typeof AssetStatus)[number]
export type EpisodeStatus = (typeof EpisodeStatus)[number]
export type UserRole = (typeof UserRole)[number]
export type MemberTier = (typeof MemberTier)[number]
export type UserStatus = (typeof UserStatus)[number]
export type Gender = (typeof Gender)[number]
export type SignupPurpose = (typeof SignupPurpose)[number]
export type ReportStatus = (typeof ReportStatus)[number]
export type ReportReason = (typeof ReportReason)[number]
export type ReportTarget = (typeof ReportTarget)[number]
export type NotifType = (typeof NotifType)[number]
export type AgeRating = (typeof AgeRating)[number]
export type Visibility = (typeof Visibility)[number]
export type LinkKind = (typeof LinkKind)[number]
export type ConsentKind = (typeof ConsentKind)[number]
export type ContentLicense = (typeof ContentLicense)[number]
export type CreditRole = (typeof CreditRole)[number]
export type SubtitleKind = (typeof SubtitleKind)[number]
export type AuthEventKind = (typeof AuthEventKind)[number]
export type DeletionRequestStatus = (typeof DeletionRequestStatus)[number]
