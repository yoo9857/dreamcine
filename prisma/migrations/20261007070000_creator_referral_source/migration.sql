ALTER TABLE "creator_application"
  ALTER COLUMN "track" DROP NOT NULL,
  ADD COLUMN "referral_source" VARCHAR(24);
