CREATE TABLE "stored_image" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "owner_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "object_key" TEXT NOT NULL UNIQUE,
  "purpose" VARCHAR(40) NOT NULL,
  "content_type" VARCHAR(80) NOT NULL,
  "size_bytes" BIGINT NOT NULL CHECK ("size_bytes" > 0),
  "width" INTEGER CHECK ("width" > 0),
  "height" INTEGER CHECK ("height" > 0),
  "sha256" VARCHAR(64),
  "status" VARCHAR(20) NOT NULL DEFAULT 'READY' CHECK ("status" IN ('READY', 'RETIRED', 'MISSING')),
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "stored_image_owner_id_purpose_created_at_idx" ON "stored_image"("owner_id", "purpose", "created_at" DESC);
CREATE INDEX "stored_image_status_updated_at_idx" ON "stored_image"("status", "updated_at");

CREATE TABLE "moderation_action" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actor_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "subject_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "actor_handle" VARCHAR(80),
  "subject_handle" VARCHAR(80),
  "target" "ReportTarget" NOT NULL,
  "target_id" TEXT NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "report_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "pending_media_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "media_queued_at" TIMESTAMP(3),
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "before_state" JSONB NOT NULL DEFAULT '{}',
  "after_state" JSONB NOT NULL DEFAULT '{}',
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "moderation_action_subject_id_created_at_idx" ON "moderation_action"("subject_id", "created_at" DESC);
CREATE INDEX "moderation_action_target_target_id_created_at_idx" ON "moderation_action"("target", "target_id", "created_at" DESC);
CREATE INDEX "moderation_action_actor_id_created_at_idx" ON "moderation_action"("actor_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "user_suspension_expiry_idx" ON "user"("suspended_until") WHERE "status" = 'SUSPENDED';
