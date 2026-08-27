# 04 — 도메인 모델 · Prisma 스키마 계약

> 상태: **불변 계약**. CODEX 수정 금지.
> 이 문서의 스키마는 **그대로** `prisma/schema.prisma` 가 된다.
> 필드를 추가/삭제하려면 `_ISSUES.md` 에 제안하고 멈춘다.

---

## 1. 엔티티 관계

```
User ──┬──< Series ──< Season ──< Episode >── VideoAsset ──< Rendition
       │      │                     │
       │      │                     ├──< Like
       │      │                     ├──< Comment ──< Comment (1단 대댓글)
       │      │                     ├──< WatchProgress
       │      │                     ├──< EpisodeTag >── Tag
       │      │                     ├──< Chapter            (챕터/타임스탬프)
       │      │                     ├──< SubtitleTrack      (자막·캡션)
       │      │                     ├──< EpisodeTranslation (로케일별 카피)
       │      │                     ├──< Credit             (제작진·출연)
       │      │                     └──< PlaylistItem
       │      ├──< SeriesTranslation
       │      ├──< Credit
       │      └──> Category
       │                             Episode ──> Category
       ├──< Follow >── User            (팔로워/팔로잉)
       ├──< Block >── User             (차단)
       ├──< UploadSession
       ├──< Notification
       ├──< NotificationPreference    (알림 채널별 수신 설정)
       ├──< Report                    (신고자)
       ├──< Session / Account          (Auth.js)
       ├──< UserLink                  (채널 외부 링크)
       ├──< UserConsent               (약관·개인정보 동의 이력)
       ├──< AuthAuditLog              (인증·계정 상태 감사)
       ├──< RoleGrant                 (역할 변경 이력. 부여자도 User)
       ├──< Playlist ──< PlaylistItem (시청자 재생목록)
       ├──1 UserDeletionRequest       (탈퇴 유예)
       └──> Episode                   (채널 트레일러)
```

`User.trailerEpisodeId` · `Series.trailerEpisodeId` 는 `Episode` 를 가리키는
역방향 참조다. 순환이지만 둘 다 nullable + `onDelete: SetNull` 이므로 삭제
순서에 걸리지 않는다.

## 2. Prisma 스키마

> 이 절은 `prisma/schema.prisma` 와 **바이트 단위로 같아야 한다.**
> 2026-08-27 `ISS-019` 승인으로 회원 정보(블록 A)와 콘텐츠 메타데이터(블록 B)가,
> `ISS-020` 승인으로 7단계 역할 사다리와 회원 등급이 추가되었다.
> 확장 근거는 `10_TASKS/T15_METADATA_UPGRADE.md` 와 `T16_ROLE_TIERS.md`.
>
> `UserRole` 에 `GUEST` 가 없는 것은 누락이 아니다 — 게스트는 행이 없다.
> 판정 계층의 `ActorRole` 이 담당한다 (`07_AUTH_SECURITY.md` §2).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

/// 저장되는 역할. `GUEST` 는 행이 없는 상태이므로 여기 없다 —
/// 판정 계층의 `ActorRole` 이 담당한다. (ISS-020)
enum UserRole {
  VIEWER
  MEMBER
  CREATOR
  PARTNER
  MODERATOR
  ADMIN
}

/// 활동 기반 회원 등급. 권한이 아니라 **혜택**을 가른다.
enum MemberTier {
  BRONZE
  SILVER
  GOLD
  PLATINUM
  DIAMOND
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  DELETED
}

enum UploadStatus {
  CREATED
  UPLOADING
  UPLOADED
  FAILED
  ABORTED
}

enum AssetStatus {
  PENDING
  PROBING
  TRANSCODING
  READY
  FAILED
}

enum EpisodeStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
  HIDDEN
  REMOVED
}

enum AgeRating {
  ALL
  A12
  A15
  A19
}

enum ReportStatus {
  OPEN
  REVIEWING
  ACTIONED
  REJECTED
}

enum ReportReason {
  SEXUAL
  VIOLENCE
  HATE
  SPAM
  COPYRIGHT
  MINOR_SAFETY
  OTHER
}

enum ReportTarget {
  EPISODE
  SERIES
  COMMENT
  USER
}

enum NotifType {
  NEW_EPISODE
  NEW_FOLLOWER
  NEW_COMMENT
  NEW_LIKE
  TRANSCODE_DONE
  TRANSCODE_FAILED
  PUBLISH_FAILED
  MODERATION
}

enum CreatorTrack {
  DIRECTOR
  WRITER
  AI_VISUAL
  PRODUCER
  OTHER
}

enum CreatorApplicationStatus {
  SUBMITTED
  REVIEWING
  SHORTLISTED
  ACCEPTED
  REJECTED
}

enum Visibility {
  PUBLIC
  UNLISTED
  PRIVATE
}

enum LinkKind {
  WEBSITE
  YOUTUBE
  INSTAGRAM
  X
  TIKTOK
  THREADS
  DISCORD
  EMAIL
  OTHER
}

enum ConsentKind {
  TOS
  PRIVACY
  MARKETING
  AGE
  AI_TRAINING
  SENSITIVE_DATA
}

enum ContentLicense {
  STANDARD
  CC_BY
}

enum CreditRole {
  DIRECTOR
  WRITER
  VOICE
  MUSIC
  EDIT
  AI_VISUAL
  PRODUCER
  TRANSLATOR
  OTHER
}

enum SubtitleKind {
  SUBTITLE
  CAPTION
}

enum AuthEventKind {
  SIGNUP
  LOGIN_SUCCESS
  LOGIN_FAILED
  LOGOUT
  PASSWORD_RESET_REQUEST
  PASSWORD_CHANGED
  EMAIL_VERIFIED
  ROLE_CHANGED
  SUSPENDED
  REACTIVATED
}

enum DeletionRequestStatus {
  PENDING
  CANCELLED
  PURGED
}

model User {
  id            String     @id @default(cuid())
  handle        String     @unique
  email         String     @unique
  emailVerified DateTime?  @map("email_verified")
  passwordHash  String?    @map("password_hash")
  displayName   String     @map("display_name")
  bio           String?    @db.VarChar(500)
  avatarKey     String?    @map("avatar_key")
  role          UserRole   @default(VIEWER)
  status        UserStatus @default(ACTIVE)

  // ───── 활동 등급 (권한이 아니라 혜택. ISS-020)
  tier            MemberTier @default(BRONZE)
  tierPoints      Int        @default(0) @map("tier_points")
  tierEvaluatedAt DateTime?  @map("tier_evaluated_at")

  // ───── 역할 부여 흔적. 상세 이력은 RoleGrant 가 갖는다.
  roleGrantedAt DateTime? @map("role_granted_at")
  roleGrantedBy String?   @map("role_granted_by")

  // ───── 채널 프로필 (YouTube 채널 등가물)
  bannerKey          String?    @map("banner_key")
  channelDescription String?    @map("channel_description") @db.VarChar(5000)
  channelKeywords    String[]   @default([]) @map("channel_keywords")
  trailerEpisodeId   String?    @map("trailer_episode_id")
  profileVisibility  Visibility @default(PUBLIC) @map("profile_visibility")
  hideFollowerCount  Boolean    @default(false) @map("hide_follower_count")
  verifiedAt         DateTime?  @map("verified_at")

  // ───── 지역·언어 (12_GLOBAL_EXPANSION §2 language != market)
  country  String? @db.Char(2)
  locale   String  @default("ko-KR") @db.VarChar(10)
  timezone String  @default("Asia/Seoul") @db.VarChar(64)

  // ───── 본인확인·연령 (AgeRating.A19 게이트의 저장 근거)
  birthDate       DateTime? @map("birth_date") @db.Date
  phone           String?   @db.VarChar(32)
  phoneVerifiedAt DateTime? @map("phone_verified_at")

  // ───── 업로드 기본값
  defaultAgeRating AgeRating      @default(ALL) @map("default_age_rating")
  defaultLanguage  String         @default("ko") @map("default_language") @db.VarChar(10)
  defaultLicense   ContentLicense @default(STANDARD) @map("default_license")

  // ───── 집계 카운터
  followerCount  Int    @default(0) @map("follower_count")
  followingCount Int    @default(0) @map("following_count")
  seriesCount    Int    @default(0) @map("series_count")
  episodeCount   Int    @default(0) @map("episode_count")
  totalViews     BigInt @default(0) @map("total_views")

  // ───── 운영·유입·제재
  lastLoginAt     DateTime? @map("last_login_at")
  lastSeenAt      DateTime? @map("last_seen_at")
  loginCount      Int       @default(0) @map("login_count")
  signupIpHash    String?   @map("signup_ip_hash") @db.VarChar(64)
  signupUserAgent String?   @map("signup_user_agent") @db.VarChar(500)
  signupReferrer  String?   @map("signup_referrer") @db.VarChar(500)
  utmSource       String?   @map("utm_source") @db.VarChar(120)
  utmMedium       String?   @map("utm_medium") @db.VarChar(120)
  utmCampaign     String?   @map("utm_campaign") @db.VarChar(120)
  suspendedUntil  DateTime? @map("suspended_until")
  suspendReason   String?   @map("suspend_reason") @db.VarChar(500)

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  series         Series[]
  uploadSessions UploadSession[]
  likes          Like[]
  comments       Comment[]
  watchProgress  WatchProgress[]
  following      Follow[]        @relation("follower")
  followers      Follow[]        @relation("following")
  blocking       Block[]         @relation("blocker")
  blockedBy      Block[]         @relation("blocked")
  notifications  Notification[]
  reportsMade    Report[]        @relation("reporter")
  accounts       Account[]
  sessions       Session[]

  trailerEpisode  Episode?                 @relation("channelTrailer", fields: [trailerEpisodeId], references: [id], onDelete: SetNull)
  links           UserLink[]
  consents        UserConsent[]
  notifPrefs      NotificationPreference[]
  authEvents      AuthAuditLog[]
  roleGrants      RoleGrant[]              @relation("roleSubject")
  roleGrantsMade  RoleGrant[]              @relation("roleGranter")
  deletionRequest UserDeletionRequest?
  playlists       Playlist[]
  credits         Credit[]

  @@index([status, createdAt])
  @@index([role, status])
  @@index([tier, tierPoints(sort: Desc)])
  @@index([country, locale])
  @@index([verifiedAt])
  @@index([lastSeenAt])
  @@map("user")
}

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("account")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("session")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_token")
}

model Series {
  id          String    @id @default(cuid())
  ownerId     String    @map("owner_id")
  slug        String    @unique
  title       String    @db.VarChar(120)
  synopsis    String?   @db.VarChar(2000)
  posterKey   String?   @map("poster_key")
  ageRating   AgeRating @default(ALL) @map("age_rating")
  isCompleted Boolean   @default(false) @map("is_completed")
  commentsOff Boolean   @default(false) @map("comments_off")

  // ----- 발견 축
  bannerKey        String?    @map("banner_key")
  categoryId       String?    @map("category_id")
  language         String     @default("ko") @db.VarChar(10)
  visibility       Visibility @default(PUBLIC)
  keywords         String[]   @default([])
  trailerEpisodeId String?    @map("trailer_episode_id")
  firstAiredAt     DateTime?  @map("first_aired_at")

  // ----- 공유 메타태그 (12_GLOBAL_EXPANSION §4 SEO 게이트)
  metaTitle       String? @map("meta_title") @db.VarChar(70)
  metaDescription String? @map("meta_description") @db.VarChar(160)
  ogImageKey      String? @map("og_image_key")
  canonicalPath   String? @map("canonical_path") @db.VarChar(300)

  // ----- 정책·권리
  madeForKids     Boolean        @default(false) @map("made_for_kids")
  license         ContentLicense @default(STANDARD)
  contentWarnings String[]       @default([]) @map("content_warnings")
  regionsAllowed  String[]       @default([]) @map("regions_allowed")
  regionsBlocked  String[]       @default([]) @map("regions_blocked")

  // ----- 집계
  episodeCount  Int    @default(0) @map("episode_count")
  totalViews    BigInt @default(0) @map("total_views")
  totalLikes    Int    @default(0) @map("total_likes")
  followerCount Int    @default(0) @map("follower_count")

  searchVector Unsupported("tsvector")? @map("search_vector")

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  owner        User                @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  seasons      Season[]
  episodes     Episode[]
  tags         SeriesTag[]
  category     Category?           @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  trailer      Episode?            @relation("seriesTrailer", fields: [trailerEpisodeId], references: [id], onDelete: SetNull)
  translations SeriesTranslation[]
  credits      Credit[]

  @@index([ownerId, createdAt])
  @@index([deletedAt, createdAt])
  @@index([categoryId, visibility, createdAt(sort: Desc)])
  @@index([language, visibility])
  @@map("series")
}

model Season {
  id        String   @id @default(cuid())
  seriesId  String   @map("series_id")
  number    Int
  title     String?  @db.VarChar(120)
  createdAt DateTime @default(now()) @map("created_at")

  series   Series    @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  episodes Episode[]

  @@unique([seriesId, number])
  @@map("season")
}

model Episode {
  id          String        @id @default(cuid())
  seriesId    String        @map("series_id")
  seasonId    String?       @map("season_id")
  assetId     String?       @unique @map("asset_id")
  number      Int
  title       String        @db.VarChar(160)
  description String?       @db.VarChar(2000)
  thumbKey    String?       @map("thumb_key")
  status      EpisodeStatus @default(DRAFT)
  ageRating   AgeRating     @default(ALL) @map("age_rating")

  // ----- 가시성·재생 기본값
  visibility    Visibility @default(PUBLIC)
  durationSec   Int?       @map("duration_sec")
  language      String     @default("ko") @db.VarChar(10)
  categoryId    String?    @map("category_id")
  keywords      String[]   @default([])
  allowEmbed    Boolean    @default(true) @map("allow_embed")
  allowDownload Boolean    @default(false) @map("allow_download")
  recordedAt    DateTime?  @map("recorded_at")

  // ----- 공유 메타태그 (JSON-LD VideoObject 원천)
  metaTitle       String? @map("meta_title") @db.VarChar(70)
  metaDescription String? @map("meta_description") @db.VarChar(160)
  ogImageKey      String? @map("og_image_key")
  canonicalPath   String? @map("canonical_path") @db.VarChar(300)

  // ----- 정책·권리
  madeForKids     Boolean        @default(false) @map("made_for_kids")
  license         ContentLicense @default(STANDARD)
  contentWarnings String[]       @default([]) @map("content_warnings")
  regionsAllowed  String[]       @default([]) @map("regions_allowed")
  regionsBlocked  String[]       @default([]) @map("regions_blocked")

  // ----- AI 고지 (자유서술 aiDisclosure 를 구조화)
  aiDisclosure   String?  @map("ai_disclosure") @db.VarChar(500)
  aiModels       String[] @default([]) @map("ai_models")
  aiTools        String[] @default([]) @map("ai_tools")
  aiHumanRole    String?  @map("ai_human_role") @db.VarChar(500)
  aiGeneratedPct Int?     @map("ai_generated_pct")

  publishAt   DateTime? @map("publish_at")
  publishedAt DateTime? @map("published_at")

  // ----- 집계·분석
  viewCount       BigInt @default(0) @map("view_count")
  likeCount       Int    @default(0) @map("like_count")
  commentCount    Int    @default(0) @map("comment_count")
  shareCount      Int    @default(0) @map("share_count")
  impressionCount BigInt @default(0) @map("impression_count")
  avgWatchSec     Int    @default(0) @map("avg_watch_sec")
  rankScore       Float  @default(0) @map("rank_score")

  searchVector Unsupported("tsvector")? @map("search_vector")

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  series        Series          @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  season        Season?         @relation(fields: [seasonId], references: [id], onDelete: SetNull)
  asset         VideoAsset?     @relation(fields: [assetId], references: [id], onDelete: SetNull)
  likes         Like[]
  comments      Comment[]
  watchProgress WatchProgress[]
  tags          EpisodeTag[]

  category         Category?            @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  chapters         Chapter[]
  credits          Credit[]
  subtitles        SubtitleTrack[]
  translations     EpisodeTranslation[]
  playlistItems    PlaylistItem[]
  channelTrailerOf User[]               @relation("channelTrailer")
  seriesTrailerOf  Series[]             @relation("seriesTrailer")

  @@unique([seriesId, seasonId, number])
  @@index([status, publishedAt(sort: Desc), id(sort: Desc)], map: "episode_feed_latest_idx")
  @@index([status, rankScore(sort: Desc), id(sort: Desc)], map: "episode_feed_popular_idx")
  @@index([seriesId, number])
  @@index([status, publishAt])
  @@index([status, visibility, publishedAt(sort: Desc)])
  @@index([categoryId, status, rankScore(sort: Desc)])
  @@index([language, status, publishedAt(sort: Desc)])
  @@index([madeForKids, status])
  @@map("episode")
}

model UploadSession {
  id             String       @id @default(cuid())
  userId         String       @map("user_id")
  status         UploadStatus @default(CREATED)
  fileName       String       @map("file_name")
  fileSize       BigInt       @map("file_size")
  mimeType       String       @map("mime_type")
  checksum       String?
  objectKey      String       @map("object_key")
  s3UploadId     String?      @map("s3_upload_id")
  partSize       Int          @map("part_size")
  totalParts     Int          @map("total_parts")
  completedParts Json         @default("[]") @map("completed_parts")
  errorCode      String?      @map("error_code")
  expiresAt      DateTime     @map("expires_at")
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  user  User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset VideoAsset?

  @@index([userId, createdAt])
  @@index([status, expiresAt])
  @@map("upload_session")
}

model VideoAsset {
  id           String      @id @default(cuid())
  uploadId     String?     @unique @map("upload_id")
  status       AssetStatus @default(PENDING)
  originalKey  String      @map("original_key")
  hlsPrefix    String?     @map("hls_prefix")
  masterPath   String?     @map("master_path")
  posterKey    String?     @map("poster_key")
  durationSec  Int?        @map("duration_sec")
  width        Int?
  height       Int?
  videoCodec   String?     @map("video_codec")
  audioCodec   String?     @map("audio_codec")
  bitrateKbps  Int?        @map("bitrate_kbps")
  sizeBytes    BigInt?     @map("size_bytes")
  attemptCount Int         @default(0) @map("attempt_count")
  errorCode    String?     @map("error_code")
  errorDetail  String?     @map("error_detail") @db.VarChar(2000)
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")
  readyAt      DateTime?   @map("ready_at")

  upload     UploadSession? @relation(fields: [uploadId], references: [id], onDelete: SetNull)
  episode    Episode?
  renditions Rendition[]

  @@index([status, createdAt])
  @@map("video_asset")
}

model Rendition {
  id           String   @id @default(cuid())
  assetId      String   @map("asset_id")
  name         String
  width        Int
  height       Int
  bitrateKbps  Int      @map("bitrate_kbps")
  playlistPath String   @map("playlist_path")
  sizeBytes    BigInt   @map("size_bytes")
  createdAt    DateTime @default(now()) @map("created_at")

  asset VideoAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@unique([assetId, name])
  @@map("rendition")
}

model Follow {
  followerId  String   @map("follower_id")
  followingId String   @map("following_id")
  createdAt   DateTime @default(now()) @map("created_at")

  follower  User @relation("follower", fields: [followerId], references: [id], onDelete: Cascade)
  following User @relation("following", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
  @@index([followingId, createdAt])
  @@index([followerId, createdAt])
  @@map("follow")
}

model Block {
  blockerId String   @map("blocker_id")
  blockedId String   @map("blocked_id")
  createdAt DateTime @default(now()) @map("created_at")

  blocker User @relation("blocker", fields: [blockerId], references: [id], onDelete: Cascade)
  blocked User @relation("blocked", fields: [blockedId], references: [id], onDelete: Cascade)

  @@id([blockerId, blockedId])
  @@map("block")
}

model Like {
  userId    String   @map("user_id")
  episodeId String   @map("episode_id")
  createdAt DateTime @default(now()) @map("created_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  episode Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@id([userId, episodeId])
  @@index([episodeId, createdAt])
  @@map("like")
}

model Comment {
  id        String    @id @default(cuid())
  episodeId String    @map("episode_id")
  userId    String    @map("user_id")
  parentId  String?   @map("parent_id")
  body      String    @db.VarChar(1000)
  isHidden  Boolean   @default(false) @map("is_hidden")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  episode Episode   @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  user    User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent  Comment?  @relation("thread", fields: [parentId], references: [id], onDelete: Cascade)
  replies Comment[] @relation("thread")

  @@index([episodeId, createdAt(sort: Desc)])
  @@index([parentId, createdAt])
  @@map("comment")
}

model WatchProgress {
  userId      String   @map("user_id")
  episodeId   String   @map("episode_id")
  positionSec Int      @map("position_sec")
  completed   Boolean  @default(false)
  updatedAt   DateTime @updatedAt @map("updated_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  episode Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@id([userId, episodeId])
  @@index([userId, updatedAt(sort: Desc)])
  @@map("watch_progress")
}

model Tag {
  id       String @id @default(cuid())
  name     String @unique
  useCount Int    @default(0) @map("use_count")

  episodes EpisodeTag[]
  series   SeriesTag[]

  @@index([useCount(sort: Desc)])
  @@map("tag")
}

model EpisodeTag {
  episodeId String  @map("episode_id")
  tagId     String  @map("tag_id")
  episode   Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([episodeId, tagId])
  @@index([tagId])
  @@map("episode_tag")
}

model SeriesTag {
  seriesId String @map("series_id")
  tagId    String @map("tag_id")
  series   Series @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  tag      Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([seriesId, tagId])
  @@index([tagId])
  @@map("series_tag")
}

model Notification {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  type      NotifType
  payload   Json
  readAt    DateTime? @map("read_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, readAt])
  @@map("notification")
}

model Report {
  id           String       @id @default(cuid())
  reporterId   String       @map("reporter_id")
  target       ReportTarget
  targetId     String       @map("target_id")
  reason       ReportReason
  detail       String?      @db.VarChar(1000)
  status       ReportStatus @default(OPEN)
  priorityFlag Boolean      @default(false) @map("priority_flag")
  autoHidden   Boolean      @default(false) @map("auto_hidden")
  handledBy    String?      @map("handled_by")
  handledAt    DateTime?    @map("handled_at")
  actionNote   String?      @map("action_note") @db.VarChar(1000)
  createdAt    DateTime     @default(now()) @map("created_at")

  reporter User @relation("reporter", fields: [reporterId], references: [id], onDelete: Cascade)

  @@unique([reporterId, target, targetId])
  @@index([status, createdAt])
  @@index([status, priorityFlag, createdAt])
  @@index([target, targetId])
  @@map("report")
}

model CreatorApplication {
  id               String                   @id @default(cuid())
  displayName      String                   @map("display_name") @db.VarChar(80)
  email            String                   @db.VarChar(254)
  track            CreatorTrack
  portfolioUrl     String                   @map("portfolio_url") @db.VarChar(500)
  socialUrl        String?                  @map("social_url") @db.VarChar(500)
  experience       String?                  @db.VarChar(1200)
  pitch            String                   @db.VarChar(2000)
  round            String                   @default("2026-FOUNDING") @db.VarChar(32)
  privacyConsentAt DateTime                 @map("privacy_consent_at")
  status           CreatorApplicationStatus @default(SUBMITTED)
  createdAt        DateTime                 @default(now()) @map("created_at")
  updatedAt        DateTime                 @updatedAt @map("updated_at")

  @@unique([email, round])
  @@index([status, createdAt])
  @@map("creator_application")
}

// ═════════════════════════════ 블록 A · 회원 정보 부속 모델

/// 채널 외부 링크. YouTube 채널 링크 등가물.
model UserLink {
  id     String   @id @default(cuid())
  userId String   @map("user_id")
  kind   LinkKind
  label  String   @db.VarChar(60)
  url    String   @db.VarChar(500)
  order  Int      @default(0)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, kind, url])
  @@index([userId, order])
  @@map("user_link")
}

/// 약관·개인정보·마케팅 동의 이력. PIPA/GDPR 열람·철회 요청의 근거.
model UserConsent {
  id        String      @id @default(cuid())
  userId    String      @map("user_id")
  kind      ConsentKind
  version   String      @db.VarChar(32)
  granted   Boolean     @default(true)
  grantedAt DateTime    @default(now()) @map("granted_at")
  revokedAt DateTime?   @map("revoked_at")
  ipHash    String?     @map("ip_hash") @db.VarChar(64)
  userAgent String?     @map("user_agent") @db.VarChar(500)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, kind, version])
  @@index([userId, kind, grantedAt(sort: Desc)])
  @@index([kind, version])
  @@map("user_consent")
}

/// 알림 채널별 수신 설정. 없으면 인앱 on, 이메일/푸시 off 를 기본으로 본다.
model NotificationPreference {
  userId String    @map("user_id")
  type   NotifType
  inApp  Boolean   @default(true) @map("in_app")
  email  Boolean   @default(false)
  push   Boolean   @default(false)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, type])
  @@map("notification_preference")
}

/// 인증·계정 상태 변경 감사 로그. IP 는 원본 대신 해시로만 보관한다.
model AuthAuditLog {
  id        String        @id @default(cuid())
  userId    String?       @map("user_id")
  email     String?       @db.VarChar(254)
  kind      AuthEventKind
  success   Boolean       @default(true)
  ipHash    String?       @map("ip_hash") @db.VarChar(64)
  userAgent String?       @map("user_agent") @db.VarChar(500)
  detail    String?       @db.VarChar(500)
  createdAt DateTime      @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt(sort: Desc)])
  @@index([kind, createdAt(sort: Desc)])
  @@index([email, kind, createdAt(sort: Desc)])
  @@map("auth_audit_log")
}

/// 역할 변경 이력.
///
/// `AuthAuditLog.ROLE_CHANGED` 는 "무언가 바뀜" 만 알려준다. 권한 사고를
/// 추적하려면 **전후 값과 부여자**가 필요하다. 부여자 계정이 삭제되어도
/// 이력은 남아야 하므로 `onDelete: SetNull` 이다.
model RoleGrant {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  fromRole  UserRole @map("from_role")
  toRole    UserRole @map("to_role")
  grantedBy String?  @map("granted_by")
  reason    String?  @db.VarChar(500)
  createdAt DateTime @default(now()) @map("created_at")

  user    User  @relation("roleSubject", fields: [userId], references: [id], onDelete: Cascade)
  granter User? @relation("roleGranter", fields: [grantedBy], references: [id], onDelete: SetNull)

  @@index([userId, createdAt(sort: Desc)])
  @@index([toRole, createdAt(sort: Desc)])
  @@index([grantedBy, createdAt(sort: Desc)])
  @@map("role_grant")
}

/// 회원 탈퇴 유예. 즉시 파기하지 않고 예정 시각까지 복구 창을 둔다.
model UserDeletionRequest {
  userId           String                @id @map("user_id")
  status           DeletionRequestStatus @default(PENDING)
  reason           String?               @db.VarChar(500)
  requestedAt      DateTime              @default(now()) @map("requested_at")
  scheduledPurgeAt DateTime              @map("scheduled_purge_at")
  cancelledAt      DateTime?             @map("cancelled_at")
  purgedAt         DateTime?             @map("purged_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status, scheduledPurgeAt])
  @@map("user_deletion_request")
}

// ═════════════════════════════ 블록 B · 콘텐츠 메타데이터 부속 모델

/// 장르 축. 자유 태그와 달리 운영이 소유하는 고정 분류다.
model Category {
  id       String  @id @default(cuid())
  slug     String  @unique @db.VarChar(40)
  nameKo   String  @map("name_ko") @db.VarChar(60)
  nameEn   String  @map("name_en") @db.VarChar(60)
  order    Int     @default(0)
  isActive Boolean @default(true) @map("is_active")

  series   Series[]
  episodes Episode[]

  @@index([isActive, order])
  @@map("category")
}

/// 에피소드 챕터(타임스탬프). 플레이어 진행바 마커와 JSON-LD Clip 의 원천.
model Chapter {
  id        String @id @default(cuid())
  episodeId String @map("episode_id")
  startSec  Int    @map("start_sec")
  title     String @db.VarChar(120)

  episode Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@unique([episodeId, startSec])
  @@index([episodeId, startSec])
  @@map("chapter")
}

/// 제작진·출연. 시리즈 단위 또는 에피소드 단위로 붙는다.
model Credit {
  id        String     @id @default(cuid())
  seriesId  String?    @map("series_id")
  episodeId String?    @map("episode_id")
  userId    String?    @map("user_id")
  role      CreditRole
  name      String     @db.VarChar(80)
  note      String?    @db.VarChar(200)
  order     Int        @default(0)

  series  Series?  @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  episode Episode? @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  user    User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([seriesId, order])
  @@index([episodeId, order])
  @@index([userId])
  @@map("credit")
}

/// 자막·캡션 트랙. 접근성(10_NFR)과 다국어 유통의 전제.
model SubtitleTrack {
  id              String       @id @default(cuid())
  episodeId       String       @map("episode_id")
  language        String       @db.VarChar(10)
  label           String       @db.VarChar(60)
  kind            SubtitleKind @default(SUBTITLE)
  objectKey       String       @map("object_key")
  isDefault       Boolean      @default(false) @map("is_default")
  isAutoGenerated Boolean      @default(false) @map("is_auto_generated")
  createdAt       DateTime     @default(now()) @map("created_at")

  episode Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@unique([episodeId, language, kind])
  @@index([episodeId])
  @@map("subtitle_track")
}

/// 에피소드 로케일별 카피. hreflang alternates 의 원천.
model EpisodeTranslation {
  episodeId       String   @map("episode_id")
  locale          String   @db.VarChar(10)
  title           String   @db.VarChar(160)
  description     String?  @db.VarChar(2000)
  metaTitle       String?  @map("meta_title") @db.VarChar(70)
  metaDescription String?  @map("meta_description") @db.VarChar(160)
  updatedAt       DateTime @updatedAt @map("updated_at")

  episode Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@id([episodeId, locale])
  @@index([locale])
  @@map("episode_translation")
}

/// 시리즈 로케일별 카피.
model SeriesTranslation {
  seriesId        String   @map("series_id")
  locale          String   @db.VarChar(10)
  title           String   @db.VarChar(120)
  synopsis        String?  @db.VarChar(2000)
  metaTitle       String?  @map("meta_title") @db.VarChar(70)
  metaDescription String?  @map("meta_description") @db.VarChar(160)
  updatedAt       DateTime @updatedAt @map("updated_at")

  series Series @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  @@id([seriesId, locale])
  @@index([locale])
  @@map("series_translation")
}

/// 시청자 재생목록. Series 는 크리에이터 소유라 시청자가 담을 수 없다.
model Playlist {
  id          String     @id @default(cuid())
  userId      String     @map("user_id")
  title       String     @db.VarChar(120)
  description String?    @db.VarChar(1000)
  visibility  Visibility @default(PRIVATE)
  itemCount   Int        @default(0) @map("item_count")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  user  User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  items PlaylistItem[]

  @@index([userId, updatedAt(sort: Desc)])
  @@index([visibility, updatedAt(sort: Desc)])
  @@map("playlist")
}

model PlaylistItem {
  playlistId String   @map("playlist_id")
  episodeId  String   @map("episode_id")
  order      Int      @default(0)
  addedAt    DateTime @default(now()) @map("added_at")

  playlist Playlist @relation(fields: [playlistId], references: [id], onDelete: Cascade)
  episode  Episode  @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@id([playlistId, episodeId])
  @@index([playlistId, order])
  @@map("playlist_item")
}
```

## 3. 상태기계 (순수 함수로 강제)

`packages/core/src/state/` 의 함수만이 상태 전이를 허가한다.
리포지토리는 전이 함수를 통과하지 않은 상태 변경을 하지 않는다.

### Episode

```
DRAFT ──▶ SCHEDULED ──▶ PUBLISHED ──▶ HIDDEN ──▶ PUBLISHED
  │  ▲        │            │            │
  │  └────────┘            └────────────┴──▶ REMOVED (되돌릴 수 없음)
  │    scheduler 검증 실패 시에만 복귀
  └──▶ PUBLISHED  (즉시 공개)
```

| 전이 | 추가 조건 |
|---|---|
| `* → PUBLISHED` | `asset.status === 'READY'` **그리고** `aiDisclosure` 비어있지 않음 |
| `DRAFT → SCHEDULED` | `publishAt` 이 현재보다 미래 |
| `SCHEDULED → PUBLISHED` | scheduler 또는 소유자 수동 |
| `SCHEDULED → DRAFT` | scheduler가 공개 직전 조건 검증에 실패한 경우만 |
| `PUBLISHED → HIDDEN` | 소유자 또는 MODERATOR |
| `* → REMOVED` | 소유자 또는 ADMIN. **불가역.** |
| `REMOVED → *` | **전면 금지** |

조건 위반 시 `E_EPISODE_INVALID_TRANSITION`,
자산 미준비 시 `E_EPISODE_ASSET_NOT_READY`,
표기 누락 시 `E_EPISODE_AI_DISCLOSURE_REQUIRED`.

### VideoAsset

```
PENDING ──▶ PROBING ──▶ TRANSCODING ──▶ READY
              │              │
              └──────────────┴──▶ FAILED ──▶ PENDING (재시도 시)
```

`FAILED → PENDING` 은 `attemptCount < 3` 일 때만 허용.

### UploadSession

```
CREATED ──▶ UPLOADING ──▶ UPLOADED
   │            │
   └────────────┴──▶ ABORTED / FAILED
```

`UPLOADED` 는 종착점. 다시 `UPLOADING` 으로 못 간다 (`E_UPLOAD_ALREADY_COMPLETED`).

## 4. 비정규화 카운터 정합성 규칙

| 카운터 | 갱신 방식 | 정합성 보정 |
|---|---|---|
| `Episode.likeCount` | 트랜잭션 내 `Like` 삽입/삭제와 동시 `increment` | 야간 배치가 실측과 대조 후 수정 |
| `Episode.commentCount` | 동일 | 동일 |
| `Episode.viewCount` | Redis 버퍼 → 1분마다 flush (`counter.flush` 잡) | flush 실패 시 Redis 키 보존 (유실 방지) |
| `Episode.shareCount` | 공유 액션 시 `increment` | 보정 불필요 (참고 지표) |
| `Episode.impressionCount` | Redis 버퍼 → flush (`viewCount` 와 동일 경로) | flush 실패 시 키 보존 |
| `Episode.avgWatchSec` | `WatchProgress` 집계 배치가 덮어쓴다 | 배치가 진실 |
| `Series.episodeCount` | 상태 전이 시 재계산 | |
| `Series.totalLikes` · `Series.followerCount` | 하위 에피소드 집계 배치 | 배치가 진실 |
| `User.followerCount` | 트랜잭션 내 동시 갱신 | |
| `User.followingCount` | `Follow` 삽입/삭제와 동시 갱신 | 야간 배치 대조 |
| `User.episodeCount` · `User.totalViews` | 소유 시리즈 집계 배치 | 배치가 진실 |
| `Playlist.itemCount` | `PlaylistItem` 삽입/삭제와 동시 갱신 | |
| `User.tierPoints` · `User.tier` | `tier.reevaluate` 배치가 `evaluateTier()` 로 덮어쓴다 | 배치가 진실. **하락도 반영한다** |
| `Tag.useCount` | 태그 연결/해제 시 | |

**철칙**: 카운터는 **읽기 최적화용 캐시**다. 진실은 항상 실제 행의 개수다.
카운터가 틀렸다고 서비스가 깨지면 안 된다. (예: 좋아요 버튼은 `Like` 존재 여부로 판단)

## 5. 소프트 삭제 규칙

`deletedAt` 을 가진 모델: `User` `Series` `Episode` `Comment`

회원 탈퇴는 `deletedAt` 을 찍는 것으로 끝나지 않는다. `UserDeletionRequest` 가
`scheduledPurgeAt` 을 들고 있고, 그 시각 이후에 `cleanup` 잡이 물리 파기한다.
그 사이에 본인이 취소하면 `status = CANCELLED` 로 되돌린다. 동의 이력
(`UserConsent`)과 인증 감사(`AuthAuditLog`)는 법정 보존 기간이 따로 있어
계정 파기와 **같은 시점에 지우지 않는다.**

- 조회는 **반드시** `deletedAt: null` 조건을 포함한다.
- `packages/db` 의 리포지토리에서만 조회하므로, 각 리포지토리 함수가 기본으로 필터를 넣는다.
- 삭제된 행을 반드시 봐야 하는 운영 조회는 `*IncludingDeleted` 접미사 함수로 분리.
- 물리 삭제는 90일 후 `cleanup` 잡이 수행한다.

## 6. 인덱스 근거 (임의 추가/삭제 금지)

| 인덱스 | 쓰이는 쿼리 |
|---|---|
| `episode(status, publishedAt desc)` | 최신 피드 |
| `episode(status, rankScore desc)` | 인기 피드 |
| `episode(status, publishAt)` | scheduler 의 예약공개 스캔 |
| `follow(followerId, createdAt)` | 팔로잉 피드의 대상 목록 |
| `watch_progress(userId, updatedAt desc)` | 이어보기 목록 |
| `report(status, createdAt)` | 심사큐 |
| `upload_session(status, expiresAt)` | 만료 세션 정리 |
| `episode(status, visibility, publishedAt desc)` | 공개 피드·sitemap (UNLISTED 제외) |
| `episode(categoryId, status, rankScore desc)` | 장르별 인기 |
| `episode(language, status, publishedAt desc)` | 언어별 피드 (다국어 확장) |
| `episode(madeForKids, status)` | 키즈 모드 필터 |
| `episode USING GIN(search_vector)` | 전문 검색 (트리거가 유지) |
| `episode USING GIN(title gin_trgm_ops)` | 한국어 부분 일치 — `simple` 사전은 형태소를 못 자른다 |
| `episode USING GIN(keywords)` · `GIN(ai_models)` · `GIN(regions_blocked)` | 배열 포함 필터 |
| `series(categoryId, visibility, createdAt desc)` | 장르별 작품 목록 |
| `user(country, locale)` | 시장별 집계 (12_GLOBAL_EXPANSION §2) |
| `user_consent(userId, kind, grantedAt desc)` | 동의 이력 열람 요청 응답 |
| `auth_audit_log(email, kind, createdAt desc)` | 로그인 실패 폭주 탐지 |
| `user_deletion_request(status, scheduledPurgeAt)` | 파기 예정 스캔 |
| `user(tier, tierPoints desc)` | 등급별 순위·재평가 배치 스캔 |
| `role_grant(userId, createdAt desc)` | 계정별 역할 변경 이력 |
| `role_grant(toRole, createdAt desc)` | "최근 ADMIN 이 된 계정" 감사 |

새 인덱스가 필요하다고 판단되면 `EXPLAIN ANALYZE` 결과를 `_ISSUES.md` 에 첨부해 제안한다.

## 7. 마이그레이션 규칙

1. 스키마 수정 → **반드시** `pnpm prisma migrate dev --name t{NN}_{요약}` 로 마이그레이션 생성
2. `prisma db push` **프로덕션 금지** (개발 실험용도로도 지양)
3. 파괴적 변경(컬럼 삭제/타입 축소)은 2단계로 나눈다:
   - 1차 배포: 새 컬럼 추가 + 양쪽 쓰기
   - 2차 배포: 구 컬럼 삭제
4. `contract:prisma` 게이트가 스키마 ↔ 마이그레이션 드리프트를 차단한다.
