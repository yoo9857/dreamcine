-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('VIEWER', 'CREATOR', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('CREATED', 'UPLOADING', 'UPLOADED', 'FAILED', 'ABORTED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'PROBING', 'TRANSCODING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "AgeRating" AS ENUM ('ALL', 'A12', 'A15', 'A19');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'ACTIONED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SEXUAL', 'VIOLENCE', 'HATE', 'SPAM', 'COPYRIGHT', 'MINOR_SAFETY', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('EPISODE', 'SERIES', 'COMMENT', 'USER');

-- CreateEnum
CREATE TYPE "NotifType" AS ENUM ('NEW_EPISODE', 'NEW_FOLLOWER', 'NEW_COMMENT', 'NEW_LIKE', 'TRANSCODE_DONE', 'TRANSCODE_FAILED', 'MODERATION');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "password_hash" TEXT,
    "display_name" TEXT NOT NULL,
    "bio" VARCHAR(500),
    "avatar_key" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "follower_count" INTEGER NOT NULL DEFAULT 0,
    "series_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_token" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "synopsis" VARCHAR(2000),
    "poster_key" TEXT,
    "age_rating" "AgeRating" NOT NULL DEFAULT 'ALL',
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "comments_off" BOOLEAN NOT NULL DEFAULT false,
    "episode_count" INTEGER NOT NULL DEFAULT 0,
    "total_views" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season" (
    "id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode" (
    "id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "season_id" TEXT,
    "asset_id" TEXT,
    "number" INTEGER NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000),
    "thumb_key" TEXT,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'DRAFT',
    "age_rating" "AgeRating" NOT NULL DEFAULT 'ALL',
    "ai_disclosure" VARCHAR(500),
    "publish_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "view_count" BIGINT NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "rank_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'CREATED',
    "file_name" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "checksum" TEXT,
    "object_key" TEXT NOT NULL,
    "s3_upload_id" TEXT,
    "part_size" INTEGER NOT NULL,
    "total_parts" INTEGER NOT NULL,
    "completed_parts" JSONB NOT NULL DEFAULT '[]',
    "error_code" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_asset" (
    "id" TEXT NOT NULL,
    "upload_id" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'PENDING',
    "original_key" TEXT NOT NULL,
    "hls_prefix" TEXT,
    "master_path" TEXT,
    "poster_key" TEXT,
    "duration_sec" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "video_codec" TEXT,
    "audio_codec" TEXT,
    "bitrate_kbps" INTEGER,
    "size_bytes" BIGINT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "error_detail" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ready_at" TIMESTAMP(3),

    CONSTRAINT "video_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rendition" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bitrate_kbps" INTEGER NOT NULL,
    "playlist_path" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rendition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow" (
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateTable
CREATE TABLE "block" (
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateTable
CREATE TABLE "like" (
    "user_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "like_pkey" PRIMARY KEY ("user_id","episode_id")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "body" VARCHAR(1000) NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_progress" (
    "user_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "position_sec" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watch_progress_pkey" PRIMARY KEY ("user_id","episode_id")
);

-- CreateTable
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "use_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_tag" (
    "episode_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "episode_tag_pkey" PRIMARY KEY ("episode_id","tag_id")
);

-- CreateTable
CREATE TABLE "series_tag" (
    "series_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "series_tag_pkey" PRIMARY KEY ("series_id","tag_id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotifType" NOT NULL,
    "payload" JSONB NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target" "ReportTarget" NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "detail" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "handled_by" TEXT,
    "handled_at" TIMESTAMP(3),
    "action_note" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_handle_key" ON "user"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_status_created_at_idx" ON "user"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_provider_account_id_key" ON "account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_session_token_key" ON "session"("session_token");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_token_key" ON "verification_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_identifier_token_key" ON "verification_token"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "series_slug_key" ON "series"("slug");

-- CreateIndex
CREATE INDEX "series_owner_id_created_at_idx" ON "series"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "series_deleted_at_created_at_idx" ON "series"("deleted_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "season_series_id_number_key" ON "season"("series_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "episode_asset_id_key" ON "episode"("asset_id");

-- CreateIndex
CREATE INDEX "episode_status_published_at_idx" ON "episode"("status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "episode_status_rank_score_idx" ON "episode"("status", "rank_score" DESC);

-- CreateIndex
CREATE INDEX "episode_series_id_number_idx" ON "episode"("series_id", "number");

-- CreateIndex
CREATE INDEX "episode_status_publish_at_idx" ON "episode"("status", "publish_at");

-- CreateIndex
CREATE UNIQUE INDEX "episode_series_id_season_id_number_key" ON "episode"("series_id", "season_id", "number");

-- CreateIndex
CREATE INDEX "upload_session_user_id_created_at_idx" ON "upload_session"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "upload_session_status_expires_at_idx" ON "upload_session"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "video_asset_upload_id_key" ON "video_asset"("upload_id");

-- CreateIndex
CREATE INDEX "video_asset_status_created_at_idx" ON "video_asset"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rendition_asset_id_name_key" ON "rendition"("asset_id", "name");

-- CreateIndex
CREATE INDEX "follow_following_id_created_at_idx" ON "follow"("following_id", "created_at");

-- CreateIndex
CREATE INDEX "follow_follower_id_created_at_idx" ON "follow"("follower_id", "created_at");

-- CreateIndex
CREATE INDEX "like_episode_id_created_at_idx" ON "like"("episode_id", "created_at");

-- CreateIndex
CREATE INDEX "comment_episode_id_created_at_idx" ON "comment"("episode_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "comment_parent_id_created_at_idx" ON "comment"("parent_id", "created_at");

-- CreateIndex
CREATE INDEX "watch_progress_user_id_updated_at_idx" ON "watch_progress"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tag_name_key" ON "tag"("name");

-- CreateIndex
CREATE INDEX "tag_use_count_idx" ON "tag"("use_count" DESC);

-- CreateIndex
CREATE INDEX "episode_tag_tag_id_idx" ON "episode_tag"("tag_id");

-- CreateIndex
CREATE INDEX "series_tag_tag_id_idx" ON "series_tag"("tag_id");

-- CreateIndex
CREATE INDEX "notification_user_id_created_at_idx" ON "notification"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notification_user_id_read_at_idx" ON "notification"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "report_status_created_at_idx" ON "report"("status", "created_at");

-- CreateIndex
CREATE INDEX "report_target_target_id_idx" ON "report"("target", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_reporter_id_target_target_id_key" ON "report"("reporter_id", "target", "target_id");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season" ADD CONSTRAINT "season_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "video_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_session" ADD CONSTRAINT "upload_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_asset" ADD CONSTRAINT "video_asset_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "upload_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendition" ADD CONSTRAINT "rendition_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "video_asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow" ADD CONSTRAINT "follow_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow" ADD CONSTRAINT "follow_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block" ADD CONSTRAINT "block_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block" ADD CONSTRAINT "block_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like" ADD CONSTRAINT "like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like" ADD CONSTRAINT "like_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_tag" ADD CONSTRAINT "episode_tag_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_tag" ADD CONSTRAINT "episode_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_tag" ADD CONSTRAINT "series_tag_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_tag" ADD CONSTRAINT "series_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
