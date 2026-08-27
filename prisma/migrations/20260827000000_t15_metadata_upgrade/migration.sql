-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "LinkKind" AS ENUM ('WEBSITE', 'YOUTUBE', 'INSTAGRAM', 'X', 'TIKTOK', 'THREADS', 'DISCORD', 'EMAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('TOS', 'PRIVACY', 'MARKETING', 'AGE', 'AI_TRAINING', 'SENSITIVE_DATA');

-- CreateEnum
CREATE TYPE "ContentLicense" AS ENUM ('STANDARD', 'CC_BY');

-- CreateEnum
CREATE TYPE "CreditRole" AS ENUM ('DIRECTOR', 'WRITER', 'VOICE', 'MUSIC', 'EDIT', 'AI_VISUAL', 'PRODUCER', 'TRANSLATOR', 'OTHER');

-- CreateEnum
CREATE TYPE "SubtitleKind" AS ENUM ('SUBTITLE', 'CAPTION');

-- CreateEnum
CREATE TYPE "AuthEventKind" AS ENUM ('SIGNUP', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET_REQUEST', 'PASSWORD_CHANGED', 'EMAIL_VERIFIED', 'ROLE_CHANGED', 'SUSPENDED', 'REACTIVATED');

-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING', 'CANCELLED', 'PURGED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "banner_key" TEXT,
ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "channel_description" VARCHAR(5000),
ADD COLUMN     "channel_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "country" CHAR(2),
ADD COLUMN     "default_age_rating" "AgeRating" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "default_language" VARCHAR(10) NOT NULL DEFAULT 'ko',
ADD COLUMN     "default_license" "ContentLicense" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "episode_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "following_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hide_follower_count" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "last_seen_at" TIMESTAMP(3),
ADD COLUMN     "locale" VARCHAR(10) NOT NULL DEFAULT 'ko-KR',
ADD COLUMN     "login_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phone" VARCHAR(32),
ADD COLUMN     "phone_verified_at" TIMESTAMP(3),
ADD COLUMN     "profile_visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "signup_ip_hash" VARCHAR(64),
ADD COLUMN     "signup_referrer" VARCHAR(500),
ADD COLUMN     "signup_user_agent" VARCHAR(500),
ADD COLUMN     "suspend_reason" VARCHAR(500),
ADD COLUMN     "suspended_until" TIMESTAMP(3),
ADD COLUMN     "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Seoul',
ADD COLUMN     "total_views" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "trailer_episode_id" TEXT,
ADD COLUMN     "utm_campaign" VARCHAR(120),
ADD COLUMN     "utm_medium" VARCHAR(120),
ADD COLUMN     "utm_source" VARCHAR(120),
ADD COLUMN     "verified_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "series" ADD COLUMN     "banner_key" TEXT,
ADD COLUMN     "canonical_path" VARCHAR(300),
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "content_warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "first_aired_at" TIMESTAMP(3),
ADD COLUMN     "follower_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "language" VARCHAR(10) NOT NULL DEFAULT 'ko',
ADD COLUMN     "license" "ContentLicense" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "made_for_kids" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meta_description" VARCHAR(160),
ADD COLUMN     "meta_title" VARCHAR(70),
ADD COLUMN     "og_image_key" TEXT,
ADD COLUMN     "regions_allowed" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "regions_blocked" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "search_vector" tsvector,
ADD COLUMN     "total_likes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trailer_episode_id" TEXT,
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "episode" ADD COLUMN     "ai_generated_pct" INTEGER,
ADD COLUMN     "ai_human_role" VARCHAR(500),
ADD COLUMN     "ai_models" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ai_tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "allow_download" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allow_embed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "avg_watch_sec" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "canonical_path" VARCHAR(300),
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "content_warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "duration_sec" INTEGER,
ADD COLUMN     "impression_count" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "language" VARCHAR(10) NOT NULL DEFAULT 'ko',
ADD COLUMN     "license" "ContentLicense" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "made_for_kids" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meta_description" VARCHAR(160),
ADD COLUMN     "meta_title" VARCHAR(70),
ADD COLUMN     "og_image_key" TEXT,
ADD COLUMN     "recorded_at" TIMESTAMP(3),
ADD COLUMN     "regions_allowed" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "regions_blocked" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "search_vector" tsvector,
ADD COLUMN     "share_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "user_link" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "LinkKind" NOT NULL,
    "label" VARCHAR(60) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consent" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "version" VARCHAR(32) NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "ip_hash" VARCHAR(64),
    "user_agent" VARCHAR(500),

    CONSTRAINT "user_consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preference" (
    "user_id" TEXT NOT NULL,
    "type" "NotifType" NOT NULL,
    "in_app" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "push" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notification_preference_pkey" PRIMARY KEY ("user_id","type")
);

-- CreateTable
CREATE TABLE "auth_audit_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" VARCHAR(254),
    "kind" "AuthEventKind" NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "ip_hash" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "detail" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_deletion_request" (
    "user_id" TEXT NOT NULL,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" VARCHAR(500),
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_purge_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "purged_at" TIMESTAMP(3),

    CONSTRAINT "user_deletion_request_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(40) NOT NULL,
    "name_ko" VARCHAR(60) NOT NULL,
    "name_en" VARCHAR(60) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter" (
    "id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "start_sec" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL,

    CONSTRAINT "chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit" (
    "id" TEXT NOT NULL,
    "series_id" TEXT,
    "episode_id" TEXT,
    "user_id" TEXT,
    "role" "CreditRole" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "note" VARCHAR(200),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtitle_track" (
    "id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "label" VARCHAR(60) NOT NULL,
    "kind" "SubtitleKind" NOT NULL DEFAULT 'SUBTITLE',
    "object_key" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_auto_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subtitle_track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_translation" (
    "episode_id" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000),
    "meta_title" VARCHAR(70),
    "meta_description" VARCHAR(160),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "episode_translation_pkey" PRIMARY KEY ("episode_id","locale")
);

-- CreateTable
CREATE TABLE "series_translation" (
    "series_id" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "synopsis" VARCHAR(2000),
    "meta_title" VARCHAR(70),
    "meta_description" VARCHAR(160),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_translation_pkey" PRIMARY KEY ("series_id","locale")
);

-- CreateTable
CREATE TABLE "playlist" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_item" (
    "playlist_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_item_pkey" PRIMARY KEY ("playlist_id","episode_id")
);

-- CreateIndex
CREATE INDEX "user_link_user_id_order_idx" ON "user_link"("user_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "user_link_user_id_kind_url_key" ON "user_link"("user_id", "kind", "url");

-- CreateIndex
CREATE INDEX "user_consent_user_id_kind_granted_at_idx" ON "user_consent"("user_id", "kind", "granted_at" DESC);

-- CreateIndex
CREATE INDEX "user_consent_kind_version_idx" ON "user_consent"("kind", "version");

-- CreateIndex
CREATE UNIQUE INDEX "user_consent_user_id_kind_version_key" ON "user_consent"("user_id", "kind", "version");

-- CreateIndex
CREATE INDEX "auth_audit_log_user_id_created_at_idx" ON "auth_audit_log"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "auth_audit_log_kind_created_at_idx" ON "auth_audit_log"("kind", "created_at" DESC);

-- CreateIndex
CREATE INDEX "auth_audit_log_email_kind_created_at_idx" ON "auth_audit_log"("email", "kind", "created_at" DESC);

-- CreateIndex
CREATE INDEX "user_deletion_request_status_scheduled_purge_at_idx" ON "user_deletion_request"("status", "scheduled_purge_at");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX "category_is_active_order_idx" ON "category"("is_active", "order");

-- CreateIndex
CREATE INDEX "chapter_episode_id_start_sec_idx" ON "chapter"("episode_id", "start_sec");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_episode_id_start_sec_key" ON "chapter"("episode_id", "start_sec");

-- CreateIndex
CREATE INDEX "credit_series_id_order_idx" ON "credit"("series_id", "order");

-- CreateIndex
CREATE INDEX "credit_episode_id_order_idx" ON "credit"("episode_id", "order");

-- CreateIndex
CREATE INDEX "credit_user_id_idx" ON "credit"("user_id");

-- CreateIndex
CREATE INDEX "subtitle_track_episode_id_idx" ON "subtitle_track"("episode_id");

-- CreateIndex
CREATE UNIQUE INDEX "subtitle_track_episode_id_language_kind_key" ON "subtitle_track"("episode_id", "language", "kind");

-- CreateIndex
CREATE INDEX "episode_translation_locale_idx" ON "episode_translation"("locale");

-- CreateIndex
CREATE INDEX "series_translation_locale_idx" ON "series_translation"("locale");

-- CreateIndex
CREATE INDEX "playlist_user_id_updated_at_idx" ON "playlist"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "playlist_visibility_updated_at_idx" ON "playlist"("visibility", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "playlist_item_playlist_id_order_idx" ON "playlist_item"("playlist_id", "order");

-- CreateIndex
CREATE INDEX "user_role_status_idx" ON "user"("role", "status");

-- CreateIndex
CREATE INDEX "user_country_locale_idx" ON "user"("country", "locale");

-- CreateIndex
CREATE INDEX "user_verified_at_idx" ON "user"("verified_at");

-- CreateIndex
CREATE INDEX "user_last_seen_at_idx" ON "user"("last_seen_at");

-- CreateIndex
CREATE INDEX "series_category_id_visibility_created_at_idx" ON "series"("category_id", "visibility", "created_at" DESC);

-- CreateIndex
CREATE INDEX "series_language_visibility_idx" ON "series"("language", "visibility");

-- CreateIndex
CREATE INDEX "episode_status_visibility_published_at_idx" ON "episode"("status", "visibility", "published_at" DESC);

-- CreateIndex
CREATE INDEX "episode_category_id_status_rank_score_idx" ON "episode"("category_id", "status", "rank_score" DESC);

-- CreateIndex
CREATE INDEX "episode_language_status_published_at_idx" ON "episode"("language", "status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "episode_made_for_kids_status_idx" ON "episode"("made_for_kids", "status");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_trailer_episode_id_fkey" FOREIGN KEY ("trailer_episode_id") REFERENCES "episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_trailer_episode_id_fkey" FOREIGN KEY ("trailer_episode_id") REFERENCES "episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_link" ADD CONSTRAINT "user_link_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consent" ADD CONSTRAINT "user_consent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_audit_log" ADD CONSTRAINT "auth_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_deletion_request" ADD CONSTRAINT "user_deletion_request_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit" ADD CONSTRAINT "credit_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit" ADD CONSTRAINT "credit_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit" ADD CONSTRAINT "credit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtitle_track" ADD CONSTRAINT "subtitle_track_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_translation" ADD CONSTRAINT "episode_translation_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_translation" ADD CONSTRAINT "series_translation_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist" ADD CONSTRAINT "playlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_item" ADD CONSTRAINT "playlist_item_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_item" ADD CONSTRAINT "playlist_item_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════
-- T15 수동 구간: Prisma 가 표현할 수 없는 전문 검색 인프라
-- ═══════════════════════════════════════════════════════════════════

-- 한국어는 PostgreSQL 기본 사전에 없다. tsvector 는 'simple' 설정으로
-- 토큰화하고, 부분 일치는 pg_trgm 트라이그램 인덱스가 담당한다.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── episode.search_vector 유지 트리거
CREATE OR REPLACE FUNCTION episode_search_vector_refresh() RETURNS trigger AS $$
BEGIN
  NEW."search_vector" :=
    setweight(to_tsvector('simple', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW."keywords", ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."meta_description", '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW."description", '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS episode_search_vector_trg ON "episode";
CREATE TRIGGER episode_search_vector_trg
  BEFORE INSERT OR UPDATE OF "title", "description", "keywords", "meta_description"
  ON "episode"
  FOR EACH ROW EXECUTE FUNCTION episode_search_vector_refresh();

-- ─── series.search_vector 유지 트리거
CREATE OR REPLACE FUNCTION series_search_vector_refresh() RETURNS trigger AS $$
BEGIN
  NEW."search_vector" :=
    setweight(to_tsvector('simple', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW."keywords", ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."meta_description", '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW."synopsis", '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS series_search_vector_trg ON "series";
CREATE TRIGGER series_search_vector_trg
  BEFORE INSERT OR UPDATE OF "title", "synopsis", "keywords", "meta_description"
  ON "series"
  FOR EACH ROW EXECUTE FUNCTION series_search_vector_refresh();

-- ─── 기존 행 백필 (트리거는 신규/변경 행만 채운다)
--
-- **반드시 트리거가 감시하는 컬럼을 SET 해야 한다.** `UPDATE OF col_list` 트리거는
-- UPDATE 문의 SET 목록에 그 컬럼이 **언급**될 때만 발동한다 — 값이 바뀌는지는
-- 보지 않는다. 그래서 `SET updated_at = updated_at` 은 트리거를 깨우지 못하고
-- 백필이 조용히 아무 일도 하지 않는다. 그 증상은 "기존 작품이 검색에 안 걸림"
-- 이고, 누가 제목을 고칠 때까지 드러나지 않는다.
--
-- `title` 을 자기 값으로 덮는다. Prisma 의 `@updatedAt` 은 애플리케이션 레벨이라
-- raw SQL 로는 `updated_at` 이 올라가지 않는다 — sitemap 의 lastModified 가
-- 이 마이그레이션 때문에 전부 오늘로 바뀌는 일이 없다.
UPDATE "episode" SET "title" = "title";
UPDATE "series" SET "title" = "title";

-- ─── 검색 인덱스
CREATE INDEX IF NOT EXISTS "episode_search_vector_idx" ON "episode" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "series_search_vector_idx" ON "series" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "episode_title_trgm_idx" ON "episode" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "series_title_trgm_idx" ON "series" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "user_display_name_trgm_idx" ON "user" USING GIN ("display_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "user_handle_trgm_idx" ON "user" USING GIN ("handle" gin_trgm_ops);

-- ─── 배열 컬럼 조회용 GIN 인덱스 (키워드·AI 모델·지역 필터)
CREATE INDEX IF NOT EXISTS "episode_keywords_idx" ON "episode" USING GIN ("keywords");
CREATE INDEX IF NOT EXISTS "episode_ai_models_idx" ON "episode" USING GIN ("ai_models");
CREATE INDEX IF NOT EXISTS "episode_regions_blocked_idx" ON "episode" USING GIN ("regions_blocked");
CREATE INDEX IF NOT EXISTS "series_keywords_idx" ON "series" USING GIN ("keywords");
CREATE INDEX IF NOT EXISTS "user_channel_keywords_idx" ON "user" USING GIN ("channel_keywords");

-- ═══════════════════════════════════════════════════════════════════
-- 장르 분류 시드 (운영이 소유하는 고정 축. 재실행 안전)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO "category" ("id", "slug", "name_ko", "name_en", "order", "is_active") VALUES
  ('cat_drama',       'drama',       '드라마',     'Drama',        10, true),
  ('cat_romance',     'romance',     '로맨스',     'Romance',      20, true),
  ('cat_thriller',    'thriller',    '스릴러',     'Thriller',     30, true),
  ('cat_scifi',       'sci-fi',      'SF',         'Sci-Fi',       40, true),
  ('cat_fantasy',     'fantasy',     '판타지',     'Fantasy',      50, true),
  ('cat_comedy',      'comedy',      '코미디',     'Comedy',       60, true),
  ('cat_action',      'action',      '액션',       'Action',       70, true),
  ('cat_mystery',     'mystery',     '미스터리',   'Mystery',      80, true),
  ('cat_horror',      'horror',      '호러',       'Horror',       90, true),
  ('cat_documentary', 'documentary', '다큐멘터리', 'Documentary', 100, true),
  ('cat_animation',   'animation',   '애니메이션', 'Animation',   110, true),
  ('cat_youth',       'youth',       '청춘',       'Youth',       120, true),
  ('cat_historical',  'historical',  '사극',       'Historical',  130, true),
  ('cat_noir',        'noir',        '느와르',     'Noir',        140, true),
  ('cat_music',       'music',       '뮤직',       'Music',       150, true)
ON CONFLICT ("id") DO NOTHING;
