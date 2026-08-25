CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_episode_title_trgm
  ON episode USING gin (title gin_trgm_ops);

CREATE INDEX idx_series_title_trgm
  ON series USING gin (title gin_trgm_ops);

CREATE INDEX idx_user_search_trgm
  ON "user" USING gin (handle gin_trgm_ops, display_name gin_trgm_ops);
