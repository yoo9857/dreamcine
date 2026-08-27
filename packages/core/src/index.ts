export { NotImplementedError } from './errors/not-implemented.js'
export { ERROR_CODES, type ErrorCode } from './errors/codes.js'
export { AppError } from './errors/app-error.js'
export {
  AgeRating,
  AssetStatus,
  AuthEventKind,
  ConsentKind,
  ContentLicense,
  CreditRole,
  DeletionRequestStatus,
  EpisodeStatus,
  Gender,
  LinkKind,
  MemberTier,
  NotifType,
  ReportReason,
  ReportStatus,
  ReportTarget,
  SubtitleKind,
  SignupPurpose,
  UploadStatus,
  UserRole,
  UserStatus,
  Visibility,
} from './enums.js'
export type {
  AuthAuditEvent,
  Category,
  Chapter,
  Comment,
  Credit,
  Episode,
  EpisodeMetaView,
  EpisodeSearchResult,
  EpisodeTranslation,
  FeedItem,
  Notification,
  NotificationPreference,
  Page,
  Playlist,
  PlaylistItem,
  PublicUserSummary,
  Rendition,
  Report,
  RoleGrantRecord,
  Season,
  Series,
  SeriesSearchResult,
  SeriesTranslation,
  SearchResult,
  SubtitleTrack,
  TrendingTag,
  UploadSession,
  User,
  UserConsent,
  UserDeletionRequest,
  UserLink,
  UserProfile,
  UserSearchResult,
  VideoAsset,
} from './entities.js'
export { sanitizeUserText } from './rules/sanitize-text.js'
export {
  CommentBodySchema,
  CommentListQuerySchema,
  CommentPageSchema,
  CommentResponseSchema,
  CommentThreadItemSchema,
  CreateCommentSchema,
  UpdateCommentSchema,
  type CommentListQuery,
  type CommentResponse,
  type CommentThreadItem,
  type CreateCommentInput,
  type UpdateCommentInput,
} from './schemas/comment.schema.js'
export {
  MarkNotificationsReadSchema,
  NotificationListQuerySchema,
  NotificationPayloadSchema,
  type MarkNotificationsReadInput,
  type NotificationListQuery,
  type NotificationPayload,
} from './schemas/notification.schema.js'
export { rankScore, type RankInput } from './rules/rank-score.js'
export {
  PaginationSchema,
  parsePagination,
  type PaginationInput,
} from './schemas/pagination.schema.js'
export {
  FeedItemSchema,
  FeedPageSchema,
  FeedQuerySchema,
  SearchQuerySchema,
  SearchResultSchema,
  TagFeedQuerySchema,
  TrendingTagsResponseSchema,
  type FeedQuery,
  type SearchQuery,
  type TagFeedQuery,
} from './schemas/feed.schema.js'
export { LIMITS } from './limits.js'
export {
  CAPACITY_TIERS,
  loadCapacity,
  type Capacity,
  type CapacityTier,
} from './capacity.js'
export { ServerEnvSchema, loadServerEnv, type ServerEnv } from './env.js'
export {
  ACTIONS,
  actorFromAccount,
  can,
  guestActor,
  type Action,
  type Actor,
  type ActorAccount,
  type ResourceRef,
} from './rules/permission.js'
export {
  GRANTABLE_ROLES,
  ROLE_LABELS,
  ROLE_LADDER,
  ROLE_RANK,
  hasAtLeast,
  isAuthenticatedRole,
  isAuthorRole,
  isGrantableRole,
  isModeratorRole,
  isPartnerRole,
  resolveActorRole,
  type ActorRole,
  type ActorRoleInput,
} from './rules/roles.js'
export {
  TIER_CATEGORY_MAX,
  TIER_LABELS,
  TIER_LADDER,
  TIER_THRESHOLDS,
  TIER_WEIGHTS,
  computeTierPoints,
  evaluateTier,
  tierForPoints,
  type TierActivity,
  type TierEvaluation,
} from './rules/member-tier.js'
export {
  TIER_ALLOWANCE,
  resolveEntitlements,
  type EntitlementInput,
  type Entitlements,
} from './rules/entitlements.js'
export {
  checkAgeGate,
  type AgeGateInput,
  type AgeGateResult,
} from './rules/age-gate.js'
export {
  BioSchema,
  DisplayNameSchema,
  EmailSchema,
  HandleSchema,
  LoginSchema,
  PasswordSchema,
  RESERVED_HANDLES,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  SignupEmailSchema,
  SignupSchema,
  UpdateProfileSchema,
  VerifyEmailSchema,
  sanitizeText,
  type LoginInput,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
  type SignupInput,
  type UpdateProfileInput,
  type VerifyEmailInput,
} from './schemas/auth.schema.js'
export {
  ALLOWED_UPLOAD_MIME,
  MIME_EXTENSIONS,
  UPLOAD_MIN_BYTES,
  assertUploadAllowed,
  decidePartSize,
  type AllowedUploadMime,
  type PartPlan,
  type UploadRequest,
} from './rules/upload-policy.js'
export {
  TERMINAL_UPLOAD_STATUS,
  canTransitionUpload,
  decideComplete,
  isTerminalUploadStatus,
  type CompleteDecision,
  type TerminalUploadStatus,
} from './state/upload-state.js'
export {
  canTransitionAsset,
  type AssetTransitionContext,
} from './state/asset-state.js'
export {
  CompleteUploadResultSchema,
  CompleteUploadSchema,
  CompletedPartSchema,
  CreateUploadResultSchema,
  CreateUploadSchema,
  SignPartsSchema,
  SignedPartSchema,
  UploadSessionStateSchema,
  type CompleteUploadInput,
  type CompleteUploadResult,
  type CreateUploadInput,
  type CreateUploadResult,
  type SignPartsInput,
  type UploadSessionState,
} from './schemas/upload.schema.js'
export {
  AgeConfirmSchema,
  AgeVerificationClaimSchema,
  PlaybackRenditionSchema,
  PlaybackResponseSchema,
  SaveProgressSchema,
  type AgeConfirmInput,
  type AgeVerificationClaim,
  type PlaybackResponse,
  type SaveProgressInput,
} from './schemas/playback.schema.js'
export {
  CreateSeriesSchema,
  SeriesListQuerySchema,
  SeriesResponseSchema,
  UpdateSeriesSchema,
  type CreateSeriesInput,
  type SeriesListQuery,
  type SeriesResponse,
  type UpdateSeriesInput,
} from './schemas/series.schema.js'
export {
  CreateEpisodeSchema,
  EpisodeResponseSchema,
  PublishEpisodeResponseSchema,
  PublishEpisodeSchema,
  UpdateEpisodeSchema,
  type CreateEpisodeInput,
  type EpisodeResponse,
  type PublishEpisodeInput,
  type PublishEpisodeResponse,
  type UpdateEpisodeInput,
} from './schemas/episode.schema.js'
export {
  checkEpisodeTransition,
  type TransitionActor,
  type TransitionContext,
  type TransitionPatch,
  type TransitionVerdict,
} from './state/episode-state.js'
export { ensureUniqueSlug, toSlug } from './rules/slug.js'
export { normalizeTag } from './rules/tag.js'
export {
  METRICS,
  httpStatusClass,
  normalizeRoutePattern,
  type HttpStatusClass,
  type JobStatus,
  type MetricName,
} from './observability/metrics.js'
export {
  AdminUserQuerySchema,
  CreateReportSchema,
  ReportQueueQuerySchema,
  ReviewReportSchema,
  UpdateUserStatusSchema,
  type AdminUserQuery,
  type CreateReportInput,
  type ReportQueueQuery,
  type ReviewReportInput,
  type UpdateUserStatusInput,
} from './schemas/report.schema.js'
export {
  decideAutoAction,
  type AutoAction,
  type AutoActionInput,
} from './rules/moderation.js'
export { PublicUserSchema, type PublicUser } from './schemas/user.schema.js'
export {
  CREATOR_TRACKS,
  CreateCreatorApplicationSchema,
  type CreatorTrack,
  type CreateCreatorApplicationInput,
} from './schemas/creator-application.schema.js'
