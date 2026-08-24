# 04 — 도메인 모델 · Prisma 스키마 계약

> 상태: **불변 계약**. CODEX 수정 금지.
> 이 문서의 스키마는 **그대로** `prisma/schema.prisma` 가 된다.
> 필드를 추가/삭제하려면 `_ISSUES.md` 에 제안하고 멈춘다.

---

## 1. 엔티티 관계

```
User ──┬──< Series ──< Season ──< Episode >── VideoAsset ──< Rendition
       │                             │
       │                             ├──< Like
       │                             ├──< Comment ──< Comment (1단 대댓글)
       │                             ├──< WatchProgress
       │                             └──< EpisodeTag >── Tag
       │
       ├──< Follow >── User            (팔로워/팔로잉)
       ├──< Block >── User             (차단)
       ├──< UploadSession
       ├──< Notification
       ├──< Report                    (신고자)
       └──< Session / Account          (Auth.js)
```

## 2. Prisma 스키마

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ───────────────────────────── 열거형

enum UserRole      { VIEWER CREATOR MODERATOR ADMIN }
enum UserStatus    { ACTIVE SUSPENDED DELETED }
enum UploadStatus  { CREATED UPLOADING UPLOADED FAILED ABORTED }
enum AssetStatus   { PENDING PROBING TRANSCODING READY FAILED }
enum EpisodeStatus { DRAFT SCHEDULED PUBLISHED HIDDEN REMOVED }
enum AgeRating     { ALL A12 A15 A19 }
enum ReportStatus  { OPEN REVIEWING ACTIONED REJECTED }
enum ReportReason  { SEXUAL VIOLENCE HATE SPAM COPYRIGHT MINOR_SAFETY OTHER }
enum ReportTarget  { EPISODE SERIES COMMENT USER }
enum NotifType     { NEW_EPISODE NEW_FOLLOWER NEW_COMMENT NEW_LIKE TRANSCODE_DONE TRANSCODE_FAILED PUBLISH_FAILED MODERATION }

// ───────────────────────────── 사용자

model User {
  id            String     @id @default(cuid())
  handle        String     @unique               // 영문/숫자/_ 3~20자
  email         String     @unique
  emailVerified DateTime?  @map("email_verified")
  passwordHash  String?    @map("password_hash") // 소셜 전용 계정은 null
  displayName   String     @map("display_name")
  bio           String?    @db.VarChar(500)
  avatarKey     String?    @map("avatar_key")    // Object Storage 키
  role          UserRole   @default(VIEWER)
  status        UserStatus @default(ACTIVE)

  followerCount Int        @default(0) @map("follower_count")  // 비정규화 카운터
  seriesCount   Int        @default(0) @map("series_count")

  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt      @map("updated_at")
  deletedAt     DateTime?  @map("deleted_at")

  series          Series[]
  uploadSessions  UploadSession[]
  likes           Like[]
  comments        Comment[]
  watchProgress   WatchProgress[]
  following       Follow[]         @relation("follower")
  followers       Follow[]         @relation("following")
  blocking        Block[]          @relation("blocker")
  blockedBy       Block[]          @relation("blocked")
  notifications   Notification[]
  reportsMade     Report[]         @relation("reporter")
  accounts        Account[]
  sessions        Session[]

  @@index([status, createdAt])
  @@map("user")
}

// Auth.js 필수 모델 (스키마 변경 금지 — 라이브러리 규격)
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
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
  @@map("account")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
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

// ───────────────────────────── 작품

model Series {
  id           String     @id @default(cuid())
  ownerId      String     @map("owner_id")
  slug         String     @unique                  // URL용, 소유자 내 유니크가 아니라 전역
  title        String     @db.VarChar(120)
  synopsis     String?    @db.VarChar(2000)
  posterKey    String?    @map("poster_key")
  ageRating    AgeRating  @default(ALL) @map("age_rating")
  isCompleted  Boolean    @default(false) @map("is_completed")
  commentsOff  Boolean    @default(false) @map("comments_off")

  episodeCount Int        @default(0) @map("episode_count")   // 공개된 것만 카운트
  totalViews   BigInt     @default(0) @map("total_views")

  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt      @map("updated_at")
  deletedAt    DateTime?  @map("deleted_at")

  owner    User       @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  seasons  Season[]
  episodes Episode[]
  tags     SeriesTag[]

  @@index([ownerId, createdAt])
  @@index([deletedAt, createdAt])
  @@map("series")
}

model Season {
  id        String   @id @default(cuid())
  seriesId  String   @map("series_id")
  number    Int                                    // 1부터
  title     String?  @db.VarChar(120)
  createdAt DateTime @default(now()) @map("created_at")

  series   Series    @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  episodes Episode[]

  @@unique([seriesId, number])
  @@map("season")
}

model Episode {
  id            String        @id @default(cuid())
  seriesId      String        @map("series_id")
  seasonId      String?       @map("season_id")
  assetId       String?       @unique @map("asset_id")

  number        Int                                  // 시즌 내 화수
  title         String        @db.VarChar(160)
  description   String?       @db.VarChar(2000)
  thumbKey      String?       @map("thumb_key")
  status        EpisodeStatus @default(DRAFT)
  ageRating     AgeRating     @default(ALL) @map("age_rating")

  aiDisclosure  String?       @db.VarChar(500) @map("ai_disclosure")  // 필수: PUBLISHED 전이 조건

  publishAt     DateTime?     @map("publish_at")     // SCHEDULED 일 때 필수
  publishedAt   DateTime?     @map("published_at")

  viewCount     BigInt        @default(0) @map("view_count")
  likeCount     Int           @default(0) @map("like_count")
  commentCount  Int           @default(0) @map("comment_count")
  rankScore     Float         @default(0) @map("rank_score")

  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt      @map("updated_at")
  deletedAt     DateTime?     @map("deleted_at")

  series        Series          @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  season        Season?         @relation(fields: [seasonId], references: [id], onDelete: SetNull)
  asset         VideoAsset?     @relation(fields: [assetId], references: [id], onDelete: SetNull)
  likes         Like[]
  comments      Comment[]
  watchProgress WatchProgress[]
  tags          EpisodeTag[]

  @@unique([seriesId, seasonId, number])
  @@index([status, publishedAt(sort: Desc)])          // 최신 피드
  @@index([status, rankScore(sort: Desc)])            // 인기 피드
  @@index([seriesId, number])
  @@index([status, publishAt])                        // 예약 공개 스캔
  @@map("episode")
}

// ───────────────────────────── 미디어

model UploadSession {
  id            String       @id @default(cuid())
  userId        String       @map("user_id")
  status        UploadStatus @default(CREATED)

  fileName      String       @map("file_name")
  fileSize      BigInt       @map("file_size")
  mimeType      String       @map("mime_type")
  checksum      String?                              // 클라이언트 신고값 (참고용)

  objectKey     String       @map("object_key")      // originals/{userId}/{sessionId}/{fileName}
  s3UploadId    String?      @map("s3_upload_id")    // 멀티파트 업로드 ID
  partSize      Int          @map("part_size")
  totalParts    Int          @map("total_parts")
  completedParts Json        @default("[]") @map("completed_parts")  // [{partNumber, etag}]

  errorCode     String?      @map("error_code")
  expiresAt     DateTime     @map("expires_at")      // 생성 + 24h
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt      @map("updated_at")

  user  User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset VideoAsset?

  @@index([userId, createdAt])
  @@index([status, expiresAt])                       // 만료 세션 정리 스캔
  @@map("upload_session")
}

model VideoAsset {
  id            String      @id @default(cuid())
  uploadId      String?     @unique @map("upload_id")
  status        AssetStatus @default(PENDING)

  originalKey   String      @map("original_key")
  hlsPrefix     String?     @map("hls_prefix")       // hls/{assetId}/
  masterPath    String?     @map("master_path")      // hls/{assetId}/master.m3u8
  posterKey     String?     @map("poster_key")

  durationSec   Int?        @map("duration_sec")
  width         Int?
  height        Int?
  videoCodec    String?     @map("video_codec")
  audioCodec    String?     @map("audio_codec")
  bitrateKbps   Int?        @map("bitrate_kbps")
  sizeBytes     BigInt?     @map("size_bytes")

  attemptCount  Int         @default(0) @map("attempt_count")
  errorCode     String?     @map("error_code")
  errorDetail   String?     @db.VarChar(2000) @map("error_detail")

  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt      @map("updated_at")
  readyAt       DateTime?   @map("ready_at")

  upload      UploadSession? @relation(fields: [uploadId], references: [id], onDelete: SetNull)
  episode     Episode?
  renditions  Rendition[]

  @@index([status, createdAt])
  @@map("video_asset")
}

model Rendition {
  id          String   @id @default(cuid())
  assetId     String   @map("asset_id")
  name        String                                 // "1080p" | "720p" | "480p" | "360p"
  width       Int
  height      Int
  bitrateKbps Int      @map("bitrate_kbps")
  playlistPath String  @map("playlist_path")         // hls/{assetId}/720p/index.m3u8
  sizeBytes   BigInt   @map("size_bytes")
  createdAt   DateTime @default(now()) @map("created_at")

  asset VideoAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@unique([assetId, name])
  @@map("rendition")
}

// ───────────────────────────── 소셜

model Follow {
  followerId  String   @map("follower_id")
  followingId String   @map("following_id")
  createdAt   DateTime @default(now()) @map("created_at")

  follower  User @relation("follower",  fields: [followerId],  references: [id], onDelete: Cascade)
  following User @relation("following", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
  @@index([followingId, createdAt])                  // 팔로워 목록
  @@index([followerId, createdAt])                   // 팔로잉 피드 조회
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

  user    User    @relation(fields: [userId],    references: [id], onDelete: Cascade)
  episode Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@id([userId, episodeId])
  @@index([episodeId, createdAt])
  @@map("like")
}

model Comment {
  id        String    @id @default(cuid())
  episodeId String    @map("episode_id")
  userId    String    @map("user_id")
  parentId  String?   @map("parent_id")              // null = 최상위, 1단까지만
  body      String    @db.VarChar(1000)
  isHidden  Boolean   @default(false) @map("is_hidden")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt      @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  episode Episode   @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  user    User      @relation(fields: [userId],    references: [id], onDelete: Cascade)
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

  user    User    @relation(fields: [userId],    references: [id], onDelete: Cascade)
  episode Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@id([userId, episodeId])
  @@index([userId, updatedAt(sort: Desc)])           // 이어보기 목록
  @@map("watch_progress")
}

// ───────────────────────────── 태그

model Tag {
  id       String @id @default(cuid())
  name     String @unique                            // 소문자 정규화 저장
  useCount Int    @default(0) @map("use_count")

  episodes EpisodeTag[]
  series   SeriesTag[]

  @@index([useCount(sort: Desc)])
  @@map("tag")
}

model EpisodeTag {
  episodeId String @map("episode_id")
  tagId     String @map("tag_id")
  episode Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  tag     Tag     @relation(fields: [tagId],     references: [id], onDelete: Cascade)
  @@id([episodeId, tagId])
  @@index([tagId])
  @@map("episode_tag")
}

model SeriesTag {
  seriesId String @map("series_id")
  tagId    String @map("tag_id")
  series Series @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId],    references: [id], onDelete: Cascade)
  @@id([seriesId, tagId])
  @@index([tagId])
  @@map("series_tag")
}

// ───────────────────────────── 알림 · 신고

model Notification {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  type      NotifType
  payload   Json                                     // 타입별 스키마는 zod 로 검증
  readAt    DateTime? @map("read_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, readAt])
  @@map("notification")
}

model Report {
  id         String       @id @default(cuid())
  reporterId String       @map("reporter_id")
  target     ReportTarget
  targetId   String       @map("target_id")
  reason     ReportReason
  detail     String?      @db.VarChar(1000)
  status     ReportStatus @default(OPEN)

  handledBy  String?      @map("handled_by")
  handledAt  DateTime?    @map("handled_at")
  actionNote String?      @db.VarChar(1000) @map("action_note")

  createdAt  DateTime     @default(now()) @map("created_at")

  reporter User @relation("reporter", fields: [reporterId], references: [id], onDelete: Cascade)

  @@unique([reporterId, target, targetId])           // 중복 신고 방지
  @@index([status, createdAt])                       // 심사큐
  @@index([target, targetId])                        // 대상별 누적 신고
  @@map("report")
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
| `Series.episodeCount` | 상태 전이 시 재계산 | |
| `User.followerCount` | 트랜잭션 내 동시 갱신 | |
| `Tag.useCount` | 태그 연결/해제 시 | |

**철칙**: 카운터는 **읽기 최적화용 캐시**다. 진실은 항상 실제 행의 개수다.
카운터가 틀렸다고 서비스가 깨지면 안 된다. (예: 좋아요 버튼은 `Like` 존재 여부로 판단)

## 5. 소프트 삭제 규칙

`deletedAt` 을 가진 모델: `User` `Series` `Episode` `Comment`

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

새 인덱스가 필요하다고 판단되면 `EXPLAIN ANALYZE` 결과를 `_ISSUES.md` 에 첨부해 제안한다.

## 7. 마이그레이션 규칙

1. 스키마 수정 → **반드시** `pnpm prisma migrate dev --name t{NN}_{요약}` 로 마이그레이션 생성
2. `prisma db push` **프로덕션 금지** (개발 실험용도로도 지양)
3. 파괴적 변경(컬럼 삭제/타입 축소)은 2단계로 나눈다:
   - 1차 배포: 새 컬럼 추가 + 양쪽 쓰기
   - 2차 배포: 구 컬럼 삭제
4. `contract:prisma` 게이트가 스키마 ↔ 마이그레이션 드리프트를 차단한다.
