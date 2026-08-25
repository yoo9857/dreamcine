DROP INDEX IF EXISTS "episode_status_published_at_idx";
DROP INDEX IF EXISTS "episode_status_rank_score_idx";

CREATE INDEX "episode_feed_latest_idx"
  ON "episode"("status", "published_at" DESC, "id" DESC);

CREATE INDEX "episode_feed_popular_idx"
  ON "episode"("status", "rank_score" DESC, "id" DESC);
