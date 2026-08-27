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
  AuthEventKind,
  MemberTier,
  ConsentKind,
  ContentLicense,
  CreditRole,
  DeletionRequestStatus,
  Gender,
  LinkKind,
  SubtitleKind,
  SignupPurpose,
  Visibility,
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
  tier: MemberTier
  tierPoints: number
  tierEvaluatedAt: Date | null
  roleGrantedAt: Date | null
  roleGrantedBy: string | null
  bannerKey: string | null
  channelDescription: string | null
  channelKeywords: readonly string[]
  trailerEpisodeId: string | null
  profileVisibility: Visibility
  hideFollowerCount: boolean
  verifiedAt: Date | null
  country: string | null
  locale: string
  timezone: string
  birthDate: Date | null
  gender?: Gender | null
  signupPurpose?: SignupPurpose | null
  phone: string | null
  phoneVerifiedAt: Date | null
  defaultAgeRating: AgeRating
  defaultLanguage: string
  defaultLicense: ContentLicense
  followerCount: number
  followingCount: number
  seriesCount: number
  episodeCount: number
  totalViews: string
  lastLoginAt: Date | null
  lastSeenAt: Date | null
  loginCount: number
  signupIpHash: string | null
  signupUserAgent: string | null
  signupReferrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  suspendedUntil: Date | null
  suspendReason: string | null
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
  bannerKey: string | null
  categoryId: string | null
  language: string
  visibility: Visibility
  keywords: readonly string[]
  trailerEpisodeId: string | null
  firstAiredAt: Date | null
  metaTitle: string | null
  metaDescription: string | null
  ogImageKey: string | null
  canonicalPath: string | null
  madeForKids: boolean
  license: ContentLicense
  contentWarnings: readonly string[]
  regionsAllowed: readonly string[]
  regionsBlocked: readonly string[]
  episodeCount: number
  totalViews: string
  totalLikes: number
  followerCount: number
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
  visibility: Visibility
  durationSec: number | null
  language: string
  categoryId: string | null
  keywords: readonly string[]
  allowEmbed: boolean
  allowDownload: boolean
  recordedAt: Date | null
  metaTitle: string | null
  metaDescription: string | null
  ogImageKey: string | null
  canonicalPath: string | null
  madeForKids: boolean
  license: ContentLicense
  contentWarnings: readonly string[]
  regionsAllowed: readonly string[]
  regionsBlocked: readonly string[]
  aiDisclosure: string | null
  aiModels: readonly string[]
  aiTools: readonly string[]
  aiHumanRole: string | null
  aiGeneratedPct: number | null
  publishAt: Date | null
  publishedAt: Date | null
  viewCount: string
  likeCount: number
  commentCount: number
  shareCount: number
  impressionCount: string
  avgWatchSec: number
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

/**
 * 공개 사용자 요약. 피드·검색·댓글·크레딧이 같은 모양을 쓴다.
 *
 * `tier` 를 여기 두는 이유: 등급 배지는 작품 카드·작가 이름·댓글 작성자에 모두
 * 붙는다. 각 응답 타입이 따로 등급을 들고 있으면 한 곳을 빠뜨렸을 때 "댓글에는
 * 배지가 뜨는데 피드에는 안 뜨는" 상태가 된다.
 *
 * 배지 여부는 담지 않는다 — `TIER_ALLOWANCE[tier].badge` 로 유도한다.
 */
export interface PublicUserSummary {
  handle: string
  displayName: string
  avatarUrl: string | null
  tier: MemberTier
  /** 인증 채널. 등급 배지와 별개다 — 하나는 실적, 하나는 신원이다. */
  isVerified: boolean
}

export interface UserProfile extends PublicUserSummary {
  bio: string | null
  channelDescription: string | null
  bannerUrl: string | null
  channelKeywords: readonly string[]
  country: string | null
  locale: string
  role: UserRole
  tierPoints: number
  /**
   * `hideFollowerCount` 가 켜지면 `null` 이다. 0 이나 실제 값을 보내고 UI 에서
   * 가리는 방식은 HTML 페이로드에 숫자를 남긴다 — 숨김은 숨김이어야 한다.
   */
  followerCount: number | null
  followingCount: number
  seriesCount: number
  episodeCount: number
  totalViews: string
  joinedAt: Date
  trailerEpisodeId: string | null
  links: readonly UserLink[]
  isFollowing: boolean
  isBlocked: boolean
}

export interface UserLink {
  id: string
  kind: LinkKind
  label: string
  url: string
  order: number
}

export interface UserConsent {
  id: string
  userId: string
  kind: ConsentKind
  version: string
  granted: boolean
  grantedAt: Date
  revokedAt: Date | null
}

export interface NotificationPreference {
  userId: string
  type: NotifType
  inApp: boolean
  email: boolean
  push: boolean
}

export interface RoleGrantRecord {
  id: string
  userId: string
  fromRole: UserRole
  toRole: UserRole
  grantedBy: string | null
  reason: string | null
  createdAt: Date
}

export interface AuthAuditEvent {
  id: string
  userId: string | null
  email: string | null
  kind: AuthEventKind
  success: boolean
  detail: string | null
  createdAt: Date
}

export interface UserDeletionRequest {
  userId: string
  status: DeletionRequestStatus
  reason: string | null
  requestedAt: Date
  scheduledPurgeAt: Date
  cancelledAt: Date | null
  purgedAt: Date | null
}

export interface Category {
  id: string
  slug: string
  nameKo: string
  nameEn: string
  order: number
  isActive: boolean
}

export interface Chapter {
  id: string
  episodeId: string
  startSec: number
  title: string
}

export interface Credit {
  id: string
  seriesId: string | null
  episodeId: string | null
  userId: string | null
  role: CreditRole
  name: string
  note: string | null
  order: number
}

export interface SubtitleTrack {
  id: string
  episodeId: string
  language: string
  label: string
  kind: SubtitleKind
  objectKey: string
  isDefault: boolean
  isAutoGenerated: boolean
}

export interface EpisodeTranslation {
  episodeId: string
  locale: string
  title: string
  description: string | null
  metaTitle: string | null
  metaDescription: string | null
}

export interface SeriesTranslation {
  seriesId: string
  locale: string
  title: string
  synopsis: string | null
  metaTitle: string | null
  metaDescription: string | null
}

export interface Playlist {
  id: string
  userId: string
  title: string
  description: string | null
  visibility: Visibility
  itemCount: number
  createdAt: Date
  updatedAt: Date
}

export interface PlaylistItem {
  playlistId: string
  episodeId: string
  order: number
  addedAt: Date
}

/// watch/[episodeId] 와 series/[seriesId] 의 generateMetadata·JSON-LD 가 소비하는
/// 단일 뷰. 페이지가 여러 테이블을 직접 알지 않게 한다.
export interface EpisodeMetaView {
  episodeId: string
  seriesId: string
  seriesSlug: string
  seriesTitle: string
  number: number
  title: string
  description: string | null
  metaTitle: string | null
  metaDescription: string | null
  canonicalPath: string | null
  thumbKey: string | null
  ogImageKey: string | null
  durationSec: number | null
  language: string
  ageRating: AgeRating
  visibility: Visibility
  madeForKids: boolean
  license: ContentLicense
  allowEmbed: boolean
  keywords: readonly string[]
  contentWarnings: readonly string[]
  regionsAllowed: readonly string[]
  regionsBlocked: readonly string[]
  aiDisclosure: string | null
  aiModels: readonly string[]
  aiTools: readonly string[]
  aiHumanRole: string | null
  category: Category | null
  chapters: readonly Chapter[]
  credits: readonly Credit[]
  subtitles: readonly SubtitleTrack[]
  translations: readonly EpisodeTranslation[]
  creator: PublicUserSummary
  publishedAt: Date | null
  viewCount: string
  likeCount: number
  commentCount: number
}

export interface Report {
  id: string
  reporterId: string
  target: ReportTarget
  targetId: string
  reason: ReportReason
  detail: string | null
  status: ReportStatus
  priorityFlag: boolean
  autoHidden: boolean
  handledBy: string | null
  handledAt: Date | null
  actionNote: string | null
  createdAt: Date
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

export interface FeedItem {
  episodeId: string
  title: string
  thumbUrl: string | null
  durationSec: number | null
  ageRating: AgeRating
  viewCount: string
  likeCount: number
  publishedAt: string
  series: {
    id: string
    title: string
    slug: string
  }
  // 인라인 리터럴이 아니라 공용 타입을 쓴다. 등급 배지를 작품 카드에도
  // 붙이려면 여기가 댓글·검색과 같은 모양이어야 한다.
  creator: PublicUserSummary
  isLiked: boolean
}

export interface SeriesSearchResult {
  type: 'series'
  id: string
  title: string
  slug: string
  posterUrl: string | null
  creator: FeedItem['creator']
}

export interface EpisodeSearchResult {
  type: 'episode'
  episode: FeedItem
}

export interface UserSearchResult {
  type: 'user'
  handle: string
  displayName: string
  avatarUrl: string | null
  followerCount: number
}

export type SearchResult =
  | SeriesSearchResult
  | EpisodeSearchResult
  | UserSearchResult

export interface TrendingTag {
  name: string
  useCount: number
}
