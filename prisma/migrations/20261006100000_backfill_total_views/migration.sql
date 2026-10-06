-- 작품·작가 조회 합계 채우기 (데이터만, 스키마 변경 없음).
-- 지금까지 Series.totalViews 와 User.totalViews 를 갱신하는 코드가 없어 늘 0 이었다.
-- 이후로는 counter.flush 가 회차와 함께 올린다(incrementEpisodeViews).

UPDATE "series" AS s
SET "total_views" = COALESCE((
  SELECT SUM(e."view_count")
  FROM "episode" AS e
  WHERE e."series_id" = s."id" AND e."deleted_at" IS NULL
), 0);

UPDATE "user" AS u
SET "total_views" = COALESCE((
  SELECT SUM(s."total_views")
  FROM "series" AS s
  WHERE s."owner_id" = u."id" AND s."deleted_at" IS NULL
), 0);
