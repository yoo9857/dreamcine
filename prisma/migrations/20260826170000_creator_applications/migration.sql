CREATE TYPE "CreatorTrack" AS ENUM ('DIRECTOR', 'WRITER', 'AI_VISUAL', 'PRODUCER', 'OTHER');

CREATE TYPE "CreatorApplicationStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED');

CREATE TABLE "creator_application" (
    "id" TEXT NOT NULL,
    "display_name" VARCHAR(80) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "track" "CreatorTrack" NOT NULL,
    "portfolio_url" VARCHAR(500) NOT NULL,
    "social_url" VARCHAR(500),
    "experience" VARCHAR(1200),
    "pitch" VARCHAR(2000) NOT NULL,
    "round" VARCHAR(32) NOT NULL DEFAULT '2026-FOUNDING',
    "privacy_consent_at" TIMESTAMP(3) NOT NULL,
    "status" "CreatorApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_application_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creator_application_email_round_key"
ON "creator_application"("email", "round");

CREATE INDEX "creator_application_status_created_at_idx"
ON "creator_application"("status", "created_at");
