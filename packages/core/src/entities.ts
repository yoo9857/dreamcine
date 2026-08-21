import type {
  AgeRating,
  AssetStatus,
  EpisodeStatus,
  NotifType,
  ReportReason,
  ReportStatus,
  ReportTarget,
  UploadStatus,
  UserRole,
  UserStatus,
} from './enums.js'

export interface User {
  id: string
  handle: string
  email: string
  emailVerified: Date | null
  passwordHash: string | null
  displayName: string
  bio: string | null
  avatarKey: string | null
  role: UserRole
  status: UserStatus
  followerCount: number
  seriesCount: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface Series {
  id: string
  ownerId: string
  slug: string
  title: string
  synopsis: string | null
  posterKey: string | null
  ageRating: AgeRating
  isCompleted: boolean
  commentsOff: boolean
  episodeCount: number
  totalViews: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface Season {
  id: string
  seriesId: string
  number: number
  title: string | null
  createdAt: Date
}

export interface Episode {
  id: string
  seriesId: string
  seasonId: string | null
  assetId: string | null
  number: number
  title: string
  description: string | null
  thumbKey: string | null
  status: EpisodeStatus
  ageRating: AgeRating
  aiDisclosure: string | null
  publishAt: Date | null
  publishedAt: Date | null
  viewCount: string
  likeCount: number
  commentCount: number
  rankScore: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface UploadSession {
  id: string
  userId: string
  status: UploadStatus
  fileName: string
  fileSize: string
  mimeType: string
  checksum: string | null
  objectKey: string
  s3UploadId: string | null
  partSize: number
  totalParts: number
  completedParts: unknown
  errorCode: string | null
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface VideoAsset {
  id: string
  uploadId: string | null
  status: AssetStatus
  originalKey: string
  hlsPrefix: string | null
  masterPath: string | null
  posterKey: string | null
  durationSec: number | null
  width: number | null
  height: number | null
  videoCodec: string | null
  audioCodec: string | null
  bitrateKbps: number | null
  sizeBytes: string | null
  attemptCount: number
  errorCode: string | null
  errorDetail: string | null
  createdAt: Date
  updatedAt: Date
  readyAt: Date | null
}

export interface Rendition {
  id: string
  assetId: string
  name: string
  width: number
  height: number
  bitrateKbps: number
  playlistPath: string
  sizeBytes: string
  createdAt: Date
}

export interface Comment {
  id: string
  episodeId: string
  userId: string
  parentId: string | null
  body: string
  isHidden: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface Notification {
  id: string
  userId: string
  type: NotifType
  payload: unknown
  readAt: Date | null
  createdAt: Date
}

export interface Report {
  id: string
  reporterId: string
  target: ReportTarget
  targetId: string
  reason: ReportReason
  detail: string | null
  status: ReportStatus
  handledBy: string | null
  handledAt: Date | null
  actionNote: string | null
  createdAt: Date
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}
