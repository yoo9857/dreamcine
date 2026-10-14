-- 시청 진행은 (user_id, episode_id)가 기본 키라 회차 번호로 평균을 내면
-- 표 전체를 훑는다. 회차 조회와 최근 변경 분 집계가 인덱스를 타게 한다.
CREATE INDEX "watch_progress_episode_id_idx" ON "watch_progress"("episode_id");
CREATE INDEX "watch_progress_updated_at_idx" ON "watch_progress"("updated_at");
